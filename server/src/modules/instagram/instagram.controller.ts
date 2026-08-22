import { Request, Response } from "express";
import { InstagramService } from "./instagram.service";
import { handleCommentWebhook, handleMessagingWebhook } from "./instagram.webhook";
import InstagramAccount from "../../models/InstagramAccounts";
import ExecutionLog from "../../models/ExecutionLog";
import { metaFetch, redactMetaSecrets } from "../../utils/metaFetch";
import { EXECUTION_ACTION, EXECUTION_STATUS, WEBHOOK_FIELD, IG_GRAPH_API_BASE, META_API_VERSION } from "../../constants";
import type { ApiResponse } from "../../types/common.types";
import type { MappedReel, WebhookEntry } from "../../types/instagram.types";

const instagramService = new InstagramService();

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function getExpectedWebhookCallbackUrl(): string | null {
  const publicBaseUrl =
    process.env.SERVER_URL ??
    process.env.PUBLIC_API_URL ??
    process.env.API_BASE_URL ??
    null;

  return publicBaseUrl ? `${normalizeUrl(publicBaseUrl)}/api/instagram/webhook` : null;
}

// ─── GET /auth ─────────────────────────────────────────────────────────────

export async function getAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const url = instagramService.getAuthUrl(req.user!.userId);
    const response: ApiResponse<{ url: string }> = { success: true, data: { url } };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate auth URL",
    });
  }
}

// ─── GET /callback ─────────────────────────────────────────────────────────

export async function handleCallback(req: Request, res: Response): Promise<void> {
  const clientUrl = process.env.CLIENT_URL?.split(",")[0].trim().replace(/\/$/, "") ?? "http://localhost:5173";

  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;
    const errorParam = req.query.error as string | undefined;
    const errorReason = req.query.error_reason as string | undefined;

    if (errorParam) {
      console.warn(`[callback] Instagram returned error: ${errorParam} — ${errorReason}`);
      res.redirect(
        `${clientUrl}/dashboard?ig_error=true&reason=${encodeURIComponent(errorReason ?? errorParam)}`
      );
      return;
    }

    if (!code || !userId) {
      console.warn("[callback] Missing code or state in query params:", req.query);
      res.redirect(`${clientUrl}/dashboard?ig_error=true&reason=missing_params`);
      return;
    }

    await instagramService.handleCallback(code, userId);
    res.redirect(`${clientUrl}/dashboard?ig_connected=true`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[callback] OAuth error:", message, error);
    res.redirect(
      `${clientUrl}/dashboard?ig_error=true&reason=${encodeURIComponent(message)}`
    );
  }
}

// ─── DELETE /disconnect ───────────────────────────────────────────────────

export async function disconnect(req: Request, res: Response): Promise<void> {
  try {
    await instagramService.disconnect(req.user!.userId);
    res.status(200).json({ success: true, message: "Instagram disconnected" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    });
  }
}

// ─── GET /reels ───────────────────────────────────────────────────────────

export async function getReels(req: Request, res: Response): Promise<void> {
  try {
    const reels = await instagramService.fetchAndSyncReels(req.user!.userId);
    const response: ApiResponse<MappedReel[]> = { success: true, data: reels };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch reels",
    });
  }
}

// ─── GET /account ─────────────────────────────────────────────────────────

export async function getAccount(req: Request, res: Response): Promise<void> {
  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (igAccount?.instagramUserId && igAccount.accessToken) {
      instagramService
        .subscribeWebhookApp(igAccount.instagramUserId, igAccount.accessToken)
        .catch((err) => {
          console.error("[getAccount] Auto subscribe webhook failed:", err);
        });
    }
    res.status(200).json({
      success: true,
      data: igAccount
        ? {
            instagramUserId: igAccount.instagramUserId,
            username: igAccount.username,
            createdAt: igAccount.createdAt,
            tokenExpiresAt: igAccount.tokenExpiresAt,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch account",
    });
  }
}

// ─── GET /conversations ───────────────────────────────────────────────────

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const logs = await ExecutionLog.find({
      userId: req.user!.userId,
      action: {
        $in: [
          EXECUTION_ACTION.DM_RECEIVED,
          EXECUTION_ACTION.SEND_DM,
          EXECUTION_ACTION.DM_AUTO_REPLY,
        ],
      },
      dmSenderId: { $exists: true, $ne: null },
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch conversations",
    });
  }
}

