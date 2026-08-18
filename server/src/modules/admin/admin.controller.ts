import { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../../models/User";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import InstagramAccount from "../../models/InstagramAccounts";
import Reels from "../../models/Reels";

// ── Collection registry ─────────────────────────────────────────────────────
// Maps URL-friendly names to Mongoose models
const COLLECTION_MAP: Record<string, mongoose.Model<any>> = {
  users: User,
  automations: Automation,
  executionlogs: ExecutionLog,
  instagramaccounts: InstagramAccount,
  reels: Reels,
};

function getModel(name: string): mongoose.Model<any> | null {
  return COLLECTION_MAP[name.toLowerCase()] ?? null;
}

// ── GET /api/admin/collections ──────────────────────────────────────────────
export async function listCollections(_req: Request, res: Response) {
  try {
    const collections = await Promise.all(
      Object.entries(COLLECTION_MAP).map(async ([key, model]) => {
        const count = await model.countDocuments();
        return {
          name: key,
          displayName: model.modelName,
          count,
        };
      })
    );
    res.json({ success: true, data: collections });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/collections/:name ───────────────────────────────────────
export async function getDocuments(req: Request, res: Response) {
  const model = getModel(String(req.params.name));
  if (!model) return res.status(404).json({ success: false, message: "Collection not found" });

  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? "20")));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      model.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      model.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/collections/:name/:id ──────────────────────────────────
export async function getDocument(req: Request, res: Response) {
  const model = getModel(String(req.params.name));
  if (!model) return res.status(404).json({ success: false, message: "Collection not found" });

  try {
    const doc = await model.findById(String(req.params.id)).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── PATCH /api/admin/collections/:name/:id ─────────────────────────────────
export async function updateDocument(req: Request, res: Response) {
  const model = getModel(String(req.params.name));
  if (!model) return res.status(404).json({ success: false, message: "Collection not found" });

  try {
    // Prevent overwriting _id or __v
    const { _id, __v, ...updates } = req.body;

    const doc = await model
      .findByIdAndUpdate(String(req.params.id), { $set: updates }, { new: true, runValidators: true })
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ── DELETE /api/admin/collections/:name/:id ────────────────────────────────
export async function deleteDocument(req: Request, res: Response) {
  const model = getModel(String(req.params.name));
  if (!model) return res.status(404).json({ success: false, message: "Collection not found" });

  try {
    const doc = await model.findByIdAndDelete(String(req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, message: "Document deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── DELETE /api/admin/collections/:name ────────────────────────────────────
// Drops ALL documents from the collection (wipe)
export async function dropCollection(req: Request, res: Response) {
  const model = getModel(String(req.params.name));
  if (!model) return res.status(404).json({ success: false, message: "Collection not found" });

  try {
    const result = await model.deleteMany({});
    res.json({
      success: true,
      message: `Dropped ${result.deletedCount} document(s) from ${model.modelName}`,
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────
// Cascade-delete a user and all their associated data
export async function deleteUser(req: Request, res: Response) {
  const userId = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Collect automation IDs so we can cascade execution logs
    const automations = await Automation.find({ userId }).select("_id").lean();
    const automationIds = automations.map((a) => a._id);

    // Delete all associated data in parallel
    const [automResult, logsByUser, logsByAutomation, igResult] = await Promise.all([
      Automation.deleteMany({ userId }),
      ExecutionLog.deleteMany({ userId }),
      automationIds.length
        ? ExecutionLog.deleteMany({ automationId: { $in: automationIds } })
        : Promise.resolve({ deletedCount: 0 }),
      InstagramAccount.deleteMany({ userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User "${user.email}" and all associated data removed`,
      details: {
        automationsDeleted: automResult.deletedCount,
        executionLogsDeleted: (logsByUser.deletedCount ?? 0) + (logsByAutomation.deletedCount ?? 0),
        instagramAccountsDeleted: igResult.deletedCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────
export async function getStats(_req: Request, res: Response) {
  try {
    const now = new Date();

    // ── Time windows ────────────────────────────────────────────────────────
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 29);
    last30Days.setHours(0, 0, 0, 0);

    // ── Parallel queries ─────────────────────────────────────────────────────
    const [
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      newUsersPrevMonth,
      usersWithInstagram,
      totalAutomations,
      enabledAutomations,
      commentAutomations,
      dmAutomations,
      totalLogs,
      successLogs,
      failedLogs,
      todayLogs,
      dmsSent,
      dmsReceived,
      dmAutoReplies,
      commentReplies,
      commentsReceived,
      totalInstagramAccounts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
      User.countDocuments({ instagramConnected: true }),
      Automation.countDocuments(),
      Automation.countDocuments({ enabled: true }),
      Automation.countDocuments({ type: "COMMENT" }),
      Automation.countDocuments({ type: "DM" }),
      ExecutionLog.countDocuments(),
      ExecutionLog.countDocuments({ status: "SUCCESS" }),
      ExecutionLog.countDocuments({ status: "FAILED" }),
      ExecutionLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      ExecutionLog.countDocuments({ action: "SEND_DM" }),
      ExecutionLog.countDocuments({ action: "DM_RECEIVED" }),
      ExecutionLog.countDocuments({ action: "DM_AUTO_REPLY" }),
      ExecutionLog.countDocuments({ action: "COMMENT_REPLY" }),
      ExecutionLog.countDocuments({ action: "COMMENT_RECEIVED" }),
      InstagramAccount.countDocuments(),
    ]);

    // ── MRR / ARR (connected users × plan price) ────────────────────────────
    // Swap PLAN_PRICE_USD for real Stripe data when billing is added
    const PLAN_PRICE_USD = 9.99; // monthly plan price per user
    const mrr = Math.round(usersWithInstagram * PLAN_PRICE_USD * 100) / 100;
    const arr = Math.round(mrr * 12 * 100) / 100;

    // ── Month-over-month growth (%) ──────────────────────────────────────────
    const userGrowthPct =
      newUsersPrevMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100 * 10) / 10
        : newUsersThisMonth > 0
        ? 100
        : 0;

    // ── Automation success rate ──────────────────────────────────────────────
    const successRate =
      totalLogs > 0 ? Math.round((successLogs / totalLogs) * 1000) / 10 : 0;

    // ── Per-day user signups + executions (last 30 days) ────────────────────
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const logGrowthAgg = await ExecutionLog.aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build a complete 30-day day-by-day map
    const dayMap: Record<string, { users: number; actions: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30Days);
      d.setDate(last30Days.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { users: 0, actions: 0 };
    }
    for (const r of userGrowthAgg) dayMap[r._id] = { ...dayMap[r._id], users: r.count };
    for (const r of logGrowthAgg) {
      if (dayMap[r._id]) dayMap[r._id].actions = r.count;
    }
    const growthChart = Object.entries(dayMap).map(([date, vals]) => ({ date, ...vals }));

    // ── Top automations by execution count ───────────────────────────────────
    const topAutomationsAgg = await ExecutionLog.aggregate([
      { $match: { automationId: { $exists: true, $ne: null } } },
      { $group: { _id: "$automationId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        // Revenue
        revenue: {
          mrr,
          arr,
          planPriceUsd: PLAN_PRICE_USD,
          payingUsers: usersWithInstagram,
        },

        // Users
        users: {
          total: totalUsers,
          active: activeUsers,
          withInstagram: usersWithInstagram,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          growthPct: userGrowthPct,
        },

        // Automations
        automations: {
          total: totalAutomations,
          enabled: enabledAutomations,
          comment: commentAutomations,
          dm: dmAutomations,
        },

        // Execution / Activity
        activity: {
          total: totalLogs,
          today: todayLogs,
          success: successLogs,
          failed: failedLogs,
          successRate,
          dmsSent,
          dmsReceived,
          dmAutoReplies,
          commentReplies,
          commentsReceived,
        },

        // Instagram
        instagramAccounts: {
          total: totalInstagramAccounts,
          connected: usersWithInstagram,
        },

        // Chart data
        charts: {
          growthLast30Days: growthChart,
          topAutomationsByExecutions: topAutomationsAgg,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
