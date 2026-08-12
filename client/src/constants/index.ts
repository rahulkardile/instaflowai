/* ──────────────────────────────────────────────────────────────────── */
/*  App metadata                                                        */
/* ──────────────────────────────────────────────────────────────────── */
export const APP = {
  NAME: "InstaFlow",
  TAGLINE: "AI-powered Instagram automation",
  DESCRIPTION:
    "Automatically reply to comments, send personalized DMs, and convert followers into customers.",
  EMAIL: "support@instaflow.ai",
  PRIVACY_EMAIL: "privacy@instaflow.ai",
  COMPANY: "InstaFlow Pvt Limited",
  WEBSITE: "https://instaflow.ai",
  YEAR: new Date().getFullYear(),
  PRIVACY_LAST_UPDATED: "August 7, 2026",
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Route paths                                                         */
/* ──────────────────────────────────────────────────────────────────── */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  ADMIN: "/admin",
  ABOUT: "/about",
  PRIVACY: "/privacy-policy",
  REELS: "/reels",
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  React Query cache keys                                              */
/* ──────────────────────────────────────────────────────────────────── */
export const QUERY_KEYS = {
  AUTOMATIONS:   ["automations"]       as const,
  LOGS:          ["automation-logs"]   as const,
  REELS:         ["reels"]             as const,
  IG_ACCOUNT:    ["igAccount"]         as const,
  CONVERSATIONS: ["conversations"]     as const,
  // Admin panel
  ADMIN_STATS:   ["admin", "stats"]    as const,
  ADMIN_DAU:     ["admin", "dau"]      as const,
  ADMIN_USERS:   ["admin", "users"]    as const,
  ADMIN_LOGS:    ["admin", "logs"]     as const,
  ADMIN_ACTIVE:  ["admin", "active"]   as const,
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Cache / stale durations (milliseconds)                              */
/* ──────────────────────────────────────────────────────────────────── */
export const CACHE = {
  /** Automations change only when user edits them – 30 s stale time */
  STALE_AUTOMATIONS: 30_000,
  /** Logs update on every webhook trigger – keep fresh at 15 s */
  STALE_LOGS: 15_000,
  /** Reels rarely change mid-session – 5 min stale time */
  STALE_REELS: 5 * 60_000,
  /** Account info is stable – 10 min stale time */
  STALE_IG_ACCOUNT: 10 * 60_000,
  /** Inbox polls for new DMs every 15 s (was 5 s — too aggressive) */
  CONVERSATIONS_REFETCH: 15_000,
  /** Unused queries are garbage-collected after 10 min */
  GC_TIME: 10 * 60_000,
  // Admin
  STALE_ADMIN_STATS:  30_000,
  STALE_ADMIN_DAU:    60_000,
  STALE_ADMIN_USERS:  15_000,
  STALE_ADMIN_ACTIVE: 30_000,
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  API endpoint paths                                                  */
/* ──────────────────────────────────────────────────────────────────── */
export const API = {
  AUTOMATIONS:       "/automations",
  AUTOMATION_LOGS:   "/automations/logs",
  IG_AUTH:           "/instagram/auth",
  IG_REELS:          "/instagram/reels",
  IG_ACCOUNT:        "/instagram/account",
  IG_CONVERSATIONS:  "/instagram/conversations",
  IG_MESSAGE:        "/instagram/message",
  IG_DISCONNECT:     "/instagram/disconnect",
  AUTH_ME:           "/auth/me",
  AUTH_REGISTER:     "/auth/register",
  AUTH_LOGIN:        "/auth/login",
  AUTH_LOGOUT:       "/auth/logout",
  // Admin
  ADMIN_STATS:       "/admin/stats",
  ADMIN_DAU:         "/admin/dau",
  ADMIN_ACTIVE:      "/admin/active-now",
  ADMIN_USERS:       "/admin/users",
  ADMIN_LOGS:        "/admin/logs",
  ADMIN_CACHE_STATS: "/admin/cache-stats",
  ADMIN_CACHE_FLUSH: "/admin/cache-flush",
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Dashboard tab identifiers                                           */
/* ──────────────────────────────────────────────────────────────────── */
export const TABS = {
  REELS:              "reels",
  COMMENT_AUTOMATIONS:"automations",
  DM_AUTOMATIONS:     "dm-automations",
  INBOX:              "inbox",
  LOGS:               "logs",
} as const;

export type TabId = typeof TABS[keyof typeof TABS];

/* ──────────────────────────────────────────────────────────────────── */
/*  Admin panel tab identifiers                                         */
/* ──────────────────────────────────────────────────────────────────── */
export const ADMIN_TABS = {
  OVERVIEW:   "overview",
  USERS:      "users",
  LOGS:       "logs",
  CACHE:      "cache",
} as const;

export type AdminTabId = typeof ADMIN_TABS[keyof typeof ADMIN_TABS];

/* ──────────────────────────────────────────────────────────────────── */
/*  localStorage keys                                                   */
/* ──────────────────────────────────────────────────────────────────── */
export const STORAGE = {
  THEME:        "instaflow-theme",
  AUTH_SESSION: "instaflow-user",
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Activity log pagination                                             */
/* ──────────────────────────────────────────────────────────────────── */
export const LOG = {
  INITIAL_LIMIT:        50,
  LOAD_MORE_INCREMENT:  50,
} as const;
