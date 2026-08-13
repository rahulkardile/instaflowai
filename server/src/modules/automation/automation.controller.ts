import { Request, Response } from "express";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import InstagramAccount from "../../models/InstagramAccounts";
import { createAutomationSchema, updateAutomationSchema } from "./automation.schema";
import { DEFAULT_LOG_LIMIT } from "../../constants";
import type { ApiResponse } from "../../types/common.types";
import type { IAutomation } from "../../types/automation.types";
import type { IExecutionLog } from "../../types/executionLog.types";

// ─── GET / — List automations ─────────────────────────────────────────────

export async function listAutomations(req: Request, res: Response): Promise<void> {
  try {
    const automations = await Automation.find({ userId: req.user!.userId }).populate(
      "instagramAccountId"
    );
    const response: ApiResponse<IAutomation[]> = {
      success: true,
      data: automations as unknown as IAutomation[],
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch automations",
    });
  }
}

// ─── POST / — Create automation ───────────────────────────────────────────

export async function createAutomation(req: Request, res: Response): Promise<void> {
  const parsed = createAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid automation data",
    });
    return;
  }

  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });

    if (!igAccount) {
      res.status(400).json({
        success: false,
        message: "No Instagram account connected. Please connect Instagram first.",
      });
      return;
    }

    const { type, reelId, keywords, commentReply, dmMessage, dmReplyMessage, enabled } =
      parsed.data;

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
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create automation",
    });
  }
}

// ─── PUT /:id — Update automation ─────────────────────────────────────────

export async function updateAutomation(req: Request, res: Response): Promise<void> {
  const parsed = updateAutomationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid update data",
    });
    return;
  }

  try {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      parsed.data,
      { new: true }
    );

    if (!automation) {
      res.status(404).json({ success: false, message: "Automation not found" });
      return;
    }

    const response: ApiResponse<{ automation: IAutomation }> = {
      success: true,
      data: { automation: automation as unknown as IAutomation },
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update automation",
    });
  }
}

// ─── DELETE /:id — Delete automation ──────────────────────────────────────

export async function deleteAutomation(req: Request, res: Response): Promise<void> {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!automation) {
      res.status(404).json({ success: false, message: "Automation not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Automation deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete automation",
    });
  }
}

// ─── GET /logs — Execution logs ───────────────────────────────────────────

export async function getLogs(req: Request, res: Response): Promise<void> {
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
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch logs",
    });
  }
}
