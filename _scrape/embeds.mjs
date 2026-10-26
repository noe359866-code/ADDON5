import { readFileSync } from 'node:fs';
import { findMedia, findEmbedTargets, normalizeUrl } from '../src/players/shared.js';

const cases = [
  ['uqload-embed.html', 'https://uqload.com/embed-fqhl3m5h3zcn.html'],
  ['jawcloud-embed.html', 'https://jawcloud.co/embed-lww3ummjhnxl.html'],
  ['voe-embed.html', 'https://voe.sx/e/rvnyarijf6gm'],
  ['byse-embed.html', 'https://byse.sx/e/ltd6r245u81w'],
  ['savefiles-embed.html', 'https://savefiles.com/e/j1zo9m2tgvcs']
];

for (const [file, url] of cases) {
  let html = '';
  try { html = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'); } catch { console.log(file, 'SIN FICHERO'); continue; }
  const media = findMedia(html, url);
  const next = findEmbedTargets(html, url);
  console.log(`== ${file} (${html.length} B)`);
  console.log('   media:', media || '—');
  console.log('   next :', next.slice(0, 3).join(' , ') || '—');
  const sources = [...html.matchAll(/(?:file|src|url)\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/gi)].map((m) => m[1]).slice(0, 3);
  if (sources.length) console.log('   crudo:', sources.join(' , '));
  const title = /<title[^>]*>([^<]{0,80})/i.exec(html);
  if (title) console.log('   <title>:', title[1].trim());
}
