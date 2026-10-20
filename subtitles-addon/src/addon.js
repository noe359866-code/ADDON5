'use strict';

/**
 * Compatibilidad histórica.
 *
 * El builder y el defineSubtitlesHandler viven en el archivo principal
 * (../index.js), que es el punto de entrada del addon. Este módulo solo
 * reexporta la interfaz ya construida para quien la importaba desde aquí
 * (p.ej. los tests). Requerir ../index NO arranca el servidor: index.js
 * solo hace listen() cuando es el módulo principal.
 */
module.exports = require('../index').addonInterface;
