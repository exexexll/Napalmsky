import { User, Session, ReferralNotification, Report, BanRecord, IPBan, InviteCode, RateLimitRecord } from './types';
import { query } from './database';

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
  private useDatabase = !!process.env.DATABASE_URL;
  
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private history = new Map<string, ChatHistory[]>(); // userId -> history[]
  private timerTotals = new Map<string, number>(); // userId -> cumulative seconds
  private presence = new Map<string, Presence>(); // userId -> presence (always in-memory for real-time)
  private cooldowns = new Map<string, number>(); // "userId1|userId2" -> expiresAt
  private activeInvites = new Map<string, ActiveInvite>(); // inviteId -> invite (always in-memory for real-time)
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

  constructor() {
    console.log(`[Store] Using ${this.useDatabase ? 'PostgreSQL' : 'in-memory'} storage`);
  }

  // User operations - with PostgreSQL support
  async createUser(user: User): Promise<void> {
    if (this.useDatabase) {
      try {
        await query(
          `INSERT INTO users (user_id, name, gender, account_type, email, password_hash, selfie_url, video_url, 
           socials, paid_status, paid_at, payment_id, invite_code_used, my_invite_code, invite_code_uses_remaining,
           ban_status, introduced_to, introduced_by, introduced_via_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            user.userId, user.name, user.gender, user.accountType, user.email || null,
            user.password_hash || null, user.selfieUrl || null, user.videoUrl || null,
            JSON.stringify(user.socials || {}), user.paidStatus || 'unpaid',
            user.paidAt ? new Date(user.paidAt) : null, user.paymentId || null,
            user.inviteCodeUsed || null, user.myInviteCode || null, user.inviteCodeUsesRemaining || 0,
            user.banStatus || 'none', user.introducedTo || null, user.introducedBy || null,
            user.introducedViaCode || null
          ]
        );
        console.log('[Store] User created in database:', user.userId.substring(0, 8));
      } catch (error) {
        console.error('[Store] Failed to create user in database:', error);
        throw error;
      }
    }
    // Also keep in memory for fast access
    this.users.set(user.userId, user);
  }

  async getUser(userId: string): Promise<User | undefined> {
    // Check memory first (fast)
    let user = this.users.get(userId);
    
    // If not in memory and we have database, check there
    if (!user && this.useDatabase) {
      try {
        const result = await query('SELECT * FROM users WHERE user_id = $1', [userId]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          user = this.dbRowToUser(row);
          // Cache in memory
          this.users.set(userId, user);
          console.log('[Store] User loaded from database:', userId.substring(0, 8));
        }
      } catch (error) {
        console.error('[Store] Failed to get user from database:', error);
      }
    }
    
    return user;
  }
  
  // Helper: Convert database row to User object
  private dbRowToUser(row: any): User {
    return {
      userId: row.user_id,
      name: row.name,
      gender: row.gender,
      accountType: row.account_type,
      email: row.email,
      password_hash: row.password_hash,
      selfieUrl: row.selfie_url,
      videoUrl: row.video_url,
      socials: row.socials || {},
      paidStatus: row.paid_status,
      paidAt: row.paid_at ? new Date(row.paid_at).getTime() : undefined,
      paymentId: row.payment_id,
      inviteCodeUsed: row.invite_code_used,
      myInviteCode: row.my_invite_code,
      inviteCodeUsesRemaining: row.invite_code_uses_remaining,
      banStatus: row.ban_status,
      bannedAt: row.banned_at ? new Date(row.banned_at).getTime() : undefined,
      bannedReason: row.banned_reason,
      reviewStatus: row.review_status,
      introducedTo: row.introduced_to,
      introducedBy: row.introduced_by,
      introducedViaCode: row.introduced_via_code,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Check memory first
    let user = Array.from(this.users.values()).find(u => u.email === email);
    
    // If not found and database available, check there
    if (!user && this.useDatabase && email) {
      try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
          user = this.dbRowToUser(result.rows[0]);
          this.users.set(user.userId, user);
        }
      } catch (error) {
        console.error('[Store] Failed to get user by email from database:', error);
      }
    }
    
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    // Update in memory
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(userId, updatedUser);
      
      // Also update in database if available
      if (this.useDatabase) {
        try {
          // Build dynamic UPDATE query based on what fields were updated
          const setClauses: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;
          
          if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
          if (updates.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(updates.email); }
          if (updates.password_hash !== undefined) { setClauses.push(`password_hash = $${paramIndex++}`); values.push(updates.password_hash); }
          if (updates.selfieUrl !== undefined) { setClauses.push(`selfie_url = $${paramIndex++}`); values.push(updates.selfieUrl); }
          if (updates.videoUrl !== undefined) { setClauses.push(`video_url = $${paramIndex++}`); values.push(updates.videoUrl); }
          if (updates.socials !== undefined) { setClauses.push(`socials = $${paramIndex++}`); values.push(JSON.stringify(updates.socials)); }
          if (updates.paidStatus !== undefined) { setClauses.push(`paid_status = $${paramIndex++}`); values.push(updates.paidStatus); }
          if (updates.paidAt !== undefined) { setClauses.push(`paid_at = $${paramIndex++}`); values.push(updates.paidAt ? new Date(updates.paidAt) : null); }
          if (updates.paymentId !== undefined) { setClauses.push(`payment_id = $${paramIndex++}`); values.push(updates.paymentId); }
          if (updates.myInviteCode !== undefined) { setClauses.push(`my_invite_code = $${paramIndex++}`); values.push(updates.myInviteCode); }
          if (updates.inviteCodeUsesRemaining !== undefined) { setClauses.push(`invite_code_uses_remaining = $${paramIndex++}`); values.push(updates.inviteCodeUsesRemaining); }
          if (updates.inviteCodeUsed !== undefined) { setClauses.push(`invite_code_used = $${paramIndex++}`); values.push(updates.inviteCodeUsed); }
          if (updates.banStatus !== undefined) { setClauses.push(`ban_status = $${paramIndex++}`); values.push(updates.banStatus); }
          if (updates.accountType !== undefined) { setClauses.push(`account_type = $${paramIndex++}`); values.push(updates.accountType); }
          
          if (setClauses.length > 0) {
            values.push(userId);
            await query(
              `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`,
              values
            );
            console.log('[Store] User updated in database:', userId.substring(0, 8));
          }
        } catch (error) {
          console.error('[Store] Failed to update user in database:', error);
          // Don't throw - fallback to memory-only mode
        }
      }
    }
  }

  // Session operations - with PostgreSQL support  
  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.sessionToken, session);
    
    if (this.useDatabase) {
      try {
        await query(
          `INSERT INTO sessions (session_token, user_id, ip_address, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (session_token) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
          [session.sessionToken, session.userId, session.ipAddress || null, new Date(session.createdAt), new Date(session.expiresAt)]
        );
      } catch (error) {
        console.error('[Store] Failed to create session in database:', error);
      }
    }
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    let session = this.sessions.get(sessionToken);
    
    if (!session && this.useDatabase) {
      try {
        const result = await query('SELECT * FROM sessions WHERE session_token = $1 AND expires_at > NOW()', [sessionToken]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          session = {
            sessionToken: row.session_token,
            userId: row.user_id,
            createdAt: new Date(row.created_at).getTime(),
            expiresAt: new Date(row.expires_at).getTime(),
            ipAddress: row.ip_address,
          };
          this.sessions.set(sessionToken, session);
        }
      } catch (error) {
        console.error('[Store] Failed to get session from database:', error);
      }
    }
    
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    if (session) {
      this.sessions.delete(sessionToken);
      if (this.useDatabase) {
        try {
          await query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);
        } catch (error) {}
      }
    }
    return undefined;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken);
    if (this.useDatabase) {
      try {
        await query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);
      } catch (error) {}
    }
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

