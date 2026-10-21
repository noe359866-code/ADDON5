import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const root = new URL('../', import.meta.url);

test('npm start serves the subtitles-only addon from the repository root', async (t) => {
  const child = spawn('npm', ['start'], {
    cwd: root,
    env: { ...process.env, PORT: '0', ANIME_MAPPING_ENABLED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  t.after(() => { if (child.exitCode === null) process.kill(-child.pid, 'SIGTERM'); });
  // The entrypoint uses port 7000 when PORT=0. Read its actual startup message.
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Startup timed out')), 10000);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    child.stdout.on('data', (data) => {
      const match = String(data).match(/escuchando en 0\.0\.0\.0:(\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  const response = await fetch(`http://127.0.0.1:${port}/manifest.json`);
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.id, 'org.addon5.subtitles');
  assert.equal(manifest.name, 'Subtítulos Plus');
  assert.equal(manifest.version, '1.2.0');
  assert.equal(manifest.logo, `http://127.0.0.1:${port}/assets/logo.png`);
  const logo = await fetch(manifest.logo);
  assert.equal(logo.status, 200);
  assert.match(logo.headers.get('content-type'), /image\/png/);
  const landing = await fetch(`http://127.0.0.1:${port}/`);
  assert.match(await landing.text(), /Tus historias, en tus palabras/);

  assert.deepEqual(manifest.resources, ['subtitles']);
  assert.deepEqual(manifest.catalogs, []);
  assert.deepEqual(manifest.types, ['movie', 'series']);
  assert.ok(manifest.idPrefixes.includes('kitsu'));
});

test('Render blueprint deploys only the subtitles service', () => {
  const blueprint = readFileSync(new URL('render.yaml', root), 'utf8');
  assert.match(blueprint, /name: addon5-subtitles/);
  assert.equal((blueprint.match(/type: web/g) || []).length, 1);
  assert.match(blueprint, /rootDir: subtitles-addon/);
});
