/**
 * index.js — Punto de entrada del addon de Stremio «Gnula Streams».
 *
 * Un solo addon, un solo recurso: `stream`. Se instala en Stremio con
 *   https://<tu-servicio>/manifest.json
 *
 * Arranca con:
 *   npm start                 (usa PORT o 7000)
 *   DEBUG=true npm start      (logs de scraping)
 */

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from './src/config.js';
import { manifest } from './src/manifest.js';
import { createServerInstance } from './src/server.js';

export function start(port = config.port) {
  const server = createServerInstance();
  server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    const realPort = address && typeof address === 'object' ? address.port : port;
    console.log(`${manifest.name} v${manifest.version} escuchando en 0.0.0.0:${realPort}`);
    console.log(`Manifest: http://localhost:${realPort}/manifest.json`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  start();
}

export { manifest, config };
