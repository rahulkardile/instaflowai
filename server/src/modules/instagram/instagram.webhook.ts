import InstagramAccount from "../../models/InstagramAccounts";
import Automation from "../../models/Automation";
import ExecutionLog from "../../models/ExecutionLog";
import { InstagramService } from "./instagram.service";
import {
  EXECUTION_ACTION,
  EXECUTION_STATUS,
  AUTOMATION_TYPE,
  WEBHOOK_FIELD,
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

// ─── Normalise comment change ──────────────────────────────────────────────

function normaliseCommentChange(change: WebhookChange): NormalisedCommentEvent | null {
  const val = change.value as WebhookCommentValue & WebhookFeedCommentValue;

  console.log(`[webhook-normalise] field="${change.field}" value=${JSON.stringify(val)}`);

  if (change.field === WEBHOOK_FIELD.COMMENTS) {
    const comment_id = val.id ?? val.comment_id ?? "";
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
    `[webhook-comment] Parsed — comment_id="${comment_id}" media_id="${media_id}" from=@${commenter_username} text="${message}"`
  );

  // ── Lookup the IG account by entry.id (coerce both sides to string) ──
  const recipientIgAccount = await InstagramAccount.findOne({
    instagramUserId: String(entry.id),
  });

  if (!recipientIgAccount) {
    console.warn(
      `[webhook-comment] ⚠️  No InstagramAccount found for entry.id="${entry.id}". ` +
      `Make sure instagramUserId is stored as a string matching exactly this value.`
    );
  } else {
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
  }

  if (!recipientIgAccount) return;

  // ── FIX: Query automations ONLY for this specific IG account ──
  const automations = await Automation.find({
    instagramAccountId: recipientIgAccount._id,
    type: AUTOMATION_TYPE.COMMENT,
    enabled: true,
  });

  console.log(
    `[webhook-comment] Found ${automations.length} enabled COMMENT automation(s) for account ${recipientIgAccount._id}`
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

    // ── Reply to comment ──
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

    // ── Send Private DM to commenter ──
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
        console.log(`[webhook-comment] ✅ Private DM sent for automation ${automation._id}`);
      } catch (err) {
        dmStatus = EXECUTION_STATUS.FAILED;
        dmError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[webhook-comment] ❌ Private DM FAILED: ${dmError}`);
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
  if (messagingEvent.message?.is_echo) {
    console.log("[webhook-dm] Skipping echo message");
    return;
  }

  const senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id ?? entry.id;
  const messageText = messagingEvent.message?.text ?? messagingEvent.message_edit?.text;

  console.log(
    `[webhook-dm] Received — senderId="${senderId}" recipientId="${recipientId}" text="${messageText}"`
  );

  if (!senderId || !messageText) {
    console.log(
      `[webhook-dm] Skipping — missing senderId ("${senderId}") or messageText ("${messageText}"). ` +
      `Raw event: ${JSON.stringify(messagingEvent)}`
    );
    return;
  }

  // ── Lookup IG account by recipientId (coerce to string) ──
  const igAccount = await InstagramAccount.findOne({
    instagramUserId: String(recipientId),
  });

  if (!igAccount) {
    console.warn(
      `[webhook-dm] ⚠️  No InstagramAccount found for recipientId="${recipientId}". ` +
      `Make sure instagramUserId is stored as a string matching exactly this value.`
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

  // ── FIX: Query DM automations ONLY for this specific IG account ──
  const automations = await Automation.find({
    instagramAccountId: igAccount._id,
    type: AUTOMATION_TYPE.DM,
    enabled: true,
  });

  console.log(
    `[webhook-dm] Found ${automations.length} enabled DM automation(s) for account ${igAccount._id}`
  );

  for (const automation of automations) {
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) =>
          messageText.toLowerCase().includes(kw.toLowerCase())
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
