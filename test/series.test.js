import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectStreams } from '../src/addon.js';
import { decodeParam } from '../src/streams.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

function seriesRoutes() {
  return {
    'https://v3-cinemeta.strem.io/meta/series/tt9140554.json': jsonRoute(JSON.parse(fixture('cinemeta-series.json'))),
    'https://ver.verteleseriesonline.com/?s=': fixture('series-search.html'),
    'https://ver.verteleseriesonline.com/serie/loki/': fixture('series-page.html'),
    'https://ver.verteleseriesonline.com/loki-2x01-hd-online-temporada-2-episodio-1/': fixture('series-episode.html'),
    'https://links.cuevana.ac/e/cue1': fixture('cuevana-links.html'),
    'https://streamtape.com/e/st2': '<div id="robotlink">//streamtape.com/get_video?id=st2abc&expires=1&ip=2&token=</div><script>document.getElementById("robotlink").innerHTML += "Tok";</script>',
    'https://voe.sx/e/voe3': fixture('voe-player.html'),
    'https://filemoon.sx/e/fm4': fixture('filemoon-packed.html'),
    'https://voe.sx/e/chain789': fixture('voe-player.html'),
    'https://streamtape.com/e/chain456': '<div id="robotlink">//streamtape.com/get_video?id=ch4&expires=1&ip=2&token=</div>'
  };
}

function mediaOf(streamUrl) {
  return decodeParam(new URL(streamUrl).searchParams.get('u'));
}

test('una serie se resuelve por temporada y episodio', async (t) => {
  const stub = installFetchStub(seriesRoutes());
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554:2:1',
    baseUrl: 'https://addon.example.com'
  });

  assert.equal(trace.meta.name, 'Loki');
  assert.equal(trace.meta.season, 2);
  assert.equal(trace.meta.episode, 1);
  assert.match(trace.page.url, /loki-2x01-hd-online-temporada-2-episodio-1/);
  assert.equal(trace.page.embeds, 4);

  assert.equal(streams.length, 3, 'los duplicados del agregador no se repiten');
  const media = streams.map((stream) => mediaOf(stream.url));
  assert.ok(media.includes('https://cdn.example.com/master.m3u8'));
  assert.ok(media.includes('https://cdn.voe.sx/hls/abc123/master.m3u8'));
  assert.ok(media.some((url) => url.startsWith('https://streamtape.com/get_video?id=st2abc')));

  // Cada stream conserva el idioma que le tocó en la ficha del episodio.
  const filemoon = streams.find((stream) => mediaOf(stream.url) === 'https://cdn.example.com/master.m3u8');
  assert.equal(filemoon.name, 'Gnula · Sub Español');
  assert.equal(filemoon.title, 'Filemoon · HD');
});

test('sin temporada ni episodio no se busca nada', async (t) => {
  const stub = installFetchStub(seriesRoutes());
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554',
    baseUrl: 'https://addon.example.com'
  });

  assert.deepEqual(streams, []);
  assert.ok(trace.errors.length > 0);
});

test('si el episodio no está en la ficha se prueba la URL predecible', async (t) => {
  const stub = installFetchStub({
    ...seriesRoutes(),
    'https://ver.verteleseriesonline.com/serie/loki/': '<div id="content"><h1>Loki</h1><p>sin episodios listados</p></div>'
  });
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554:2:1',
    baseUrl: 'https://addon.example.com'
  });

  assert.match(trace.page.url, /loki-2x01-hd-online-temporada-2-episodio-1/);
  assert.ok(streams.length >= 1);
});
