'use strict';

const axios = require('axios');
const config = require('../config');

// Una sola instancia compartida: timeout corto y User-Agent de navegador.
// OJO: varios de estos sitios usan Cloudflare; si una petición devuelve
// 403/503 con HTML de "challenge", ese proveedor simplemente devolverá []
// (ver el manejo de errores en cada provider y en el agregador).
const http = axios.create({
  timeout: config.providerTimeoutMs,
  maxRedirects: 5,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
  },
  validateStatus: (status) => status >= 200 && status < 300
});

module.exports = http;
