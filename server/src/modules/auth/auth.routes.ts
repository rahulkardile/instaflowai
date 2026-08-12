import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authMiddleware } from "../../middleware/authMiddleware";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema } from "../../schema/zUserSchema";
import { cache, CACHE_KEY } from "../../utils/cache";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_MS,
  LOGIN_RATE_WINDOW_MS,
  LOGIN_RATE_MAX,
} from "../../constants";

const authRoutes = Router();
const authService = new AuthService();

// ─── Login-specific rate limiter ───────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,   // 1 hour
  max:      LOGIN_RATE_MAX,         // 5 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 1 hour before trying again.",
    retryAfterMs: LOGIN_RATE_WINDOW_MS,
  },
  skipSuccessfulRequests: true,     // Only count failed/blocked attempts
});

// ─── Cookie helper ─────────────────────────────────────────────────────────
function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly:  true,                                 // Not accessible from JS
    secure:    process.env.NODE_ENV === "production",// HTTPS only in prod
    sameSite:  "lax",                                // CSRF protection
    maxAge:    COOKIE_MAX_AGE_MS,                    // 30 days
    path:      "/",
  });
}

// ─── Hcaptcha verification helper ─────────────────────────────────────────
async function verifyHcaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    // If no secret is configured, skip captcha in development
    if (process.env.NODE_ENV !== "production") return true;
    console.warn("[captcha] HCAPTCHA_SECRET not set in production — captcha skipped");
    return true;
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[captcha] hCaptcha verification error:", err);
    return false;
  }
}

// ─── POST /auth/register ───────────────────────────────────────────────────
authRoutes.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message,
    });
  }

  try {
    const data = await authService.register(parsed.data);
    setAuthCookie(res, data.token);

    return res.status(201).json({
      success: true,
      message: "Account created",
      data,
    });
  } catch (error) {
    return res.status(409).json({
      success: false,
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
});

// ─── POST /auth/login ──────────────────────────────────────────────────────
authRoutes.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid login data",
    });
  }

  // ── Captcha verification ────────────────────────────────────────────────
  const captchaToken = req.body.captchaToken as string | undefined;
  if (process.env.NODE_ENV === "production") {
    if (!captchaToken) {
      return res.status(400).json({ success: false, message: "Captcha is required" });
    }
    const captchaOk = await verifyHcaptcha(captchaToken);
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: "Captcha verification failed" });
    }
  }

  try {
    const data = await authService.loginWithPassword(parsed.data);
    setAuthCookie(res, data.token);

    return res.status(200).json({
      success: true,
      message: "Logged in",
      data,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
});

// ─── GET /auth/me ──────────────────────────────────────────────────────────
authRoutes.get("/me", authMiddleware, async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: { user },
  });
});

// ─── GET /auth/verify ──────────────────────────────────────────────────────
authRoutes.get("/verify", authMiddleware, (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Token is valid",
  });
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────
authRoutes.post("/logout", authMiddleware, (req, res) => {
  // Clear the httpOnly auth cookie
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
  });

  // Evict user from the auth cache so the token is effectively invalidated
  if (req.user?.userId) {
    cache.del(CACHE_KEY.USER(req.user.userId));
  }

  return res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

export { authRoutes };
