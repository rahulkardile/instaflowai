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

// ─── Comment webhook handler ──────────────────────────────────────────────

export async function handleCommentWebhook(
  change: WebhookChange,
  entry: WebhookEntry
): Promise<void> {
  const event = normaliseCommentChange(change);
  if (!event) return;

  const { comment_id, sender_id, commenter_username, message, media_id } = event;

  console.log(
    `[webhook-comment] comment_id: ${comment_id}, media_id: ${media_id}, from: @${commenter_username}, text: "${message}"`
  );

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

  const automations = await Automation.find({ type: AUTOMATION_TYPE.COMMENT, enabled: true });
  console.log(`[webhook-comment] ${automations.length} enabled COMMENT automation(s)`);

  for (const automation of automations) {
    const reelMatch = automation.reelId === media_id;
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) =>
          message.toLowerCase().includes(kw.toLowerCase())
        )
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
  const messageText = messagingEvent.message?.text;

  if (!senderId || !messageText) {
    console.log("[webhook-dm] Skipping — missing sender or message text");
    return;
  }

  console.log(
    `[webhook-dm] sender: ${senderId}, recipient: ${recipientId}, text: "${messageText}"`
  );

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

  console.log(
    `[webhook-dm] ${automations.length} enabled DM automation(s) for user ${igAccount.userId}`
  );

  for (const automation of automations) {
    const hasKeywords = automation.keywords?.length > 0;
    const keywordMatch = hasKeywords
      ? automation.keywords.some((kw: string) =>
          messageText.toLowerCase().includes(kw.toLowerCase())
        )
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
