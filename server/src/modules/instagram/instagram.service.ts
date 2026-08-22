import InstagramAccount from "../../models/InstagramAccounts";
import Reel from "../../models/Reels";
import { User } from "../../models/User";
import { metaFetch } from "../../utils/metaFetch";
import {
  IG_GRAPH_API_BASE,
  FB_GRAPH_API_BASE,
  IG_OAUTH_BASE_URL,
  IG_SHORT_TOKEN_URL,
  IG_LONG_TOKEN_URL,
  IG_SCOPES,
  TOKEN_EXPIRY_DAYS,
  IG_MEDIA_FIELDS,
  WEBHOOK_SUBSCRIBED_FIELDS,
} from "../../constants";
import type {
  IGShortTokenResponse,
  IGLongTokenResponse,
  IGProfileResponse,
  IGMediaResponse,
  IGApiResponse,
  MappedReel,
  IGCommentsResponse,
  IGPostCommentResponse,
  IGComment,
} from "../../types/instagram.types";


// ─── In-memory dedup guard for subscribeWebhookApp ──────────────────────────
const _subscribeInProgress = new Set<string>();

export class InstagramService {
  /**
   * Build the Instagram OAuth authorization URL.
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
      scope: IG_SCOPES.join(","),
      response_type: "code",
      state: userId,
    });

    return `${IG_OAUTH_BASE_URL}?${params.toString()}`;
  }

  /**
   * Handle the OAuth callback: exchange code for tokens, discover IG account,
   * persist them, and mark the user as connected.
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const clientId = process.env.INSTAGRAM_APP_ID ?? process.env.FACEBOOK_APP_ID!;
    // Support both spellings: new (INSTAGRAM_APP_SECRET) and old typo (INSTAGRAM_APP_SECREAT) in .env
    const clientSecret =
      process.env.INSTAGRAM_APP_SECRET ??
      process.env.INSTAGRAM_APP_SECREAT ??
      process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI!;

    // 1. Exchange code for short-lived token
    const formData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const shortTokenRes = await metaFetch(IG_SHORT_TOKEN_URL, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }, "oauth.short_token");

    const shortTokenData = (await shortTokenRes.json()) as IGShortTokenResponse;

    if (!shortTokenData.access_token) {
      throw new Error(
        shortTokenData.error_message ?? shortTokenData.error?.message ?? "Failed to get short-lived token"
      );
    }

    // 2. Exchange short-lived token for long-lived token (60-day)
    const longTokenParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: clientSecret,
      access_token: shortTokenData.access_token,
    });

    const longTokenRes = await metaFetch(
      `${IG_LONG_TOKEN_URL}?${longTokenParams.toString()}`,
      undefined,
      "oauth.long_token"
    );
    const longTokenData = (await longTokenRes.json()) as IGLongTokenResponse;

    if (!longTokenData.access_token) {
      throw new Error(longTokenData.error?.message ?? "Failed to get long-lived token");
    }

    const accessToken = longTokenData.access_token;

    // 3. Fetch IG profile (id + username).
    //    We fetch `id` as a string to avoid JS number precision loss on large IDs (> 2^53).
    const profileRes = await metaFetch(
      `${IG_GRAPH_API_BASE}/me?fields=id,username&access_token=${accessToken}`,
      undefined,
      "profile.me"
    );
    const profileData = (await profileRes.json()) as IGProfileResponse;

    if (profileData.error) {
      throw new Error(profileData.error.message);
    }

    // Prefer string ID from the API; never rely on the numeric user_id from token exchange
    const igUserId = profileData.id ?? String(shortTokenData.user_id);
    const username = profileData.username ?? "";

    console.log(`[handleCallback] IG User ID: ${igUserId}, username: ${username}`);

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    // 4. Upsert Instagram account record
    await InstagramAccount.findOneAndUpdate(
      { userId },
      {
        userId,
        instagramUserId: igUserId,
        username,
        pageId: "", // Not required for direct Instagram OAuth
        accessToken,
        tokenExpiresAt,
      },
      { upsert: true, new: true }
    );

    // 5. Mark user as connected
    await User.findByIdAndUpdate(userId, { instagramConnected: true });

    // 6. Subscribe to Webhook events (POST /{ig-user-id}/subscribed_apps)
    await this.subscribeWebhookApp(igUserId, accessToken);
  }

  /**
   * Subscribes this IG account to receive webhook events (comments, messages)
   * and verifies the subscription.
   */
  async subscribeWebhookApp(igUserId: string, accessToken: string): Promise<boolean> {
    // Prevent duplicate concurrent calls (e.g. getAccount triggers two in parallel)
    if (_subscribeInProgress.has(igUserId)) {
      console.log(`[subscribeWebhookApp] Already in progress for IG user ${igUserId} — skipping duplicate`);
      return false;
    }
    _subscribeInProgress.add(igUserId);

    try {
      console.log(`[subscribeWebhookApp] Subscribing IG user ${igUserId} to fields: ${WEBHOOK_SUBSCRIBED_FIELDS}`);
      
      // IMPORTANT: subscribed_apps must use graph.facebook.com, NOT graph.instagram.com
      // graph.instagram.com returns 404 for this endpoint even with valid tokens.
      const postRes = await metaFetch(`${FB_GRAPH_API_BASE}/${igUserId}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          subscribed_fields: WEBHOOK_SUBSCRIBED_FIELDS,
          access_token: accessToken,
        }),
      }, "webhook.subscribe");

      const postData = (await postRes.json()) as { success?: boolean; error?: { message: string; code: number } };

      if (postData.error) {
        console.warn(
          `[subscribeWebhookApp] POST failed for IG user ${igUserId}: ` +
          `${postData.error.message} (code: ${postData.error.code})`
        );
      } else {
        console.log(`[subscribeWebhookApp] ✅ Successfully subscribed IG user ${igUserId}:`, JSON.stringify(postData));
      }

      // Diagnostic: verify subscribed fields after subscribing
      const getRes = await metaFetch(
        `${FB_GRAPH_API_BASE}/${igUserId}/subscribed_apps?access_token=${accessToken}`,
        undefined,
        "webhook.subscriptions"
      );
      const getData = (await getRes.json()) as { data?: unknown[]; error?: { message: string; code: number } };
      console.log(`[subscribeWebhookApp] Current subscriptions:`, JSON.stringify(getData.data ?? getData.error));

      return !!postData.success;
    } catch (err) {
      console.error(
        `[subscribeWebhookApp] Unexpected error:`,
        err instanceof Error ? err.message : err
      );
      return false;
    } finally {
      _subscribeInProgress.delete(igUserId);
    }
  }

  /**
   * Fetch the user's Instagram media, upsert each item into the Reel collection,
   * and return all cached Reels for the user.
   */
  async fetchAndSyncReels(userId: string): Promise<MappedReel[]> {
    const igAccount = await InstagramAccount.findOne({ userId });
    if (!igAccount) {
      throw new Error("No Instagram account connected");
    }

    // Best-effort: ensure webhook subscriptions on each sync
    if (igAccount.instagramUserId && igAccount.accessToken) {
      this.subscribeWebhookApp(igAccount.instagramUserId, igAccount.accessToken).catch((err) => {
        console.error("[fetchAndSyncReels] Webhook subscription check failed:", err);
      });
    }

    console.log("[fetchAndSyncReels] Fetching media for IG user:", igAccount.instagramUserId);

    const mediaRes = await metaFetch(
      `${IG_GRAPH_API_BASE}/me/media?fields=${IG_MEDIA_FIELDS}&access_token=${igAccount.accessToken}`,
      undefined,
      "media.list"
    );
    const mediaData = (await mediaRes.json()) as IGMediaResponse;

    if (mediaData.error) {
      throw new Error(mediaData.error.message);
    }

    const mediaItems = mediaData.data ?? [];

    for (const item of mediaItems) {
      await Reel.findOneAndUpdate(
        { userId, reelId: item.id },
        {
          userId,
          instagramAccountId: igAccount._id,
          reelId: item.id,
          caption: item.caption ?? "",
          thumbnailUrl: item.thumbnail_url ?? "",
          permalink: item.permalink ?? "",
          likesCount: item.like_count ?? 0,
          commentsCount: item.comments_count ?? 0,
        },
        { upsert: true, new: true }
      );
    }

    const reels = await Reel.find({ userId });

    return reels.map((r) => ({
      id: (r as any).reelId ?? r._id?.toString(),
      caption: (r as any).caption,
      thumbnail_url: (r as any).thumbnailUrl,
      media_url: undefined,
      like_count: (r as any).likesCount ?? 0,
      comments_count: (r as any).commentsCount ?? 0,
      permalink: (r as any).permalink,
      timestamp: r.createdAt,
    }));
  }

  /**
   * Reply publicly to a comment on Instagram.
   */
  async replyToComment(commentId: string, message: string, accessToken: string): Promise<IGApiResponse> {
    console.log(`[replyToComment] Replying to comment ${commentId}`);

    const res = await metaFetch(`${IG_GRAPH_API_BASE}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    }, "comments.reply");

    const data = (await res.json()) as IGApiResponse;
    console.log(`[replyToComment] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Send the one allowed private reply to a comment.
   *
   * For comment-triggered DMs, Meta requires recipient.comment_id. Using the
   * commenter's IGSID here is treated like a normal DM and fails unless the
   * user already opened the messaging window.
   */
  async sendPrivateDM(
    igUserId: string,
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<IGApiResponse> {
    console.log(`[sendPrivateDM] Sending private reply for comment=${commentId} via IG user ${igUserId}`);

    const res = await metaFetch(`${FB_GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
      }),
    }, "messages.private_reply");

    const data = (await res.json()) as IGApiResponse;
    console.log(`[sendPrivateDM] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Send a DM reply to an incoming DM sender.
   * Uses the sender's Instagram-Scoped ID (IGSID) as the recipient.
   *
   * messaging_type "RESPONSE" is required by Meta for replies within the
   * 24-hour user-initiated messaging window.
   */
  async sendDMReply(
    igUserId: string,
    recipientId: string,
    message: string,
    accessToken: string
  ): Promise<IGApiResponse> {
    console.log(`[sendDMReply] Replying to IGSID=${recipientId} via IG user ${igUserId}`);

    // IMPORTANT: /{igUserId}/messages must use graph.facebook.com for the Messenger API.
    // Authorization must be in the Bearer header, not in the JSON body for v25+.
    const res = await metaFetch(`${FB_GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: "RESPONSE",
      }),
    }, "messages.dm_reply");

    const data = (await res.json()) as IGApiResponse;
    console.log(`[sendDMReply] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Post a new top-level comment on a media object.
   * Requires the `instagram_business_manage_comments` permission.
   */
  async postComment(
    mediaId: string,
    message: string,
    accessToken: string
  ): Promise<IGPostCommentResponse> {
    console.log(`[postComment] Posting comment on media ${mediaId}`);

    const res = await metaFetch(`${IG_GRAPH_API_BASE}/${mediaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    }, "comments.create");

    const data = (await res.json()) as IGPostCommentResponse;
    console.log(`[postComment] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Fetch all top-level comments (+ replies) on a media object.
   * Returns newest first (Instagram default ordering).
   */
  async getComments(mediaId: string, accessToken: string): Promise<IGComment[]> {
    console.log(`[getComments] Fetching comments for media ${mediaId}`);

    const fields = "id,text,timestamp,username,like_count,replies{id,text,timestamp,username}";
    const params = new URLSearchParams({ fields, access_token: accessToken });

    const res = await metaFetch(
      `${IG_GRAPH_API_BASE}/${mediaId}/comments?${params.toString()}`,
      undefined,
      "comments.list"
    );
    const data = (await res.json()) as IGCommentsResponse;

    console.log(`[getComments] Found ${data.data?.length ?? 0} comment(s) for media ${mediaId}`);

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data.data ?? [];
  }

  /**
   * Disconnect all Instagram accounts for a user and clear the connected flag.
   */
  async disconnect(userId: string): Promise<void> {
    await InstagramAccount.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { instagramConnected: false });
  }
}
