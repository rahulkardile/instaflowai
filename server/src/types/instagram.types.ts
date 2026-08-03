// ─── Comment Types ─────────────────────────────────────────────────────────
export interface IGCommentReply {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
}

export interface IGComment {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  replies?: { data: IGCommentReply[] };
}

export interface IGCommentsResponse {
  data?: IGComment[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  error?: { message: string; code: number };
}

export interface IGPostCommentResponse {
  id?: string;
  error?: { message: string; code: number };
}

// ─── Token Exchange Responses ──────────────────────────────────────────────
export interface IGShortTokenResponse {
  access_token?: string;
  user_id?: number | string;
  error_message?: string;
  error?: { message: string };
}

export interface IGLongTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string };
}

// ─── Profile & Media Responses ────────────────────────────────────────────
export interface IGProfileResponse {
  id?: string;
  username?: string;
  error?: { message: string };
}

export interface IGMediaItem {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_product_type?: string;
}

export interface IGMediaResponse {
  data?: IGMediaItem[];
  error?: { message: string; type: string; code: number };
}

// ─── Generic API Error Shape ───────────────────────────────────────────────
export interface IGApiResponse {
  id?: string;
  error?: { message: string; code: number };
}

// ─── Webhook Subscription ─────────────────────────────────────────────────
export interface IGSubscribeResponse {
  success?: boolean;
  error?: { message: string; code: number };
}

// ─── Webhook Payload Types ─────────────────────────────────────────────────
export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  time: number;
  changes?: WebhookChange[];
  messaging?: WebhookMessagingEvent[];
}

export interface WebhookChange {
  field: string;
  value: WebhookCommentValue | WebhookFeedCommentValue | Record<string, unknown>;
}

/** Payload shape when field === "comments" */
export interface WebhookCommentValue {
  id?: string;
  comment_id?: string;
  from?: { id: string; username?: string };
  text?: string;
  media?: { id: string };
  media_id?: string;
}

/** Payload shape when field === "feed" and item === "comment" */
export interface WebhookFeedCommentValue {
  comment_id?: string;
  sender_id?: string;
  sender_name?: string;
  message?: string;
  media_id?: string;
  post_id?: string;
  item?: string;
}

/** Extracted and normalised comment event data */
export interface NormalisedCommentEvent {
  comment_id: string;
  sender_id: string;
  commenter_username: string;
  message: string;
  media_id: string;
}

/** Incoming DM from the messaging webhook */
export interface WebhookMessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
}

// ─── Mapped Reel (client-facing shape) ────────────────────────────────────
export interface MappedReel {
  id: string;
  caption: string | undefined;
  thumbnail_url: string | undefined;
  media_url?: string;
  like_count: number;
  comments_count: number;
  permalink: string | undefined;
  timestamp: Date;
}
