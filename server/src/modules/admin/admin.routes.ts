import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { adminGuard } from "../../middleware/adminGuard";
import { User } from "../../models/User";
import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import { cache, CACHE_KEY, CACHE_TTL } from "../../utils/cache";
import { z } from "zod";
import {
  ACTIVE_WINDOW_MINUTES,
  ADMIN_LOG_LIMIT,
  ADMIN_USER_LIMIT,
  EXECUTION_STATUS,
  INITIAL_ADMIN_EMAIL,
} from "../../constants";
import { UserRole } from "../../types/userTypes";
import type { ApiResponse } from "../../types/common.types";

export const adminRoutes = Router();

// All admin routes require auth + admin role
adminRoutes.use(authMiddleware, adminGuard);

// ─── GET /admin/stats ──────────────────────────────────────────────────────
/**
 * Returns aggregate counts for the entire application.
 * Cached for 30 s.
 */
adminRoutes.get("/stats", async (_req: Request, res: Response) => {
  try {
    const cacheKey = CACHE_KEY.ADMIN_STATS;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const activeWindow = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      igConnectedUsers,
      currentlyActive,
      newUsersToday,
      totalAutomations,
      enabledAutomations,
      totalLogs,
      successLogs,
      failedLogs,
      totalConversations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ instagramConnected: true }),
      User.countDocuments({ lastLoginAt: { $gte: activeWindow } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Automation.countDocuments(),
      Automation.countDocuments({ enabled: true }),
      ExecutionLog.countDocuments(),
      ExecutionLog.countDocuments({ status: EXECUTION_STATUS.SUCCESS }),
      ExecutionLog.countDocuments({ status: EXECUTION_STATUS.FAILED }),
      ExecutionLog.countDocuments({ action: { $in: ["DM_RECEIVED", "SEND_DM", "DM_AUTO_REPLY"] } }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        igConnected: igConnectedUsers,
        currentlyActive,
        newToday: newUsersToday,
      },
      automations: {
        total: totalAutomations,
        enabled: enabledAutomations,
        disabled: totalAutomations - enabledAutomations,
      },
      executions: {
        total: totalLogs,
        success: successLogs,
        failed: failedLogs,
        successRate: totalLogs > 0 ? `${((successLogs / totalLogs) * 100).toFixed(1)}%` : "N/A",
        conversations: totalConversations,
      },
      cache: cache.stats(),
    };

    cache.set(cacheKey, stats, CACHE_TTL.ADMIN_STATS);
    return res.json({ success: true, data: stats });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch stats",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/dau ────────────────────────────────────────────────────────
/**
 * Daily active users for the last 30 days.
 * Uses MongoDB aggregation on lastLoginAt. Cached 60 s.
 */
adminRoutes.get("/dau", async (_req: Request, res: Response) => {
  try {
    const cacheKey = CACHE_KEY.ADMIN_DAU;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);

    const dau = await User.aggregate([
      { $match: { lastLoginAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]);

    cache.set(cacheKey, dau, CACHE_TTL.ADMIN_DAU);
    return res.json({ success: true, data: dau });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch DAU",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/active-now ─────────────────────────────────────────────────
/**
 * Users with lastLoginAt within the last ACTIVE_WINDOW_MINUTES minutes.
 */
adminRoutes.get("/active-now", async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000);
    const users = await User.find({ lastLoginAt: { $gte: since } })
      .select("name email avatar lastLoginAt instagramConnected role")
      .sort({ lastLoginAt: -1 })
      .limit(50);

    return res.json({ success: true, data: { count: users.length, users } });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch active users",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/users ──────────────────────────────────────────────────────
/**
 * Paginated, searchable user list.
 * Query params: page (default 1), limit (default 50), search, role, isActive
 */
adminRoutes.get("/users", async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(ADMIN_USER_LIMIT, parseInt(req.query.limit as string) || 20);
    const search = req.query.search as string | undefined;
    const role   = req.query.role as string | undefined;
    const isActive = req.query.isActive as string | undefined;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role)     filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch users",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/users/:id ──────────────────────────────────────────────────
adminRoutes.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const [user, igAccount, automations] = await Promise.all([
      User.findById(req.params.id).select("-passwordHash"),
      InstagramAccount.findOne({ userId: req.params.id }).select("username instagramUserId tokenExpiresAt createdAt"),
      Automation.find({ userId: req.params.id }).select("type enabled keywords createdAt"),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, data: { user, igAccount, automations } });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch user",
    };
    return res.status(500).json(response);
  }
});

// ─── PATCH /admin/users/:id ────────────────────────────────────────────────
const updateUserSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  email:    z.string().email().optional(),
  role:     z.enum([UserRole.USER, UserRole.ADMIN]).optional(),
  isActive: z.boolean().optional(),
});

adminRoutes.patch("/users/:id", async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid update data",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Invalidate the cached auth user entry
    cache.del(CACHE_KEY.USER(String(req.params.id)));

    return res.json({ success: true, data: { user } });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/logs ───────────────────────────────────────────────────────
/**
 * Cross-user execution log viewer.
 * Query params: page, limit, action, status, userId
 */
adminRoutes.get("/logs", async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(ADMIN_LOG_LIMIT, parseInt(req.query.limit as string) || 50);

    const filter: Record<string, unknown> = {};
    if (req.query.action) filter.action = req.query.action as string;
    if (req.query.status) filter.status = req.query.status as string;
    if (req.query.userId) filter.userId = req.query.userId as string;

    const [logs, total] = await Promise.all([
      ExecutionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name email")
        .populate("automationId", "type keywords"),
      ExecutionLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch logs",
    };
    return res.status(500).json(response);
  }
});

// ─── DELETE /admin/users/:id ───────────────────────────────────────────────
adminRoutes.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Clean up related data
    await Promise.all([
      InstagramAccount.deleteMany({ userId: req.params.id }),
      Automation.deleteMany({ userId: req.params.id }),
    ]);

    // Evict from cache
    cache.del(CACHE_KEY.USER(String(req.params.id)));
    cache.del(CACHE_KEY.IG_ACCOUNT(String(req.params.id)));
    cache.del(CACHE_KEY.AUTOMATIONS(String(req.params.id)));
    // Invalidate admin stats cache
    cache.del(CACHE_KEY.ADMIN_STATS);
    cache.del(CACHE_KEY.ADMIN_DAU);

    return res.json({ success: true, message: "User deleted" });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete user",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /admin/cache-stats ────────────────────────────────────────────────
adminRoutes.get("/cache-stats", (_req: Request, res: Response) => {
  return res.json({ success: true, data: cache.stats() });
});

// ─── POST /admin/cache-flush ───────────────────────────────────────────────
adminRoutes.post("/cache-flush", (_req: Request, res: Response) => {
  cache.flush();
  return res.json({ success: true, message: "Cache flushed" });
});

// ─── Helper: seed the initial admin user ──────────────────────────────────
export async function seedInitialAdmin(): Promise<void> {
  try {
    const count = await User.countDocuments({ role: UserRole.ADMIN });
    if (count > 0) return; // admins already exist

    const updated = await User.findOneAndUpdate(
      { email: INITIAL_ADMIN_EMAIL },
      { role: UserRole.ADMIN },
      { new: true }
    );

    if (updated) {
      console.log(`[Admin Seed] Promoted ${INITIAL_ADMIN_EMAIL} to admin`);
    } else {
      console.warn(`[Admin Seed] User ${INITIAL_ADMIN_EMAIL} not found — register first`);
    }
  } catch (err) {
    console.error("[Admin Seed] Error:", err);
  }
}
