"use strict";
/**
 * Paywall Guard Middleware
 * Ensures users have either paid or used a valid invite code
 * Applied to all protected routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePayment = requirePayment;
const store_1 = require("./store");
function requirePayment(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    const session = store_1.store.getSession(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const user = store_1.store.getUser(session.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Check if user has verified access
    const hasAccess = user.paidStatus === 'paid' || user.paidStatus === 'qr_verified';
    if (!hasAccess) {
        console.warn(`[Paywall] 🚫 Unpaid user ${user.name} attempted to access protected route`);
        return res.status(402).json({
            error: 'Payment required',
            message: 'Please complete payment or use an invite code to access this feature',
            requiresPayment: true,
        });
    }
    // User has access, continue
    req.userId = session.userId;
    next();
}
