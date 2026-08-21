import InstagramAccount from "../../models/InstagramAccounts";
import Reel from "../../models/Reels";
import { User } from "../../models/User";
import {
  IG_GRAPH_API_BASE,
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

    const shortTokenRes = await fetch(IG_SHORT_TOKEN_URL, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

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

    const longTokenRes = await fetch(`${IG_LONG_TOKEN_URL}?${longTokenParams.toString()}`);
    const longTokenData = (await longTokenRes.json()) as IGLongTokenResponse;

    if (!longTokenData.access_token) {
      throw new Error(longTokenData.error?.message ?? "Failed to get long-lived token");
    }

    const accessToken = longTokenData.access_token;

    // 3. Fetch IG profile (id + username).
    //    We fetch `id` as a string to avoid JS number precision loss on large IDs (> 2^53).
    const profileRes = await fetch(
      `${IG_GRAPH_API_BASE}/me?fields=id,username&access_token=${accessToken}`
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
    try {
      console.log(`[subscribeWebhookApp] Subscribing IG user ${igUserId} to fields: ${WEBHOOK_SUBSCRIBED_FIELDS}`);
      
      const postRes = await fetch(`${IG_GRAPH_API_BASE}/${igUserId}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          subscribed_fields: WEBHOOK_SUBSCRIBED_FIELDS,
          access_token: accessToken,
        }),
      });

      const postData = (await postRes.json()) as { success?: boolean; error?: { message: string; code: number } };

      if (postData.error) {
        console.warn(
          `[subscribeWebhookApp] POST failed for IG user ${igUserId}: ` +
          `${postData.error.message} (code: ${postData.error.code})`
        );
      } else {
        console.log(`[subscribeWebhookApp] ✅ Successfully subscribed IG user ${igUserId}:`, JSON.stringify(postData));
      }

      // Diagnostic check after subscribing
      const getRes = await fetch(
        `${IG_GRAPH_API_BASE}/${igUserId}/subscribed_apps?access_token=${accessToken}`
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

    const mediaRes = await fetch(
      `${IG_GRAPH_API_BASE}/me/media?fields=${IG_MEDIA_FIELDS}&access_token=${igAccount.accessToken}`
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

    const res = await fetch(`${IG_GRAPH_API_BASE}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    });

    const data = (await res.json()) as IGApiResponse;
    console.log(`[replyToComment] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Send a private DM via the Instagram Private Reply API.
   * Uses `comment_id` as the recipient identifier — this opens a DM thread
   * to the person who left the comment.
   */
  async sendPrivateDM(
    igUserId: string,
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<IGApiResponse> {
    console.log(`[sendPrivateDM] Sending DM to commenter of comment ${commentId} via IG user ${igUserId}`);

    const res = await fetch(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
        access_token: accessToken,
      }),
    });

    const data = (await res.json()) as IGApiResponse;
    console.log(`[sendPrivateDM] Response:`, JSON.stringify(data));

    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }

  /**
   * Send a DM reply to an incoming DM sender.
   * Uses the sender's Instagram-scoped user ID as the recipient.
   */
  async sendDMReply(
    igUserId: string,
    recipientId: string,
    message: string,
    accessToken: string
  ): Promise<IGApiResponse> {
    console.log(`[sendDMReply] Replying to ${recipientId} via IG user ${igUserId}`);

    const res = await fetch(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken,
      }),
    });

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

    const res = await fetch(`${IG_GRAPH_API_BASE}/${mediaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    });

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

    const res = await fetch(`${IG_GRAPH_API_BASE}/${mediaId}/comments?${params.toString()}`);
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
