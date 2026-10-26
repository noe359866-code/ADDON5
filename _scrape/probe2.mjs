import { resolveEmbed } from '../src/players/index.js';
import { fetchPlayer, findEmbedTargets, findMedia } from '../src/players/shared.js';
import { Deadline } from '../src/http.js';

const REFERER = 'https://ver.verteleseriesonline.com/loki-2x01-hd-online-temporada-2-episodio-1/';
const urls = [
  'https://doodstream.com/e/5om8hen4mx5z#yep=1',
  'https://mixdrop.ch/e/kn4868p8c31zvmw',
  'https://streamhub.to/e/hp3t8oth58kc',
  'https://links.cuevana.ac/play/L0ZTVGJ2YVo0STBEYkYyaC9LY3FPZz09.html#lang=lat',
  'https://player.cuevana.ac/f/7Rkx7iWUYWWW',
  'https://player.cuevana.ac/f/tHTI18pdRZ3Z'
];

for (const url of urls) {
  const page = await fetchPlayer(url, { deadline: new Deadline(20000), referer: REFERER });
  console.log(`\n${url}\n   page: ${page ? page.text.length + ' B' : 'null'} | media: ${page ? (findMedia(page.text, url) || '—') : '—'}`);
  if (page) {
    const next = findEmbedTargets(page.text, url);
    console.log('   next:', next.slice(0, 2).join(' , ') || '—');
    const title = /<title[^>]*>([^<]{0,90})/i.exec(page.text);
    if (title) console.log('   title:', title[1].trim());
  }

  const t0 = Date.now();
  const out = await resolveEmbed(url, { deadline: new Deadline(20000), referer: REFERER });
  console.log(`   resolve ${Date.now() - t0} ms →`, out && out.media ? `${out.media.slice(0, 120)} (${out.via})` : 'NULL');
}
