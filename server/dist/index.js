"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const store_1 = require("./store");
const auth_1 = require("./auth");
const media_1 = __importDefault(require("./media"));
const room_1 = __importDefault(require("./room"));
const user_1 = __importDefault(require("./user"));
const referral_1 = __importDefault(require("./referral"));
const report_1 = __importDefault(require("./report"));
const payment_1 = __importDefault(require("./payment"));
const turn_1 = __importDefault(require("./turn"));
const rate_limit_1 = require("./rate-limit");
const security_headers_1 = require("./security-headers");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Socket.io with environment-based CORS
const socketOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
const io = new socket_io_1.Server(server, {
    cors: {
        origin: socketOrigins,
        credentials: true,
    },
});
// Socket.io Authentication Middleware
// Authenticate connections BEFORE accepting them (security improvement)
// For backward compatibility, this is optional - full auth happens in 'auth' event
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        // Allow connection but mark as not pre-authenticated
        console.log('[Socket.io] Connection without pre-auth token - will auth via event');
        socket.userId = null;
        return next();
    }
    const session = store_1.store.getSession(token);
    if (!session) {
        console.warn('[Socket.io] Invalid pre-auth token - will retry via event');
        socket.userId = null;
        return next();
    }
    // Check if user is banned
    if (store_1.store.isUserBanned(session.userId)) {
        console.warn(`[Socket.io] Connection rejected - user ${session.userId} is banned`);
        return next(new Error('Account suspended'));
    }
    // Attach userId to socket for use in event handlers
    socket.userId = session.userId;
    console.log(`[Socket.io] Pre-authenticated connection for user ${session.userId.substring(0, 8)}`);
    next();
});
const PORT = process.env.PORT || 3001;
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Trust proxy for cloud deployment (required for correct IP detection)
app.set('trust proxy', true);
// Centralized IP extraction function
function getClientIp(req) {
    // Priority order: x-forwarded-for (proxy) > req.ip > socket address > unknown
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can be a comma-separated list, take the first one
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}
// Middleware
// CORS with environment-based origin configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// Security headers (OWASP best practices)
app.use(security_headers_1.securityHeaders);
app.use(security_headers_1.httpsRedirect);
app.use(express_1.default.json());
// IP tracking middleware - track user IPs for ban enforcement
app.use((req, res, next) => {
    const ip = getClientIp(req);
    // Check if IP is banned
    const ipBan = store_1.store.isIpBanned(ip);
    if (ipBan) {
        console.log(`[Security] 🚫 Blocked request from banned IP: ${ip}`);
        return res.status(403).json({
            error: 'Access denied',
            banned: true,
            message: 'Your IP address has been banned from accessing this service.',
            reason: ipBan.reason,
        });
    }
    // Attach IP to request for later use
    req.userIp = ip;
    next();
});
// Serve uploaded files (cloud seam: replace with CDN in production)
app.use('/uploads', express_1.default.static(uploadsDir));
// Socket.io state (must be declared before routes that need it)
const activeSockets = new Map(); // userId -> socketId
const activeRooms = new Map(); // roomId -> room data
// Routes with rate limiting and dependency injection
app.use('/auth', rate_limit_1.authLimiter, (0, auth_1.createAuthRoutes)(io, activeSockets));
app.use('/media', rate_limit_1.apiLimiter, media_1.default);
app.use('/room', rate_limit_1.apiLimiter, room_1.default);
app.use('/user', rate_limit_1.apiLimiter, user_1.default);
app.use('/referral', rate_limit_1.apiLimiter, referral_1.default);
app.use('/report', rate_limit_1.reportLimiter, report_1.default);
app.use('/payment', rate_limit_1.paymentLimiter, payment_1.default);
app.use('/turn', rate_limit_1.turnLimiter, turn_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// Live stats (public endpoint)
app.get('/stats/live', (req, res) => {
    // Count only online users (not just available)
    const allPresence = Array.from(store_1.store['presence'].values());
    const onlineCount = allPresence.filter(p => p.online).length;
    res.json({
        onlineUsers: onlineCount,
        timestamp: Date.now(),
    });
});
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    // Support both pre-authenticated (via middleware) and post-authenticated (via event) flows
    let currentUserId = socket.userId || null;
    // If pre-authenticated, set up presence immediately
    if (currentUserId) {
        activeSockets.set(currentUserId, socket.id);
        store_1.store.setPresence(currentUserId, {
            socketId: socket.id,
            online: true,
            available: false,
            lastActiveAt: Date.now(),
        });
        console.log(`[Connection] User ${currentUserId.substring(0, 8)} pre-authenticated and marked online`);
    }
    // Authenticate socket connection (for clients that don't use handshake auth)
    socket.on('auth', ({ sessionToken }) => {
        const session = store_1.store.getSession(sessionToken);
        if (session) {
            // Check if user is banned
            if (store_1.store.isUserBanned(session.userId)) {
                console.log(`[Security] 🚫 Banned user ${session.userId} attempted socket connection`);
                socket.emit('auth:banned', {
                    message: 'Your account has been suspended.',
                    banned: true,
                });
                socket.disconnect(true);
                return;
            }
            // Set currentUserId if not already set by middleware
            if (!currentUserId) {
                currentUserId = session.userId;
                activeSockets.set(session.userId, socket.id);
                // IMMEDIATELY set presence when authenticated (fix race condition)
                store_1.store.setPresence(session.userId, {
                    socketId: socket.id,
                    online: true,
                    available: false,
                    lastActiveAt: Date.now(),
                });
                console.log(`[Connection] User ${session.userId.substring(0, 8)} authenticated via event and marked online`);
            }
            socket.emit('auth:success');
            // Check for any referral notifications for this user (someone was introduced to them)
            const notifications = store_1.store.getReferralNotifications(session.userId);
            const unreadNotifications = notifications.filter(n => !n.read);
            if (unreadNotifications.length > 0) {
                // Send all unread notifications
                unreadNotifications.forEach(notif => {
                    socket.emit('referral:notification', {
                        message: `${notif.referredName} wants to connect with you!`,
                        notification: notif,
                    });
                });
                console.log(`[Referral] Sent ${unreadNotifications.length} unread notifications to ${session.userId.substring(0, 8)}`);
            }
        }
        else {
            socket.emit('auth:failed');
        }
    });
    // Presence: join (mark online) - DEPRECATED, presence set at auth now
    // Kept for backward compatibility but now just confirms presence
    socket.on('presence:join', () => {
        if (!currentUserId) {
            console.error('[Presence] ❌ presence:join called but user not authenticated yet!');
            return;
        }
        // Update lastActiveAt (presence already set at auth time)
        store_1.store.updatePresence(currentUserId, {
            online: true,
            available: false,
            lastActiveAt: Date.now(),
        });
        console.log(`[Presence] ✅ ${currentUserId.substring(0, 8)} confirmed online`);
        // Broadcast to all
        io.emit('presence:update', {
            userId: currentUserId,
            online: true,
            available: false,
        });
    });
    // Presence: leave
    socket.on('presence:leave', () => {
        if (!currentUserId)
            return;
        store_1.store.updatePresence(currentUserId, {
            online: false,
            available: false,
        });
        console.log(`[Presence] ${currentUserId} left (offline)`);
        io.emit('presence:update', {
            userId: currentUserId,
            online: false,
            available: false,
        });
    });
    // Queue: join (mark available for matching)
    socket.on('queue:join', () => {
        if (!currentUserId) {
            console.error('[Queue] ❌ queue:join called but user not authenticated yet!');
            return;
        }
        // First ensure user is online
        const currentPresence = store_1.store.getPresence(currentUserId);
        if (!currentPresence || !currentPresence.online) {
            console.warn(`[Queue] User ${currentUserId.substring(0, 8)} trying to join queue but not marked online - fixing`);
            store_1.store.setPresence(currentUserId, {
                socketId: socket.id,
                online: true,
                available: true,
                lastActiveAt: Date.now(),
            });
        }
        else {
            // Update available flag
            store_1.store.updatePresence(currentUserId, {
                available: true,
                lastActiveAt: Date.now(),
            });
        }
        const presence = store_1.store.getPresence(currentUserId);
        console.log(`[Queue] ${currentUserId.substring(0, 8)} joined queue - online: ${presence?.online}, available: ${presence?.available}`);
        // Broadcast to all users
        io.emit('queue:update', {
            userId: currentUserId,
            available: true,
        });
        // Double-check presence was set correctly
        const verified = store_1.store.getPresence(currentUserId);
        if (!verified?.available) {
            console.error(`[Queue] ⚠️ FAILED to set available for ${currentUserId.substring(0, 8)} - presence: ${JSON.stringify(verified)}`);
        }
        else {
            console.log(`[Queue] ✅ Verified ${currentUserId.substring(0, 8)} is now available`);
        }
    });
    // Queue: leave
    socket.on('queue:leave', () => {
        if (!currentUserId)
            return;
        store_1.store.updatePresence(currentUserId, {
            available: false,
        });
        console.log(`[Queue] ${currentUserId} left queue`);
        io.emit('queue:update', {
            userId: currentUserId,
            available: false,
        });
    });
    // Call: invite
    socket.on('call:invite', ({ toUserId, requestedSeconds }) => {
        if (!currentUserId) {
            console.error('[Invite] ❌ call:invite received but currentUserId is null - user not authenticated yet');
            return socket.emit('error', { message: 'Please wait for authentication to complete' });
        }
        console.log(`[Invite] 📞 Received invite request from ${currentUserId.substring(0, 8)} to ${toUserId.substring(0, 8)} for ${requestedSeconds}s`);
        // Validate toUserId
        if (!toUserId || typeof toUserId !== 'string') {
            console.warn(`[Invite] Invalid toUserId: ${toUserId}`);
            return;
        }
        // Can't invite yourself
        if (toUserId === currentUserId) {
            console.warn(`[Invite] User ${currentUserId.substring(0, 8)} tried to invite themselves`);
            return socket.emit('call:declined', {
                inviteId: (0, uuid_1.v4)(),
                reason: 'invalid_target',
            });
        }
        // Check if target user exists
        const targetUser = store_1.store.getUser(toUserId);
        if (!targetUser) {
            console.warn(`[Invite] Target user not found: ${toUserId}`);
            return socket.emit('call:declined', {
                inviteId: (0, uuid_1.v4)(),
                reason: 'user_not_found',
            });
        }
        // Validate requested time (60s to 30min)
        if (!requestedSeconds ||
            typeof requestedSeconds !== 'number' ||
            requestedSeconds < 60 ||
            requestedSeconds > 1800 ||
            !Number.isInteger(requestedSeconds)) {
            console.warn(`[Invite] Invalid duration requested: ${requestedSeconds}`);
            return socket.emit('call:declined', {
                inviteId: (0, uuid_1.v4)(),
                reason: 'invalid_duration',
            });
        }
        const inviteId = (0, uuid_1.v4)();
        const targetPresence = store_1.store.getPresence(toUserId);
        const targetSocket = activeSockets.get(toUserId);
        // Validation
        if (!targetPresence || !targetPresence.online || !targetPresence.available) {
            return socket.emit('call:declined', {
                inviteId,
                reason: 'offline',
            });
        }
        if (store_1.store.hasCooldown(currentUserId, toUserId)) {
            return socket.emit('call:declined', {
                inviteId,
                reason: 'cooldown',
            });
        }
        // Create invite
        store_1.store.createInvite({
            inviteId,
            fromUserId: currentUserId,
            toUserId,
            createdAt: Date.now(),
            callerSeconds: requestedSeconds,
        });
        const fromUser = store_1.store.getUser(currentUserId);
        // Notify callee
        if (targetSocket) {
            io.to(targetSocket).emit('call:notify', {
                inviteId,
                fromUser: {
                    userId: fromUser?.userId,
                    name: fromUser?.name,
                    gender: fromUser?.gender,
                    selfieUrl: fromUser?.selfieUrl,
                    videoUrl: fromUser?.videoUrl,
                },
                requestedSeconds,
                ttlMs: 20000, // Changed to 20 seconds
            });
            console.log(`[Invite] ${currentUserId} → ${toUserId}, invite: ${inviteId}`);
            // Note: No automatic timeout - caller must manually cancel (rescind)
            // This gives caller full control over when to give up
        }
    });
    // Call: accept
    socket.on('call:accept', ({ inviteId, requestedSeconds }) => {
        console.log(`[Accept] 📞 Received accept for invite ${inviteId} with ${requestedSeconds}s`);
        const invite = store_1.store.getInvite(inviteId);
        if (!invite) {
            console.error('[Accept] ❌ Invite not found:', inviteId);
            return socket.emit('error', { message: 'Invite not found or expired' });
        }
        console.log(`[Accept] ✅ Invite found: ${invite.fromUserId.substring(0, 8)} → ${invite.toUserId.substring(0, 8)}, caller requested ${invite.callerSeconds}s`);
        // Validate requested time (60s to 30min)
        if (!requestedSeconds ||
            typeof requestedSeconds !== 'number' ||
            requestedSeconds < 60 ||
            requestedSeconds > 1800 ||
            !Number.isInteger(requestedSeconds)) {
            console.warn(`[Accept] Invalid duration requested: ${requestedSeconds}`);
            return socket.emit('error', { message: 'Invalid call duration' });
        }
        // Calculate average
        const agreedSeconds = Math.floor((invite.callerSeconds + requestedSeconds) / 2);
        const roomId = (0, uuid_1.v4)();
        console.log(`[Call] Averaging times: ${invite.callerSeconds}s (caller) + ${requestedSeconds}s (callee) = ${agreedSeconds}s (average)`);
        // Mark both as unavailable
        store_1.store.updatePresence(invite.fromUserId, { available: false });
        store_1.store.updatePresence(invite.toUserId, { available: false });
        // Broadcast presence change
        io.emit('queue:update', { userId: invite.fromUserId, available: false });
        io.emit('queue:update', { userId: invite.toUserId, available: false });
        // Create room
        activeRooms.set(roomId, {
            user1: invite.fromUserId,
            user2: invite.toUserId,
            messages: [],
            startedAt: Date.now(),
            duration: agreedSeconds,
        });
        const user1 = store_1.store.getUser(invite.fromUserId);
        const user2 = store_1.store.getUser(invite.toUserId);
        const callerSocket = activeSockets.get(invite.fromUserId);
        const calleeSocket = activeSockets.get(invite.toUserId);
        // Notify both users
        if (callerSocket) {
            io.to(callerSocket).emit('call:start', {
                roomId,
                agreedSeconds,
                isInitiator: true, // Caller creates offer
                peerUser: {
                    userId: user2?.userId,
                    name: user2?.name,
                },
            });
        }
        if (calleeSocket) {
            io.to(calleeSocket).emit('call:start', {
                roomId,
                agreedSeconds,
                isInitiator: false, // Callee waits for offer
                peerUser: {
                    userId: user1?.userId,
                    name: user1?.name,
                },
            });
        }
        store_1.store.deleteInvite(inviteId);
        console.log(`[Call] Started room ${roomId} with ${agreedSeconds}s`);
    });
    // Call: decline
    socket.on('call:decline', ({ inviteId }) => {
        const invite = store_1.store.getInvite(inviteId);
        if (!invite)
            return;
        const callerSocket = activeSockets.get(invite.fromUserId);
        if (callerSocket) {
            io.to(callerSocket).emit('call:declined', {
                inviteId,
                reason: 'user_declined',
            });
        }
        // Set 24h cooldown when user declines (prevents repeated unwanted invites)
        const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
        store_1.store.setCooldown(invite.fromUserId, invite.toUserId, cooldownUntil);
        console.log(`[Cooldown] Set 24h cooldown after decline: ${invite.fromUserId.substring(0, 8)} ↔ ${invite.toUserId.substring(0, 8)}`);
        store_1.store.deleteInvite(inviteId);
        console.log(`[Invite] ${inviteId} declined by user`);
    });
    // Call: rescind (caller cancels their own invite)
    socket.on('call:rescind', ({ toUserId }) => {
        if (!currentUserId) {
            console.error('[Rescind] ❌ call:rescind received but currentUserId is null');
            return;
        }
        // Find the active invite from current user to target user
        const invite = Array.from(store_1.store['activeInvites'].values()).find(inv => inv.fromUserId === currentUserId && inv.toUserId === toUserId);
        if (!invite) {
            console.warn(`[Rescind] No active invite found from ${currentUserId.substring(0, 8)} to ${toUserId.substring(0, 8)}`);
            return;
        }
        console.log(`[Rescind] User ${currentUserId.substring(0, 8)} rescinding invite to ${toUserId.substring(0, 8)}`);
        const calleeSocket = activeSockets.get(toUserId);
        if (calleeSocket) {
            // Notify callee that invite was cancelled
            io.to(calleeSocket).emit('call:rescinded', { inviteId: invite.inviteId });
        }
        // Set 1h cooldown when caller cancels (prevents spam re-invites)
        const cooldownUntil = Date.now() + (60 * 60 * 1000); // 1 hour
        store_1.store.setCooldown(currentUserId, toUserId, cooldownUntil);
        console.log(`[Cooldown] Set 1h cooldown after rescind: ${currentUserId.substring(0, 8)} ↔ ${toUserId.substring(0, 8)}`);
        store_1.store.deleteInvite(invite.inviteId);
        console.log(`[Invite] ${invite.inviteId} rescinded by caller`);
    });
    // Join room
    socket.on('room:join', ({ roomId }) => {
        if (!currentUserId) {
            return socket.emit('error', { message: 'Not authenticated' });
        }
        socket.join(roomId);
        console.log(`User ${currentUserId} joined room ${roomId}`);
    });
    // WebRTC signaling
    socket.on('rtc:offer', ({ roomId, offer }) => {
        console.log(`RTC offer from ${currentUserId} in room ${roomId}`);
        socket.to(roomId).emit('rtc:offer', { offer, from: currentUserId });
    });
    socket.on('rtc:answer', ({ roomId, answer }) => {
        console.log(`RTC answer from ${currentUserId} in room ${roomId}`);
        socket.to(roomId).emit('rtc:answer', { answer, from: currentUserId });
    });
    socket.on('rtc:ice', ({ roomId, candidate }) => {
        socket.to(roomId).emit('rtc:ice', { candidate, from: currentUserId });
    });
    // Chat messaging
    socket.on('room:chat', ({ roomId, text }) => {
        if (!currentUserId)
            return;
        // Sanitize input to prevent XSS attacks
        // Remove HTML tags and limit length
        let sanitized = text || '';
        // Strip all HTML/script tags (basic sanitization)
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        // Limit length to 500 characters
        sanitized = sanitized.substring(0, 500);
        // Trim whitespace
        sanitized = sanitized.trim();
        // Don't send empty messages
        if (!sanitized) {
            return;
        }
        const message = {
            from: currentUserId,
            text: sanitized,
            timestamp: Date.now(),
            type: 'message',
        };
        // Save to room
        const room = activeRooms.get(roomId);
        if (room) {
            room.messages.push(message);
        }
        // Broadcast to room
        io.to(roomId).emit('room:chat', message);
    });
    // Give social
    socket.on('room:giveSocial', ({ roomId, socials }) => {
        if (!currentUserId)
            return;
        const message = {
            from: currentUserId,
            timestamp: Date.now(),
            type: 'social',
            socials,
        };
        // Save to room
        const room = activeRooms.get(roomId);
        if (room) {
            room.messages.push(message);
        }
        // Broadcast to room
        io.to(roomId).emit('room:socialShared', message);
    });
    // End call
    socket.on('call:end', ({ roomId }) => {
        if (!currentUserId)
            return;
        const room = activeRooms.get(roomId);
        if (room) {
            const sessionId = `session-${Date.now()}`;
            const user1 = store_1.store.getUser(room.user1);
            const user2 = store_1.store.getUser(room.user2);
            // Calculate actual duration (in seconds)
            const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);
            if (user1 && user2) {
                // Only save to history if call lasted at least 5 seconds (prevents accidental/spam calls)
                if (actualDuration >= 5) {
                    // Save to history for both users
                    const history1 = {
                        sessionId,
                        roomId,
                        partnerId: user2.userId,
                        partnerName: user2.name,
                        startedAt: room.startedAt,
                        duration: actualDuration,
                        messages: room.messages,
                    };
                    const history2 = {
                        sessionId,
                        roomId,
                        partnerId: user1.userId,
                        partnerName: user1.name,
                        startedAt: room.startedAt,
                        duration: actualDuration,
                        messages: room.messages,
                    };
                    store_1.store.addHistory(room.user1, history1);
                    store_1.store.addHistory(room.user2, history2);
                    // Update timer totals and metrics (use actual duration)
                    store_1.store.addToTimer(room.user1, actualDuration);
                    store_1.store.addToTimer(room.user2, actualDuration);
                    console.log(`[Call] Saved ${actualDuration}s call to history for both users`);
                }
                else {
                    console.log(`[Call] Call too short (${actualDuration}s), not saving to history`);
                }
                // Emit metrics update to both users
                const user1Socket = activeSockets.get(room.user1);
                const user2Socket = activeSockets.get(room.user2);
                if (user1Socket) {
                    const u1 = store_1.store.getUser(room.user1);
                    io.to(user1Socket).emit('metrics:update', {
                        timerTotalSeconds: u1?.timerTotalSeconds || 0,
                        sessionCount: u1?.sessionCount || 0,
                        lastSessions: u1?.lastSessions || [],
                    });
                }
                if (user2Socket) {
                    const u2 = store_1.store.getUser(room.user2);
                    io.to(user2Socket).emit('metrics:update', {
                        timerTotalSeconds: u2?.timerTotalSeconds || 0,
                        sessionCount: u2?.sessionCount || 0,
                        lastSessions: u2?.lastSessions || [],
                    });
                }
                // Set 24h cooldown between these users
                const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
                store_1.store.setCooldown(room.user1, room.user2, cooldownUntil);
                console.log(`[Cooldown] Set 24h cooldown between ${room.user1} and ${room.user2}`);
            }
            // Mark both users as available again
            store_1.store.updatePresence(room.user1, { available: true });
            store_1.store.updatePresence(room.user2, { available: true });
            // Broadcast presence change
            io.emit('queue:update', { userId: room.user1, available: true });
            io.emit('queue:update', { userId: room.user2, available: true });
            console.log(`[Queue] ${room.user1} marked available again`);
            console.log(`[Queue] ${room.user2} marked available again`);
            // Notify both users
            io.to(roomId).emit('session:finalized', { sessionId });
            // Cleanup
            activeRooms.delete(roomId);
        }
    });
    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (currentUserId) {
            activeSockets.delete(currentUserId);
            // Find any active room and clean up properly
            Array.from(activeRooms.entries()).forEach(([roomId, room]) => {
                if (room.user1 === currentUserId || room.user2 === currentUserId) {
                    const partnerId = room.user1 === currentUserId ? room.user2 : room.user1;
                    const partnerUser = store_1.store.getUser(partnerId);
                    // Notify partner
                    io.to(roomId).emit('peer:disconnected');
                    console.log(`[Disconnect] Notified partner ${partnerId.substring(0, 8)} of disconnection`);
                    // Save partial session history (for analytics/debugging)
                    const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);
                    if (actualDuration >= 5) {
                        const sessionId = `session-${Date.now()}-disconnected`;
                        const user1 = store_1.store.getUser(room.user1);
                        const user2 = store_1.store.getUser(room.user2);
                        if (user1 && user2) {
                            // Save history for both users with disconnection flag
                            const history1 = {
                                sessionId,
                                roomId,
                                partnerId: room.user2,
                                partnerName: user2.name,
                                startedAt: room.startedAt,
                                duration: actualDuration,
                                messages: [...room.messages, {
                                        from: 'system',
                                        text: 'Call ended due to disconnection',
                                        timestamp: Date.now(),
                                        type: 'message',
                                    }],
                            };
                            const history2 = {
                                sessionId,
                                roomId,
                                partnerId: room.user1,
                                partnerName: user1.name,
                                startedAt: room.startedAt,
                                duration: actualDuration,
                                messages: [...room.messages, {
                                        from: 'system',
                                        text: 'Call ended due to disconnection',
                                        timestamp: Date.now(),
                                        type: 'message',
                                    }],
                            };
                            store_1.store.addHistory(room.user1, history1);
                            store_1.store.addHistory(room.user2, history2);
                            // Update timer totals
                            store_1.store.addToTimer(room.user1, actualDuration);
                            store_1.store.addToTimer(room.user2, actualDuration);
                            // Set cooldown even for disconnected calls (prevent abuse)
                            const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
                            store_1.store.setCooldown(room.user1, room.user2, cooldownUntil);
                            console.log(`[Disconnect] Saved partial session (${actualDuration}s) and set cooldown`);
                        }
                    }
                    else {
                        console.log(`[Disconnect] Call too short (${actualDuration}s), not saving history`);
                    }
                    // Mark both users as available again
                    store_1.store.updatePresence(room.user1, { available: true });
                    store_1.store.updatePresence(room.user2, { available: true });
                    // Broadcast presence updates
                    io.emit('queue:update', { userId: room.user1, available: true });
                    io.emit('queue:update', { userId: room.user2, available: true });
                    // Clean up room from memory (critical fix for memory leak)
                    activeRooms.delete(roomId);
                    console.log(`[Disconnect] ✅ Cleaned up room ${roomId} and marked users available`);
                }
            });
            // Mark user offline (they disconnected from socket)
            store_1.store.updatePresence(currentUserId, {
                online: false,
                available: false
            });
            // Broadcast offline status
            io.emit('presence:update', {
                userId: currentUserId,
                online: false,
                available: false,
            });
            console.log(`[Disconnect] ✅ User ${currentUserId.substring(0, 8)} marked offline`);
        }
    });
});
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   ⚠️  In-memory store active - migrate to PostgreSQL for production`);
    console.log(`   ℹ️  Production mode - ready for real users`);
});