// ─── POST /message ────────────────────────────────────────────────────────

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { recipientId, text } = req.body as { recipientId?: string; text?: string };

    if (!recipientId || !text) {
      res.status(400).json({ success: false, message: "recipientId and text are required" });
      return;
    }

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      res.status(400).json({ success: false, message: "Instagram account not connected" });
      return;
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
      action: EXECUTION_ACTION.SEND_DM,
      status: EXECUTION_STATUS.SUCCESS,
    });

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send message",
    });
  }
}

// ─── POST /comment ────────────────────────────────────────────────────────

export async function postComment(req: Request, res: Response): Promise<void> {
  try {
    const { mediaId, message } = req.body as { mediaId?: string; message?: string };

    if (!mediaId || !message?.trim()) {
      res.status(400).json({ success: false, message: "mediaId and message are required" });
      return;
    }

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      res.status(400).json({ success: false, message: "Instagram account not connected" });
      return;
    }

    const result = await instagramService.postComment(
      mediaId,
      message.trim(),
      igAccount.accessToken
    );

    const log = await ExecutionLog.create({
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      commentId: result.id,
      commentText: message.trim(),
      action: EXECUTION_ACTION.COMMENT_REPLY,
      status: EXECUTION_STATUS.SUCCESS,
    });

    console.log(`[POST /comment] Comment posted — id: ${result.id}, media: ${mediaId}`);
    res.status(201).json({ success: true, data: { commentId: result.id, log } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to post comment",
    });
  }
}

// ─── GET /comments/:mediaId ───────────────────────────────────────────────

export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const mediaIdParam = req.params.mediaId;
    const mediaId = Array.isArray(mediaIdParam) ? mediaIdParam[0] : mediaIdParam;

    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });
    if (!igAccount?.accessToken) {
      res.status(400).json({ success: false, message: "Instagram account not connected" });
      return;
    }

    const comments = await instagramService.getComments(mediaId, igAccount.accessToken);
    res
      .status(200)
      .json({ success: true, data: { mediaId, count: comments.length, comments } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch comments",
    });
  }
}

// ─── GET /comment-logs ────────────────────────────────────────────────────

export async function getCommentLogs(req: Request, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = {
      userId: req.user!.userId,
      action: EXECUTION_ACTION.COMMENT_RECEIVED,
    };

    const logs = await ExecutionLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("commenterId commenterUsername commentId commentText createdAt status");

    console.log(
      `[GET /comment-logs] Returning ${logs.length} comment log(s) for user ${req.user!.userId}`
    );

    res.status(200).json({
      success: true,
      data: { count: logs.length, comments: logs },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch comment logs",
    });
  }
}

// ─── GET /verify-access ───────────────────────────────────────────────────
// Debug endpoint: validates the stored access token against the Graph API
// and optionally fetches comments — counts as a Meta API test call.

