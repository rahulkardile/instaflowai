import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { InstagramService } from "./instagram.service";
import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import fs from "fs";
import path from "path";

const instagramRoutes = Router();
const instagramService = new InstagramService();

// Persistent webhook log file
const WEBHOOK_LOG_FILE = path.join(process.cwd(), "webhook_debug.log");

function logToFile(label: string, data: unknown) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${label}: ${JSON.stringify(data)}\n`;
  fs.appendFileSync(WEBHOOK_LOG_FILE, line);
}

/**
 * GET /auth — Return the Facebook OAuth URL.
 */
instagramRoutes.get("/auth", authMiddleware, async (req: Request, res: Response) => {
  try {
    const url = instagramService.getAuthUrl(req.user!.userId);
    return res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate auth URL",
    });
  }
});

/**
 * GET /callback — Facebook redirects here after user authorizes.
 */
instagramRoutes.get("/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing code or state parameter",
      });
    }

    await instagramService.handleCallback(code, userId);

    const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "") || "http://localhost:5173";
    return res.redirect(`${clientUrl}/dashboard?ig_connected=true`);
  } catch (error) {
    console.error("Instagram callback error:", error);
    const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "") || "http://localhost:5173";
    return res.redirect(`${clientUrl}/dashboard?ig_error=true`);
  }
});

/**
 * DELETE /disconnect — Disconnect the user's Instagram account.
 */
instagramRoutes.delete("/disconnect", authMiddleware, async (req: Request, res: Response) => {
  try {
    await instagramService.disconnect(req.user!.userId);
    return res.status(200).json({ success: true, message: "Instagram disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    });
  }
});

/**
 * GET /reels — Fetch and sync the user's Instagram Reels.
 */
instagramRoutes.get("/reels", authMiddleware, async (req: Request, res: Response) => {
  try {
    const reels = await instagramService.fetchAndSyncReels(req.user!.userId);

    // Map MongoDB camelCase fields → snake_case shape expected by the client
    const mapped = reels.map((r: any) => ({
      id: r.reelId ?? r._id?.toString(),
      caption: r.caption,
      thumbnail_url: r.thumbnailUrl,
      media_url: r.mediaUrl,
      like_count: r.likesCount ?? 0,
      comments_count: r.commentsCount ?? 0,
      permalink: r.permalink,
      timestamp: r.createdAt,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch reels",
    });
  }
});

/**
 * GET /account — Fetch the user's connected Instagram Account info.
 */
instagramRoutes.get("/account", authMiddleware, async (req: Request, res: Response) => {
  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId }).select(
      "instagramUserId username createdAt tokenExpiresAt"
    );
    return res.status(200).json({ success: true, data: igAccount });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch account",
    });
  }
});

/**
 * GET /conversations — Fetch DM history for the user.
 */
instagramRoutes.get("/conversations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await ExecutionLog.find({
      userId: req.user!.userId,
      action: { $in: ["DM_RECEIVED", "SEND_DM", "DM_AUTO_REPLY"] },
      dmSenderId: { $exists: true, $ne: null }
    }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch conversations",
    });
  }
});

/**
 * POST /message — Send a DM reply from the portal.
 */
instagramRoutes.post("/message", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) {
      return res.status(400).json({ success: false, message: "recipientId and text are required" });
    }

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount || !igAccount.accessToken) {
      return res.status(400).json({ success: false, message: "Instagram account not connected" });
    }

    await instagramService.sendDMReply(
      igAccount.instagramUserId!,
      recipientId,
      text,
      igAccount.accessToken
    );

    const log = await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      dmSenderId: recipientId,
      dmText: text,
      action: "SEND_DM",
      status: "SUCCESS",
    });

    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send message",
    });
  }
});

// ─── Webhook endpoints (no auth) ──────────────────────────────────────────

/**
 * GET /webhook — Facebook webhook verification.
 */
instagramRoutes.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  console.log("--- Webhook Verification Request ---");
  console.log("Received mode:", mode);
  console.log("Received token:", token);
  console.log("Expected token:", process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN);
  logToFile("GET Verification Request", { mode, token, challenge });

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log("Verification SUCCESS");
    return res.status(200).send(challenge);
  }

  console.log("Verification FAILED (403)");
  return res.status(403).json({ success: false, message: "Verification failed" });
});

/**
 * POST /webhook — Receive incoming webhook events from Facebook / Instagram.
 * Handles both comment events and messaging events.
 */
instagramRoutes.post("/webhook", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    console.log("[webhook] Raw payload:", JSON.stringify(body, null, 2));
    logToFile("POST Webhook Payload", body);

    if (!body.entry) {
      return res.sendStatus(200);
    }

    for (const entry of body.entry) {
      // ─── Handle Comment Events ─────────────────────────────────────
      if (entry.changes) {
        for (const change of entry.changes) {
          await handleCommentWebhook(change, entry);
        }
      }

      // ─── Handle Messaging Events (DM automation) ───────────────────
      if (entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          await handleMessagingWebhook(messagingEvent, entry);
        }
      }
    }
  } catch (error) {
    console.error("[webhook] Unhandled processing error:", error);
  }

  // Always respond 200 to webhooks — Meta requires this
  return res.sendStatus(200);
});

/**
 * Handle a comment webhook change event.
 * Extracts comment details and triggers matching COMMENT automations.
 */
async function handleCommentWebhook(change: any, entry: any): Promise<void> {
  let comment_id = "";
  let sender_id = "";
  let commenterUsername = "";
  let message = "";
  let media_id = "";

  if (change.field === "comments" && change.value) {
    const val = change.value as any;
    comment_id = val.id || val.comment_id || "";
    sender_id = val.from?.id || "";
    commenterUsername = val.from?.username || "";
    message = val.text || "";
    media_id = val.media?.id || val.media_id || "";
  } else if (change.field === "feed" && change.value?.item === "comment") {
    const val = change.value as any;
    comment_id = val.comment_id || "";
    sender_id = val.sender_id || "";
    commenterUsername = val.sender_name || "";
    message = val.message || "";
    media_id = val.media_id || val.post_id || "";
  } else {
    console.log(`[webhook] Skipping unhandled field: ${change.field}`);
    return;
  }

  console.log(
    `[webhook] Comment event — comment_id: ${comment_id}, media_id: ${media_id}, message: "${message}", from: @${commenterUsername}`
  );

  // Find the recipient's Instagram Account
  const recipientIgUserId = entry.id;
  const igAccountRecipient = await InstagramAccount.findOne({ instagramUserId: recipientIgUserId });

  if (igAccountRecipient) {
    // Log the incoming comment
    await ExecutionLog.create({
      userId: igAccountRecipient.userId,
      instagramAccountId: igAccountRecipient._id,
      commenterId: sender_id,
      commenterUsername,
      commentId: comment_id,
      commentText: message,
      action: "COMMENT_RECEIVED",
      status: "SUCCESS",
    });
  }

  // Find all enabled COMMENT automations
  const automations = await Automation.find({ type: "COMMENT", enabled: true });
  console.log(`[webhook] Found ${automations.length} enabled COMMENT automation(s)`);

  for (const automation of automations) {
    // Match logic: reel must match, AND (no keywords = match all, or at least one keyword matches)
    const reelMatch = automation.reelId === media_id;

    const hasKeywords = automation.keywords && automation.keywords.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords!.some((kw: string) =>
          message?.toLowerCase().includes(kw.toLowerCase())
        )
      : true; // No keywords configured = match all comments on this reel

    console.log(
      `[webhook] Automation ${automation._id}: reelMatch=${reelMatch}, keywordMatch=${keywordMatch}, hasKeywords=${hasKeywords} (keywords: [${automation.keywords?.join(", ")}], reelId: ${automation.reelId})`
    );

    // Require reel to match AND keyword condition to be met
    if (!reelMatch || !keywordMatch) {
      console.log(`[webhook] Automation ${automation._id} skipped — no match`);
      continue;
    }

    // Look up the Instagram account for this automation
    const igAccount = await InstagramAccount.findById(automation.instagramAccountId);
    if (!igAccount?.accessToken) {
      console.log(`[webhook] Automation ${automation._id} skipped — no IG account or access token`);
      continue;
    }

    console.log(`[webhook] Automation ${automation._id} matched! IG user: ${igAccount.instagramUserId}`);

    // ── Reply to comment ──────────────────────────────────────
    let commentReplyStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let commentReplyError = "";
    try {
      if (automation.commentReply) {
        console.log(`[webhook] Replying to comment with: "${automation.commentReply}"`);
        await instagramService.replyToComment(
          comment_id,
          automation.commentReply,
          igAccount.accessToken
        );
        console.log(`[webhook] Comment reply sent successfully`);
      } else {
        console.log(`[webhook] No commentReply configured — skipping`);
      }
    } catch (err) {
      commentReplyStatus = "FAILED";
      commentReplyError = err instanceof Error ? err.message : "Unknown error";
      console.error(`[webhook] Comment reply FAILED:`, commentReplyError);
    }

    if (automation.commentReply) {
      await ExecutionLog.create({
        automationId: automation._id,
        commenterId: sender_id,
        commenterUsername,
        commentId: comment_id,
        commentText: message,
        action: "COMMENT_REPLY",
        status: commentReplyStatus,
        errorMessage: commentReplyError || undefined,
      });
    }

    // ── Send DM (Private Reply to commenter) ─────────────────
    let dmStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let dmError = "";
    try {
      if (automation.dmMessage) {
        // Use instagramUserId — required for direct Instagram OAuth (no Facebook Page)
        const igUserId = igAccount.instagramUserId;
        if (!igUserId) {
          throw new Error("No instagramUserId on account record — reconnect Instagram");
        }
        console.log(`[webhook] Sending DM via IG user ${igUserId}: "${automation.dmMessage}"`);
        await instagramService.sendPrivateDM(
          igUserId,
          comment_id,
          automation.dmMessage,
          igAccount.accessToken
        );
        console.log(`[webhook] DM sent successfully`);
      } else {
        console.log(`[webhook] No dmMessage configured — skipping`);
      }
    } catch (err) {
      dmStatus = "FAILED";
      dmError = err instanceof Error ? err.message : "Unknown error";
      console.error(`[webhook] DM FAILED:`, dmError);
    }

    if (automation.dmMessage) {
      await ExecutionLog.create({
        automationId: automation._id,
        commenterId: sender_id,
        commenterUsername,
        commentId: comment_id,
        commentText: message,
        action: "SEND_DM",
        status: dmStatus,
        errorMessage: dmError || undefined,
      });
    }
  }
}

/**
 * Handle an incoming messaging (DM) webhook event.
 * Extracts sender and message, then triggers matching DM automations.
 */
async function handleMessagingWebhook(messagingEvent: any, entry: any): Promise<void> {
  const senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id || entry.id;
  const messageText = messagingEvent.message?.text;

  // Ignore echoes (messages sent by the account itself)
  if (messagingEvent.message?.is_echo) {
    console.log(`[webhook-dm] Skipping echo message`);
    return;
  }

  if (!senderId || !messageText) {
    console.log(`[webhook-dm] Skipping — no sender_id or message text`, JSON.stringify(messagingEvent));
    return;
  }

  console.log(
    `[webhook-dm] DM received — sender: ${senderId}, recipient (ig user): ${recipientId}, message: "${messageText}"`
  );

  // Find the Instagram account by the recipient's IG user ID
  const igAccount = await InstagramAccount.findOne({ instagramUserId: recipientId });
  
  if (igAccount) {
    // Log the incoming DM
    await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      dmSenderId: senderId,
      dmText: messageText,
      action: "DM_RECEIVED",
      status: "SUCCESS",
    });
  }
  
  if (!igAccount?.accessToken) {
    console.log(`[webhook-dm] No IG account found for recipient ${recipientId}`);
    return;
  }

  // Find all enabled DM automations for this user
  const automations = await Automation.find({
    type: "DM",
    enabled: true,
    userId: igAccount.userId,
  });
  console.log(`[webhook-dm] Found ${automations.length} enabled DM automation(s) for user ${igAccount.userId}`);

  for (const automation of automations) {
    const hasKeywords = automation.keywords && automation.keywords.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords!.some((kw: string) =>
          messageText.toLowerCase().includes(kw.toLowerCase())
        )
      : true; // No keywords = match all DMs

    console.log(
      `[webhook-dm] Automation ${automation._id}: keywordMatch=${keywordMatch}, hasKeywords=${hasKeywords} (keywords: [${automation.keywords?.join(", ")}])`
    );

    if (!keywordMatch) {
      console.log(`[webhook-dm] Automation ${automation._id} skipped — no keyword match`);
      continue;
    }

    const replyMessage = automation.dmReplyMessage;
    if (!replyMessage) {
      console.log(`[webhook-dm] Automation ${automation._id} skipped — no dmReplyMessage configured`);
      continue;
    }

    console.log(`[webhook-dm] Automation ${automation._id} matched! Sending reply: "${replyMessage}"`);

    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage = "";
    try {
      await instagramService.sendDMReply(
        igAccount.instagramUserId!,
        senderId,
        replyMessage,
        igAccount.accessToken
      );
      console.log(`[webhook-dm] DM auto-reply sent successfully`);
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[webhook-dm] DM auto-reply FAILED:`, errorMessage);
    }

    await ExecutionLog.create({
      automationId: automation._id,
      dmSenderId: senderId,
      dmText: messageText,
      action: "DM_AUTO_REPLY",
      status,
      errorMessage: errorMessage || undefined,
    });
  }
}

export { instagramRoutes };
