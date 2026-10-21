'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
const languages = {
  ES: 'Español', EN: 'Inglés', PT: 'Portugués', FR: 'Francés', DE: 'Alemán',
  IT: 'Italiano', JA: 'Japonés', KO: 'Coreano', ZH: 'Chino', AR: 'Árabe',
  RU: 'Ruso', TR: 'Turco', PL: 'Polaco', NL: 'Neerlandés', HI: 'Hindi',
  ID: 'Indonesio', VI: 'Vietnamita', TH: 'Tailandés', UK: 'Ucraniano',
  EL: 'Griego', HE: 'Hebreo', RO: 'Rumano', CS: 'Checo', HU: 'Húngaro',
  SV: 'Sueco', DA: 'Danés', NO: 'Noruego', FI: 'Finés'
};

function parsePreferences(value) {
  if (typeof value !== 'string' || value.length > 300) throw new Error('Configuración inválida');
  const params = new URLSearchParams(value);
  if ([...params.keys()].some(k => !['languages', 'only'].includes(k)) ||
      params.getAll('languages').length !== 1 || params.getAll('only').length !== 1) {
    throw new Error('Configuración inválida');
  }
  const selected = [...new Set(params.get('languages').split(',').map(x => x.toUpperCase()))];
  if (!selected.length || selected.length > 8 || selected.some(x => !Object.hasOwn(languages, x)) ||
      !['true', 'false'].includes(params.get('only'))) throw new Error('Selecciona entre 1 y 8 idiomas válidos');
  return { languages: selected, languagesOnly: params.get('only') === 'true' };
}

module.exports = { context, languages, parsePreferences };
