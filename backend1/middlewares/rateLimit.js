// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// General rate limiter for API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Beta signup rate limiter (more restrictive)
const betaSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 beta signup attempts per hour
  message: {
    error: 'Too many beta signup attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many beta signup attempts',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Email-based rate limiter for beta signups (prevent email spam)
const betaEmailLimiter = rateLimit({
  keyGenerator: (req) => {
    // Use email as key for beta signup to prevent email spam
    // Use proper IP handling for IPv6 compatibility
    const email = req.body.email || '';
    return email; // Just use email, no IP to avoid IPv6 issues
  },
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // Only 1 beta signup per email per day
  message: {
    error: 'This email has already been used for beta signup today.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Email rate limit exceeded',
      message: 'This email has already been used for beta signup today. Please try again tomorrow.',
      retryAfter: '24 hours'
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  betaSignupLimiter,
  betaEmailLimiter
};
