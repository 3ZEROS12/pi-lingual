/**
 * In-Memory LRU Cache for Lingual Translations (Zero-Dependency In-Process Cache)
 * 
 * High-frequency developer phrases ("continue", "agree", "proceed", "sounds good")
 * are served with 0ms latency from an in-memory LRU cache (default capacity: 50 entries).
 * Cache hits consume zero network round-trips and zero model tokens.
 */

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  capacity: number;
}

export class LingualLruCache<T> {
  private cache = new Map<string, T>();
  private candidatesCache = new Map<string, any[]>();
  private hits = 0;
  private misses = 0;

  constructor(public readonly capacity: number = 50) {}

  /**
   * Generates a normalized cache key incorporating language pairs and slot signature.
   */
  static buildKey(text: string, sourceLang = "en", targetLang = "ja", slotSignature?: string): string {
    const sig = slotSignature ? `[${slotSignature}]` : "";
    return `${sourceLang}➔${targetLang}${sig}:${text.trim()}`;
  }

  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    const val = this.cache.get(key)!;
    // Refresh LRU recency: re-insert at end of Map
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: string, val: T): void {
    // Memory safety guard: do not cache excessively long keys (> 256 chars)
    if (!key || key.length > 256) {
      return;
    }
    // Memory safety guard: do not cache oversized payloads (> 2048 chars)
    if (typeof val === "string" && val.length > 2048) {
      return;
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently accessed key
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }

  getCandidates<C = any>(key: string): C[] | undefined {
    if (!this.candidatesCache.has(key)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    const val = this.candidatesCache.get(key)!;
    // Refresh LRU recency
    this.candidatesCache.delete(key);
    this.candidatesCache.set(key, val);
    return val as C[];
  }

  setCandidates<C = any>(key: string, candidates: C[]): void {
    if (!key || key.length > 256) {
      return;
    }
    if (this.candidatesCache.has(key)) {
      this.candidatesCache.delete(key);
    } else if (this.candidatesCache.size >= this.capacity) {
      const oldestKey = this.candidatesCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.candidatesCache.delete(oldestKey);
      }
    }
    this.candidatesCache.set(key, candidates);
  }

  has(key: string): boolean {
    return this.cache.has(key) || this.candidatesCache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.candidatesCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      capacity: this.capacity,
    };
  }
}

export const LinguaLruCache = LingualLruCache;
export const globalLingualCache = new LingualLruCache<any>(50);
export const globalLinguaCache = globalLingualCache;
