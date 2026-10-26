/**
 * src/sources.js — Las webs de las que se sacan los streams.
 *
 * Cada fuente sabe buscar el título y devolver sus reproductores:
 *   { id, label, findMovie(wanted, ctx), findEpisode(wanted, ctx) }
 *
 * Se consultan todas a la vez y los streams se mezclan en la respuesta, así
 * que si una web está caída o no tiene el título, la otra sigue sirviendo.
 */

import * as gnula from './gnula.js';
import * as gnulahd from './gnulahd.js';

export const SOURCES = [
  {
    id: 'gnula',
    label: 'Gnula',
    findMovie: gnula.findMovie,
    findEpisode: gnula.findEpisode
  },
  {
    id: 'gnulahd',
    label: 'GnulaHD',
    findMovie: gnulahd.findMovie,
    findEpisode: gnulahd.findEpisode
  }
];

export const SOURCE_LABELS = SOURCES.reduce((acc, source) => {
  acc[source.id] = source.label;
  return acc;
}, {});

export function sourceLabel(id) {
  return SOURCE_LABELS[id] || 'Gnula';
}
