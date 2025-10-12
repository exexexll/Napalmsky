"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportLimiter = exports.paymentLimiter = exports.turnLimiter = exports.apiLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 */
/**
 * Auth endpoints: 5 attempts per 15 minutes per IP
 * Protects against password brute force attacks
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window per IP
    message: {
        error: 'Too many login attempts',
        message: 'Please try again in 15 minutes',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skipSuccessfulRequests: true, // Only count failed attempts
    handler: (req, res) => {
        console.warn(`[RateLimit] Auth limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Please try again in 15 minutes',
            retryAfter: 15 * 60
        });
    }
});
/**
 * API endpoints: 100 requests per 15 minutes per IP
 * Protects against API abuse and DDoS
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: {
        error: 'Too many requests',
        message: 'Please slow down',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] API limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please slow down and try again later',
            retryAfter: 15 * 60
        });
    }
});
/**
 * TURN credentials endpoint: 10 per hour per IP
 * Prevents credential farming and abuse
 */
exports.turnLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour per IP
    message: {
        error: 'Too many TURN credential requests',
        message: 'Please wait before requesting again',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] TURN limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            error: 'Too many TURN credential requests',
            message: 'Please wait before requesting new credentials',
            retryAfter: 60 * 60
        });
    }
});
/**
 * Payment endpoints: 20 requests per hour per IP
 * Prevents payment spam and code validation attacks
 */
exports.paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour per IP
    message: {
        error: 'Too many payment requests',
        message: 'Please wait before trying again',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] Payment limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            error: 'Too many payment requests',
            retryAfter: 60 * 60
        });
    }
});
/**
 * Report endpoints: 10 reports per hour per IP
 * Prevents report spam
 */
exports.reportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 reports per hour per IP
    message: {
        error: 'Too many reports',
        message: 'Please wait before submitting another report',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] Report limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            error: 'Too many reports',
            message: 'Please wait before submitting another report',
            retryAfter: 60 * 60
        });
    }
});
