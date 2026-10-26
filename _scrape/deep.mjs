import { readFileSync } from 'node:fs';
import { unpackFromHtml } from '../src/players/packer.js';
import { findMedia, findAtobMedia } from '../src/players/shared.js';

for (const [file, url] of [
  ['uqload-embed.html', 'https://uqload.com/embed-fqhl3m5h3zcn.html'],
  ['voe-mirror.html', 'https://ashleyhardat.com/e/rvnyarijf6gm'],
  ['jawcloud-embed.html', 'https://jawcloud.co/embed-lww3ummjhnxl.html']
]) {
  const html = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
  const unpacked = unpackFromHtml(html);
  console.log(`== ${file}: unpacked=${unpacked ? unpacked.length + ' B' : 'no'}`);
  if (unpacked) {
    const m = findMedia(unpacked, url) || findAtobMedia(unpacked, url);
    console.log('   media del unpacked:', m || '—');
    const files = [...unpacked.matchAll(/["']([^"']*\.(?:mp4|m3u8)[^"']*)["']/gi)].map((x) => x[1]).slice(0, 3);
    if (files.length) console.log('   files:', files.join(' , '));
  }
  const raw = [...html.matchAll(/["'](https?:\/\/[^"']*\.(?:mp4|m3u8)[^"']*)["']/gi)].map((x) => x[1]).slice(0, 3);
  if (raw.length) console.log('   raw http media:', raw.join(' , '));
  const vid = /<video[^>]*>/i.exec(html);
  if (vid) console.log('   <video>:', vid[0].slice(0, 160));
}
