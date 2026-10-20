'use strict';

/**
 * Conversión de los archivos que devuelven los sitios de subtítulos a algo que
 * Stremio pueda pintar: texto UTF-8 en formato SRT (o VTT).
 *
 * Los descargas reales llegan en .srt, .ass/.ssa, .vtt, .sub (MicroDVD) y, muy
 * a menudo, en Latin-1/CP1252 o UTF-16. Si servimos los bytes tal cual, el
 * reproductor muestra caracteres raros o directamente ignora el archivo.
 */

const SUBTITLE_EXTENSIONS = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'txt'];

function normalizeNewlines(text) {
  return String(text).replace(/\r\n?/g, '\n');
}

/** Decodifica bytes de subtítulo a UTF-8, detectando BOM y codificaciones viejas. */
function decodeSubtitleBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return '';
  const buf = buffer;

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return normalizeNewlines(buf.toString('utf8', 3));
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return normalizeNewlines(new TextDecoder('utf-16le').decode(buf.subarray(2)));
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    try {
      return normalizeNewlines(new TextDecoder('utf-16be').decode(buf.subarray(2)));
    } catch { /* sin ICU: seguimos abajo */ }
  }

  // UTF-8 estricto: si falla, casi siempre es CP1252/Latin-1 (muy común en
  // subtítulos en español antiguos).
  try {
    return normalizeNewlines(new TextDecoder('utf-8', { fatal: true }).decode(buf));
  } catch { /* no era UTF-8 */ }

  try {
    return normalizeNewlines(new TextDecoder('windows-1252').decode(buf));
  } catch {
    const latin1 = buf.toString('latin1');
    return normalizeNewlines(latin1);
  }
}

function extensionOf(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  return m ? m[1] : '';
}

function looksBinary(text) {
  if (!text) return true;
  if (text.includes('\u0000')) return true;
  // Una proporción alta de caracteres de control = no es un subtítulo de texto.
  let control = 0;
  for (let i = 0; i < Math.min(text.length, 2000); i += 1) {
    const code = text.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32)) control += 1;
  }
  return control > Math.min(40, text.length / 20);
}

function detectSubtitleFormat(name, text) {
  const ext = extensionOf(name);
  if (ext === 'ass' || ext === 'ssa') return 'ass';
  if (ext === 'vtt') return 'vtt';
  if (ext === 'srt') return 'srt';
  if (ext === 'sub') return 'microdvd';

  const head = String(text || '').slice(0, 4000);
  if (/^\uFEFF?WEBVTT/i.test(head)) return 'vtt';
  if (/\[Script Info\]/i.test(head) && /\[Events\]/i.test(head)) return 'ass';
  if (/^\s*\{\d+\}\{\d+\}/m.test(head)) return 'microdvd';
  if (/^\s*\d+\s*\n\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->/m.test(head)) return 'srt';
  if (/-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/.test(head)) return 'srt';
  return 'srt';
}

/* --------------------------------------------------------------- ASS / SSA */

function assTimeToSrt(value) {
  const m = String(value || '').trim().match(/^(\d+):(\d{2}):(\d{2})[.:](\d{1,3})$/);
  if (!m) return null;
  const ms = Number(m[4].padEnd(3, '0').slice(0, 3));
  return `${String(m[1]).padStart(2, '0')}:${m[2]}:${m[3]},${String(ms).padStart(3, '0')}`;
}

function cleanAssText(text) {
  return String(text || '')
    .replace(/\{[^}]*\}/g, '')      // {\an8}, {\pos(...)}, {\i1}…
    .replace(/\\N/gi, '\n')
    .replace(/\\n/gi, '\n')
    .replace(/\\h/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assToSrt(text) {
  const lines = normalizeNewlines(text).split('\n');
  const blocks = [];
  let inEvents = false;
  let formatFields = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^\[.*\]$/.test(line)) {
      inEvents = /^\[events\]$/i.test(line);
      continue;
    }
    if (!inEvents) continue;

    if (/^format\s*:/i.test(line)) {
      formatFields = line.slice(line.indexOf(':') + 1).split(',').map((f) => f.trim().toLowerCase());
      continue;
    }
    if (!/^dialogue\s*:/i.test(line)) continue;

    const payload = line.slice(line.indexOf(':') + 1).trim();
    const fields = formatFields || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
    const textIndex = fields.indexOf('text');
    const values = [];
    let rest = payload;
    const fieldCount = textIndex >= 0 ? textIndex : fields.length - 1;
    for (let i = 0; i < fieldCount; i += 1) {
      const comma = rest.indexOf(',');
      if (comma === -1) { values.push(rest); rest = ''; break; }
      values.push(rest.slice(0, comma));
      rest = rest.slice(comma + 1);
    }
    values.push(rest);

    const start = assTimeToSrt(values[fields.indexOf('start')]);
    const end = assTimeToSrt(values[fields.indexOf('end')]);
    const content = cleanAssText(textIndex >= 0 ? values[textIndex] : values[values.length - 1]);
    if (!start || !end || !content) continue;
    blocks.push(`${blocks.length + 1}\n${start} --> ${end}\n${content}`);
  }

  return blocks.join('\n\n') + (blocks.length ? '\n' : '');
}

