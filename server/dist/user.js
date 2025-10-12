"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const store_1 = require("./store");
const router = express_1.default.Router();
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
 * GET /user/me
 * Get current user profile with metrics
 */
router.get('/me', requireAuth, (req, res) => {
    const user = store_1.store.getUser(req.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({
        userId: user.userId,
        name: user.name,
        gender: user.gender,
        accountType: user.accountType,
        email: user.email,
        selfieUrl: user.selfieUrl,
        videoUrl: user.videoUrl,
        socials: user.socials,
        createdAt: user.createdAt,
        timerTotalSeconds: user.timerTotalSeconds || 0,
        sessionCount: user.sessionCount || 0,
        lastSessions: user.lastSessions || [],
        streakDays: user.streakDays || null,
    });
});
/**
 * PUT /user/me
 * Update user profile (partial updates)
 * Supports: socials object
 */
router.put('/me', requireAuth, (req, res) => {
    const { socials } = req.body;
    if (socials) {
        // Store socials in user object
        // In production: validate and sanitize
        store_1.store.updateUser(req.userId, { socials });
    }
    const user = store_1.store.getUser(req.userId);
    res.json({
        success: true,
        user: {
            userId: user?.userId,
            name: user?.name,
            socials: user?.socials,
        },
    });
});
exports.default = router;
