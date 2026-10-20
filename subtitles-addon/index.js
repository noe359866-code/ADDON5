'use strict';

require('dotenv').config();

const express = require('express');
const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('./src/addon');
const config = require('./src/config');

const app = express();

// Monta las rutas del protocolo Stremio (/manifest.json, /subtitles/...).
// ¿Para qué Express si el SDK trae serveHTTP()? Para poder añadir rutas
// propias: /health hoy, y mañana el endpoint /download que descomprima los
// .zip de SubDL/SubSource y sirva el .srt (ver README > Siguientes pasos).
app.use(getRouter(addonInterface));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', addon: addonInterface.manifest.id });
});

app.get('/', (req, res) => {
  res.type('text/plain').send(
    `${addonInterface.manifest.name} — instala en Stremio la URL que termina en /manifest.json`
  );
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`ADDON5 Subtitles escuchando en http://localhost:${config.port}/manifest.json`);
});
