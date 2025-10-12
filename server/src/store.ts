import { User, Session, ReferralNotification, Report, BanRecord, IPBan, InviteCode, RateLimitRecord } from './types';

interface ChatMessage {
  from: string;
  text: string;
  timestamp: number;
  type: 'message' | 'social';
  socials?: any;
}

interface ChatHistory {
  sessionId: string;
  roomId: string;
  partnerId: string;
  partnerName: string;
  startedAt: number;
  duration: number;
  messages: ChatMessage[];
}

/**
 * In-memory data store for demo purposes.
 * ⚠️ Data will be lost on server restart.
 * Cloud-ready seam: Replace with PostgreSQL/MongoDB for production.
 */
interface Presence {
  socketId: string;
  online: boolean;
  available: boolean;
  lastActiveAt: number;
}

interface ActiveInvite {
  inviteId: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
  callerSeconds: number;
}

interface ReferralMapping {
  targetUserId: string;
  targetName: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: number;
}

class DataStore {
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private history = new Map<string, ChatHistory[]>(); // userId -> history[]
  private timerTotals = new Map<string, number>(); // userId -> cumulative seconds
  private presence = new Map<string, Presence>(); // userId -> presence
  private cooldowns = new Map<string, number>(); // "userId1|userId2" -> expiresAt
  private activeInvites = new Map<string, ActiveInvite>(); // inviteId -> invite
  private seenInSession = new Map<string, Set<string>>(); // sessionId -> Set<userIds>
  private referralNotifications = new Map<string, ReferralNotification[]>(); // userId -> notifications[]
  private referralMappings = new Map<string, ReferralMapping>(); // code -> {targetUserId, createdByUserId, ...}
  
  // Blacklist & Reporting system
  private reports = new Map<string, Report>(); // reportId -> Report
  private userReports = new Map<string, Set<string>>(); // reportedUserId -> Set<reportId>
  private reporterHistory = new Map<string, Set<string>>(); // reporterUserId -> Set<reportedUserId> (tracks who reported whom)
  private banRecords = new Map<string, BanRecord>(); // userId -> BanRecord
  private ipBans = new Map<string, IPBan>(); // ipAddress -> IPBan
  private userIps = new Map<string, Set<string>>(); // userId -> Set<ipAddresses>
  
  // Paywall & Invite Code system
  private inviteCodes = new Map<string, InviteCode>(); // code -> InviteCode
  private rateLimits = new Map<string, RateLimitRecord>(); // ipAddress -> RateLimitRecord

