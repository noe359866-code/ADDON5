import { request } from '../src/http.js';

const urls = [
  'https://ww3.gnulahd.nu/wp-json/gnrd/v1/search?q=interstellar',
  'https://ww3.gnulahd.nu/wp-json/gnrd/v1/search?s=interstellar',
  'https://ww3.gnulahd.nu/wp-json/wp/v2/search?search=interstellar&per_page=10',
  'https://ww3.gnulahd.nu/wp-json/wp/v2/estreno?search=interstellar&per_page=10&_fields=id,slug,title,link',
  'https://www2.gnula.one/wp-json/wp/v2/search?search=Interestelar&per_page=10',
  'https://www2.gnula.one/wp-json/wp/v2/search?search=Interstellar&per_page=10'
];

for (const url of urls) {
  const t0 = Date.now();
  const r = await request(url, { timeoutMs: 25000 });
  console.log('---', r.status, r.text.length, (Date.now() - t0) + 'ms', url, '| err:', r.error || '-');
  console.log('   ', (r.text || '').replace(/\s+/g, ' ').slice(0, 400));
  await new Promise((res) => setTimeout(res, 1200));
}
