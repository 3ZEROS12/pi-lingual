/**
 * In-Memory LRU Cache for Lingual Translations (会话级 0 依赖极速缓存)
 * 
 * 开发者在与 AI 对话时存在大量高频短语（如“继续”、“可以”、“同意”、“开始吧”、“继续推进”）。
 * 基于 ES6 Map 实现轻量高效的 LRU 缓存（默认容量 50 条）。
 * 命中缓存后 0ms 瞬间直出，零外部调用，零 Token 损耗。
 */

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  capacity: number;
}

export class LingualLruCache<T> {
  private cache = new Map<string, T>();
  private hits = 0;
  private misses = 0;

  constructor(public readonly capacity: number = 50) {}

  /**
   * 生成标准化缓存键（结合源语言与目标语言）
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
    // 刷新热度：删除后重新插入末尾
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: string, val: T): void {
    // 内存安全防护：超长键 (如粘入整篇论文 > 256 字符) 不做缓存，防止内存膨胀
    if (!key || key.length > 256) {
      return;
    }
    // 内存安全防护：超大载荷 (> 2048 字符) 不做缓存
    if (typeof val === "string" && val.length > 2048) {
      return;
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 淘汰最久未访问的首个键
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
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