/* --------------------------------------------------------------------- VTT */

function vttTimeToSrt(value) {
  const clean = String(value || '').trim().split(/\s+/)[0].replace('.', ',');
  const withHours = /^\d+:\d{2}:\d{2},\d{1,3}$/.test(clean) ? clean : `00:${clean}`;
  const m = withHours.match(/^(\d+):(\d{2}):(\d{2}),(\d{1,3})$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}:${m[3]},${m[4].padEnd(3, '0').slice(0, 3)}`;
}

function vttToSrt(text) {
  const normalized = normalizeNewlines(text).replace(/^\uFEFF/, '');
  const body = normalized.replace(/^WEBVTT[^\n]*\n+/, '');
  const blocks = body.split(/\n{2,}/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    const timeIndex = lines.findIndex((l) => /-->/.test(l));
    if (timeIndex === -1) continue;
    const [from, to] = lines[timeIndex].split('-->');
    const start = vttTimeToSrt(from);
    const end = vttTimeToSrt(to);
    const content = lines.slice(timeIndex + 1).join('\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .trim();
    if (!start || !end || !content) continue;
    out.push(`${out.length + 1}\n${start} --> ${end}\n${content}`);
  }
  return out.join('\n\n') + (out.length ? '\n' : '');
}

/* --------------------------------------------------------------- MicroDVD */

function framesToSrtTime(frames, fps) {
  const totalMs = Math.max(0, Math.round((Number(frames) / fps) * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function microDvdToSrt(text, fps = 23.976) {
  const out = [];
  for (const line of normalizeNewlines(text).split('\n')) {
    const m = line.match(/^\{(\d+)\}\{(\d+)\}(.*)$/);
    if (!m) continue;
    const content = m[3].replace(/\{[^}]*\}/g, '').replace(/\|/g, '\n').trim();
    if (!content) continue;
    out.push(`${out.length + 1}\n${framesToSrtTime(m[1], fps)} --> ${framesToSrtTime(m[2], fps)}\n${content}`);
  }
  return out.join('\n\n') + (out.length ? '\n' : '');
}

/* -------------------------------------------------------------- API pública */

/**
 * Convierte el contenido de un archivo de subtítulo a un texto que Stremio
 * entiende.
 * @returns {{text:string, ext:'srt'|'vtt', format:string}|null}
 */
function toStremioSubtitleText(buffer, name) {
  const text = decodeSubtitleBuffer(buffer);
  if (!text || looksBinary(text)) return null;

  const format = detectSubtitleFormat(name, text);
  let converted;
  if (format === 'ass') converted = assToSrt(text);
  else if (format === 'vtt') converted = vttToSrt(text);
  else if (format === 'microdvd') converted = microDvdToSrt(text);
  else converted = text;

  const clean = normalizeNewlines(converted).trim();
  if (!clean || looksBinary(clean)) return null;

  // ¿Quedó algo con pinta de subtítulo? Si el "srt" no tiene ni una flecha,
  // probablemente sea un HTML de error o un archivo vacío.
  if (!/-->/.test(clean) && !/^\s*\d+\s*$/m.test(clean)) return null;

  // Todo se entrega como SRT: es lo que Stremio reproduce de forma fiable.
  return { text: `${clean}\n`, ext: 'srt', format };
}

function scoreEntry(name) {
  const ext = extensionOf(name);
  const index = SUBTITLE_EXTENSIONS.indexOf(ext);
  if (index === -1) return -1;
  const base = 10 - index * 2;
  const macJunk = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/i.test(name) ? -20 : 0;
  return base + macJunk;
}

/**
 * Elige el mejor archivo de un zip. Si conocemos el release/episodio,
 * preferimos el que lo mencione (los packs de temporada traen varios).
 */
function pickSubtitleEntry(entries, { release, season, episode } = {}) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const wantedEpisode = episode !== undefined ? String(episode).padStart(2, '0') : null;
  const scored = entries
    .map((entry) => {
      let score = scoreEntry(entry.name);
      if (score < 0) return null;
      if (release) {
        const releaseWords = String(release).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3).slice(0, 6);
        const name = entry.name.toLowerCase();
        score += releaseWords.filter((w) => name.includes(w)).length * 2;
      }
      if (wantedEpisode && season !== undefined) {
        const s = String(season).padStart(2, '0');
        const patterns = [`s${s}e${wantedEpisode}`, `${season}x${wantedEpisode}`, `e${wantedEpisode}`];
        if (patterns.some((p) => entry.name.toLowerCase().includes(p))) score += 8;
      }
      return { entry, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].entry : null;
}

module.exports = {
  decodeSubtitleBuffer,
  detectSubtitleFormat,
  assToSrt,
  vttToSrt,
  microDvdToSrt,
  toStremioSubtitleText,
  pickSubtitleEntry,
  extensionOf,
  SUBTITLE_EXTENSIONS
};