  // User operations
  createUser(user: User): void {
    this.users.set(user.userId, user);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  updateUser(userId: string, updates: Partial<User>): void {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, ...updates });
    }
  }

  // Session operations
  createSession(session: Session): void {
    this.sessions.set(session.sessionToken, session);
  }

  getSession(sessionToken: string): Session | undefined {
    const session = this.sessions.get(sessionToken);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    // Auto-cleanup expired sessions
    if (session) {
      this.sessions.delete(sessionToken);
    }
    return undefined;
  }

  deleteSession(sessionToken: string): void {
    this.sessions.delete(sessionToken);
  }

  // History operations
  addHistory(userId: string, history: ChatHistory): void {
    const userHistory = this.history.get(userId) || [];
    userHistory.push(history);
    this.history.set(userId, userHistory);
  }

  getHistory(userId: string): ChatHistory[] {
    return this.history.get(userId) || [];
  }

  // Timer operations (legacy - now using user.timerTotalSeconds)
  addToTimer(userId: string, seconds: number): void {
    const current = this.timerTotals.get(userId) || 0;
    this.timerTotals.set(userId, current + seconds);
    
    // Also update user metrics
    const user = this.getUser(userId);
    if (user) {
      const timerTotal = (user.timerTotalSeconds || 0) + seconds;
      const sessionCount = (user.sessionCount || 0) + 1;
      const lastSessions = user.lastSessions || [];
      
      // Add new session to lastSessions (cap at 10)
      lastSessions.push({ at: Date.now(), duration: seconds });
      if (lastSessions.length > 10) {
        lastSessions.shift();
      }

      this.updateUser(userId, {
        timerTotalSeconds: timerTotal,
        sessionCount,
        lastSessions,
      });
    }
  }

  getTimerTotal(userId: string): number {
    return this.timerTotals.get(userId) || 0;
  }

  // Presence operations
  setPresence(userId: string, presence: Presence): void {
    this.presence.set(userId, presence);
  }

  getPresence(userId: string): Presence | undefined {
    return this.presence.get(userId);
  }

  updatePresence(userId: string, updates: Partial<Presence>): void {
    const current = this.presence.get(userId);
    if (current) {
      const updated = { ...current, ...updates };
      this.presence.set(userId, updated);
      console.log(`[Store] Presence updated for ${userId.substring(0, 8)}: online=${updated.online}, available=${updated.available}`);
    } else {
      console.warn(`[Store] Cannot update presence for ${userId.substring(0, 8)} - not found`);
    }
  }

  getAllOnlineAvailable(excludeUserId?: string): string[] {
    const allPresence = Array.from(this.presence.entries());
    
    // Debug: Log all presence states
    console.log(`[Store] getAllOnlineAvailable called - Total presence entries: ${allPresence.length}`);
    allPresence.forEach(([uid, p]) => {
      const user = this.getUser(uid);
      const isExcluded = uid === excludeUserId;
      const isIncluded = p.online && p.available && !isExcluded;
      console.log(`[Store]   ${user?.name || 'Unknown'} (${uid.substring(0, 8)}): online=${p.online}, available=${p.available}, excluded=${isExcluded} → ${isIncluded ? '✅ INCLUDED' : '❌ FILTERED'}`);
    });
    
    const available = allPresence
      .filter(([uid, p]) => p.online && p.available && uid !== excludeUserId)
      .map(([uid]) => uid);
    
    console.log(`[Store] getAllOnlineAvailable result: ${available.length} users`);
    return available;
  }

  // Cooldown operations
  
  /**
   * Generate consistent cooldown key for any pair of users
   * Always returns same key regardless of parameter order
   */
  private getCooldownKey(userId1: string, userId2: string): string {
    // Lexicographic comparison ensures consistent ordering
    // Works correctly for UUIDs and any string-based IDs
    return userId1 < userId2 
      ? `${userId1}|${userId2}`
      : `${userId2}|${userId1}`;
  }

  setCooldown(userId1: string, userId2: string, expiresAt: number): void {
    const key = this.getCooldownKey(userId1, userId2);
    this.cooldowns.set(key, expiresAt);
  }

  hasCooldown(userId1: string, userId2: string): boolean {
    const key = this.getCooldownKey(userId1, userId2);
    const expires = this.cooldowns.get(key);
    if (expires && expires > Date.now()) {
      const hoursLeft = Math.floor((expires - Date.now()) / (1000 * 60 * 60));
      const minutesLeft = Math.floor(((expires - Date.now()) % (1000 * 60 * 60)) / (1000 * 60));
      console.log(`[Store] 🚫 Cooldown active: ${userId1.substring(0, 8)} ↔ ${userId2.substring(0, 8)} - ${hoursLeft}h ${minutesLeft}m remaining`);
      return true;
    }
    if (expires) {
      console.log(`[Store] ✅ Cooldown expired, removing: ${userId1.substring(0, 8)} ↔ ${userId2.substring(0, 8)}`);
      this.cooldowns.delete(key);
    }
    return false;
  }

  getCooldownExpiry(userId1: string, userId2: string): number | null {
    const key = this.getCooldownKey(userId1, userId2);
    const expires = this.cooldowns.get(key);
    if (expires && expires > Date.now()) {
      return expires;
    }
    return null;
  }

  // Active invite operations
  createInvite(invite: ActiveInvite): void {
    this.activeInvites.set(invite.inviteId, invite);
  }

  getInvite(inviteId: string): ActiveInvite | undefined {
    return this.activeInvites.get(inviteId);
  }

  deleteInvite(inviteId: string): void {
    this.activeInvites.delete(inviteId);
  }

  // Seen tracking for reel
  addSeen(sessionId: string, userId: string): void {
    if (!this.seenInSession.has(sessionId)) {
      this.seenInSession.set(sessionId, new Set());
    }
    this.seenInSession.get(sessionId)!.add(userId);
  }

  getSeen(sessionId: string): Set<string> {
    return this.seenInSession.get(sessionId) || new Set();
  }

  clearSeen(sessionId: string): void {
    this.seenInSession.delete(sessionId);
  }

  // Referral operations (matchmaker system)
  createReferralMapping(code: string, mapping: { targetUserId: string; targetName: string; createdByUserId: string; createdByName: string; createdAt: number }): void {
    this.referralMappings.set(code, mapping);
    console.log(`[Referral] ${mapping.createdByName} created intro link for ${mapping.targetName} (code: ${code})`);
  }

  getReferralMapping(code: string): { targetUserId: string; targetName: string; createdByUserId: string; createdByName: string; createdAt: number } | undefined {
    return this.referralMappings.get(code);
  }

  createReferralNotification(notification: ReferralNotification): void {
    const notifications = this.referralNotifications.get(notification.forUserId) || [];
    notifications.push(notification);
    this.referralNotifications.set(notification.forUserId, notifications);
    console.log(`[Referral] Notification created for ${notification.forUserId.substring(0, 8)}: ${notification.referredName} signed up`);
  }

  getReferralNotifications(userId: string): ReferralNotification[] {
    return this.referralNotifications.get(userId) || [];
  }

  markNotificationRead(userId: string, notificationId: string): void {
    const notifications = this.referralNotifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  clearNotifications(userId: string): void {
    this.referralNotifications.delete(userId);
  }

  // ===== Report & Ban System =====

  // Track IP address for user
  addUserIp(userId: string, ipAddress: string): void {
    if (!this.userIps.has(userId)) {
      this.userIps.set(userId, new Set());
    }
    this.userIps.get(userId)!.add(ipAddress);
  }

  getUserIps(userId: string): string[] {
    return Array.from(this.userIps.get(userId) || []);
  }

  // Check if IP is banned
  isIpBanned(ipAddress: string): IPBan | null {
    return this.ipBans.get(ipAddress) || null;
  }

  // Ban an IP address
  banIp(ipAddress: string, userId: string, reason: string): void {
    const ipBan: IPBan = {
      ipAddress,
      bannedAt: Date.now(),
      userId,
      reason,
    };
    this.ipBans.set(ipAddress, ipBan);
    console.log(`[Ban] IP ${ipAddress} banned for user ${userId}: ${reason}`);
  }

  // Create a report
  createReport(report: Report): void {
    this.reports.set(report.reportId, report);
    
    // Track by reported user
    if (!this.userReports.has(report.reportedUserId)) {
      this.userReports.set(report.reportedUserId, new Set());
    }
    this.userReports.get(report.reportedUserId)!.add(report.reportId);

    // Track reporter history (who reported whom)
    if (!this.reporterHistory.has(report.reporterUserId)) {
      this.reporterHistory.set(report.reporterUserId, new Set());
    }
    this.reporterHistory.get(report.reporterUserId)!.add(report.reportedUserId);

    console.log(`[Report] User ${report.reportedUserName} reported by ${report.reporterName}`);
  }

  // Check if reporter already reported this user
  hasReportedUser(reporterUserId: string, reportedUserId: string): boolean {
    const reportedUsers = this.reporterHistory.get(reporterUserId);
    return reportedUsers ? reportedUsers.has(reportedUserId) : false;
  }

  // Get all reports for a user
  getReportsForUser(userId: string): Report[] {
    const reportIds = this.userReports.get(userId);
    if (!reportIds) return [];
    
    return Array.from(reportIds)
      .map(id => this.reports.get(id))
      .filter(r => r !== undefined) as Report[];
  }

  // Get report count for user (unique reporters only)
  getReportCount(userId: string): number {
    const reports = this.getReportsForUser(userId);
    const uniqueReporters = new Set(reports.map(r => r.reporterUserId));
    return uniqueReporters.size;
  }

  // Create or update ban record
  createBanRecord(record: BanRecord): void {
    this.banRecords.set(record.userId, record);
    
    // Also update user's ban status
    const user = this.getUser(record.userId);
    if (user) {
      this.updateUser(record.userId, {
        banStatus: record.banStatus,
        bannedAt: record.bannedAt,
        bannedReason: record.bannedReason,
        reviewStatus: record.reviewStatus,
      });
    }

    // Ban all IPs associated with this user
    const userIps = this.getUserIps(record.userId);
    userIps.forEach(ip => {
      this.banIp(ip, record.userId, record.bannedReason);
    });

    console.log(`[Ban] User ${record.userName} status: ${record.banStatus}`);
  }

  getBanRecord(userId: string): BanRecord | undefined {
    return this.banRecords.get(userId);
  }

  getAllBanRecords(): BanRecord[] {
    return Array.from(this.banRecords.values());
  }

  // Get all permanently banned users for blacklist
  getBlacklistedUsers(): BanRecord[] {
    return Array.from(this.banRecords.values())
      .filter(record => record.banStatus === 'permanent');
  }

  // Get all pending reviews
  getPendingReviews(): BanRecord[] {
    return Array.from(this.banRecords.values())
      .filter(record => record.reviewStatus === 'pending');
  }

  // Update ban status (for admin review)
  updateBanStatus(userId: string, newStatus: 'permanent' | 'vindicated', reviewedBy: string): void {
    const banRecord = this.banRecords.get(userId);
    if (!banRecord) return;

    banRecord.banStatus = newStatus;
    banRecord.reviewStatus = newStatus === 'permanent' ? 'reviewed_ban' : 'reviewed_vindicate';
    banRecord.reviewedAt = Date.now();
    banRecord.reviewedBy = reviewedBy;

    // Update user
    const user = this.getUser(userId);
    if (user) {
      if (newStatus === 'vindicated') {
        // Clear ban
        this.updateUser(userId, {
          banStatus: 'none',
          bannedAt: undefined,
          bannedReason: undefined,
          reviewStatus: undefined,
        });
        
        // Unban IPs (only if not used by other banned users)
        const userIps = this.getUserIps(userId);
        userIps.forEach(ip => {
          // Check if any other banned user has this IP
          const otherBannedUsersWithIp = Array.from(this.banRecords.values())
            .filter(record => 
              record.userId !== userId && 
              record.banStatus !== 'vindicated' &&
              record.banStatus !== 'none' &&
              this.getUserIps(record.userId).includes(ip)
            );
          
          if (otherBannedUsersWithIp.length === 0) {
            this.ipBans.delete(ip);
          }
        });
      } else {
        this.updateUser(userId, {
          banStatus: newStatus,
          reviewStatus: 'reviewed_ban',
        });
      }
    }

    console.log(`[Ban] User ${banRecord.userName} reviewed: ${newStatus}`);
  }

  // Check if user is banned (any type)
  isUserBanned(userId: string): boolean {
    const user = this.getUser(userId);
    if (!user) return false;
    return user.banStatus === 'temporary' || user.banStatus === 'permanent';
  }

  // Get all reports (for admin)
  getAllReports(): Report[] {
    return Array.from(this.reports.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // ===== Invite Code System =====

  // Create an invite code
  createInviteCode(inviteCode: InviteCode): void {
    this.inviteCodes.set(inviteCode.code, inviteCode);
    console.log(`[InviteCode] Created ${inviteCode.type} code: ${inviteCode.code} (${inviteCode.maxUses === -1 ? 'unlimited' : inviteCode.maxUses} uses)`);
  }

  // Get invite code
  getInviteCode(code: string): InviteCode | undefined {
    return this.inviteCodes.get(code);
  }

  // Validate and use an invite code
  useInviteCode(code: string, userId: string, userName: string): { success: boolean; error?: string } {
    const inviteCode = this.inviteCodes.get(code);
    
    if (!inviteCode) {
      return { success: false, error: 'Invalid invite code' };
    }

    if (!inviteCode.isActive) {
      return { success: false, error: 'This invite code has been deactivated' };
    }

    // Check if user already used this code (prevent reuse)
    if (inviteCode.usedBy.includes(userId)) {
      return { success: false, error: 'You have already used this invite code' };
    }

    // Check if code has uses remaining
    if (inviteCode.type === 'user' && inviteCode.usesRemaining <= 0) {
      return { success: false, error: 'This invite code has been fully used' };
    }

    // Use the code
    inviteCode.usedBy.push(userId);
    
    // Decrement uses for user codes (admin codes have unlimited uses)
    if (inviteCode.type === 'user') {
      inviteCode.usesRemaining--;
      console.log(`[InviteCode] Code ${code} used by ${userName} - ${inviteCode.usesRemaining} uses remaining`);
    } else {
      console.log(`[InviteCode] Admin code ${code} used by ${userName} - unlimited uses`);
    }

    return { success: true };
  }

  // Get all codes created by a user
  getUserInviteCodes(userId: string): InviteCode[] {
    return Array.from(this.inviteCodes.values())
      .filter(code => code.createdBy === userId);
  }

  // Get all admin codes
  getAdminInviteCodes(): InviteCode[] {
    return Array.from(this.inviteCodes.values())
      .filter(code => code.type === 'admin');
  }

  // Deactivate a code (admin only)
  deactivateInviteCode(code: string): boolean {
    const inviteCode = this.inviteCodes.get(code);
    if (!inviteCode) return false;
    
    inviteCode.isActive = false;
    console.log(`[InviteCode] Code ${code} deactivated`);
    return true;
  }

  // ===== Rate Limiting =====

  // Check rate limit (5 attempts per hour per IP)
  checkRateLimit(ipAddress: string): { allowed: boolean; remainingAttempts?: number; retryAfter?: number } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const maxAttempts = 5;

    let record = this.rateLimits.get(ipAddress);

    // Clean up old records (older than 1 hour)
    if (record && (now - record.firstAttemptAt) > oneHour) {
      this.rateLimits.delete(ipAddress);
      record = undefined;
    }

    if (!record) {
      // First attempt in this window
      this.rateLimits.set(ipAddress, {
        ipAddress,
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
      return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    // Check if limit exceeded
    if (record.attempts >= maxAttempts) {
      const retryAfter = record.firstAttemptAt + oneHour - now;
      console.warn(`[RateLimit] IP ${ipAddress} exceeded limit - ${record.attempts} attempts`);
      return { allowed: false, retryAfter };
    }

    // Increment attempts
    record.attempts++;
    record.lastAttemptAt = now;
    return { allowed: true, remainingAttempts: maxAttempts - record.attempts };
  }

  // Clear rate limit for IP (admin override)
  clearRateLimit(ipAddress: string): void {
    this.rateLimits.delete(ipAddress);
    console.log(`[RateLimit] Cleared for IP: ${ipAddress}`);
  }
}

export const store = new DataStore();

