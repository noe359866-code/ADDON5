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

  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

module.exports = TtlCache;
