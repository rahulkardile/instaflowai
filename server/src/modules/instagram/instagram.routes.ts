import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { authMiddleware } from "../../middleware/authMiddleware";
import { InstagramService } from "./instagram.service";
import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import {
  WEBHOOK_LOG_FILENAME,
  EXECUTION_ACTION,
  EXECUTION_STATUS,
  AUTOMATION_TYPE,
  WEBHOOK_FIELD,
} from "../../constants";
import type { ApiResponse } from "../../types/common.types";
import type { MappedReel, WebhookEntry, WebhookChange, WebhookCommentValue, WebhookFeedCommentValue, WebhookMessagingEvent, NormalisedCommentEvent } from "../../types/instagram.types";
import type { ExecutionStatus } from "../../types/executionLog.types";

const instagramRoutes = Router();
const instagramService = new InstagramService();

// ─── Persistent webhook log ────────────────────────────────────────────────
const WEBHOOK_LOG_FILE = path.join(process.cwd(), WEBHOOK_LOG_FILENAME);

function logToFile(label: string, data: unknown): void {
  const line = `[${new Date().toISOString()}] ${label}: ${JSON.stringify(data)}\n`;
  try {
    fs.appendFileSync(WEBHOOK_LOG_FILE, line);
  } catch {
    // Never crash the server over a logging failure
  }
}

// ─── GET /auth — Return the Instagram OAuth URL ────────────────────────────
instagramRoutes.get("/auth", authMiddleware, async (req: Request, res: Response) => {
  try {
    const url = instagramService.getAuthUrl(req.user!.userId);
    const response: ApiResponse<{ url: string }> = { success: true, data: { url } };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate auth URL",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /callback — Facebook redirects here after user authorizes ─────────
instagramRoutes.get("/callback", async (req: Request, res: Response) => {
  const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "") ?? "http://localhost:5173";

  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;
    const errorParam = req.query.error as string | undefined;
    const errorReason = req.query.error_reason as string | undefined;

    // Instagram may send back an error (e.g. user denied access)
    if (errorParam) {
      console.warn(`[callback] Instagram returned error: ${errorParam} — ${errorReason}`);
      return res.redirect(
        `${clientUrl}/dashboard?ig_error=true&reason=${encodeURIComponent(errorReason ?? errorParam)}`
      );
    }

    if (!code || !userId) {
      console.warn("[callback] Missing code or state in query params:", req.query);
      return res.redirect(`${clientUrl}/dashboard?ig_error=true&reason=missing_params`);
    }

    await instagramService.handleCallback(code, userId);
    return res.redirect(`${clientUrl}/dashboard?ig_connected=true`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[callback] OAuth error:", message, error);
    return res.redirect(
      `${clientUrl}/dashboard?ig_error=true&reason=${encodeURIComponent(message)}`
    );
  }
});

// ─── DELETE /disconnect — Remove connected Instagram account ───────────────
instagramRoutes.delete("/disconnect", authMiddleware, async (req: Request, res: Response) => {
  try {
    await instagramService.disconnect(req.user!.userId);
    const response: ApiResponse = { success: true, message: "Instagram disconnected" };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /reels — Fetch and sync the user's Reels ─────────────────────────
instagramRoutes.get("/reels", authMiddleware, async (req: Request, res: Response) => {
  try {
    const reels = await instagramService.fetchAndSyncReels(req.user!.userId);
    const response: ApiResponse<MappedReel[]> = { success: true, data: reels };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch reels",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /account — Return connected Instagram account info ────────────────
instagramRoutes.get("/account", authMiddleware, async (req: Request, res: Response) => {
  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId }).select(
      "instagramUserId username createdAt tokenExpiresAt"
    );
    const response: ApiResponse = { success: true, data: igAccount };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch account",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /conversations — Fetch DM conversation logs ──────────────────────
instagramRoutes.get("/conversations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await ExecutionLog.find({
      userId: req.user!.userId,
      action: { $in: [EXECUTION_ACTION.DM_RECEIVED, EXECUTION_ACTION.SEND_DM, EXECUTION_ACTION.DM_AUTO_REPLY] },
      dmSenderId: { $exists: true, $ne: null },
    }).sort({ createdAt: 1 });

    const response: ApiResponse = { success: true, data: logs };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch conversations",
    };
    return res.status(500).json(response);
  }
});

// ─── POST /message — Send a manual DM reply from the portal ───────────────
instagramRoutes.post("/message", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { recipientId, text } = req.body as { recipientId?: string; text?: string };

    if (!recipientId || !text) {
      const response: ApiResponse = { success: false, message: "recipientId and text are required" };
      return res.status(400).json(response);
    }

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      const response: ApiResponse = { success: false, message: "Instagram account not connected" };
      return res.status(400).json(response);
    }

    await instagramService.sendDMReply(igAccount.instagramUserId!, recipientId, text, igAccount.accessToken);

    const log = await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      dmSenderId: recipientId,
      dmText: text,
      action: EXECUTION_ACTION.SEND_DM,
      status: EXECUTION_STATUS.SUCCESS,
    });

    const response: ApiResponse = { success: true, data: log };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send message",
    };
    return res.status(500).json(response);
  }
});

