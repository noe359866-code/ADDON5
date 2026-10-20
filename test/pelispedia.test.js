import test from 'node:test';
import assert from 'node:assert/strict';
import { scrapeCatalog, scrapeHlsFromPage } from '../src/pelispedia.js';

const fetchHtml = (html) => async (url, options = {}) => new Response(html, {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8' }
});

test('catalog scraper keeps only internal links and does not follow external links', async () => {
  const html = '<a href="/pelicula-ejemplo/">Película Ejemplo</a><a href="https://evil.example/movie">External</a><a href="/contacto/">Contacto</a>';
  const items = await scrapeCatalog('https://pelispedia.mov/', fetchHtml(html));
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Película Ejemplo');
  assert.equal(items[0]._sourceUrl, 'https://pelispedia.mov/pelicula-ejemplo/');
});

test('HLS scraper accepts only HTTPS URLs on the configured allowlist', async () => {
  const html = '<script>var a="https://media.example.org/master.m3u8";var b="https://evil.example/master.m3u8";var c="http://media.example.org/no.m3u8";</script>';
  const items = await scrapeHlsFromPage('https://pelispedia.mov/pelicula/', 'https://pelispedia.mov/', ['media.example.org'], fetchHtml(html), 'movie');
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://media.example.org/master.m3u8');
});

test('scraper rejects a different base hostname', async () => {
  await assert.rejects(() => scrapeCatalog('https://example.org/', fetchHtml('<a href="/">x</a>')));
});