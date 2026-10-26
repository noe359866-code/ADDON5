import { request } from '../src/http.js';
const urls = [
  'https://www2.gnula.one/?s=Interstellar',
  'https://www2.gnula.one/?s=interstellar',
  'https://ww3.gnulahd.nu/?s=Interstellar',
  'https://ww3.gnulahd.nu/?s=interstellar',
  'https://www2.gnula.one/movie/interestelar/',
  'https://ww3.gnulahd.nu/ver/interestelar/'
];
for (const url of urls) {
  const r = await request(url, { timeoutMs: 20000, headers: { Referer: new URL(url).origin + '/' } });
  const head = (r.text || '').replace(/\s+/g, ' ').slice(0, 120);
  console.log(r.status, String((r.text||'').length).padStart(7), url, '|', r.error || '', '|', head);
}
