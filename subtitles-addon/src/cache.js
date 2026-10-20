'use strict';

// Caché en memoria con TTL. Stremio pide los subtítulos cada vez que el usuario
// abre el selector; sin caché repetiríamos el scraping/API en cada petición.
class TtlCache {
  constructor(ttlSeconds) {
    this.ttlMs = ttlSeconds * 1000;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Devuelve la entrada aunque haya caducado: { value, stale } o undefined.
   * Sirve para responder al instante con lo último bueno y refrescar detrás.
   */
  peek(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    return { value: entry.value, stale: Date.now() > entry.expiresAt };
  }

  set(key, value, ttlSeconds) {
    const ttl = ttlSeconds === undefined ? this.ttlMs : ttlSeconds * 1000;
    if (!Number.isFinite(ttl) || ttl <= 0) return;
    if (this.store.size > 2000) this.store.clear();
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  delete(key) {
    this.store.delete(key);
  }
}

module.exports = TtlCache;
