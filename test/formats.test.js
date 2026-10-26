import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import {
  allowedFormats,
  classifyMedia,
  extensionOf,
  formatFromContentType,
  formatFromUrl,
  formatLabel,
  probeContentType
} from '../src/formats.js';
import { Deadline } from '../src/http.js';
import { installFetchStub } from './helpers/stub-fetch.js';

async function withFormats(formats, run) {
  const previous = config.stremioFormats;
  config.stremioFormats = formats;
  try {
    return await run();
  } finally {
    config.stremioFormats = previous;
  }
}

test('extensionOf y formatFromUrl reconocen los formatos de video', () => {
  assert.equal(extensionOf('https://cdn.tv/v/master.m3u8?token=1'), 'm3u8');
  assert.equal(extensionOf('https://cdn.tv/v/film.mp4'), 'mp4');
  assert.equal(extensionOf('https://cdn.tv/v/film.MKV'), 'mkv');
  assert.equal(extensionOf('https://cdn.tv/get_video?id=1'), '');

  assert.equal(formatFromUrl('https://cdn.tv/a.m3u8'), 'hls');
  assert.equal(formatFromUrl('https://cdn.tv/a.mp4?x=1'), 'mp4');
  assert.equal(formatFromUrl('https://cdn.tv/a.m4v'), 'mp4');
  assert.equal(formatFromUrl('https://cdn.tv/a.mpd'), 'dash');
  assert.equal(formatFromUrl('https://cdn.tv/a.zip'), 'zip');
  assert.equal(formatFromUrl('https://cdn.tv/a.html'), 'page');
  assert.equal(formatFromUrl('https://cdn.tv/get_video?id=1'), '');
});

test('formatFromContentType traduce los tipos de los CDN', () => {
  assert.equal(formatFromContentType('application/vnd.apple.mpegurl'), 'hls');
  assert.equal(formatFromContentType('application/x-mpegURL; charset=utf-8'), 'hls');
  assert.equal(formatFromContentType('video/mp4'), 'mp4');
  assert.equal(formatFromContentType('video/mp4; codecs="avc1"'), 'mp4');
  assert.equal(formatFromContentType('application/dash+xml'), 'dash');
  assert.equal(formatFromContentType('video/x-matroska'), 'mkv');
  assert.equal(formatFromContentType('text/html; charset=UTF-8'), 'page');
  assert.equal(formatFromContentType('application/json'), 'page');
  assert.equal(formatFromContentType(''), '');
});

test('por defecto solo HLS y MP4 son compatibles con Stremio', () => {
  assert.deepEqual([...allowedFormats()].sort(), ['hls', 'mp4']);

  return withFormats(['hls', 'mp4'], async () => {
    const hls = await classifyMedia('https://cdn.tv/a.m3u8');
    assert.equal(hls.compatible, true);
    assert.equal(hls.label, 'HLS');

    const mp4 = await classifyMedia('https://cdn.tv/a.mp4');
    assert.equal(mp4.compatible, true);
    assert.equal(mp4.label, 'MP4');

    const dash = await classifyMedia('https://cdn.tv/a.mpd');
    assert.equal(dash.compatible, false);
    assert.match(dash.reason, /dash/);

    const mkv = await classifyMedia('https://cdn.tv/a.mkv');
    assert.equal(mkv.compatible, false);

    const zip = await classifyMedia('https://cdn.tv/a.zip');
    assert.equal(zip.compatible, false);
    assert.match(zip.reason, /zip/);
  });
});

test('MKV se puede habilitar para escritorio/TV', () => withFormats(['hls', 'mp4', 'mkv'], async () => {
  const mkv = await classifyMedia('https://cdn.tv/a.mkv');
  assert.equal(mkv.compatible, true);
  assert.equal(mkv.label, 'MKV');
  assert.equal(formatLabel('mkv'), 'MKV');
}));

test('un enlace sin extensión se identifica por Content-Type', async (t) => {
  const stub = installFetchStub({
    'https://streamtape.com/get_video': { body: '', headers: { 'content-type': 'video/mp4' } },
    'https://cdn.tv/hls': { body: '', headers: { 'content-type': 'application/vnd.apple.mpegurl' } },
    'https://cdn.tv/pagina': { body: '<html></html>', headers: { 'content-type': 'text/html' } }
  });
  t.after(() => stub.restore());

  const video = await classifyMedia('https://streamtape.com/get_video?id=1&token=x', { referer: 'https://streamtape.com/e/1' });
  assert.equal(video.compatible, true);
  assert.equal(video.format, 'mp4');
  assert.equal(video.label, 'MP4');

  const hls = await classifyMedia('https://cdn.tv/hls');
  assert.equal(hls.compatible, true);
  assert.equal(hls.format, 'hls');

  const page = await classifyMedia('https://cdn.tv/pagina');
  assert.equal(page.compatible, false);
  assert.equal(page.format, 'page');

  // El sondeo lleva el Referer del reproductor (el CDN lo exige).
  const call = stub.calls.find((item) => item.url.includes('/get_video'));
  assert.equal(call.headers.Referer, 'https://streamtape.com/e/1');
});

test('si no se puede confirmar el tipo, no se entrega', async (t) => {
  const stub = installFetchStub({});
  t.after(() => stub.restore());

  const unknown = await classifyMedia('https://cdn.tv/get_video?id=1');
  assert.equal(unknown.compatible, false);
  assert.match(unknown.reason, /no se pudo confirmar/);
});

test('probeContentType no descarga el archivo y respeta el presupuesto', async (t) => {
  const stub = installFetchStub({
    'https://cdn.tv/video': { body: 'x'.repeat(1024), headers: { 'content-type': 'video/mp4' } }
  });
  t.after(() => stub.restore());

  const type = await probeContentType('https://cdn.tv/video', { deadline: new Deadline(2000) });
  assert.equal(type, 'video/mp4');
  assert.equal(stub.calls[0].method, 'HEAD');

  const expired = new Deadline(1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(await probeContentType('https://cdn.tv/video', { deadline: expired }), '');
});
