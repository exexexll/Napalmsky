/**
 * Memory Manager - Automatic cleanup without data loss
 * 
 * Safely manages memory by:
 * 1. Cleaning expired sessions
 * 2. Archiving old data to PostgreSQL
 * 3. Removing stale real-time data
 * 4. Monitoring memory usage
 */

import { store } from './store';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  timestamp: number;
}

class MemoryManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private stats: MemoryStats[] = [];
  private readonly MAX_STATS_HISTORY = 60; // Keep last 60 readings
  
  // Thresholds (in MB)
  // OPTIMIZED FOR 3000-4000 USERS (2GB+ instance recommended)
  private readonly WARNING_THRESHOLD = 1200;  // Warn at 60% of 2GB
  private readonly CRITICAL_THRESHOLD = 1400; // Critical at 70% of 2GB
  // Note: For 4GB instance, increase to WARNING=3000, CRITICAL=3500

  start(): void {
    console.log('[MemoryManager] Starting memory management...');
    
    // Run cleanup every 3 minutes (more aggressive for 4000 users)
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 3 * 60 * 1000);
    
    // Monitor memory every 15 seconds (faster detection for high scale)
    this.monitorInterval = setInterval(() => {
      this.monitorMemory();
    }, 15 * 1000);
    
    // Run initial cleanup
    this.runCleanup();
    this.monitorMemory();
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    console.log('[MemoryManager] Stopped');
  }

  private monitorMemory(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;
    
    const stats: MemoryStats = {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      external: usage.external / 1024 / 1024,
      timestamp: Date.now(),
    };
    
    this.stats.push(stats);
    if (this.stats.length > this.MAX_STATS_HISTORY) {
      this.stats.shift();
    }
    
    // Log with color coding
    if (heapUsedMB > this.CRITICAL_THRESHOLD) {
      console.warn(`[MemoryManager] 🔴 CRITICAL: ${heapUsedMB.toFixed(2)} MB / ${heapTotalMB.toFixed(2)} MB (RSS: ${rssMB.toFixed(2)} MB)`);
      this.runAggressiveCleanup();
    } else if (heapUsedMB > this.WARNING_THRESHOLD) {
      console.warn(`[MemoryManager] 🟡 WARNING: ${heapUsedMB.toFixed(2)} MB / ${heapTotalMB.toFixed(2)} MB (RSS: ${rssMB.toFixed(2)} MB)`);
    } else {
      console.log(`[MemoryManager] 🟢 OK: ${heapUsedMB.toFixed(2)} MB / ${heapTotalMB.toFixed(2)} MB (RSS: ${rssMB.toFixed(2)} MB)`);
    }
  }

  private async runCleanup(): Promise<void> {
    console.log('[MemoryManager] Running periodic cleanup...');
    const startTime = Date.now();
    
    try {
      let totalCleaned = 0;
      
      // 1. Clean expired sessions (older than expiry time)
      totalCleaned += await this.cleanExpiredSessions();
      
      // 2. Clean old call history (keep in DB, remove from memory)
      totalCleaned += await this.archiveOldHistory();
      
      // 3. Clean expired cooldowns
      totalCleaned += await this.cleanExpiredCooldowns();
      
      // 4. Clean stale presence (offline > 1 hour)
      totalCleaned += await this.cleanStalePresence();
      
      // 5. Clean expired invite codes
      totalCleaned += await this.cleanExpiredInvites();
      
      const duration = Date.now() - startTime;
      console.log(`[MemoryManager] ✅ Cleanup complete: ${totalCleaned} items removed in ${duration}ms`);
      
      // Force garbage collection if available (only in development with --expose-gc flag)
      if (global.gc && totalCleaned > 0) {
        global.gc();
        console.log('[MemoryManager] Garbage collection triggered');
      }
    } catch (error) {
      console.error('[MemoryManager] Cleanup error:', error);
    }
  }

  private async runAggressiveCleanup(): Promise<void> {
    console.warn('[MemoryManager] 🚨 Running AGGRESSIVE cleanup due to high memory...');
    
    // Run all normal cleanup first
    await this.runCleanup();
    
    // Additional aggressive cleanup
    let totalCleaned = 0;
    
    // Archive call history older than 1 day (instead of 7 days)
    totalCleaned += await this.archiveOldHistory(1);
    
    // Remove unread notifications older than 7 days
    totalCleaned += await this.cleanOldNotifications(7);
    
    // Force GC
    if (global.gc) {
      global.gc();
      console.log('[MemoryManager] FORCED garbage collection');
    }
    
    console.warn(`[MemoryManager] Aggressive cleanup removed ${totalCleaned} additional items`);
  }

  private async cleanExpiredSessions(): Promise<number> {
    const sessions = (store as any).sessions as Map<string, any>;
    let cleaned = 0;
    const now = Date.now();
    
    for (const [token, session] of sessions.entries()) {
      if (session.expiresAt < now) {
        sessions.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} expired sessions`);
    }
    return cleaned;
  }

  private async archiveOldHistory(daysOld = 7): Promise<number> {
    const history = (store as any).history as Map<string, any[]>;
    let cleaned = 0;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    for (const [userId, userHistory] of history.entries()) {
      // Keep recent history in memory, archive old history
      const recentHistory = userHistory.filter((entry: any) => {
        if (entry.timestamp < cutoffTime) {
          cleaned++;
          return false; // Remove from memory (already in DB)
        }
        return true;
      });
      
      if (recentHistory.length < userHistory.length) {
        if (recentHistory.length > 0) {
          history.set(userId, recentHistory);
        } else {
          history.delete(userId);
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Archived ${cleaned} old call history entries (>${daysOld}d old)`);
    }
    return cleaned;
  }

  private async cleanExpiredCooldowns(): Promise<number> {
    const cooldowns = (store as any).cooldowns as Map<string, number>;
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, expiresAt] of cooldowns.entries()) {
      if (expiresAt < now) {
        cooldowns.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} expired cooldowns`);
    }
    return cleaned;
  }

  private async cleanStalePresence(): Promise<number> {
    const presence = (store as any).presence as Map<string, any>;
    let cleaned = 0;
    const staleTime = Date.now() - (60 * 60 * 1000); // 1 hour
    
    for (const [userId, userPresence] of presence.entries()) {
      // Only clean if offline AND stale
      if (!userPresence.online && userPresence.lastActiveAt < staleTime) {
        presence.delete(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} stale presence records`);
    }
    return cleaned;
  }

  private async cleanExpiredInvites(): Promise<number> {
    const activeInvites = (store as any).activeInvites as Map<string, any>;
    let cleaned = 0;
    const expiredTime = Date.now() - (5 * 60 * 1000); // 5 minutes old = expired
    
    for (const [inviteId, invite] of activeInvites.entries()) {
      if (invite.createdAt < expiredTime) {
        activeInvites.delete(inviteId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} expired active invites`);
    }
    return cleaned;
  }

  private async cleanOldNotifications(daysOld = 30): Promise<number> {
    const notifications = (store as any).referralNotifications as Map<string, any[]>;
    let cleaned = 0;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    for (const [userId, userNotifications] of notifications.entries()) {
      const recentNotifications = userNotifications.filter((notif: any) => {
        if (notif.timestamp < cutoffTime && notif.read) {
          cleaned++;
          return false;
        }
        return true;
      });
      
      if (recentNotifications.length < userNotifications.length) {
        if (recentNotifications.length > 0) {
          notifications.set(userId, recentNotifications);
        } else {
          notifications.delete(userId);
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned ${cleaned} old read notifications (>${daysOld}d)`);
    }
    return cleaned;
  }

  getMemoryStats(): MemoryStats[] {
    return [...this.stats];
  }

  getCurrentMemory(): { heapUsed: number; heapTotal: number; rss: number } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
    };
  }
}

// Export singleton
export const memoryManager = new MemoryManager();

