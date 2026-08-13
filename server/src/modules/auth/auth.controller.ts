import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema } from "../../schema/zUserSchema";

const authService = new AuthService();

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid registration data",
    });
    return;
  }

  try {
    const data = await authService.register(parsed.data);
    res.status(201).json({ success: true, message: "Account created", data });
  } catch (error) {
    res.status(409).json({
      success: false,
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid login data",
    });
    return;
  }

  try {
    const data = await authService.loginWithPassword(parsed.data);
    res.status(200).json({ success: true, message: "Logged in", data });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch user",
    });
  }
}

export function verify(_req: Request, res: Response): void {
  res.status(200).json({ success: true, message: "Token is valid" });
}

export function logout(_req: Request, res: Response): void {
  res.status(200).json({ success: true, message: "Logged out" });
}
