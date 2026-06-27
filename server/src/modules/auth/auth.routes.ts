import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/authMiddleware";
import { AuthService } from "./auth.service";
import { registerSchema } from "../../schema/zUserSchema";

const authRoutes = Router();
const authService = new AuthService();


const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

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
authRoutes.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid login data",
    });
  }

  try {
    const data = await authService.loginWithPassword(parsed.data);

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

authRoutes.get("/verify", authMiddleware, (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Token is valid",
  });
});

authRoutes.post("/logout", authMiddleware, (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

export { authRoutes };
