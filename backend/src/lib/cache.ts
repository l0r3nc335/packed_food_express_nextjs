type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Tiny in-process TTL cache. Open Food Facts rate-limits aggressively, and
 * repeated searches for the same term are common while clicking around the UI.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      return undefined;
    }

    return entry.value;
  }

  /**
   * Returns an expired value if one is still held. Used as a fallback when the
   * upstream service is unavailable: stale data beats an error page.
   */
  getStale(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }

    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
