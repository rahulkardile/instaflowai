// ─── Instagram Graph API ───────────────────────────────────────────────────
export const META_API_VERSION = "v25.0" as const;
export const IG_GRAPH_API_BASE = "https://graph.instagram.com/v25.0" as const;
// graph.facebook.com is required for certain endpoints (e.g. /{ig-user-id}/subscribed_apps,
// app-level subscriptions) even when using the Instagram Business Login flow.
export const FB_GRAPH_API_BASE = "https://graph.facebook.com/v25.0" as const;

export const IG_OAUTH_BASE_URL = "https://www.instagram.com/oauth/authorize" as const;
export const IG_SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token" as const;
export const IG_LONG_TOKEN_URL = "https://graph.instagram.com/access_token" as const;
export const IG_REFRESH_TOKEN_URL = "https://graph.instagram.com/refresh_access_token" as const;

// ─── Instagram OAuth Scopes ────────────────────────────────────────────────
export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
] as const;

// ─── Token Configuration ───────────────────────────────────────────────────
export const TOKEN_EXPIRY_DAYS = 60 as const;
export const JWT_EXPIRY = "30d" as const;

// ─── Automation Types ──────────────────────────────────────────────────────
export const AUTOMATION_TYPE = {
  COMMENT: "COMMENT",
  DM: "DM",
} as const;

// ─── Execution Log Actions ─────────────────────────────────────────────────
export const EXECUTION_ACTION = {
  COMMENT_REPLY: "COMMENT_REPLY",
  SEND_DM: "SEND_DM",
  DM_AUTO_REPLY: "DM_AUTO_REPLY",
  COMMENT_RECEIVED: "COMMENT_RECEIVED",
  DM_RECEIVED: "DM_RECEIVED",
} as const;

// ─── Execution Log Statuses ────────────────────────────────────────────────
export const EXECUTION_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

// ─── Webhook Fields ────────────────────────────────────────────────────────
export const WEBHOOK_FIELD = {
  COMMENTS: "comments",
  FEED: "feed",
  MESSAGES: "messages",
} as const;

export const WEBHOOK_SUBSCRIBED_FIELDS = "comments,messages" as const;

// ─── Logging ───────────────────────────────────────────────────────────────
export const WEBHOOK_LOG_FILENAME = "webhook_debug.log" as const;

// ─── Pagination ────────────────────────────────────────────────────────────
export const DEFAULT_LOG_LIMIT = 100 as const;

// ─── Instagram Media Fields ────────────────────────────────────────────────
export const IG_MEDIA_FIELDS =
  "id,caption,thumbnail_url,permalink,like_count,comments_count,media_type,media_product_type" as const;
