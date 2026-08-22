import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import { metaFetch } from "../../utils/metaFetch";
import { InstagramService } from "./instagram.service";
import {
  EXECUTION_ACTION,
  EXECUTION_STATUS,
  AUTOMATION_TYPE,
  WEBHOOK_FIELD,
  IG_GRAPH_API_BASE,
} from "../../constants";
import type {
  WebhookEntry,
  WebhookChange,
  WebhookCommentValue,
  WebhookFeedCommentValue,
  WebhookMessagingEvent,
  NormalisedCommentEvent,
} from "../../types/instagram.types";
import type { ExecutionStatus } from "../../types/executionLog.types";

const instagramService = new InstagramService();

// ─── Non-actionable messaging event types ─────────────────────────────────────
//
// Meta fires these inside the `messages` webhook subscription, but they carry
// no user-originated text and must NOT trigger automation:
//   message_edit   – user edited a previously sent message (num_edit ≥ 0)
//   read/seen      – read receipt (user opened the thread)
//   delivery       – delivery receipt
//   echo           – copy of outbound messages sent by the page itself
//
function isNonActionableMessagingEvent(event: WebhookMessagingEvent): boolean {
  if (event.message?.is_echo === true) return true;
  if (event.message_edit !== undefined) return true;
  if ((event as Record<string, unknown>).read !== undefined) return true;
  if ((event as Record<string, unknown>).delivery !== undefined) return true;
  return false;
}

// ─── Normalise comment change ──────────────────────────────────────────────

function normaliseCommentChange(change: WebhookChange): NormalisedCommentEvent | null {
  const val = change.value as WebhookCommentValue & WebhookFeedCommentValue;

  console.log(`[webhook-normalise] field="${change.field}" value=${JSON.stringify(val)}`);

  if (change.field === WEBHOOK_FIELD.COMMENTS) {
    const comment_id = val.id ?? val.comment_id ?? "";
    // sender_id = commenter's Instagram-Scoped ID (IGSID) from from.id
    // This is required by sendPrivateDM — NOT comment_id
    const sender_id = val.from?.id ?? "";
    const commenter_username = val.from?.username ?? "";
    const message = val.text ?? "";
    const media_id = val.media?.id ?? val.media_id ?? "";

    if (!comment_id) {
      console.warn(`[webhook-normalise] Skipping — comment_id is empty`);
      return null;
    }
    return { comment_id, sender_id, commenter_username, message, media_id };
  }

  if (change.field === WEBHOOK_FIELD.FEED && val.item === "comment") {
    const comment_id = val.comment_id ?? "";
    const sender_id = val.sender_id ?? "";
    const commenter_username = val.sender_name ?? "";
    const message = val.message ?? "";
    const media_id = val.media_id ?? val.post_id ?? "";

    if (!comment_id) {
      console.warn(`[webhook-normalise] Skipping — comment_id is empty (feed)`);
      return null;
    }
    return { comment_id, sender_id, commenter_username, message, media_id };
  }

  console.log(`[webhook-normalise] Skipping unhandled field: "${change.field}"`);
  return null;
}

// ─── Comment webhook handler ──────────────────────────────────────────────

