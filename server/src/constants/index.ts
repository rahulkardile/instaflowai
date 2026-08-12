// ─── Instagram Graph API ───────────────────────────────────────────────────
export const META_API_VERSION = "v21.0" as const;
export const IG_GRAPH_API_BASE = "https://graph.instagram.com/v21.0" as const;

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

// ─── Cookie Configuration ──────────────────────────────────────────────────
export const COOKIE_NAME = "auth_token" as const;
export const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
export const ADMIN_LOG_LIMIT   = 500 as const;
export const ADMIN_USER_LIMIT  = 50  as const;

// ─── Instagram Media Fields ────────────────────────────────────────────────
export const IG_MEDIA_FIELDS =
  "id,caption,thumbnail_url,permalink,like_count,comments_count,media_type,media_product_type" as const;

// ─── Rate Limiting ─────────────────────────────────────────────────────────
/** General API: 200 requests per 15 minutes per IP */
export const RATE_LIMIT_WINDOW_MS  = 15 * 60_000;
export const RATE_LIMIT_MAX        = 200 as const;

/** Login / auth: max 5 attempts per hour per IP */
export const LOGIN_RATE_WINDOW_MS  = 60 * 60_000;
export const LOGIN_RATE_MAX        = 5 as const;

// ─── Admin configuration ───────────────────────────────────────────────────
/** The initial admin user seeded on first boot */
export const INITIAL_ADMIN_EMAIL = "rahulkardile321@gmail.com" as const;

// ─── Database ─────────────────────────────────────────────────────────────
export const MAX_DB_POOL_SIZE          = 10 as const;
export const DB_SERVER_SELECTION_MS    = 5_000 as const;
export const DB_SOCKET_TIMEOUT_MS      = 45_000 as const;

// ─── Active session window ─────────────────────────────────────────────────
/** Users with lastLoginAt within this window are considered "currently active" */
export const ACTIVE_WINDOW_MINUTES = 15 as const;
