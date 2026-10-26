import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function startServer(t) {
  const child = spawn(process.execPath, ['index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGTERM');
  });

  return new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error('el servidor no arrancó a tiempo')), 15000);
    let output = '';
    const onData = (data) => {
      output += String(data);
      const match = /escuchando en 0\.0\.0\.0:(\d+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolvePort(Number.parseInt(match[1], 10));
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (data) => {
      output += String(data);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`el proceso terminó con código ${code}: ${output}`));
    });
  });
}

test('node index.js arranca y publica el manifest de streams', async (t) => {
  const port = await startServer(t);
  assert.ok(port > 0);

  const manifestResponse = await fetch(`http://127.0.0.1:${port}/manifest.json`);
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.id, 'org.addon5.gnula');
  assert.equal(manifest.name, 'Gnula Streams');
  assert.deepEqual(manifest.resources, ['stream']);
  assert.deepEqual(manifest.catalogs, []);

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');

  const landing = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Instalar en Stremio/);
});
