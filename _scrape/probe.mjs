import { resolveEmbed } from '../src/players/index.js';
import { fetchPlayer } from '../src/players/shared.js';
import { Deadline } from '../src/http.js';

const REFERER = 'https://www2.gnula.one/movie/interestelar/';
const embeds = [
  'https://uqload.com/embed-fqhl3m5h3zcn.html',
  'https://viewsb.com/e/beypa68rqj3t.html',
  'https://jawcloud.co/embed-lww3ummjhnxl.html',
  'https://voe.sx/e/rvnyarijf6gm',
  'https://byse.sx/e/ltd6r245u81w',
  'https://savefiles.com/e/j1zo9m2tgvcs'
];

for (const url of embeds) {
  const t0 = Date.now();
  let status = '-';
  let size = 0;
  try {
    const page = await fetchPlayer(url, { deadline: new Deadline(15000), referer: REFERER });
    status = page ? String(page.status) : 'null';
    size = page ? page.text.length : 0;
  } catch (error) {
    status = `exc ${error.message}`;
  }

  try {
    const own = await fetchPlayer(url, { deadline: new Deadline(15000) });
    console.log(`   sin referer ajeno: ${own ? own.text.length + ' B' : 'null'}`);
  } catch (error) {
    console.log('   sin referer ajeno: exc', error.message);
  }

  const t1 = Date.now();
  let out = null;
  try {
    out = await resolveEmbed(url, { deadline: new Deadline(15000), referer: REFERER });
  } catch (error) {
    out = { error: error.message };
  }
  console.log(
    `${url}\n   fetch: ${status} ${size} B ${t1 - t0} ms | resolve: ${Date.now() - t1} ms → `
    + (out && out.media ? `${out.media.slice(0, 110)} (${out.via || 'via?'}, ${out.format || 's/formato'})` : 'NULL')
  );
}
