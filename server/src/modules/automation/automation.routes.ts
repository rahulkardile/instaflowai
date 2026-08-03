import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import InstagramAccount from "../../models/InstagramAccounts";
import { createAutomationSchema, updateAutomationSchema } from "./automation.schema";
import { DEFAULT_LOG_LIMIT } from "../../constants";
import type { ApiResponse } from "../../types/common.types";
import type { IAutomation } from "../../types/automation.types";
import type { IExecutionLog } from "../../types/executionLog.types";

const automationRoutes = Router();

automationRoutes.use(authMiddleware);

// ─── GET / — List all automations for the authenticated user ───────────────
automationRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const automations = await Automation.find({ userId: req.user!.userId }).populate(
      "instagramAccountId"
    );
    const response: ApiResponse<IAutomation[]> = { success: true, data: automations as unknown as IAutomation[] };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch automations",
    };
    return res.status(500).json(response);
  }
});

// ─── POST / — Create a new automation ─────────────────────────────────────
automationRoutes.post("/", async (req: Request, res: Response) => {
  const parsed = createAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid automation data",
    };
    return res.status(400).json(response);
  }

  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });

    if (!igAccount) {
      const response: ApiResponse = {
        success: false,
        message: "No Instagram account connected. Please connect Instagram first.",
      };
      return res.status(400).json(response);
    }

    const { type, reelId, keywords, commentReply, dmMessage, dmReplyMessage, enabled } = parsed.data;

    const automation = await Automation.create({
      userId: req.user!.userId,
      instagramAccountId: igAccount._id,
      type,
      reelId: reelId ?? null,
      keywords,
      commentReply,
      dmMessage,
      dmReplyMessage,
      enabled,
    });

    const response: ApiResponse<{ automation: IAutomation }> = {
      success: true,
      data: { automation: automation as unknown as IAutomation },
    };
    return res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create automation",
    };
    return res.status(500).json(response);
  }
});

// ─── PUT /:id — Update an existing automation (ownership verified) ─────────
automationRoutes.put("/:id", async (req: Request, res: Response) => {
  const parsed = updateAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid update data",
    };
    return res.status(400).json(response);
  }

  try {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      parsed.data,
      { new: true }
    );

    if (!automation) {
      const response: ApiResponse = { success: false, message: "Automation not found" };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{ automation: IAutomation }> = {
      success: true,
      data: { automation: automation as unknown as IAutomation },
    };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update automation",
    };
    return res.status(500).json(response);
  }
});

// ─── DELETE /:id — Delete an automation (ownership verified) ───────────────
automationRoutes.delete("/:id", async (req: Request, res: Response) => {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!automation) {
      const response: ApiResponse = { success: false, message: "Automation not found" };
      return res.status(404).json(response);
    }

    const response: ApiResponse = { success: true, message: "Automation deleted" };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete automation",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /logs — Fetch execution logs for the user's automations ───────────
automationRoutes.get("/logs", async (req: Request, res: Response) => {
  try {
    const userAutomations = await Automation.find({ userId: req.user!.userId }).select("_id");
    const automationIds = userAutomations.map((a) => a._id);

    const logs = await ExecutionLog.find({
      $or: [{ userId: req.user!.userId }, { automationId: { $in: automationIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(DEFAULT_LOG_LIMIT)
      .populate("automationId");

    const response: ApiResponse<IExecutionLog[]> = {
      success: true,
      data: logs as unknown as IExecutionLog[],
    };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch logs",
    };
    return res.status(500).json(response);
  }
});

export { automationRoutes };
