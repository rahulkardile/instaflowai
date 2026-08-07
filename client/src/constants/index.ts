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
  /** Inbox polls for new DMs every 5 s */
  CONVERSATIONS_REFETCH: 5_000,
  /** Unused queries are garbage-collected after 10 min */
  GC_TIME: 10 * 60_000,
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
/*  localStorage keys                                                   */
/* ──────────────────────────────────────────────────────────────────── */
export const STORAGE = {
  THEME:        "instaflow-theme",
  AUTH_SESSION: "auth_session",
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Activity log pagination                                             */
/* ──────────────────────────────────────────────────────────────────── */
export const LOG = {
  INITIAL_LIMIT:        50,
  LOAD_MORE_INCREMENT:  50,
} as const;
