/**
 * LRU (Least Recently Used) Cache
 * 
 * Critical for scaling to 1000+ users:
 * - Only keeps most recently accessed data in memory
 * - Auto-evicts old data when limit reached
 * - PostgreSQL as source of truth
 * 
 * Memory impact:
 * - WITHOUT LRU: 1000 users × 5KB = 5 MB (all cached)
 * - WITH LRU (200 limit): 200 users × 5KB = 1 MB (80% reduction)
 */

interface CacheEntry<T> {
  value: T;
  lastAccess: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
    console.log(`[LRUCache] Initialized with max size: ${maxSize}`);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update access time
      entry.lastAccess = Date.now();
      this.hits++;
      return entry.value;
    }
    
    this.misses++;
    return undefined;
  }

  set(key: string, value: T): void {
    // If at capacity, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      lastAccess: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[LRUCache] Evicted LRU entry: ${oldestKey.substring(0, 16)}...`);
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; maxSize: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  // Cleanup entries older than TTL
  cleanup(ttlMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - ttlMs;
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < cutoff) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[LRUCache] Cleaned ${cleaned} stale entries (TTL: ${ttlMs}ms)`);
    }

    return cleaned;
  }
}

/**
 * Optimized User Cache
 * - Stores lightweight user objects (not full User type)
 * - Strips heavy fields (socials, referrals, history)
 */

export interface LightweightUser {
  userId: string;
  name: string;
  gender: string;
  selfieUrl?: string;
  videoUrl?: string;
  accountType: string;
  paidStatus?: string;
  banStatus?: string;
  // Heavy fields removed: socials, referrals, lastSessions, etc.
}

export class OptimizedUserCache {
  private cache: LRUCache<LightweightUser>;

  constructor(maxSize: number = 200) {
    this.cache = new LRUCache<LightweightUser>(maxSize);
  }

  // Convert full User to lightweight version
  static toLightweight(user: any): LightweightUser {
    return {
      userId: user.userId,
      name: user.name,
      gender: user.gender,
      selfieUrl: user.selfieUrl,
      videoUrl: user.videoUrl,
      accountType: user.accountType,
      paidStatus: user.paidStatus,
      banStatus: user.banStatus,
      // Omit: socials, referrals, password_hash, email, lastSessions, etc.
    };
  }

  get(userId: string): LightweightUser | undefined {
    return this.cache.get(userId);
  }

  set(userId: string, user: any): void {
    const lightweight = OptimizedUserCache.toLightweight(user);
    this.cache.set(userId, lightweight);
  }

  has(userId: string): boolean {
    return this.cache.has(userId);
  }

  delete(userId: string): boolean {
    return this.cache.delete(userId);
  }

  getStats() {
    return this.cache.getStats();
  }

  cleanup(ttlMs?: number): number {
    return this.cache.cleanup(ttlMs);
  }
}

// Export singleton for global use
export const userCache = new OptimizedUserCache(200); // Max 200 users in memory
export const sessionCache = new LRUCache<any>(300); // Max 300 active sessions in memory