// ─── POST /comment — Post a manual comment on a reel/media ────────────────
/**
 * Body: { mediaId: string, message: string }
 * Posts a top-level comment from the connected Instagram account onto any media.
 * Requires: instagram_business_manage_comments permission.
 */
instagramRoutes.post("/comment", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { mediaId, message } = req.body as { mediaId?: string; message?: string };

    if (!mediaId || !message?.trim()) {
      const response: ApiResponse = { success: false, message: "mediaId and message are required" };
      return res.status(400).json(response);
    }

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      const response: ApiResponse = { success: false, message: "Instagram account not connected" };
      return res.status(400).json(response);
    }

    const result = await instagramService.postComment(mediaId, message.trim(), igAccount.accessToken);

    // Log the manual comment action
    const log = await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      commentId: result.id,
      commentText: message.trim(),
      action: EXECUTION_ACTION.COMMENT_REPLY,
      status: EXECUTION_STATUS.SUCCESS,
    });

    console.log(`[POST /comment] Comment posted — id: ${result.id}, media: ${mediaId}`);
    const response: ApiResponse = { success: true, data: { commentId: result.id, log } };
    return res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to post comment",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /comments/:mediaId — Read all comments on a media object ──────────
/**
 * Fetches all top-level comments + first-level replies from the Instagram API
 * for the given media ID. Ordered newest first.
 */
instagramRoutes.get("/comments/:mediaId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const mediaIdParam = req.params.mediaId;
    const mediaId = Array.isArray(mediaIdParam) ? mediaIdParam[0] : mediaIdParam;

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      const response: ApiResponse = { success: false, message: "Instagram account not connected" };
      return res.status(400).json(response);
    }

    const comments = await instagramService.getComments(mediaId, igAccount.accessToken);


    const response: ApiResponse = { success: true, data: { mediaId, count: comments.length, comments } };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch comments",
    };
    return res.status(500).json(response);
  }
});

// ─── GET /comment-logs — Read all webhook-captured incoming comments ────────
/**
 * Returns all comments received via webhook (COMMENT_RECEIVED entries in ExecutionLog),
 * ordered newest first. This is the real-time comment stream that the webhook captured.
 */
