'use strict';

const zlib = require('node:zlib');

/**
 * Lector mínimo de archivos ZIP (sin dependencias).
 *
 * Los seis proveedores devuelven muchas veces un .zip (SubDL "Quick Download",
 * YTS-Subs, SubSource, Subscene, IndexSubtitle…). Stremio NO sabe abrir un zip:
 * necesita el texto del subtítulo. Aquí extraemos las entradas en memoria para
 * que /sub/{token} pueda servir el .srt real.
 *
 * Soporta el caso normal: método 0 (store) y 8 (deflate). No soporta ZIP64,
 * cifrado, ni métodos exóticos; en esos casos devuelve [] y el proxy responde
 * con un error claro en vez de entregar basura.
 */

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

function isZip(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06);
}

function findEocd(buffer) {
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

function safeName(raw) {
  return String(raw || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * @param {Buffer} buffer contenido del zip
 * @param {{maxBytes?:number, maxEntries?:number}} [options]
 * @returns {Array<{name:string, data:Buffer}>}
 */
function extractZip(buffer, options = {}) {
  const maxBytes = options.maxBytes || 60 * 1024 * 1024;
  const maxEntries = options.maxEntries || 200;
  if (!isZip(buffer)) return [];

  const eocd = findEocd(buffer);
  if (eocd < 0) return [];

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0 || entryCount > maxEntries || centralOffset >= buffer.length) return [];

  const entries = [];
  let pointer = centralOffset;
  let totalOut = 0;

  for (let i = 0; i < entryCount && pointer + 46 <= buffer.length; i += 1) {
    if (buffer.readUInt32LE(pointer) !== CENTRAL_SIG) break;
    const flags = buffer.readUInt16LE(pointer + 8);
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const uncompressedSize = buffer.readUInt32LE(pointer + 24);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = safeName(buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength));

    pointer += 46 + nameLength + extraLength + commentLength;

    if (!name || name.endsWith('/') || flags & 0x1) continue; // directorio o cifrado
    if (localOffset + 30 > buffer.length) continue;
    if (buffer.readUInt32LE(localOffset) !== LOCAL_SIG) continue;

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataStart >= buffer.length || dataEnd > buffer.length) continue;

    const raw = buffer.subarray(dataStart, dataEnd);
    let data;
    try {
      if (method === 0) data = Buffer.from(raw);
      else if (method === 8) data = zlib.inflateRawSync(raw, { maxOutputLength: maxBytes });
      else continue;
    } catch {
      continue;
    }

    if (uncompressedSize && data.length > uncompressedSize * 4 + 1024) continue;
    totalOut += data.length;
    if (totalOut > maxBytes) break;
    entries.push({ name, data });
  }

  return entries;
}

module.exports = { isZip, extractZip };
