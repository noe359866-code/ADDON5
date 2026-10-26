import { readFileSync } from 'node:fs';
import { findMedia, findEmbedTargets } from '../src/players/shared.js';
const html = readFileSync(new URL('./voe-mirror.html', import.meta.url), 'utf8');
console.log('len', html.length, '| title:', (/<title[^>]*>([^<]{0,80})/i.exec(html) || [])[1]);
console.log('media:', findMedia(html, 'https://ashleyhardat.com/e/rvnyarijf6gm') || '—');
console.log('next:', findEmbedTargets(html, 'https://ashleyhardat.com/e/rvnyarijf6gm').slice(0,3));
console.log('sources:', [...html.matchAll(/(?:file|src|hls|source)\s*[:=]\s*["']([^"']{20,200})["']/gi)].map(m=>m[1]).slice(0,5));
