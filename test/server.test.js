import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddonServer, buildManifest, hostIsAllowed, parseCatalog, parseStreams } from '../src/server.js';

const secret = 'a'.repeat(64);
const env = {
  NODE_ENV: 'test',
  PUBLIC_BASE_URL: 'https://addon5.test',
  STREAM_TOKEN_SECRET: secret,
  HLS_ALLOWED_HOSTS: 'media.example.org,*.cdn.example.org',
  CATALOG_JSON: JSON.stringify([
    { id: 'tt0000001', type: 'movie', name: 'Película autorizada', description: 'Drama', poster: 'https://images.example.org/poster.jpg', provider: 'never-return-this' },
    { id: 'tt0000002', type: 'series', name: 'Serie autorizada', videos: [{ id: 'tt0000002:1:1', title: 'Episodio 1', season: 1, episode: 1 }] }
  ]),
  STREAMS_JSON: JSON.stringify([
    { id: 'tt0000001', type: 'movie', url: 'https://media.example.org/master.m3u8', quality: '1080p', language: 'Español latino', headers: { Referer: 'https://origin.example.org/', Host: 'evil.example.org' } },
    { id: 'tt0000002:1:1', type: 'series', url: 'https://media.example.org/episode.m3u8', quality: '720p', language: 'Español' },
    { id: 'tt0000003', type: 'movie', url: 'https://not-allowed.example.net/master.m3u8', quality: '4K', language: 'Inglés' },
    { id: 'tt0000004', type: 'movie', url: 'https://media.example.org/video.mp4', quality: '1080p', language: 'Español' }
  ])
};

async function withServer(run) {
  const server = createAddonServer({ env });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('manifest declares only catalog, meta, stream and movie/series types', () => {
  const manifest = buildManifest();
  assert.deepEqual(manifest.resources, ['catalog', 'meta', 'stream']);
  assert.deepEqual(manifest.types, ['movie', 'series']);
  assert.equal(manifest.catalogs.length, 2);
});

test('catalog accepts valid items and drops invalid or duplicated items', () => {
  const parsed = parseCatalog([
    { id: 'a', type: 'movie', name: 'A' },
    { id: 'a', type: 'movie', name: 'Duplicate' },
    { id: 'b', type: 'channel', name: 'Wrong type' },
    { id: 'c', type: 'series', name: 'C' }
  ]);
  assert.deepEqual(parsed.map(item => item.name), ['A', 'C']);
});

test('only allowlisted HTTPS HLS manifests are accepted', () => {
  const hosts = ['media.example.org', '*.cdn.example.org'];
  assert.equal(hostIsAllowed('media.example.org', hosts), true);
  assert.equal(hostIsAllowed('part.cdn.example.org', hosts), true);
  assert.equal(hostIsAllowed('cdn.example.org', hosts), false);
  assert.equal(hostIsAllowed('127.0.0.1', ['127.0.0.1']), false);
  assert.equal(hostIsAllowed('8.8.8.8', ['8.8.8.8']), false);
  assert.equal(parseStreams([{ id: 'x', type: 'movie', url: 'http://media.example.org/master.m3u8' }], hosts).length, 0);
});

test('health endpoint returns status', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  });
});

test('catalog and metadata do not leak unapproved source fields', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/catalog/movie/addon5-movies/search=autorizada.json`);
    const body = await response.json();
    assert.equal(body.metas.length, 1);
    assert.equal(body.metas[0].name, 'Película autorizada');
    assert.equal(JSON.stringify(body).includes('never-return-this'), false);
    const meta = await (await fetch(`${base}/meta/movie/tt0000001.json`)).json();
    assert.equal(meta.meta.name, 'Película autorizada');
    assert.equal(JSON.stringify(meta).includes('provider'), false);
  });
});

test('stream responses expose only local encrypted HLS URLs and generic labels', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/stream/movie/tt0000001.json`);
    const body = await response.json();
    assert.equal(body.streams.length, 1);
    assert.match(body.streams[0].url, /^https:\/\/addon5\.test\/hls\//);
    assert.equal(body.streams[0].url.includes('media.example.org'), false);
    assert.equal(body.streams[0].title, '1080p • Español latino');
    assert.equal(body.streams[0].name, 'ADDON5 HLS');
    assert.equal(body.streams[0].url.includes('origin.example.org'), false);
  });
});

test('series episode IDs can resolve HLS streams', async () => {
  await withServer(async base => {
    const body = await (await fetch(`${base}/stream/series/tt0000002%3A1%3A1.json`)).json();
    assert.equal(body.streams.length, 1);
    assert.equal(body.streams[0].title, '720p • Español');
  });
});

test('invalid and non-HLS sources return no streams', async () => {
  await withServer(async base => {
    const blocked = await (await fetch(`${base}/stream/movie/tt0000003.json`)).json();
    const nonHls = await (await fetch(`${base}/stream/movie/tt0000004.json`)).json();
    assert.deepEqual(blocked.streams, []);
    assert.deepEqual(nonHls.streams, []);
  });
});

test('HLS playlist rewrites segments and key URIs to encrypted local routes', async () => {
  const fakeFetch = async () => new Response('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="keys/key.bin"\nsegment/part.ts\n', {
    status: 200,
    headers: { 'content-type': 'application/vnd.apple.mpegurl' }
  });
  const server = createAddonServer({ env, fetchImpl: fakeFetch });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const stream = await (await fetch(`${base}/stream/movie/tt0000001.json`)).json();
    const path = new URL(stream.streams[0].url).pathname;
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    const playlist = await response.text();
    assert.match(playlist, /^#EXTM3U/);
    assert.equal((playlist.match(/https:\/\/addon5\.test\/hls\//g) || []).length, 2);
    assert.equal(playlist.includes('media.example.org'), false);
    assert.equal(playlist.includes('segment/part.ts'), false);
    assert.equal(playlist.includes('keys/key.bin'), false);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('production mode auto-generates STREAM_TOKEN_SECRET when omitted or shorter than 32 chars', async () => {
  const prodEnv = {
    ...env,
    NODE_ENV: 'production',
    STREAM_TOKEN_SECRET: ''
  };
  const server = createAddonServer({ env: prodEnv });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const stream = await (await fetch(`${base}/stream/movie/tt0000001.json`)).json();
    assert.equal(stream.streams.length, 1);
    assert.match(stream.streams[0].url, /^https:\/\/addon5\.test\/hls\//);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

