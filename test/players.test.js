import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unpackFromHtml, findPackedCall } from '../src/players/packer.js';
import {
  fetchPlayer,
  findAtobMedia,
  findEmbedTargets,
  findMedia,
  isMediaUrl,
  normalizeUrl
} from '../src/players/shared.js';
import { extractDoodstream, extractStreamtape, extractVoe, resolveEmbed } from '../src/players/index.js';
import { Deadline } from '../src/http.js';
import { installFetchStub } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** ctx con respuestas fijas: la clave es un prefijo de la URL pedida. */
function stubCtx(routes) {
  return {
    fetchText: async (url) => {
      const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
      if (!key) return '';
      const value = routes[key];
      return typeof value === 'function' ? value(url) : value;
    }
  };
}

test('el desempaquetador saca la URL del reproductor empaquetado', () => {
  const html = fixture('filemoon-packed.html');
  const call = findPackedCall(html);
  assert.ok(call.startsWith('function'));

  const unpacked = unpackFromHtml(html);
  assert.match(unpacked, /https:\/\/cdn\.example\.com\/master\.m3u8/);

  // La página empaquetada no expone el video sin desempaquetar.
  assert.equal(findMedia(html), '');
  assert.equal(findMedia(unpacked), 'https://cdn.example.com/master.m3u8');
});

test('findMedia entiende fuentes JSON, etiquetas source y og:video', () => {
  assert.equal(
    findMedia('<script>sources: [{file:"https:\\/\\/cdn.host.tv\\/v\\/play.m3u8"}]</script>'),
    'https://cdn.host.tv/v/play.m3u8'
  );
  assert.equal(
    findMedia('<video><source src="https://cdn.host.tv/v/film.mp4" type="video/mp4"></video>'),
    'https://cdn.host.tv/v/film.mp4'
  );
  assert.equal(
    findMedia('<meta property="og:video" content="https://cdn.host.tv/v/film.m3u8">'),
    'https://cdn.host.tv/v/film.m3u8'
  );
  // Prefiere HLS cuando hay varias opciones.
  assert.equal(
    findMedia('{"file":"https://a.tv/x.mp4","hls":"https://a.tv/x.m3u8"}'),
    'https://a.tv/x.m3u8'
  );
  assert.equal(findMedia('<p>nada de video</p>'), '');
});

test('findMedia descarta tráilers, sprites y hosts de publicidad', () => {
  assert.equal(findMedia('<iframe src="https://www.youtube.com/embed/abc"></iframe>'), '');
  assert.equal(findMedia('{"file":"https://cdn.tv/trailer.mp4"}'), '');
  assert.equal(findMedia('{"file":"https://ads.doubleclick.net/x.mp4"}'), '');
});

test('findAtobMedia decodifica la fuente en base64', () => {
  const encoded = Buffer.from('https://cdn.voe.sx/hls/abc/master.m3u8').toString('base64');
  assert.equal(
    findAtobMedia(`<script>const u = atob('${encoded}');</script>`),
    'https://cdn.voe.sx/hls/abc/master.m3u8'
  );
});

test('findEmbedTargets sigue go_to_player, iframes y redirects', () => {
  const targets = findEmbedTargets(fixture('cuevana-links.html'), 'https://player.cuevana.ac/e/1');
  assert.deepEqual(targets, [
    'https://voe.sx/e/chain789',
    'https://streamtape.com/e/chain456'
  ]);

  const redirect = findEmbedTargets("<script>window.location.href='/e/xyz789'</script>", 'https://voe.sx/e/def456');
  assert.deepEqual(redirect, ['https://voe.sx/e/xyz789']);
});

test('normalizeUrl arregla barras escapadas y rutas relativas', () => {
  assert.equal(normalizeUrl('https:\\/\\/cdn.tv\\/a.m3u8'), 'https://cdn.tv/a.m3u8');
  assert.equal(normalizeUrl('//cdn.tv/a.m3u8'), 'https://cdn.tv/a.m3u8');
  assert.equal(normalizeUrl('/v/a.m3u8', 'https://cdn.tv/x/y'), 'https://cdn.tv/v/a.m3u8');
  assert.equal(normalizeUrl('javascript:void(0)'), '');
  assert.equal(isMediaUrl('https://cdn.tv/a.m3u8?token=1'), true);
  assert.equal(isMediaUrl('https://cdn.tv/pagina.html'), false);
});

