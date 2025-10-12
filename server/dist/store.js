"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
class DataStore {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
        this.history = new Map(); // userId -> history[]
        this.timerTotals = new Map(); // userId -> cumulative seconds
        this.presence = new Map(); // userId -> presence
        this.cooldowns = new Map(); // "userId1|userId2" -> expiresAt
        this.activeInvites = new Map(); // inviteId -> invite
        this.seenInSession = new Map(); // sessionId -> Set<userIds>
        this.referralNotifications = new Map(); // userId -> notifications[]
        this.referralMappings = new Map(); // code -> {targetUserId, createdByUserId, ...}
        // Blacklist & Reporting system
        this.reports = new Map(); // reportId -> Report
        this.userReports = new Map(); // reportedUserId -> Set<reportId>
        this.reporterHistory = new Map(); // reporterUserId -> Set<reportedUserId> (tracks who reported whom)
        this.banRecords = new Map(); // userId -> BanRecord
        this.ipBans = new Map(); // ipAddress -> IPBan
        this.userIps = new Map(); // userId -> Set<ipAddresses>
        // Paywall & Invite Code system
        this.inviteCodes = new Map(); // code -> InviteCode
        this.rateLimits = new Map(); // ipAddress -> RateLimitRecord
    }
    // User operations
    createUser(user) {
        this.users.set(user.userId, user);
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    getUserByEmail(email) {
        return Array.from(this.users.values()).find(u => u.email === email);
    }
    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (user) {
            this.users.set(userId, { ...user, ...updates });
        }
    }
    // Session operations
    createSession(session) {
        this.sessions.set(session.sessionToken, session);
    }
    getSession(sessionToken) {
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
    deleteSession(sessionToken) {
        this.sessions.delete(sessionToken);
    }
    // History operations
    addHistory(userId, history) {
        const userHistory = this.history.get(userId) || [];
        userHistory.push(history);
        this.history.set(userId, userHistory);
    }
    getHistory(userId) {
        return this.history.get(userId) || [];
    }
    // Timer operations (legacy - now using user.timerTotalSeconds)
    addToTimer(userId, seconds) {
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
    getTimerTotal(userId) {
        return this.timerTotals.get(userId) || 0;
    }
    // Presence operations
    setPresence(userId, presence) {
        this.presence.set(userId, presence);
    }
    getPresence(userId) {
        return this.presence.get(userId);
    }
    updatePresence(userId, updates) {
        const current = this.presence.get(userId);
        if (current) {
            const updated = { ...current, ...updates };
            this.presence.set(userId, updated);
            console.log(`[Store] Presence updated for ${userId.substring(0, 8)}: online=${updated.online}, available=${updated.available}`);
        }
        else {
            console.warn(`[Store] Cannot update presence for ${userId.substring(0, 8)} - not found`);
        }
    }
    getAllOnlineAvailable(excludeUserId) {
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
    getCooldownKey(userId1, userId2) {
        // Lexicographic comparison ensures consistent ordering
        // Works correctly for UUIDs and any string-based IDs
        return userId1 < userId2
            ? `${userId1}|${userId2}`
            : `${userId2}|${userId1}`;
    }
    setCooldown(userId1, userId2, expiresAt) {
        const key = this.getCooldownKey(userId1, userId2);
        this.cooldowns.set(key, expiresAt);
    }
    hasCooldown(userId1, userId2) {
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
    getCooldownExpiry(userId1, userId2) {
        const key = this.getCooldownKey(userId1, userId2);
        const expires = this.cooldowns.get(key);
        if (expires && expires > Date.now()) {
            return expires;
        }
        return null;
    }
    // Active invite operations
    createInvite(invite) {
        this.activeInvites.set(invite.inviteId, invite);
    }
    getInvite(inviteId) {
        return this.activeInvites.get(inviteId);
    }
    deleteInvite(inviteId) {
        this.activeInvites.delete(inviteId);
    }
    // Seen tracking for reel
    addSeen(sessionId, userId) {
        if (!this.seenInSession.has(sessionId)) {
            this.seenInSession.set(sessionId, new Set());
        }
        this.seenInSession.get(sessionId).add(userId);
    }
    getSeen(sessionId) {
        return this.seenInSession.get(sessionId) || new Set();
    }
    clearSeen(sessionId) {
        this.seenInSession.delete(sessionId);
    }
    // Referral operations (matchmaker system)
    createReferralMapping(code, mapping) {
        this.referralMappings.set(code, mapping);
        console.log(`[Referral] ${mapping.createdByName} created intro link for ${mapping.targetName} (code: ${code})`);
    }
    getReferralMapping(code) {
        return this.referralMappings.get(code);
    }
    createReferralNotification(notification) {
        const notifications = this.referralNotifications.get(notification.forUserId) || [];
        notifications.push(notification);
        this.referralNotifications.set(notification.forUserId, notifications);
        console.log(`[Referral] Notification created for ${notification.forUserId.substring(0, 8)}: ${notification.referredName} signed up`);
    }
    getReferralNotifications(userId) {
        return this.referralNotifications.get(userId) || [];
    }
    markNotificationRead(userId, notificationId) {
        const notifications = this.referralNotifications.get(userId) || [];
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }
    clearNotifications(userId) {
        this.referralNotifications.delete(userId);
    }
    // ===== Report & Ban System =====
    // Track IP address for user
    addUserIp(userId, ipAddress) {
        if (!this.userIps.has(userId)) {
            this.userIps.set(userId, new Set());
        }
        this.userIps.get(userId).add(ipAddress);
    }
    getUserIps(userId) {
        return Array.from(this.userIps.get(userId) || []);
    }
    // Check if IP is banned
    isIpBanned(ipAddress) {
        return this.ipBans.get(ipAddress) || null;
    }
    // Ban an IP address
    banIp(ipAddress, userId, reason) {
        const ipBan = {
            ipAddress,
            bannedAt: Date.now(),
            userId,
            reason,
        };
        this.ipBans.set(ipAddress, ipBan);
        console.log(`[Ban] IP ${ipAddress} banned for user ${userId}: ${reason}`);
    }
    // Create a report
    createReport(report) {
        this.reports.set(report.reportId, report);
        // Track by reported user
        if (!this.userReports.has(report.reportedUserId)) {
            this.userReports.set(report.reportedUserId, new Set());
        }
        this.userReports.get(report.reportedUserId).add(report.reportId);
        // Track reporter history (who reported whom)
        if (!this.reporterHistory.has(report.reporterUserId)) {
            this.reporterHistory.set(report.reporterUserId, new Set());
        }
        this.reporterHistory.get(report.reporterUserId).add(report.reportedUserId);
        console.log(`[Report] User ${report.reportedUserName} reported by ${report.reporterName}`);
    }
    // Check if reporter already reported this user
    hasReportedUser(reporterUserId, reportedUserId) {
        const reportedUsers = this.reporterHistory.get(reporterUserId);
        return reportedUsers ? reportedUsers.has(reportedUserId) : false;
    }
    // Get all reports for a user
    getReportsForUser(userId) {
        const reportIds = this.userReports.get(userId);
        if (!reportIds)
            return [];
        return Array.from(reportIds)
            .map(id => this.reports.get(id))
            .filter(r => r !== undefined);
    }
    // Get report count for user (unique reporters only)
    getReportCount(userId) {
        const reports = this.getReportsForUser(userId);
        const uniqueReporters = new Set(reports.map(r => r.reporterUserId));
        return uniqueReporters.size;
    }
    // Create or update ban record
    createBanRecord(record) {
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
    getBanRecord(userId) {
        return this.banRecords.get(userId);
    }
    getAllBanRecords() {
        return Array.from(this.banRecords.values());
    }
    // Get all permanently banned users for blacklist
    getBlacklistedUsers() {
        return Array.from(this.banRecords.values())
            .filter(record => record.banStatus === 'permanent');
    }
    // Get all pending reviews
    getPendingReviews() {
        return Array.from(this.banRecords.values())
            .filter(record => record.reviewStatus === 'pending');
    }
    // Update ban status (for admin review)
    updateBanStatus(userId, newStatus, reviewedBy) {
        const banRecord = this.banRecords.get(userId);
        if (!banRecord)
            return;
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
                        .filter(record => record.userId !== userId &&
                        record.banStatus !== 'vindicated' &&
                        record.banStatus !== 'none' &&
                        this.getUserIps(record.userId).includes(ip));
                    if (otherBannedUsersWithIp.length === 0) {
                        this.ipBans.delete(ip);
                    }
                });
            }
            else {
                this.updateUser(userId, {
                    banStatus: newStatus,
                    reviewStatus: 'reviewed_ban',
                });
            }
        }
        console.log(`[Ban] User ${banRecord.userName} reviewed: ${newStatus}`);
    }
    // Check if user is banned (any type)
    isUserBanned(userId) {
        const user = this.getUser(userId);
        if (!user)
            return false;
        return user.banStatus === 'temporary' || user.banStatus === 'permanent';
    }
    // Get all reports (for admin)
    getAllReports() {
        return Array.from(this.reports.values()).sort((a, b) => b.timestamp - a.timestamp);
    }
    // ===== Invite Code System =====
    // Create an invite code
    createInviteCode(inviteCode) {
        this.inviteCodes.set(inviteCode.code, inviteCode);
        console.log(`[InviteCode] Created ${inviteCode.type} code: ${inviteCode.code} (${inviteCode.maxUses === -1 ? 'unlimited' : inviteCode.maxUses} uses)`);
    }
    // Get invite code
    getInviteCode(code) {
        return this.inviteCodes.get(code);
    }
    // Validate and use an invite code
    useInviteCode(code, userId, userName) {
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
        }
        else {
            console.log(`[InviteCode] Admin code ${code} used by ${userName} - unlimited uses`);
        }
        return { success: true };
    }
    // Get all codes created by a user
    getUserInviteCodes(userId) {
        return Array.from(this.inviteCodes.values())
            .filter(code => code.createdBy === userId);
    }
    // Get all admin codes
    getAdminInviteCodes() {
        return Array.from(this.inviteCodes.values())
            .filter(code => code.type === 'admin');
    }
    // Deactivate a code (admin only)
    deactivateInviteCode(code) {
        const inviteCode = this.inviteCodes.get(code);
        if (!inviteCode)
            return false;
        inviteCode.isActive = false;
        console.log(`[InviteCode] Code ${code} deactivated`);
        return true;
    }
    // ===== Rate Limiting =====
    // Check rate limit (5 attempts per hour per IP)
    checkRateLimit(ipAddress) {
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
    clearRateLimit(ipAddress) {
        this.rateLimits.delete(ipAddress);
        console.log(`[RateLimit] Cleared for IP: ${ipAddress}`);
    }
}
exports.store = new DataStore();
