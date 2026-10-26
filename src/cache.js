/**
 * src/cache.js — Caché en memoria con TTL y tamaño máximo.
 *
 * Render Free duerme el servicio y solo hay una instancia, así que un Map
 * basta: no hay que añadir Redis ni ninguna dependencia. Guarda solo listas
 * de reproductores (y URLs de video ya resueltas), nunca respuestas de error.
 */

export class TtlCache {
  constructor({ ttlSeconds = 900, maxEntries = 500 } = {}) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    // Reinsertar para mantener el orden de "menos usado primero".
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = null) {
    if (value === undefined || value === null) return value;
    const ttl = (ttlSeconds == null ? this.ttlMs : ttlSeconds * 1000) || 0;
    if (ttl <= 0) return value;
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + ttl });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
    return value;
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

export const pageCache = new TtlCache({ ttlSeconds: 900, maxEntries: 400 });
export const mediaCache = new TtlCache({ ttlSeconds: 240, maxEntries: 800 });
export const metaCache = new TtlCache({ ttlSeconds: 86400, maxEntries: 500 });
