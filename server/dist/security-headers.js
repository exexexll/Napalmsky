"use strict";
/**
 * Security Headers Middleware
 * Implements OWASP best practices for HTTP security headers
 * Protects against XSS, clickjacking, and other attacks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = securityHeaders;
exports.httpsRedirect = httpsRedirect;
exports.securityLogger = securityLogger;
function securityHeaders(req, res, next) {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS filter in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer Policy (privacy)
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy (restrict browser features)
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');
    // Content Security Policy (XSS protection)
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.napalmsky.com wss://api.napalmsky.com https://*.cloudflare.com",
        "frame-src https://js.stripe.com",
        "media-src 'self' blob: https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
    // Strict Transport Security (HSTS) - Only in production over HTTPS
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
}
/**
 * HTTPS Redirect (Production Only)
 * Redirect all HTTP traffic to HTTPS
 */
function httpsRedirect(req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        if (protocol !== 'https') {
            console.log(`[Security] Redirecting HTTP → HTTPS: ${req.url}`);
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
    }
    next();
}
/**
 * Request logging with security context
 */
function securityLogger(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    // Log all requests (for audit trail)
    console.log('[Request]', {
        method: req.method,
        path: req.path,
        ip,
        userAgent: userAgent?.substring(0, 50)
    });
    next();
}
