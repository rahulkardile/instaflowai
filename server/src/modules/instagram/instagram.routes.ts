import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getAuthUrl,
  handleCallback,
  disconnect,
  getReels,
  getAccount,
  getConversations,
  sendMessage,
  postComment,
  getComments,
  getCommentLogs,
  verifyWebhook,
  receiveWebhook,
} from "./instagram.controller";

const instagramRoutes = Router();

// ─── Auth & Account ───────────────────────────────────────────────────────
instagramRoutes.get("/auth", authMiddleware, getAuthUrl);
instagramRoutes.get("/callback", handleCallback);
instagramRoutes.delete("/disconnect", authMiddleware, disconnect);

// ─── Reels & Comments ─────────────────────────────────────────────────────
instagramRoutes.get("/reels", authMiddleware, getReels);
instagramRoutes.get("/account", authMiddleware, getAccount);
instagramRoutes.get("/comments/:mediaId", authMiddleware, getComments);
instagramRoutes.get("/comment-logs", authMiddleware, getCommentLogs);
instagramRoutes.post("/comment", authMiddleware, postComment);

// ─── DM / Conversations ───────────────────────────────────────────────────
instagramRoutes.get("/conversations", authMiddleware, getConversations);
instagramRoutes.post("/message", authMiddleware, sendMessage);

// ─── Webhooks (public — called by Meta) ──────────────────────────────────
instagramRoutes.get("/webhook", verifyWebhook);
instagramRoutes.post("/webhook", receiveWebhook);

export { instagramRoutes };
