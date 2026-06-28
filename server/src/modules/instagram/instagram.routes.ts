import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { InstagramService } from "./instagram.service";
import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";

const instagramRoutes = Router();
const instagramService = new InstagramService();

// ─── Protected routes ─────────────────────────────────────────────────────

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
 * POST /disconnect — Disconnect the user's Instagram account.
 */
instagramRoutes.post("/disconnect", authMiddleware, async (req: Request, res: Response) => {
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
    return res.status(200).json({ success: true, data: { reels } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch reels",
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
  console.log("Expected token in process.env:", process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN);

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log("Verification SUCCESS");
    return res.status(200).send(challenge);
  }

  console.log("Verification FAILED (403)");
  return res.status(403).json({ success: false, message: "Verification failed" });
});

/**
 * POST /webhook — Receive incoming webhook events from Facebook.
 */
instagramRoutes.post("/webhook", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.entry) {
      return res.sendStatus(200);
    }

    for (const entry of body.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        let comment_id = "";
        let sender_id = "";
        let commenterUsername = "";
        let message = "";
        let media_id = "";

        if (change.field === "comments" && change.value) {
          const val = change.value as any;
          comment_id = val.comment_id;
          sender_id = val.from?.id;
          commenterUsername = val.from?.username || "";
          message = val.text;
          media_id = val.media?.id;
        } else if (change.field === "feed" && change.value?.item === "comment") {
          const val = change.value as any;
          comment_id = val.comment_id;
          sender_id = val.sender_id;
          commenterUsername = val.sender_name || "";
          message = val.message;
          media_id = val.media_id || val.post_id;
        } else {
          continue;
        }

        // Find automations that match this media_id or have a keyword match
        const automations = await Automation.find({ enabled: true });

        for (const automation of automations) {
          const reelMatch = automation.reelId === media_id;
          const keywordMatch =
            automation.keywords?.some((kw: string) =>
              message?.toLowerCase().includes(kw.toLowerCase())
            ) ?? false;

          if (!reelMatch && !keywordMatch) continue;

          // Look up the Instagram account for this automation
          const igAccount = await InstagramAccount.findById(
            automation.instagramAccountId
          );
          if (!igAccount?.accessToken) continue;

          // Reply to comment
          let commentReplyStatus: "SUCCESS" | "FAILED" = "SUCCESS";
          let commentReplyError = "";
          try {
            if (automation.commentReply) {
              await instagramService.replyToComment(
                comment_id,
                automation.commentReply,
                igAccount.accessToken
              );
            }
          } catch (err) {
            commentReplyStatus = "FAILED";
            commentReplyError = err instanceof Error ? err.message : "Unknown error";
          }

          await ExecutionLog.create({
            automationId: automation._id,
            commenterId: sender_id,
            commenterUsername: commenterUsername,
            commentId: comment_id,
            commentText: message,
            action: "COMMENT_REPLY",
            status: commentReplyStatus,
            errorMessage: commentReplyError || undefined,
          });

          // Send DM
          let dmStatus: "SUCCESS" | "FAILED" = "SUCCESS";
          let dmError = "";
          try {
            if (automation.dmMessage && igAccount.pageId) {
              await instagramService.sendPrivateDM(
                igAccount.pageId,
                comment_id,
                automation.dmMessage,
                igAccount.accessToken
              );
            }
          } catch (err) {
            dmStatus = "FAILED";
            dmError = err instanceof Error ? err.message : "Unknown error";
          }

          await ExecutionLog.create({
            automationId: automation._id,
            commenterId: sender_id,
            commenterUsername: commenterUsername,
            commentId: comment_id,
            commentText: message,
            action: "SEND_DM",
            status: dmStatus,
            errorMessage: dmError || undefined,
          });
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  // Always respond 200 to webhooks
  return res.sendStatus(200);
});

export { instagramRoutes };
