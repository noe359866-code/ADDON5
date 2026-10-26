import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { config } from '../src/config.js';
import {
  buildProxyUrl,
  buildStream,
  decodeParam,
  dedupeStreams,
  encodeParam,
  shouldProxy
} from '../src/streams.js';
import { isAllowedProxyTarget, isPrivateHost, rewritePlaylist } from '../src/proxy.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const BASE = 'https://addon.example.com';

function withProxyMode(mode, fn) {
  const previous = config.streamProxy;
  config.streamProxy = mode;
  try {
    return fn();
  } finally {
    config.streamProxy = previous;
  }
}

function proxyTarget(url) {
  const params = new URL(url).searchParams;
  return {
    media: decodeParam(params.get('u')),
    referer: decodeParam(params.get('r'))
  };
}

test('encodeParam/decodeParam sobreviven a URLs con query y acentos', () => {
  const value = 'https://cdn.tv/v/ñandú.m3u8?token=abc&expires=1';
  assert.equal(decodeParam(encodeParam(value)), value);
  assert.equal(decodeParam(''), '');
  assert.equal(decodeParam('***'), '');
});

test('modo auto: con Referer se usa el proxy del addon', () => {
  withProxyMode('auto', () => {
    const stream = buildStream({
      baseUrl: BASE,
      media: 'https://cdn.voe.sx/hls/abc/master.m3u8',
      referer: 'https://voe.sx/e/abc',
      language: 'Latino',
      label: 'Voe',
      quality: 'HD'
    });

    assert.ok(stream.url.startsWith(`${BASE}/proxy?`));
    assert.deepEqual(proxyTarget(stream.url), {
      media: 'https://cdn.voe.sx/hls/abc/master.m3u8',
      referer: 'https://voe.sx/e/abc'
    });
    assert.equal(stream.name, 'Gnula · Latino');
    assert.equal(stream.title, 'Voe · HD');
    assert.equal(stream.behaviorHints.notWebReady, false);
  });
});

test('modo never: URL directa con proxyHeaders', () => {
  withProxyMode('never', () => {
    const stream = buildStream({
      baseUrl: BASE,
      media: 'https://cdn.voe.sx/hls/abc/master.m3u8',
      referer: 'https://voe.sx/e/abc',
      language: 'Castellano',
      label: 'Voe'
    });

    assert.equal(stream.url, 'https://cdn.voe.sx/hls/abc/master.m3u8');
    assert.equal(stream.behaviorHints.proxyHeaders.request.Referer, 'https://voe.sx/e/abc');
    assert.equal(stream.title, 'Voe');
  });
});

test('modo always: todo pasa por el proxy', () => {
  withProxyMode('always', () => {
    const stream = buildStream({ baseUrl: BASE, media: 'https://cdn.tv/a.mp4', referer: '' });
    assert.ok(stream.url.startsWith(`${BASE}/proxy?`));
    assert.equal(shouldProxy('https://cdn.tv/a.mp4', ''), true);
  });
});

test('sin Referer (modo auto) se devuelve la URL directa', () => {
  withProxyMode('auto', () => {
    const stream = buildStream({ baseUrl: BASE, media: 'https://cdn.tv/a.mp4' });
    assert.equal(stream.name, 'Gnula');
    assert.equal(stream.title, 'Gnula');
    assert.equal(stream.url, 'https://cdn.tv/a.mp4');
    assert.equal(stream.behaviorHints.proxyHeaders, undefined);
  });
});

test('el título muestra el formato reproducible (HLS/MP4)', () => {
  withProxyMode('never', () => {
    const hls = buildStream({ baseUrl: BASE, media: 'https://cdn.tv/a.m3u8', label: 'Voe', quality: 'HD', format: 'HLS' });
    assert.equal(hls.title, 'Voe · HLS · HD');

    const mp4 = buildStream({ baseUrl: BASE, media: 'https://cdn.tv/a.mp4', label: 'Enlace directo', format: 'MP4' });
    assert.equal(mp4.title, 'Enlace directo · MP4');
  });
});

test('dedupeStreams quita repetidos sin perder idiomas distintos', () => {
  const streams = dedupeStreams([
    { url: 'a', name: 'Gnula · Latino' },
    { url: 'a', name: 'Gnula · Castellano' },
    { url: 'b' },
    null
  ]);
  assert.deepEqual(streams.map((stream) => stream.url), ['a', 'b']);
});

test('buildProxyUrl conserva el Referer', () => {
  const url = buildProxyUrl(BASE, 'https://cdn.tv/a.m3u8', 'https://voe.sx/e/1');
  assert.deepEqual(proxyTarget(url), {
    media: 'https://cdn.tv/a.m3u8',
    referer: 'https://voe.sx/e/1'
  });
});

test('rewritePlaylist manda cada segmento y cada clave por el proxy', () => {
  const playlist = fixture('hls-playlist.m3u8');
  const proxied = rewritePlaylist(
    playlist,
    'https://cdn.example.org/hls/master.m3u8',
    (url) => `${BASE}/proxy?u=${encodeParam(url)}&r=${encodeParam('https://voe.sx/e/abc')}`
  );

  const lines = proxied.split('\n');
  assert.equal(lines[0], '#EXTM3U');
  assert.match(lines[3], /URI="https:\/\/addon\.example\.com\/proxy\?u=/);
  assert.equal(proxyTarget(decodeURIComponent(lines[3].match(/URI="([^"]+)"/)[1]).replace(/&amp;/g, '&')).media,
    'https://cdn.example.org/hls/key.bin');
  assert.match(lines[4], /proxy\?u=/);
  assert.equal(proxyTarget(lines[6]).media, 'https://cdn.example.org/hls/segment-001.ts');
  assert.equal(proxyTarget(lines[8]).media, 'https://cdn.example.org/hls/segment-002.ts?token=abc');
  // Los comentarios que no llevan URI se conservan tal cual.
  assert.equal(lines[1], '#EXT-X-VERSION:3');
  assert.equal(lines[7], '#EXTINF:6.00000,');
});

test('el proxy rechaza destinos privados y protocolos raros', () => {
  assert.equal(isPrivateHost('127.0.0.1'), true);
  assert.equal(isPrivateHost('192.168.1.10'), true);
  assert.equal(isPrivateHost('10.0.0.5'), true);
  assert.equal(isPrivateHost('cdn.voe.sx'), false);

  assert.equal(isAllowedProxyTarget('http://127.0.0.1:8080/x.m3u8'), false);
  assert.equal(isAllowedProxyTarget('http://localhost/x'), false);
  assert.equal(isAllowedProxyTarget('file:///etc/passwd'), false);
  assert.equal(isAllowedProxyTarget('no-es-una-url'), false);
  assert.equal(isAllowedProxyTarget('https://cdn.voe.sx/x.m3u8'), true);
});
