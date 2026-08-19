import rateLimit from "express-rate-limit";

/**
 * General API rate limiter — applied globally.
 * 100 requests per 15 minutes per IP.
 *
 * IMPORTANT: We skip the Instagram webhook path entirely.
 * req.path is relative to the mount point (e.g. just "/instagram/webhook"),
 * so we check req.originalUrl which always has the full path.
 * Meta sends frequent webhook events and must never be rate-limited.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  skip: (req) => req.originalUrl.includes("/instagram/webhook"),
});

/**
 * Strict auth rate limiter — applied to login & register.
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again in 15 minutes.",
  },
});
