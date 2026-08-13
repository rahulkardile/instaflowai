import rateLimit from "express-rate-limit";

/**
 * General API rate limiter — applied globally.
 * 100 requests per 15 minutes per IP.
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
  skip: (req) => req.path.startsWith("/api/instagram/webhook"),
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
