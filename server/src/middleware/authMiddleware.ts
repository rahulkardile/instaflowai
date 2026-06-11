import { NextFunction, Request, Response } from "express";
import { JwtService } from "../utils/jwt";

export async function authMiddleware( req: Request, res: Response, next: NextFunction ) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const payload = JwtService.verifyToken(token);
    
    req.user = {
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
