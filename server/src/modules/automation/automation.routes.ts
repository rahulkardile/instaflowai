import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/authMiddleware";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import InstagramAccount from "../../models/InstagramAccounts";

const automationRoutes = Router();

automationRoutes.use(authMiddleware);

const createAutomationSchema = z.object({
  reelId: z.string().min(1, "reelId is required"),
  keywords: z.array(z.string()).default([]),
  commentReply: z.string().optional(),
  dmMessage: z.string().optional(),
});

const updateAutomationSchema = z.object({
  reelId: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  commentReply: z.string().optional(),
  dmMessage: z.string().optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET / — List all automations for the authenticated user.
 */
automationRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const automations = await Automation.find({ userId: req.user!.userId }).populate(
      "instagramAccountId"
    );
    return res.status(200).json({ success: true, data: { automations } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch automations",
    });
  }
});

/**
 * POST / — Create a new automation.
 */
automationRoutes.post("/", async (req: Request, res: Response) => {
  const parsed = createAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid automation data",
    });
  }

  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });

    if (!igAccount) {
      return res.status(400).json({
        success: false,
        message: "No Instagram account connected. Please connect Instagram first.",
      });
    }

    const automation = await Automation.create({
      userId: req.user!.userId,
      instagramAccountId: igAccount._id,
      reelId: parsed.data.reelId,
      keywords: parsed.data.keywords,
      commentReply: parsed.data.commentReply,
      dmMessage: parsed.data.dmMessage,
    });

    return res.status(201).json({ success: true, data: { automation } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create automation",
    });
  }
});

/**
 * PUT /:id — Update an existing automation (ownership verified).
 */
automationRoutes.put("/:id", async (req: Request, res: Response) => {
  const parsed = updateAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid update data",
    });
  }

  try {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      parsed.data,
      { new: true }
    );

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: "Automation not found",
      });
    }

    return res.status(200).json({ success: true, data: { automation } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update automation",
    });
  }
});

/**
 * DELETE /:id — Delete an automation (ownership verified).
 */
automationRoutes.delete("/:id", async (req: Request, res: Response) => {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: "Automation not found",
      });
    }

    return res.status(200).json({ success: true, message: "Automation deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete automation",
    });
  }
});

/**
 * GET /logs — Fetch execution logs for the user's automations.
 */
automationRoutes.get("/logs", async (req: Request, res: Response) => {
  try {
    // Find all automation IDs owned by this user
    const userAutomations = await Automation.find({ userId: req.user!.userId }).select("_id");
    const automationIds = userAutomations.map((a) => a._id);

    const logs = await ExecutionLog.find({ automationId: { $in: automationIds } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("automationId");

    return res.status(200).json({ success: true, data: { logs } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch logs",
    });
  }
});

export { automationRoutes };
