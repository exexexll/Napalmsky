import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 */

/**
 * Auth endpoints: 5 attempts per 15 minutes per IP
 * Protects against password brute force attacks
 */
export const authLimiter = rateLimit({
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
  validate: { trustProxy: false }, // Disable trust proxy validation warning
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
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many requests',
    message: 'Please slow down',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
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
export const turnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP
  message: {
    error: 'Too many TURN credential requests',
    message: 'Please wait before requesting again',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
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
 * Payment endpoints: 100 requests per hour per IP
 * Allows admin code generation while preventing abuse
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per IP (higher for admin operations)
  message: {
    error: 'Too many payment requests',
    message: 'Please wait before trying again',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy validation warning
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`[RateLimit] Payment limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: 'Too many payment requests',
      retryAfter: 60 * 60
    });
  }
});

/**
 * Report endpoints: 50 requests per hour per IP
 * Allows admin operations while preventing spam
 * (Admin panel makes multiple report API calls)
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour per IP (higher for admin operations)
  message: {
    error: 'Too many reports',
    message: 'Please wait before submitting another report',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy validation warning
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`[RateLimit] Report limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      error: 'Too many reports',
      message: 'Please wait before submitting another report',
      retryAfter: 60 * 60
    });
  }
});

