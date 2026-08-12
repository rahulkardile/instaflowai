/**
 * In-process TTL cache
 * Zero-dependency Map-based cache with:
 *  - Automatic expiry (lazy eviction + optional sweep)
 *  - Type-safe get/set
 *  - Prefix-based bulk invalidation
 *  - Cache stats
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

// ─── TTL constants (milliseconds) ─────────────────────────────────────────
export const CACHE_TTL = {
  USER:          60_000,   // 60 s  — auth middleware user lookup
  IG_ACCOUNT:    120_000,  // 2 min — Instagram account per user
  AUTOMATIONS:   30_000,   // 30 s  — automation list per user
  ADMIN_STATS:   30_000,   // 30 s  — admin dashboard aggregates
  ADMIN_DAU:     60_000,   // 60 s  — daily active users chart
  ADMIN_USERS:   15_000,   // 15 s  — admin user list
} as const;

// ─── Cache key prefixes ────────────────────────────────────────────────────
export const CACHE_KEY = {
  USER:       (id: string) => `user:${id}`,
  IG_ACCOUNT: (userId: string) => `ig_account:${userId}`,
  AUTOMATIONS:(userId: string) => `automations:${userId}`,
  ADMIN_STATS: "admin:stats",
  ADMIN_DAU:   "admin:dau",
} as const;

class InProcessCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  // ── Periodic sweep every 5 minutes to evict expired keys ──────────────
  constructor() {
    setInterval(() => this.sweep(), 5 * 60_000).unref();
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  /** Delete all keys that start with the given prefix */
  delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Flush ALL entries (e.g. on graceful shutdown or forced reset) */
  flush(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats() {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(1)}%`
        : "N/A",
    };
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// Singleton instance shared across the entire process
export const cache = new InProcessCache();
