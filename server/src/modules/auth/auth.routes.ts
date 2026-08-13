import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authLimiter } from "../../middleware/rateLimiter";
import { register, login, getMe, verify, logout } from "./auth.controller";

const authRoutes = Router();

// Public routes — rate-limited
authRoutes.post("/register", authLimiter, register);
authRoutes.post("/login", authLimiter, login);

// Protected routes
authRoutes.get("/me", authMiddleware, getMe);
authRoutes.get("/verify", authMiddleware, verify);
authRoutes.post("/logout", authMiddleware, logout);

export { authRoutes };
