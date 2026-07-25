import InstagramAccount from "../../models/InstagramAccounts";
import Reel from "../../models/Reels";
import { User } from "../../models/User";

const IG_GRAPH_API_BASE = "https://graph.instagram.com/v20.0";

export class InstagramService {
  /**
   * Build the Facebook OAuth authorization URL.
   */
  getAuthUrl(userId: string): string {
    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ].join(",");

    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
      scope: scopes,
      response_type: "code",
      state: userId,
    });

    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle the OAuth callback: exchange code for tokens, discover IG account,
   * persist them, and mark the user as connected.
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const clientId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!;
    const clientSecret = process.env.INSTAGRAM_APP_SECREAT || process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI!;

    // 1. Exchange code for short-lived token
    const formData = new URLSearchParams();
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", redirectUri);
    formData.append("code", code);

    const shortTokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const shortTokenData = (await shortTokenRes.json()) as {
      access_token?: string;
      user_id?: number | string;
      error_message?: string;
      error?: { message: string };
    };

    if (!shortTokenData.access_token) {
      throw new Error(
        shortTokenData.error_message ||
        shortTokenData.error?.message ||
        "Failed to get short-lived token"
      );
    }

    const shortToken = shortTokenData.access_token;

    // 2. Exchange short-lived token for long-lived token
    const longTokenParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: clientSecret,
      access_token: shortToken,
    });

    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?${longTokenParams.toString()}`
    );
    const longTokenData = (await longTokenRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };

    if (!longTokenData.access_token) {
      throw new Error(
        longTokenData.error?.message || "Failed to get long-lived token"
      );
    }

    const accessToken = longTokenData.access_token;

    // 3. Get Instagram profile (id + username)
    //    IMPORTANT: We fetch 'id' from the API as a string to avoid JavaScript
    //    number precision loss on large Instagram user IDs (>2^53).
    //    The token exchange returns user_id as a number which gets corrupted.
    const profileRes = await fetch(
      `${IG_GRAPH_API_BASE}/me?fields=id,username&access_token=${accessToken}`
    );
    const profileData = (await profileRes.json()) as {
      id?: string;
      username?: string;
      error?: { message: string };
    };

    if (profileData.error) {
      throw new Error(profileData.error.message);
    }

    // Use the string ID from the API, NOT the numeric user_id from token exchange
    const igUserId = profileData.id || String(shortTokenData.user_id);
    const username = profileData.username || "";

    console.log(`[handleCallback] IG User ID (from API): ${igUserId}, username: ${username}`);

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);

    // 4. Save to database (upsert by userId to avoid duplicates on re-auth)
    await InstagramAccount.findOneAndUpdate(
      { userId },
      {
        userId,
        instagramUserId: igUserId,
        username,
        pageId: "", // pageId is not needed under direct Instagram login
        accessToken,
        tokenExpiresAt,
      },
      { upsert: true, new: true }
    );

    // 5. Mark user connected
    await User.findByIdAndUpdate(userId, { instagramConnected: true });

    // 6. Subscribe to webhooks (comments + messages)
    await this.subscribeToWebhook(igUserId, accessToken);
  }

  /**
   * Subscribe the Instagram account to webhook fields (comments, messages).
   * This ensures Meta sends webhook events to our callback URL.
   */
  async subscribeToWebhook(igUserId: string, accessToken: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        subscribed_fields: "comments,messages",
        access_token: accessToken,
      });
      const subscribeRes = await fetch(
        `${IG_GRAPH_API_BASE}/${igUserId}/subscribed_apps?${params.toString()}`,
        {
          method: "POST",
        }
      );
      const subscribeData = (await subscribeRes.json()) as {
        success?: boolean;
        error?: { message: string; code: number };
      };
      console.log(`[subscribeToWebhook] Response:`, JSON.stringify(subscribeData));
      if (subscribeData.error) {
        console.error(
          `[subscribeToWebhook] Failed: ${subscribeData.error.message}`
        );
      } else {
        console.log(`[subscribeToWebhook] Successfully subscribed IG user ${igUserId} to comments + messages`);
      }
    } catch (err) {
      console.error(
        `[subscribeToWebhook] Error:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  /**
   * Fetch the user's Instagram media, filter to Reels, and upsert into the DB.
   */
  async fetchAndSyncReels(userId: string) {
    const igAccount = await InstagramAccount.findOne({ userId });
    if (!igAccount) {
      throw new Error("No Instagram account connected");
    }

    // Auto-subscribe/ensure webhook is subscribed on each Reels sync/fetch
    if (igAccount.instagramUserId && igAccount.accessToken) {
      this.subscribeToWebhook(igAccount.instagramUserId, igAccount.accessToken).catch((e) => {
        console.error("[fetchAndSyncReels] Auto-subscribe webhook failed:", e);
      });
    }

    const fields =
      "id,caption,thumbnail_url,permalink,like_count,comments_count,media_type,media_product_type";

    console.log("--- Fetching Instagram Media ---");
    console.log("Instagram User ID:", igAccount.instagramUserId);

    const mediaRes = await fetch(`${IG_GRAPH_API_BASE}/me/media?fields=${fields}&access_token=${igAccount.accessToken}`);
    const mediaData = (await mediaRes.json()) as {
      data?: Array<{
        id: string;
        caption?: string;
        thumbnail_url?: string;
        permalink?: string;
        like_count?: number;
        comments_count?: number;
        media_type?: string;
        media_product_type?: string;
      }>;
      error?: { message: string; type: string; code: number };
    };

    console.log("Meta API Response:", JSON.stringify(mediaData, null, 2));

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
          caption: item.caption || "",
          thumbnailUrl: item.thumbnail_url || "",
          permalink: item.permalink || "",
          likesCount: item.like_count ?? 0,
          commentsCount: item.comments_count ?? 0,
        },
        { upsert: true, new: true }
      );
    }

    return Reel.find({ userId });
  }

  /**
   * Reply publicly to a comment on Instagram.
   * Throws an error if the Graph API returns an error response.
   */
  async replyToComment(
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<unknown> {
    console.log(`[replyToComment] Replying to comment ${commentId}`);
    const res = await fetch(
      `${IG_GRAPH_API_BASE}/${commentId}/replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: accessToken }),
      }
    );
    const data = (await res.json()) as { error?: { message: string; code: number } };
    console.log(`[replyToComment] Response:`, JSON.stringify(data));
    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }
    return data;
  }

  /**
   * Send a private DM via the Instagram User Messaging endpoint.
   * Uses instagramUserId (not pageId) — required for direct Instagram OAuth.
   * Uses comment_id based recipient for the Private Replies API.
   * Throws an error if the Graph API returns an error response.
   */
  async sendPrivateDM(
    igUserId: string,
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<unknown> {
    console.log(`[sendPrivateDM] Sending DM to commenter of comment ${commentId} via IG user ${igUserId}`);
    const res = await fetch(
      `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text: message },
          access_token: accessToken,
        }),
      }
    );
    const data = (await res.json()) as { error?: { message: string; code: number } };
    console.log(`[sendPrivateDM] Response:`, JSON.stringify(data));
    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }
    return data;
  }

  /**
   * Send a DM reply to an incoming DM sender.
   * Uses the Instagram Messaging API with the sender's Instagram-scoped ID.
   * Throws an error if the Graph API returns an error response.
   */
  async sendDMReply(
    igUserId: string,
    recipientId: string,
    message: string,
    accessToken: string
  ): Promise<unknown> {
    console.log(`[sendDMReply] Sending DM reply to ${recipientId} via IG user ${igUserId}`);
    const res = await fetch(
      `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: accessToken,
        }),
      }
    );
    const data = (await res.json()) as { error?: { message: string; code: number } };
    console.log(`[sendDMReply] Response:`, JSON.stringify(data));
    if (data.error) {
      throw new Error(`Graph API error (${data.error.code}): ${data.error.message}`);
    }
    return data;
  }

  /**
   * Disconnect all Instagram accounts for a user.
   */
  async disconnect(userId: string): Promise<void> {
    await InstagramAccount.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { instagramConnected: false });
  }
}