export async function verifyAccess(req: Request, res: Response): Promise<void> {
  try {
    const igAccount = await InstagramAccount.findOne({ userId: req.user!.userId });

    if (!igAccount?.accessToken) {
      res.status(400).json({
        success: false,
        message: "No Instagram account connected",
      });
      return;
    }

    const results: Record<string, unknown> = {
      storedAccount: {
        instagramUserId: igAccount.instagramUserId,
        username: igAccount.username,
        tokenExpiresAt: igAccount.tokenExpiresAt,
      },
    };
    const appId = process.env.FACEBOOK_APP_ID ?? process.env.INSTAGRAM_APP_ID;
    const appSecret =
      process.env.FACEBOOK_APP_SECRET ??
      process.env.INSTAGRAM_APP_SECRET ??
      process.env.INSTAGRAM_APP_SECREAT ??
      "";

    // 1. Verify token by fetching /me
    const meRes = await metaFetch(
      `${IG_GRAPH_API_BASE}/me?fields=id,username,account_type&access_token=${igAccount.accessToken}`,
      undefined,
      "verify.me"
    );
    const meData = await meRes.json() as Record<string, unknown>;
    results.graphApi_me = meData;

    if ((meData as { error?: { message: string } }).error) {
      console.error(`[verify-access] Token invalid: ${JSON.stringify(meData)}`);
      res.status(200).json({
        success: false,
        message: "Access token validation failed — see graphApi_me for details",
        data: results,
      });
      return;
    }

    console.log(`[verify-access] Token valid for user ${igAccount.username} (id: ${igAccount.instagramUserId})`);

    // 2. Try fetching media list (tests instagram_business_basic)
    const mediaRes = await metaFetch(
      `${IG_GRAPH_API_BASE}/me/media?fields=id,caption,media_type&limit=5&access_token=${igAccount.accessToken}`,
      undefined,
      "verify.media"
    );
    const mediaData = await mediaRes.json() as { data?: Array<{ id: string }> };
    results.graphApi_media = mediaData;

    // 3. If media exists, fetch comments on first item (tests instagram_business_manage_comments)
    const firstMediaId = mediaData.data?.[0]?.id;
    if (firstMediaId) {
      const commentsRes = await metaFetch(
        `${IG_GRAPH_API_BASE}/${firstMediaId}/comments?fields=id,text,timestamp,username&access_token=${igAccount.accessToken}`,
        undefined,
        "verify.comments"
      );
      const commentsData = await commentsRes.json();
      results.graphApi_comments = commentsData;
      console.log(
        `[verify-access] Fetched comments for media ${firstMediaId}:`,
        JSON.stringify(redactMetaSecrets(commentsData))
      );
    }

    // 4. Check subscribed apps (webhook subscription)
    const subsRes = await metaFetch(
      `${IG_GRAPH_API_BASE}/${igAccount.instagramUserId}/subscribed_apps?access_token=${igAccount.accessToken}`,
      undefined,
      "verify.subscriptions"
    );
    const subsData = await subsRes.json();
    results.graphApi_subscriptions = subsData;

    // 5. Check app-level webhook subscriptions. This is separate from the
    // per-IG-user /subscribed_apps edge above.
    if (appId && appSecret) {
      const appSubsRes = await metaFetch(
        `https://graph.facebook.com/${META_API_VERSION}/${appId}/subscriptions?access_token=${appId}|${appSecret}`,
        undefined,
        "verify.app_subscriptions"
      );
      const appSubsData = await appSubsRes.json();
      results.graphApi_app_subscriptions = appSubsData;

      const expectedCallbackUrl = getExpectedWebhookCallbackUrl();
      const subscriptions = (appSubsData as {
        data?: Array<{ object?: string; callback_url?: string; active?: boolean }>;
      }).data ?? [];
      const instagramSubscription = subscriptions.find((sub) => sub.object === "instagram");
      const actualCallbackUrl = instagramSubscription?.callback_url ?? null;

      results.webhook_callback_check = {
        expectedCallbackUrl,
        actualCallbackUrl,
        matches:
          expectedCallbackUrl && actualCallbackUrl
            ? normalizeUrl(expectedCallbackUrl) === normalizeUrl(actualCallbackUrl)
            : null,
        active: instagramSubscription?.active ?? null,
        note: expectedCallbackUrl
          ? undefined
          : "Set SERVER_URL, PUBLIC_API_URL, or API_BASE_URL to your public backend origin to enable callback comparison.",
      };
    } else {
      results.graphApi_app_subscriptions = {
        skipped: true,
        reason: "INSTAGRAM_APP_ID/FACEBOOK_APP_ID or app secret env var is missing",
      };
      results.webhook_callback_check = {
        expectedCallbackUrl: getExpectedWebhookCallbackUrl(),
        actualCallbackUrl: null,
        matches: null,
        active: null,
      };
    }

    const safeResults = redactMetaSecrets(results);
    console.log(`[verify-access] Full results for user ${req.user!.userId}:`, JSON.stringify(safeResults));

    res.status(200).json({ success: true, data: safeResults });
  } catch (error) {
    console.error(`[verify-access] Error:`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Verification failed",
    });
  }
}

// ─── GET /webhook ─────────────────────────────────────────────────────────

export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  console.log(
    "[webhook] Verification request — mode:",
    mode,
    "token match:",
    token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
  );

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log("[webhook] Verification SUCCESS");
    res.status(200).send(challenge);
    return;
  }

  console.warn("[webhook] Verification FAILED — token mismatch");
  res.status(403).json({ success: false, message: "Verification failed" });
}

// ─── POST /webhook ────────────────────────────────────────────────────────

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Respond 200 immediately — Meta retries if it doesn't get a fast response
  res.sendStatus(200);

  try {
    const body = req.body as { object?: string; entry?: WebhookEntry[] };

    // Log every incoming webhook payload so we can verify Meta is calling us
    console.log(
      `[webhook] ▶ POST received — object="${body.object}" entries=${body.entry?.length ?? 0} ` +
      `timestamp=${new Date().toISOString()}`
    );
    console.log(`[webhook] Raw payload: ${JSON.stringify(body)}`);

    if (!body.entry?.length) {
      console.log(`[webhook] No entries in payload — ignoring`);
      return;
    }

    for (const entry of body.entry) {
      console.log(
        `[webhook] Processing entry: id="${entry.id}" changes=${entry.changes?.length ?? 0} ` +
        `messaging=${entry.messaging?.length ?? 0}`
      );

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
}
