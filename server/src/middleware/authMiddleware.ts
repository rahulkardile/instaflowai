import { NextFunction, Request, Response } from "express";
import { JwtService } from "../utils/jwt";
import { User } from "../models/User";

export async function authMiddleware( req: Request, res: Response, next: NextFunction ) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const payload = JwtService.verifyToken(token);
    const user = await User.findById(payload.userId).select("_id email role isActive");

    if (!user?.isActive) {
      return res.status(401).json({
        success: false,
        message: "User is inactive or no longer exists",
      });
    }
    
    req.user = {
      userId: payload.userId,
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
}
