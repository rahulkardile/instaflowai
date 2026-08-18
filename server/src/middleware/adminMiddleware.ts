import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/userTypes";

/**
 * adminMiddleware — must be used AFTER authMiddleware.
 * Rejects with 403 if the authenticated user is not an admin.
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: admin access required",
    });
  }
  next();
}
