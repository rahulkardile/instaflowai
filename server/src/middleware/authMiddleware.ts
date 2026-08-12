import { NextFunction, Request, Response } from "express";
import { JwtService } from "../utils/jwt";
import { User } from "../models/User";
import { cache, CACHE_KEY, CACHE_TTL } from "../utils/cache";
import type { RequestUser } from "../types/express.d";

/**
 * Auth middleware.
 * Accepts JWT from:
 *   1. httpOnly cookie `auth_token` (preferred — set at login)
 *   2. Authorization: Bearer <token> header (fallback for API clients)
 *
 * Caches the DB user lookup for CACHE_TTL.USER (60 s) to reduce load.
 * Invalidate with `cache.del(CACHE_KEY.USER(userId))` on user updates.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // ── 1. Extract token (cookie preferred, fallback to header) ──────────
    const cookieToken: string | undefined = (req as any).cookies?.auth_token;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookieToken ?? headerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ── 2. Verify JWT ────────────────────────────────────────────────────
    const payload = JwtService.verifyToken(token);

    // ── 3. Cache-first user lookup ───────────────────────────────────────
    const cacheKey = CACHE_KEY.USER(payload.userId);
    let requestUser = cache.get<RequestUser>(cacheKey);

    if (!requestUser) {
      const user = await User.findById(payload.userId).select("_id email role isActive");

      if (!user?.isActive) {
        return res.status(401).json({
          success: false,
          message: "User is inactive or no longer exists",
        });
      }

      requestUser = {
        userId: payload.userId,
        id: payload.userId,
        email: user.email,
        role: user.role,
      };

      cache.set(cacheKey, requestUser, CACHE_TTL.USER);
    }

    req.user = requestUser;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