instagramRoutes.get("/comment-logs", authMiddleware, async (req: Request, res: Response) => {
  try {
    const mediaId = req.query.mediaId as string | undefined;

    const filter: Record<string, unknown> = {
      userId: req.user!.userId,
      action: EXECUTION_ACTION.COMMENT_RECEIVED,
    };

    // Optional: filter to a specific reel's comments
    if (mediaId) {
      // commentId field stores the IG comment ID; we cannot filter by mediaId directly here
      // because ExecutionLog doesn't store mediaId. Add a log note for clarity.
      console.log(`[GET /comment-logs] Note: mediaId filter is advisory — ExecutionLog stores comment IDs, not media IDs.`);
    }

    const logs = await ExecutionLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("commenterId commenterUsername commentId commentText createdAt status");

    console.log(`[GET /comment-logs] Returning ${logs.length} comment log(s) for user ${req.user!.userId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        count: logs.length,
        comments: logs,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch comment logs",
    };
    return res.status(500).json(response);
  }
});

// ─── Webhook Endpoints (no auth — public, called by Meta) ─────────────────

/**
 * GET /webhook — Meta webhook verification challenge.
 */
instagramRoutes.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  logToFile("GET Verification Request", { mode, token, challenge });
  console.log("[webhook] Verification request — mode:", mode, "token match:", token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN);

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log("[webhook] Verification SUCCESS");
    return res.status(200).send(challenge);
  }

  console.warn("[webhook] Verification FAILED — token mismatch");
  return res.status(403).json({ success: false, message: "Verification failed" });
});

/**
 * POST /webhook — Receive incoming webhook events from Meta.
 * Handles both comment events (entry.changes) and DM events (entry.messaging).
 * Always responds 200 immediately — Meta requires this.
 */
instagramRoutes.post("/webhook", async (req: Request, res: Response) => {
  // Respond 200 immediately — Meta retries if it doesn't get a fast response
  res.sendStatus(200);

  try {
    const body = req.body as { entry?: WebhookEntry[] };
    logToFile("POST Webhook Payload", body);

    if (!body.entry?.length) return;

    for (const entry of body.entry) {
      if (entry.changes?.length) {
        for (const change of entry.changes) {
          await handleCommentWebhook(change, entry).catch((err) => {
            console.error("[webhook] Comment handler error:", err);
          });
        }
      }

      if (entry.messaging?.length) {
        for (const messagingEvent of entry.messaging) {
          await handleMessagingWebhook(messagingEvent, entry).catch((err) => {
            console.error("[webhook] Messaging handler error:", err);
          });
        }
      }
    }
  } catch (error) {
    console.error("[webhook] Unhandled error:", error);
  }
});

// ─── Private webhook handler helpers ──────────────────────────────────────

/**
 * Normalise a raw webhook change into a consistent comment event shape.
 * Returns null if the change is not a comment event we can handle.
 */
function normaliseCommentChange(change: WebhookChange): NormalisedCommentEvent | null {
  const val = change.value as WebhookCommentValue & WebhookFeedCommentValue;

  if (change.field === WEBHOOK_FIELD.COMMENTS) {
    const comment_id = val.id ?? val.comment_id ?? "";
    const sender_id = val.from?.id ?? "";
    const commenter_username = val.from?.username ?? "";
    const message = val.text ?? "";
    const media_id = val.media?.id ?? val.media_id ?? "";

    if (!comment_id) return null;
    return { comment_id, sender_id, commenter_username, message, media_id };
  }

  if (change.field === WEBHOOK_FIELD.FEED && val.item === "comment") {
    const comment_id = val.comment_id ?? "";
    const sender_id = val.sender_id ?? "";
    const commenter_username = val.sender_name ?? "";
    const message = val.message ?? "";
    const media_id = val.media_id ?? val.post_id ?? "";

    if (!comment_id) return null;
    return { comment_id, sender_id, commenter_username, message, media_id };
  }

  console.log(`[webhook] Skipping unhandled field: ${change.field}`);
  return null;
}

/**
 * Handle a comment webhook change event.
 * Logs the incoming comment and triggers any matching COMMENT automations.
 */
async function handleCommentWebhook(change: WebhookChange, entry: WebhookEntry): Promise<void> {
  const event = normaliseCommentChange(change);
  if (!event) return;

  const { comment_id, sender_id, commenter_username, message, media_id } = event;

  console.log(
    `[webhook-comment] comment_id: ${comment_id}, media_id: ${media_id}, from: @${commenter_username}, text: "${message}"`
  );

  // Find the Instagram account that owns the post
  const recipientIgAccount = await InstagramAccount.findOne({ instagramUserId: entry.id });

  if (recipientIgAccount) {
    await ExecutionLog.create({
      userId: recipientIgAccount.userId,
      instagramAccountId: recipientIgAccount._id,
      commenterId: sender_id,
      commenterUsername: commenter_username,
      commentId: comment_id,
      commentText: message,
      action: EXECUTION_ACTION.COMMENT_RECEIVED,
      status: EXECUTION_STATUS.SUCCESS,
    });
  }

  // Find all enabled COMMENT automations
  const automations = await Automation.find({ type: AUTOMATION_TYPE.COMMENT, enabled: true });
  console.log(`[webhook-comment] ${automations.length} enabled COMMENT automation(s)`);

  for (const automation of automations) {
    const reelMatch = automation.reelId === media_id;
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) => message.toLowerCase().includes(kw.toLowerCase()))
      : true;

    console.log(
      `[webhook-comment] Automation ${automation._id}: reelMatch=${reelMatch} keywordMatch=${keywordMatch}`
    );

    if (!reelMatch || !keywordMatch) continue;

    const igAccount = await InstagramAccount.findById(automation.instagramAccountId);
    if (!igAccount?.accessToken) {
      console.warn(`[webhook-comment] Automation ${automation._id} skipped — no access token`);
      continue;
    }

    // ── Reply to comment ──────────────────────────────────────
    if (automation.commentReply) {
      let replyStatus: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
      let replyError = "";

      try {
        await instagramService.replyToComment(comment_id, automation.commentReply, igAccount.accessToken);
        console.log(`[webhook-comment] Comment reply sent for automation ${automation._id}`);
      } catch (err) {
        replyStatus = EXECUTION_STATUS.FAILED;
        replyError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[webhook-comment] Comment reply FAILED:`, replyError);
      }

      await ExecutionLog.create({
        automationId: automation._id,
        commenterId: sender_id,
        commenterUsername: commenter_username,
        commentId: comment_id,
        commentText: message,
        action: EXECUTION_ACTION.COMMENT_REPLY,
        status: replyStatus,
        errorMessage: replyError || undefined,
      });
    }

    // ── Send Private DM to commenter ──────────────────────────
    if (automation.dmMessage) {
      let dmStatus: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
      let dmError = "";

      try {
        if (!igAccount.instagramUserId) {
          throw new Error("instagramUserId missing — reconnect Instagram");
        }
        await instagramService.sendPrivateDM(
          igAccount.instagramUserId,
          comment_id,
          automation.dmMessage,
          igAccount.accessToken
        );
        console.log(`[webhook-comment] Private DM sent for automation ${automation._id}`);
      } catch (err) {
        dmStatus = EXECUTION_STATUS.FAILED;
        dmError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[webhook-comment] Private DM FAILED:`, dmError);
      }

      await ExecutionLog.create({
        automationId: automation._id,
        commenterId: sender_id,
        commenterUsername: commenter_username,
        commentId: comment_id,
        commentText: message,
        action: EXECUTION_ACTION.SEND_DM,
        status: dmStatus,
        errorMessage: dmError || undefined,
      });
    }
  }
}

/**
 * Handle an incoming DM webhook event.
 * Logs the incoming message and triggers any matching DM automations.
 */
async function handleMessagingWebhook(messagingEvent: WebhookMessagingEvent, entry: WebhookEntry): Promise<void> {
  // Skip echo messages (sent by the IG account itself)
  if (messagingEvent.message?.is_echo) {
    console.log("[webhook-dm] Skipping echo message");
    return;
  }

  const senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id ?? entry.id;
  const messageText = messagingEvent.message?.text;

  if (!senderId || !messageText) {
    console.log("[webhook-dm] Skipping — missing sender or message text");
    return;
  }

  console.log(`[webhook-dm] sender: ${senderId}, recipient: ${recipientId}, text: "${messageText}"`);

  const igAccount = await InstagramAccount.findOne({ instagramUserId: recipientId });

  if (igAccount) {
    await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      dmSenderId: senderId,
      dmText: messageText,
      action: EXECUTION_ACTION.DM_RECEIVED,
      status: EXECUTION_STATUS.SUCCESS,
    });
  }

  if (!igAccount?.accessToken) {
    console.warn(`[webhook-dm] No IG account found for recipient ${recipientId}`);
    return;
  }

  const automations = await Automation.find({
    type: AUTOMATION_TYPE.DM,
    enabled: true,
    userId: igAccount.userId,
  });

  console.log(`[webhook-dm] ${automations.length} enabled DM automation(s) for user ${igAccount.userId}`);

  for (const automation of automations) {
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) => messageText.toLowerCase().includes(kw.toLowerCase()))
      : true;

    if (!keywordMatch) {
      console.log(`[webhook-dm] Automation ${automation._id} skipped — no keyword match`);
      continue;
    }

    const replyMessage = automation.dmReplyMessage;
    if (!replyMessage) {
      console.log(`[webhook-dm] Automation ${automation._id} skipped — no dmReplyMessage`);
      continue;
    }

    let status: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
    let errorMessage = "";

    try {
      await instagramService.sendDMReply(
        igAccount.instagramUserId!,
        senderId,
        replyMessage,
        igAccount.accessToken
      );
      console.log(`[webhook-dm] Auto-reply sent for automation ${automation._id}`);
    } catch (err) {
      status = EXECUTION_STATUS.FAILED;
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[webhook-dm] Auto-reply FAILED:`, errorMessage);
    }

    await ExecutionLog.create({
      automationId: automation._id,
      dmSenderId: senderId,
      dmText: messageText,
      action: EXECUTION_ACTION.DM_AUTO_REPLY,
      status,
      errorMessage: errorMessage || undefined,
    });
  }
}

export { instagramRoutes };
