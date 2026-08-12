import { NextFunction, Request, Response } from "express";

/**
 * Admin guard middleware.
 * Must be used AFTER authMiddleware (which sets req.user).
 * Returns 403 if the authenticated user is not an admin.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden — admin access required",
    });
  }
  return next();
}
