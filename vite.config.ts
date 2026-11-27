import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeServiceWorker } from './scripts/pwa.mjs';

// ONNX Runtime se sirve desde la propia app, sin CDN adicional.
function voiceRuntime(): Plugin {
  const names = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const source = (name: string) => resolve('node_modules/onnxruntime-web/dist', name);
  return {
    name: 'voice-runtime',
    configureServer(server) {
      server.middlewares.use('/voice-runtime', (req, res, next) => {
        const name = (req.url || '').split('?')[0]?.replace(/^\//, '');
        if (!name || !names.includes(name)) return next();
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        res.end(readFileSync(source(name)));
      });
    },
    generateBundle() {
      for (const name of names) this.emitFile({ type: 'asset', fileName: `voice-runtime/${name}`, source: readFileSync(source(name)) });
    },
  };
}

function offlineApp(): Plugin {
  let outputDir = '';
  return {
    name: 'offline-app',
    apply: 'build',
    configResolved(config) { outputDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const files: { path: string; content: Uint8Array }[] = [];
      function collect(dir: string, prefix = '') {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = prefix + entry.name;
          if (entry.isDirectory()) collect(resolve(dir, entry.name), `${path}/`);
          else if (entry.isFile() && path !== 'sw.js') {
            const content = readFileSync(resolve(dir, entry.name));
            // Los motores de voz grandes solo se guardan cuando se usan.
            if (content.byteLength <= 1_000_000) files.push({ path, content });
          }
        }
      }
      collect(outputDir);
      if (!files.some((file) => file.path === 'index.html')) throw new Error('Falta index.html para el modo sin conexión');
      writeFileSync(resolve(outputDir, 'sw.js'), makeServiceWorker(files));
    },
  };
}

export default defineConfig({
  plugins: [react(), voiceRuntime(), offlineApp()],
  server: { host: '0.0.0.0', port: 5173, strictPort: false, allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
});
