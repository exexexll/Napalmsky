"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const store_1 = require("./store");
const crypto_random_string_1 = __importDefault(require("crypto-random-string"));
const router = express_1.default.Router();
// Initialize Stripe (use test key for development)
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-09-30.clover',
});
const PRICE_AMOUNT = 1; // $0.01 in cents
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
 * Middleware for admin-only routes
 */
function requireAdmin(req, res, next) {
    // For demo: any authenticated user can access
    // In production: check admin role
    next();
}
/**
 * POST /payment/create-checkout
 * Create a Stripe checkout session for $1 payment
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
    const user = store_1.store.getUser(req.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Check if user already paid
    if (user.paidStatus === 'paid' || user.paidStatus === 'qr_verified') {
        return res.status(400).json({ error: 'You have already verified access' });
    }
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Napalm Sky Access',
                            description: 'One-time payment for platform access + 4 friend invites',
                        },
                        unit_amount: PRICE_AMOUNT,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'http://localhost:3000'}/onboarding`,
            client_reference_id: req.userId, // Track which user this payment is for
            metadata: {
                userId: req.userId,
                userName: user.name,
            },
        });
        res.json({
            checkoutUrl: session.url,
            sessionId: session.id,
        });
    }
    catch (error) {
        console.error('[Payment] Failed to create checkout:', error);
        res.status(500).json({ error: 'Failed to create payment session' });
    }
});
/**
 * POST /payment/webhook
 * Stripe webhook to handle payment completion
 * CRITICAL SECURITY: Verify webhook signature
 */
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[Payment] STRIPE_WEBHOOK_SECRET not configured!');
        return res.status(500).send('Webhook secret not configured');
    }
    let event;
    try {
        // Verify webhook signature (CRITICAL SECURITY)
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error('[Payment] ⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.client_reference_id || session.metadata?.userId;
            if (!userId) {
                console.error('[Payment] No userId in webhook payload');
                break;
            }
            console.log(`[Payment] ✅ Payment successful for user ${userId.substring(0, 8)}`);
            // Mark user as paid
            store_1.store.updateUser(userId, {
                paidStatus: 'paid',
                paidAt: Date.now(),
                paymentId: session.payment_intent,
            });
            // Generate user's invite code (4 uses)
            const inviteCode = generateSecureCode();
            const user = store_1.store.getUser(userId);
            if (user) {
                const code = {
                    code: inviteCode,
                    createdBy: userId,
                    createdByName: user.name,
                    createdAt: Date.now(),
                    type: 'user',
                    maxUses: 4,
                    usesRemaining: 4,
                    usedBy: [],
                    isActive: true,
                };
                store_1.store.createInviteCode(code);
                // Store code on user profile
                store_1.store.updateUser(userId, {
                    myInviteCode: inviteCode,
                    inviteCodeUsesRemaining: 4,
                });
                console.log(`[Payment] Generated invite code ${inviteCode} for ${user.name} (4 uses)`);
            }
            break;
        default:
            console.log(`[Payment] Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
});
/**
 * POST /payment/apply-code
 * Apply an invite code to current user (for users on paywall)
 */
router.post('/apply-code', requireAuth, async (req, res) => {
    const { inviteCode } = req.body;
    if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code is required' });
    }
    const user = store_1.store.getUser(req.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Check if already verified
    if (user.paidStatus === 'paid' || user.paidStatus === 'qr_verified') {
        return res.status(400).json({ error: 'You already have access' });
    }
    // Use the code
    const result = store_1.store.useInviteCode(inviteCode, req.userId, user.name);
    if (!result.success) {
        return res.status(403).json({ error: result.error });
    }
    // Mark user as verified
    store_1.store.updateUser(req.userId, {
        paidStatus: 'qr_verified',
        inviteCodeUsed: inviteCode,
    });
    console.log(`[Payment] User ${user.name} verified via code: ${inviteCode}`);
    res.json({ success: true, paidStatus: 'qr_verified' });
});
/**
 * POST /payment/validate-code
 * Validate an invite code (with rate limiting)
 * CRITICAL: Rate limit to prevent brute force
 */
router.post('/validate-code', async (req, res) => {
    const { code } = req.body;
    const ip = req.userIp || req.ip || 'unknown';
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Code is required' });
    }
    // SECURITY: Rate limiting (5 attempts per hour per IP)
    const rateLimit = store_1.store.checkRateLimit(ip);
    if (!rateLimit.allowed) {
        const minutesRemaining = Math.ceil((rateLimit.retryAfter || 0) / 1000 / 60);
        console.warn(`[Security] 🚫 Rate limit exceeded for IP ${ip}`);
        return res.status(429).json({
            error: 'Too many attempts',
            message: `Please wait ${minutesRemaining} minutes before trying again`,
            retryAfter: rateLimit.retryAfter,
        });
    }
    // Validate code format (security: prevent injection)
    const sanitizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{16}$/.test(sanitizedCode)) {
        console.warn(`[Security] Invalid code format attempt from IP ${ip}: ${code}`);
        return res.status(400).json({
            error: 'Invalid code format',
            attemptsRemaining: rateLimit.remainingAttempts,
        });
    }
    const inviteCode = store_1.store.getInviteCode(sanitizedCode);
    if (!inviteCode) {
        console.warn(`[Security] Code not found from IP ${ip}: ${sanitizedCode}`);
        return res.status(404).json({
            error: 'Invalid invite code',
            attemptsRemaining: rateLimit.remainingAttempts,
        });
    }
    if (!inviteCode.isActive) {
        return res.status(403).json({
            error: 'This invite code has been deactivated',
            attemptsRemaining: rateLimit.remainingAttempts,
        });
    }
    if (inviteCode.type === 'user' && inviteCode.usesRemaining <= 0) {
        return res.status(403).json({
            error: 'This invite code has been fully used',
            attemptsRemaining: rateLimit.remainingAttempts,
        });
    }
    // Code is valid!
    res.json({
        valid: true,
        type: inviteCode.type,
        usesRemaining: inviteCode.type === 'admin' ? -1 : inviteCode.usesRemaining,
        createdBy: inviteCode.createdByName,
    });
});
/**
 * GET /payment/status
 * Check if user has paid or used valid code
 */
router.get('/status', requireAuth, (req, res) => {
    const user = store_1.store.getUser(req.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // If user has their own code, get detailed info
    let myCodeInfo = null;
    if (user.myInviteCode) {
        const codeData = store_1.store.getInviteCode(user.myInviteCode);
        if (codeData) {
            myCodeInfo = {
                code: codeData.code,
                usesRemaining: codeData.usesRemaining,
                maxUses: codeData.maxUses,
                totalUsed: codeData.usedBy.length,
                type: codeData.type,
            };
        }
    }
    res.json({
        paidStatus: user.paidStatus || 'unpaid',
        paidAt: user.paidAt,
        myInviteCode: user.myInviteCode,
        inviteCodeUsesRemaining: myCodeInfo?.usesRemaining || 0,
        myCodeInfo, // Full code details
        inviteCodeUsed: user.inviteCodeUsed, // Which code they used to sign up
    });
});
/**
 * POST /payment/test-bypass
 * TEST ONLY: Bypass payment and generate invite code (for testing)
 * REMOVE IN PRODUCTION
 */
router.post('/test-bypass', requireAuth, async (req, res) => {
    try {
        const user = store_1.store.getUser(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log(`[TEST] Bypassing payment for ${user.name}`);
        // Mark as paid
        store_1.store.updateUser(req.userId, {
            paidStatus: 'paid',
            paidAt: Date.now(),
            paymentId: 'test-bypass-' + Date.now(),
        });
        // Generate 4-use invite code
        const inviteCode = generateSecureCode();
        const code = {
            code: inviteCode,
            createdBy: req.userId,
            createdByName: user.name,
            createdAt: Date.now(),
            type: 'user',
            maxUses: 4,
            usesRemaining: 4,
            usedBy: [],
            isActive: true,
        };
        store_1.store.createInviteCode(code);
        // Store on user profile
        store_1.store.updateUser(req.userId, {
            myInviteCode: inviteCode,
            inviteCodeUsesRemaining: 4,
        });
        console.log(`[TEST] ✅ Generated test invite code ${inviteCode} for ${user.name} (4 uses)`);
        res.json({ success: true, code: inviteCode });
    }
    catch (error) {
        console.error('[TEST] Bypass failed:', error);
        res.status(500).json({ error: 'Bypass failed', message: error.message });
    }
});
/**
 * POST /payment/admin/generate-code-test
 * TEST ONLY: Generate code without auth (for debugging)
 * REMOVE IN PRODUCTION
 */
router.post('/admin/generate-code-test', async (req, res) => {
    try {
        const { label } = req.body;
        console.log('[Admin TEST] Generating test code with label:', label);
        const code = generateSecureCode();
        console.log('[Admin TEST] Code generated successfully:', code);
        const inviteCode = {
            code,
            createdBy: 'test-admin',
            createdByName: label || 'Test Admin',
            createdAt: Date.now(),
            type: 'admin',
            maxUses: -1,
            usesRemaining: -1,
            usedBy: [],
            isActive: true,
        };
        store_1.store.createInviteCode(inviteCode);
        console.log(`[Admin TEST] ✅ Code created: ${code}`);
        res.json({
            code,
            qrCodeUrl: `/payment/qr/${code}`,
        });
    }
    catch (error) {
        console.error('[Admin TEST] ❌ ERROR:', error);
        console.error('[Admin TEST] Stack:', error.stack);
        res.status(500).json({
            error: 'Failed to generate code',
            message: error.message,
        });
    }
});
/**
 * POST /payment/admin/generate-code
 * Admin: Generate a permanent invite code
 */
router.post('/admin/generate-code', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { label } = req.body;
        const admin = store_1.store.getUser(req.userId);
        if (!admin) {
            console.error('[Admin] User not found:', req.userId);
            return res.status(404).json({ error: 'Admin user not found' });
        }
        console.log('[Admin] Generating code for:', admin.name);
        const code = generateSecureCode();
        console.log('[Admin] Code generated successfully:', code);
        const inviteCode = {
            code,
            createdBy: req.userId,
            createdByName: label || `Admin (${admin.name})`,
            createdAt: Date.now(),
            type: 'admin',
            maxUses: -1, // Unlimited
            usesRemaining: -1,
            usedBy: [],
            isActive: true,
        };
        store_1.store.createInviteCode(inviteCode);
        console.log(`[Admin] ✅ Permanent code created: ${code} by ${admin.name}`);
        res.json({
            code,
            qrCodeUrl: `/payment/qr/${code}`,
        });
    }
    catch (error) {
        console.error('[Admin] ❌ FATAL ERROR in generate-code:', error);
        console.error('[Admin] Stack trace:', error.stack);
        res.status(500).json({
            error: 'Failed to generate code',
            message: error.message,
            details: error.toString(),
        });
    }
});
/**
 * GET /payment/admin/codes
 * Admin: List all invite codes
 */
router.get('/admin/codes', requireAuth, requireAdmin, (req, res) => {
    const allCodes = Array.from(store_1.store['inviteCodes'].values())
        .sort((a, b) => b.createdAt - a.createdAt);
    res.json({
        codes: allCodes.map(code => ({
            code: code.code,
            type: code.type,
            createdBy: code.createdByName,
            createdAt: code.createdAt,
            maxUses: code.maxUses,
            usesRemaining: code.usesRemaining,
            totalUsed: code.usedBy.length,
            isActive: code.isActive,
        })),
        total: allCodes.length,
    });
});
/**
 * POST /payment/admin/deactivate-code
 * Admin: Deactivate a code
 */
router.post('/admin/deactivate-code', requireAuth, requireAdmin, (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }
    const success = store_1.store.deactivateInviteCode(code);
    if (!success) {
        return res.status(404).json({ error: 'Code not found' });
    }
    res.json({ success: true, message: 'Code deactivated' });
});
/**
 * GET /payment/qr/:code
 * Generate QR code image for a given invite code
 * PUBLIC endpoint (no auth required)
 */
router.get('/qr/:code', async (req, res) => {
    const { code } = req.params;
    // Validate code exists
    const inviteCode = store_1.store.getInviteCode(code);
    if (!inviteCode) {
        console.error(`[QR] Code not found: ${code}`);
        return res.status(404).send('Code not found');
    }
    try {
        // Import QRCode dynamically
        const QRCode = await Promise.resolve().then(() => __importStar(require('qrcode')));
        // Generate QR code containing the signup URL with code
        const signupUrl = `${req.protocol}://${req.get('host').replace(':3001', ':3000')}/onboarding?inviteCode=${code}`;
        console.log(`[QR] Generating QR for URL: ${signupUrl}`);
        const qrCodeBuffer = await QRCode.toBuffer(signupUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
            type: 'png',
        });
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': qrCodeBuffer.length,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        });
        res.end(qrCodeBuffer);
        console.log(`[QR] ✅ Successfully generated QR for code: ${code}`);
    }
    catch (error) {
        console.error('[QR] Failed to generate QR code:', error);
        res.status(500).send('Failed to generate QR code');
    }
});
/**
 * Helper: Generate cryptographically secure invite code
 * Format: 16 uppercase alphanumeric characters
 */
function generateSecureCode() {
    try {
        // Use crypto-random-string for cryptographic randomness
        const code = (0, crypto_random_string_1.default)({ length: 16, type: 'alphanumeric' }).toUpperCase();
        // Verify uniqueness (collision check)
        if (store_1.store.getInviteCode(code)) {
            console.warn('[Security] Code collision detected, regenerating...');
            return generateSecureCode(); // Recursive retry
        }
        console.log('[CodeGen] Generated code:', code);
        return code;
    }
    catch (error) {
        console.error('[CodeGen] Error generating code:', error);
        throw error;
    }
}
exports.default = router;
