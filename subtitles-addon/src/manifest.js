'use strict';

// manifest.json es la fuente de verdad y también sirve como documentación.
// El SDK lo publica automáticamente en GET /manifest.json a través de getRouter().
const manifest = require('../manifest.json');

module.exports = manifest;
