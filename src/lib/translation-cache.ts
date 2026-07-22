/**
 * Simple in-memory bounded LRU cache for translation results.
 *
 * Mirrors src/lib/rate-limit.ts's Map-based, module-scope-singleton,
 * single-server-deployment convention: a Map preserves insertion order, so
 * a delete+re-set on every get/set gives cheap LRU semantics (the oldest
 * key is always `store.keys().next().value`). Suitable for single-server
 * deployment; for horizontal scaling, replace with a shared cache
 * (Redis, etc).
 *
 * Cache key is `sourceLang:targetLang:text` — built only from
 * already-RequestSchema-validated inputs (bounded length, enum langs), so
 * there is no attacker-controllable unvalidated key surface (ASVS V5 /
 * T-27-06-01).
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export function createTranslationCache(opts: {
  maxSize: number;
  ttlMs: number;
}) {
  const store = new Map<string, CacheEntry>();

  function makeKey(text: string, sourceLang: string, targetLang: string) {
    return `${sourceLang}:${targetLang}:${text}`;
  }

  return {
    /**
     * Returns the cached translation, or undefined on a miss (never
     * cached, or expired).
     */
    get(
      text: string,
      sourceLang: string,
      targetLang: string,
    ): string | undefined {
      const key = makeKey(text, sourceLang, targetLang);
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return undefined;
      }
      // Bump to most-recently-used (Map preserves insertion order).
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },

    set(
      text: string,
      sourceLang: string,
      targetLang: string,
      value: string,
    ): void {
      const key = makeKey(text, sourceLang, targetLang);
      store.delete(key);
      if (store.size >= opts.maxSize) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, expiresAt: Date.now() + opts.ttlMs });
    },
  };
}
