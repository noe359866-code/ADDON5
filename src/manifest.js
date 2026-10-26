/**
 * src/manifest.js — Manifest del addon.
 *
 * Un único recurso: `stream`. Sin catálogos, sin metadatos y sin subtítulos:
 * Stremio solo consulta este addon cuando la persona abre una película o un
 * episodio y pulsa reproducir.
 */

import { config } from './config.js';

export const manifest = {
  id: 'org.addon5.gnula',
  version: config.addonVersion,
  name: config.addonName,
  description:
    'Streams en español de Gnula para películas y series. Elige un servidor y reproduce dentro de Stremio.',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: {
    configurable: false,
    configurationRequired: false
  }
};

export function getManifest() {
  return { ...manifest, resources: [...manifest.resources], types: [...manifest.types] };
}