export async function handleCommentWebhook(
  change: WebhookChange,
  entry: WebhookEntry
): Promise<void> {
  console.log(`[webhook-comment] Received — entry.id="${entry.id}" field="${change.field}"`);

  const event = normaliseCommentChange(change);
  if (!event) {
    console.warn(`[webhook-comment] Could not normalise change — skipping`);
    return;
  }

  const { comment_id, sender_id, commenter_username, message, media_id } = event;

  console.log(
    `[webhook-comment] Parsed — comment_id="${comment_id}" media_id="${media_id}" ` +
    `commenter_igsid="${sender_id}" from=@${commenter_username} text="${message}"`
  );

  // ── Lookup the IG account by entry.id ──
  let recipientIgAccount = await InstagramAccount.findOne({
    $or: [
      { instagramUserId: String(entry.id) },
      { pageId: String(entry.id) },
    ],
  });

  if (!recipientIgAccount) {
    recipientIgAccount = await InstagramAccount.findOne({ accessToken: { $exists: true, $ne: "" } });
    if (recipientIgAccount) {
      console.log(
        `[webhook-comment] Matched via fallback account: userId=${recipientIgAccount.userId} username=@${recipientIgAccount.username}`
      );
    }
  }

  if (!recipientIgAccount) {
    console.warn(
      `[webhook-comment] ⚠️  No InstagramAccount found for entry.id="${entry.id}".`
    );
    return;
  }

  console.log(
    `[webhook-comment] ✅ Matched IG account: userId=${recipientIgAccount.userId} ` +
    `username=@${recipientIgAccount.username}`
  );

  // Log the raw comment received event
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

  console.log(`[webhook-comment] COMMENT_RECEIVED log saved for user ${recipientIgAccount.userId}`);

  // ── Query automations for this user (by userId — stable across reconnects) ──

  // DEBUG: log all automations for this user regardless of filters
  const _allAutomations = await Automation.find({ userId: recipientIgAccount.userId }).lean();
  console.log(
    `[webhook-comment] DEBUG all automations for user ${recipientIgAccount.userId}:`,
    JSON.stringify(_allAutomations.map((a: any) => ({
      _id: a._id,
      userId: a.userId,
      instagramAccountId: a.instagramAccountId,
      type: a.type,
      enabled: a.enabled,
      keywords: a.keywords,
    })))
  );

  const automations = await Automation.find({
    userId: recipientIgAccount.userId,
    type: AUTOMATION_TYPE.COMMENT,
    enabled: true,
  });

  console.log(
    `[webhook-comment] Found ${automations.length} enabled COMMENT automation(s) for user ${recipientIgAccount.userId}`
  );

  if (automations.length === 0) {
    console.log(`[webhook-comment] No automations configured for this account — nothing to trigger`);
    return;
  }


  for (const automation of automations) {
    const reelMatch = !automation.reelId || String(automation.reelId) === String(media_id);
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) =>
          message.toLowerCase().includes(kw.toLowerCase())
        )
      : true;

    console.log(
      `[webhook-comment] Automation ${automation._id}: ` +
      `reelId="${automation.reelId}" media_id="${media_id}" reelMatch=${reelMatch} ` +
      `keywords=${JSON.stringify(automation.keywords)} keywordMatch=${keywordMatch}`
    );

    if (!reelMatch || !keywordMatch) {
      console.log(`[webhook-comment] Automation ${automation._id} skipped — no match`);
      continue;
    }

    const igAccount = await InstagramAccount.findById(automation.instagramAccountId);
    if (!igAccount?.accessToken) {
      console.warn(`[webhook-comment] Automation ${automation._id} skipped — no access token`);
      continue;
    }

    // ── Reply to comment publicly ──
    if (automation.commentReply) {
      let replyStatus: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
      let replyError = "";

      try {
        await instagramService.replyToComment(
          comment_id,
          automation.commentReply,
          igAccount.accessToken
        );
        console.log(`[webhook-comment] ✅ Comment reply sent for automation ${automation._id}`);
      } catch (err) {
        replyStatus = EXECUTION_STATUS.FAILED;
        replyError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[webhook-comment] ❌ Comment reply FAILED: ${replyError}`);
      }

      await ExecutionLog.create({
        automationId: automation._id,
        userId: igAccount.userId,
        instagramAccountId: igAccount._id,
        commenterId: sender_id,
        commenterUsername: commenter_username,
        commentId: comment_id,
        commentText: message,
        action: EXECUTION_ACTION.COMMENT_REPLY,
        status: replyStatus,
        errorMessage: replyError || undefined,
      });
    }

    // ── Send private reply DM to commenter ───────────────────────────────────
    //
    // For comment-triggered DMs, Meta's private reply flow uses comment_id.
    // This can initiate the first DM from a public comment, subject to Meta's
    // one-private-reply-per-comment and 7-day window limitations.
    if (automation.dmMessage) {
      let dmStatus: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
      let dmError = "";

      if (!igAccount.instagramUserId) {
        dmStatus = EXECUTION_STATUS.FAILED;
        dmError = "instagramUserId missing — reconnect Instagram";
        console.warn(`[webhook-comment] Automation ${automation._id} — DM skipped: ${dmError}`);
      } else {
        try {
          await instagramService.sendPrivateDM(
            igAccount.instagramUserId,
            comment_id,
            automation.dmMessage,
            igAccount.accessToken
          );
          console.log(`[webhook-comment] ✅ Private DM sent for automation ${automation._id}`);
        } catch (err) {
          dmStatus = EXECUTION_STATUS.FAILED;
          dmError = err instanceof Error ? err.message : "Unknown error";
          console.error(`[webhook-comment] ❌ Private DM FAILED: ${dmError}`);
        }
      }

      await ExecutionLog.create({
        automationId: automation._id,
        userId: igAccount.userId,
        instagramAccountId: igAccount._id,
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

// ─── Messaging (DM) webhook handler ──────────────────────────────────────

export async function handleMessagingWebhook(
  messagingEvent: WebhookMessagingEvent,
  entry: WebhookEntry
): Promise<void> {

  // ── Immediately discard non-actionable system events ──────────────────────
  //
  // Meta sends message_edit, read receipts, delivery receipts, and echo events
  // through the same `messages` webhook subscription as real DMs. We must
  // filter these out FIRST before attempting any automation logic, because:
  //  1. They do not contain sender.id or message.text
  //  2. Attempting Graph API resolution wastes an API call and produces empty data
  //  3. They must never trigger an auto-reply
  //
  if (isNonActionableMessagingEvent(messagingEvent)) {
    const eventType =
      messagingEvent.message?.is_echo ? "echo" :
      messagingEvent.message_edit !== undefined ? "message_edit" :
      (messagingEvent as Record<string, unknown>).read !== undefined ? "read_receipt" :
      (messagingEvent as Record<string, unknown>).delivery !== undefined ? "delivery_receipt" :
      "non_actionable";
    console.log(
      `[webhook-dm] Skipping system event type="${eventType}" — ` +
      `mid="${messagingEvent.message_edit?.mid ?? messagingEvent.message?.mid ?? "n/a"}"`
    );
    return;
  }

  // ── Extract from a real `messages` event ─────────────────────────────────
  let senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id ?? entry.id;
  let messageText = messagingEvent.message?.text;
  const mid = messagingEvent.message?.mid;

  console.log(
    `[webhook-dm] Real DM received — senderId="${senderId}" recipientId="${recipientId}" ` +
    `text="${messageText}" mid="${mid}"`
  );

  // ── If sender or text is still missing, try Graph API fallback ───────────
  // Some Meta API versions omit fields from the webhook but the data is available
  // by fetching the message object directly.
  if ((!senderId || !messageText) && mid && recipientId) {
    let accountForMid = await InstagramAccount.findOne({
      $or: [
        { instagramUserId: String(recipientId) },
        { pageId: String(recipientId) },
      ],
    });

    if (!accountForMid) {
      accountForMid = await InstagramAccount.findOne({ accessToken: { $exists: true, $ne: "" } });
      if (accountForMid) {
        console.log(
          `[webhook-dm] Fallback account for recipientId="${recipientId}": ` +
          `@${accountForMid.username} (igUserId=${accountForMid.instagramUserId})`
        );
      }
    }

    if (accountForMid?.accessToken) {
      try {
        console.log(`[webhook-dm] Fetching message details for mid="${mid}" via Graph API`);
        const msgRes = await metaFetch(
          `${IG_GRAPH_API_BASE}/${mid}?fields=id,created_time,from,to,message&access_token=${accountForMid.accessToken}`,
          undefined,
          "messages.get"
        );
        const msgData = (await msgRes.json()) as {
          from?: { id: string; username?: string };
          message?: string;
          error?: { message: string; code: number };
        };
        console.log(`[webhook-dm] Graph API response for mid="${mid}":`, JSON.stringify(msgData));

        if (msgData.error) {
          console.warn(`[webhook-dm] Graph API error: ${msgData.error.message} (code ${msgData.error.code})`);
        } else {
          if (msgData.from?.id) senderId = msgData.from.id;
          if (msgData.message) messageText = msgData.message;
          console.log(`[webhook-dm] Resolved — senderId="${senderId}" text="${messageText}"`);
        }
      } catch (err) {
        console.warn(`[webhook-dm] Could not resolve message by mid:`, err);
      }
    } else {
      console.warn(`[webhook-dm] No account with accessToken found to resolve mid`);
    }
  }

  if (!senderId || !messageText) {
    console.log(
      `[webhook-dm] Skipping — could not resolve senderId="${senderId}" or ` +
      `messageText="${messageText}" after Graph API fallback. ` +
      `Raw event: ${JSON.stringify(messagingEvent)}`
    );
    return;
  }

  // ── Lookup IG account by recipientId ──────────────────────────────────────
  let igAccount = await InstagramAccount.findOne({
    $or: [
      { instagramUserId: String(recipientId) },
      { pageId: String(recipientId) },
    ],
  });

  if (!igAccount) {
    igAccount = await InstagramAccount.findOne({ accessToken: { $exists: true, $ne: "" } });
    if (igAccount && recipientId) {
      console.log(
        `[webhook-dm] Syncing instagramUserId to "${recipientId}" for @${igAccount.username}`
      );
      igAccount.instagramUserId = String(recipientId);
      await igAccount.save().catch(() => {});
    }
  }

  if (!igAccount) {
    console.warn(
      `[webhook-dm] ⚠️  No InstagramAccount found for recipientId="${recipientId}".`
    );
    return;
  }

  console.log(
    `[webhook-dm] ✅ Matched IG account: userId=${igAccount.userId} username=@${igAccount.username}`
  );

  // Log the raw DM received event
  await ExecutionLog.create({
    userId: igAccount.userId,
    instagramAccountId: igAccount._id,
    dmSenderId: senderId,
    dmText: messageText,
    action: EXECUTION_ACTION.DM_RECEIVED,
    status: EXECUTION_STATUS.SUCCESS,
  });

  console.log(`[webhook-dm] DM_RECEIVED log saved for user ${igAccount.userId}`);

  if (!igAccount.accessToken) {
    console.warn(`[webhook-dm] No access token on account — cannot auto-reply`);
    return;
  }

  // ── Query DM automations for this user (by userId — stable across reconnects) ──
  const automations = await Automation.find({
    userId: igAccount.userId,
    type: AUTOMATION_TYPE.DM,
    enabled: true,
  });

  console.log(
    `[webhook-dm] Found ${automations.length} enabled DM automation(s) for user ${igAccount.userId}`
  );

  for (const automation of automations) {
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) =>
          messageText!.toLowerCase().includes(kw.toLowerCase())
        )
      : true;

    console.log(
      `[webhook-dm] Automation ${automation._id}: ` +
      `keywords=${JSON.stringify(automation.keywords)} keywordMatch=${keywordMatch}`
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

    let status: ExecutionStatus = EXECUTION_STATUS.SUCCESS;
    let errorMessage = "";

    try {
      await instagramService.sendDMReply(
        igAccount.instagramUserId!,
        senderId,
        replyMessage,
        igAccount.accessToken
      );
      console.log(`[webhook-dm] ✅ Auto-reply sent for automation ${automation._id}`);
    } catch (err) {
      status = EXECUTION_STATUS.FAILED;
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[webhook-dm] ❌ Auto-reply FAILED: ${errorMessage}`);
    }

    await ExecutionLog.create({
      automationId: automation._id,
      userId: igAccount.userId,
      instagramAccountId: igAccount._id,
      dmSenderId: senderId,
      dmText: messageText,
      action: EXECUTION_ACTION.DM_AUTO_REPLY,
      status,
      errorMessage: errorMessage || undefined,
    });
  }
}