test('streamtape: reconstruye el enlace partido en dos trozos', async () => {
  const ctx = stubCtx({ 'https://streamtape.com/e/ghi789': fixture('streamtape.html') });
  const result = await extractStreamtape('https://streamtape.com/e/ghi789', ctx);

  assert.ok(result);
  assert.equal(
    result.media,
    'https://streamtape.com/get_video?id=ghi789abc&expires=1767225600&ip=203.0.113.9&token=Zz9Qq'
  );
  assert.equal(result.referer, 'https://streamtape.com/e/ghi789');
});

test('doodstream: pide pass_md5 y firma el enlace final', async () => {
  const ctx = stubCtx({
    'https://doodstream.com/e/jkl012': fixture('doodstream.html'),
    'https://doodstream.com/pass_md5/': 'https://dood.pm/landing123'
  });
  const result = await extractDoodstream('https://doodstream.com/e/jkl012', ctx);

  assert.ok(result);
  assert.match(result.media, /^https:\/\/dood\.pm\/landing123[a-zA-Z0-9]{10}\?token=def456&expiry=\d+$/);
});

test('voe: sigue el redirect en JavaScript y lee la fuente', async () => {
  const ctx = stubCtx({
    'https://voe.sx/e/def456': fixture('voe-redirect.html'),
    'https://voe.sx/e/xyz789': fixture('voe-player.html')
  });
  const result = await extractVoe('https://voe.sx/e/def456', ctx);

  assert.ok(result);
  assert.equal(result.media, 'https://cdn.voe.sx/hls/abc123/master.m3u8');
  assert.equal(result.referer, 'https://voe.sx/e/xyz789');
});

test('resolveEmbed encadena agregador → reproductor', async () => {
  const ctx = stubCtx({
    'https://player.cuevana.ac/e/pqr345': fixture('cuevana-links.html'),
    'https://voe.sx/e/chain789': fixture('voe-player.html'),
    'https://streamtape.com/e/chain456': fixture('streamtape.html')
  });
  const result = await resolveEmbed('https://player.cuevana.ac/e/pqr345', ctx);

  assert.ok(result);
  assert.equal(result.media, 'https://cdn.voe.sx/hls/abc123/master.m3u8');
  assert.equal(result.via, 'voe.sx');
});

test('un reproductor caído no rompe la resolución', async () => {
  const ctx = stubCtx({});
  const result = await resolveEmbed('https://filemoon.sx/e/roto', ctx);
  assert.equal(result, null);
});

test('los vídeos de demostración de un reproductor caído no cuentan como película', async (t) => {
  const stub = installFetchStub({
    'https://voe.sx/e/caido': '<script>jwplayer("v").setup({sources:[{file:"https://test-videos.co.uk/rids/bigbuckbunny/mp4-h264"}]});</script>'
  });
  t.after(() => stub.restore());

  const resolved = await resolveEmbed('https://voe.sx/e/caido', { deadline: new Deadline(4000) });
  assert.equal(resolved, null, 'el Big Buck Bunny de relleno se descarta');
});

test('si el host bloquea las peticiones con Referer se reintenta sin él', async (t) => {
  // uqload contesta 38 bytes a cualquier GET con Referer y el reproductor
  // completo sin él; sin el reintento la película se quedaba sin ese HLS.
  const full = `<html>${'<div>reproductor</div>'.repeat(200)}</html>`;
  const stub = installFetchStub({
    'https://uqload.com/embed-x.html': (url, init) => {
      const headers = init.headers || {};
      const referer = headers.Referer || headers.referer;
      return new Response(referer ? 'bloqueado' : full, { status: 200 });
    }
  });
  t.after(() => stub.restore());

  const page = await fetchPlayer('https://uqload.com/embed-x.html', {
    deadline: new Deadline(6000),
    referer: 'https://www2.gnula.one/movie/interestelar/'
  });

  assert.ok(page);
  assert.equal(page.text, full);
  // El Referer que se guarda es el del propio host, no el de la web de origen.
  assert.equal(page.referer, 'https://uqload.com/');
  assert.equal(stub.calls.length, 3, 'referer ajeno → referer propio → sin referer');
});
