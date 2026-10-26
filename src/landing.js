/**
 * src/landing.js — Página de inicio con el botón de instalar en Stremio.
 * HTML autocontenido (sin CDN ni fuentes externas) para que abra igual en
 * cualquier navegador y dentro de la vista previa.
 */

import { config } from './config.js';
import { manifest } from './manifest.js';

export function renderLanding(baseUrl) {
  const manifestUrl = `${baseUrl}/manifest.json`;
  const installUrl = `stremio://${baseUrl.replace(/^https?:\/\//, '')}/manifest.json`;
  const proxyLabel = {
    auto: 'solo cuando el servidor de video lo exige',
    always: 'siempre',
    never: 'desactivado'
  }[config.streamProxy] || config.streamProxy;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(manifest.name)} — Stremio</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; padding: 48px 20px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at 20% 0%, #1d3b2a 0%, #0b0f0d 45%, #070909 100%);
    color: #e8f2ec; display: flex; align-items: flex-start; justify-content: center;
  }
  main { width: 100%; max-width: 720px; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px;
    border: 1px solid #2f5c43; border-radius: 999px; font-size: 13px; color: #9fe0b8;
    background: #102018; letter-spacing: .02em;
  }
  h1 { font-size: clamp(30px, 6vw, 44px); margin: 18px 0 10px; letter-spacing: -.02em; }
  p.lead { color: #a9bdb1; font-size: 17px; line-height: 1.6; margin: 0 0 28px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; }
  a.button, button.button {
    font: inherit; font-weight: 600; text-decoration: none; cursor: pointer;
    padding: 13px 22px; border-radius: 12px; border: 1px solid transparent;
    transition: transform .12s ease, filter .12s ease;
  }
  a.primary { background: #2ee07a; color: #052012; }
  button.secondary { background: #16211b; color: #d6e8dd; border-color: #2b4437; }
  a.button:hover, button.button:hover { transform: translateY(-1px); filter: brightness(1.06); }
  section { background: #101815; border: 1px solid #1f2f26; border-radius: 16px; padding: 22px 24px; margin-bottom: 18px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .1em; color: #7fae94; margin: 0 0 14px; }
  code {
    display: block; word-break: break-all; background: #0a100d; border: 1px solid #1d2c24;
    border-radius: 10px; padding: 12px 14px; color: #b9f2d0; font-size: 13px; line-height: 1.5;
  }
  ol, ul { margin: 0; padding-left: 20px; color: #b3c6ba; line-height: 1.75; font-size: 15px; }
  li strong { color: #e8f2ec; font-weight: 600; }
  .grid { display: grid; grid-template-columns: max-content 1fr; gap: 8px 18px; font-size: 14px; color: #a9bdb1; }
  .grid span:nth-child(odd) { color: #6f8f7d; }
  footer { color: #59705f; font-size: 13px; margin-top: 26px; line-height: 1.7; }
  .ok { color: #2ee07a; }
</style>
</head>
<body>
<main>
  <span class="badge">● addon de streams · Stremio</span>
  <h1>${escapeHtml(manifest.name)}</h1>
  <p class="lead">
    Películas y series en español desde <strong>Gnula</strong> y su hermano
    <strong>GnulaHD</strong>, listas para reproducir dentro del reproductor de
    Stremio. Sin catálogos: este addon solo entrega las fuentes de video.
  </p>

  <div class="actions">
    <a class="button primary" href="${escapeHtml(installUrl)}">Instalar en Stremio</a>
    <button class="button secondary" id="copy" data-url="${escapeHtml(manifestUrl)}">Copiar enlace del manifest</button>
  </div>

  <section>
    <h2>Cómo se usa</h2>
    <ol>
      <li>Abre una <strong>película</strong> o un <strong>episodio</strong> en Stremio.</li>
      <li>Pulsa el botón de fuentes y busca las entradas <strong>Gnula</strong> y
      <strong>GnulaHD</strong>: se consultan las dos webs a la vez.</li>
      <li>Cada entrada indica el idioma (Latino, Castellano, Subtitulado) y el servidor.</li>
    </ol>
  </section>

  <section>
    <h2>Enlace del manifest</h2>
    <code>${escapeHtml(manifestUrl)}</code>
  </section>

  <section>
    <h2>Estado del servicio</h2>
    <div class="grid">
      <span>Versión</span><span>${escapeHtml(manifest.version)}</span>
      <span>Recurso</span><span>stream (películas y series)</span>
      <span>Fuentes</span><span>Gnula · GnulaHD</span>
      <span>Títulos</span><span>${config.tmdbApiKey
        ? `TMDB (${escapeHtml(config.tmdbLanguage)}) + Wikipedia`
        : 'Wikipedia (sin clave de TMDB)'}</span>
      <span>Formatos</span><span>${escapeHtml(config.stremioFormats.join(', ').toUpperCase())} (compatibles con Stremio)</span>
      <span>Proxy de video</span><span>${escapeHtml(proxyLabel)}</span>
      <span>Diagnóstico</span><span><a class="ok" href="/selftest?id=tt0111161&amp;type=movie">/selftest?id=tt0111161&amp;type=movie</a></span>
      <span>Salud</span><span><a class="ok" href="/health">/health</a></span>
    </div>
  </section>

  <footer>
    Este addon solo indexa enlaces que ya publican sitios de terceros y nunca
    aloja video. Si un título no aparece, prueba a abrirlo unos minutos después o
    revisa el diagnóstico del servicio.
  </footer>
</main>
<script>
  const button = document.getElementById('copy');
  button.addEventListener('click', async () => {
    const url = button.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = '¡Copiado!';
    } catch {
      button.textContent = url;
    }
    setTimeout(() => { button.textContent = 'Copiar enlace del manifest'; }, 2200);
  });
</script>
</body>
</html>`;
}

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
