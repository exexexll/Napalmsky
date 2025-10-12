"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const store_1 = require("./store");
const router = express_1.default.Router();
/**
 * Generate a unique referral code with collision checking
 * Uses 10 alphanumeric characters for sufficient entropy
 */
function generateUniqueReferralCode(maxAttempts = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let code = '';
        // Generate 10-character code for better entropy
        for (let i = 0; i < 10; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Check if code already exists
        if (!store_1.store.getReferralMapping(code)) {
            return code;
        }
        console.warn(`[Referral] Code collision detected on attempt ${attempt + 1}, retrying...`);
    }
    return null; // Failed to generate unique code after max attempts
}
/**
 * Middleware to verify session token
 */
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    const session = store_1.store.getSession(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.userId = session.userId;
    next();
}
/**
 * POST /referral/generate
 * Generate a referral link to introduce a friend to a SPECIFIC user
 * This is a "matchmaker" feature - not a platform growth feature
 */
router.post('/generate', requireAuth, (req, res) => {
    const { targetUserId } = req.body; // The person you want to introduce your friend to
    if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId is required' });
    }
    const targetUser = store_1.store.getUser(targetUserId);
    if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
    }
    const creatorUser = store_1.store.getUser(req.userId);
    if (!creatorUser) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Generate unique referral code for this specific introduction (with collision check)
    const code = generateUniqueReferralCode();
    if (!code) {
        console.error('[Referral] Failed to generate unique code after multiple attempts');
        return res.status(500).json({ error: 'Failed to generate referral code. Please try again.' });
    }
    // Store referral mapping
    store_1.store.createReferralMapping(code, {
        targetUserId,
        targetName: targetUser.name,
        createdByUserId: req.userId,
        createdByName: creatorUser.name,
        createdAt: Date.now(),
    });
    // Generate full URL
    const referralUrl = `${req.protocol}://${req.get('host')}/onboarding?ref=${code}`;
    console.log(`[Referral] ${creatorUser.name} created introduction link for ${targetUser.name}: ${code}`);
    res.json({
        referralCode: code,
        referralUrl,
        targetUserName: targetUser.name,
    });
});
/**
 * GET /referral/info/:code
 * Get information about a referral code (who you're being introduced to)
 */
router.get('/info/:code', (req, res) => {
    const { code } = req.params;
    const referralInfo = store_1.store.getReferralMapping(code);
    if (!referralInfo) {
        return res.status(404).json({ error: 'Invalid or expired referral code' });
    }
    res.json({
        targetUserName: referralInfo.targetName,
        introducedBy: referralInfo.createdByName,
    });
});
/**
 * GET /referral/notifications
 * Get referral notifications for the current user
 * These are people who were introduced to YOU
 */
router.get('/notifications', requireAuth, (req, res) => {
    const notifications = store_1.store.getReferralNotifications(req.userId);
    res.json({
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
    });
});
/**
 * PUT /referral/notifications/:id/read
 * Mark a notification as read
 */
router.put('/notifications/:id/read', requireAuth, (req, res) => {
    store_1.store.markNotificationRead(req.userId, req.params.id);
    res.json({ success: true });
});
/**
 * GET /referral/target-status/:code
 * Check if the target user (from referral code) is online
 */
router.get('/target-status/:code', (req, res) => {
    const { code } = req.params;
    const referralInfo = store_1.store.getReferralMapping(code);
    if (!referralInfo) {
        return res.status(404).json({ error: 'Invalid referral code' });
    }
    const targetUser = store_1.store.getUser(referralInfo.targetUserId);
    if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
    }
    const presence = store_1.store.getPresence(referralInfo.targetUserId);
    const isOnline = !!(presence && presence.online);
    const isAvailable = !!(presence && presence.online && presence.available);
    res.json({
        targetUserId: targetUser.userId,
        targetName: targetUser.name,
        targetGender: targetUser.gender,
        targetSelfie: targetUser.selfieUrl,
        targetVideo: targetUser.videoUrl,
        isOnline,
        isAvailable,
        introducedBy: referralInfo.createdByName,
    });
});
/**
 * POST /referral/direct-match
 * Direct match with target user using referral code
 */
router.post('/direct-match', requireAuth, (req, res) => {
    const { referralCode } = req.body;
    if (!referralCode) {
        return res.status(400).json({ error: 'Referral code is required' });
    }
    const referralInfo = store_1.store.getReferralMapping(referralCode);
    if (!referralInfo) {
        return res.status(404).json({ error: 'Invalid referral code' });
    }
    const targetUser = store_1.store.getUser(referralInfo.targetUserId);
    if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
    }
    const presence = store_1.store.getPresence(referralInfo.targetUserId);
    const isOnline = !!(presence && presence.online);
    const isAvailable = !!(presence && presence.online && presence.available);
    // Check if current user was introduced to this target
    const currentUser = store_1.store.getUser(req.userId);
    const wasIntroduced = currentUser?.introducedTo === referralInfo.targetUserId;
    res.json({
        success: true,
        targetUser: {
            userId: targetUser.userId,
            name: targetUser.name,
            gender: targetUser.gender,
            selfieUrl: targetUser.selfieUrl,
            videoUrl: targetUser.videoUrl,
        },
        isOnline,
        isAvailable,
        canCall: isOnline && isAvailable,
        wasIntroduced,
        introducedBy: referralInfo.createdByName,
    });
});
/**
 * GET /referral/my-introductions
 * Get list of users who were introduced to me
 */
router.get('/my-introductions', requireAuth, (req, res) => {
    const notifications = store_1.store.getReferralNotifications(req.userId);
    // Get full user details for each introduction
    const introductions = notifications.map(notif => {
        const user = store_1.store.getUser(notif.referredUserId);
        const presence = store_1.store.getPresence(notif.referredUserId);
        return {
            userId: notif.referredUserId,
            name: notif.referredName,
            introducedBy: notif.introducedByName,
            timestamp: notif.timestamp,
            isOnline: !!(presence && presence.online),
            isAvailable: !!(presence && presence.online && presence.available),
            selfieUrl: user?.selfieUrl,
            videoUrl: user?.videoUrl,
            gender: user?.gender,
        };
    });
    res.json({
        introductions,
        count: introductions.length,
    });
});
exports.default = router;
