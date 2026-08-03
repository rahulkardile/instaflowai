# InstaFlowAI

> An Instagram automation platform that connects to the Instagram Graph API to detect and respond to comments and direct messages in real time via Meta webhooks.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Folder Structure](#2-architecture--folder-structure)
3. [Authentication Flow](#3-authentication-flow)
4. [Instagram Account Connection Process](#4-instagram-account-connection-process)
5. [Access Token Generation & Management](#5-access-token-generation--management)
6. [Webhook Setup & Event Handling](#6-webhook-setup--event-handling)
7. [Why DM & Comment Automation Is Failing — Root Cause Analysis](#7-why-dm--comment-automation-is-failing--root-cause-analysis)
8. [Reels Data Fetching Flow](#8-reels-data-fetching-flow)
9. [Comment Automation Flow](#9-comment-automation-flow)
10. [DM Automation Flow](#10-dm-automation-flow)
11. [Server-Side Request Lifecycle](#11-server-side-request-lifecycle)
12. [API Endpoints Reference](#12-api-endpoints-reference)
13. [Environment Variables](#13-environment-variables)
14. [Setup & Installation Instructions](#14-setup--installation-instructions)
15. [Common Issues & Troubleshooting](#15-common-issues--troubleshooting)
16. [Current Limitations & Possible Improvements](#16-current-limitations--possible-improvements)

---

## 1. Project Overview

**InstaFlowAI** is a full-stack TypeScript application that allows Instagram Business / Creator account owners to set up automated responses to:

- **Comments** left on specific Reels (public reply + optional DM to commenter)
- **Direct Messages** (incoming DMs matched by keyword → auto-reply)

The backend exposes a REST API consumed by the React frontend. Real-time event detection relies on **Meta (Facebook) webhooks** that POST to the server when Instagram events occur.

**Core technologies:**

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Frontend   | React 19, Vite, TanStack Query, React Router 7 |
| Backend    | Node.js, Express 5, TypeScript                 |
| Database   | MongoDB via Mongoose                           |
| Auth       | JWT (jsonwebtoken)                             |
| Styling    | TailwindCSS v4                                 |
| Queue      | BullMQ + Redis (configured, not yet wired)     |
| Tunneling  | ngrok (required for local webhook delivery)    |

---

## 2. Architecture & Folder Structure

```
instaFlowAI/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── config/             # Axios instance, API base URL
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx   # Main dashboard (automations, conversations, account)
│   │   │   ├── Landing.tsx     # Public landing page
│   │   │   ├── Login.tsx       # Login / register page
│   │   │   └── Reels.tsx       # Reels viewer & automation setup
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helper utilities
│   └── .env                    # VITE_API_URL
│
└── server/                     # Express backend
    ├── src/
    │   ├── index.ts            # App entry point, middleware, route mounting
    │   ├── config/
    │   │   ├── db.ts           # MongoDB connection
    │   │   ├── redis.ts        # ioredis client
    │   │   ├── bullMQ.ts       # BullMQ queue setup
    │   │   └── env.ts          # Env variable validation
    │   ├── middleware/
    │   │   └── authMiddleware.ts  # JWT verification middleware
    │   ├── models/
    │   │   ├── User.ts             # App user (email/password or Google)
    │   │   ├── InstagramAccounts.ts # Connected IG account + tokens
    │   │   ├── Automation.ts       # Automation rules (COMMENT / DM)
    │   │   ├── ExecutionLog.ts     # Per-event execution history
    │   │   └── Reels.ts            # Cached Reels metadata
    │   ├── modules/
    │   │   ├── auth/
    │   │   │   ├── auth.routes.ts  # /api/auth/*
    │   │   │   └── auth.service.ts # Register, login, token
    │   │   ├── instagram/
    │   │   │   ├── instagram.routes.ts  # /api/instagram/* + webhook endpoints
    │   │   │   └── instagram.service.ts # OAuth, token exchange, API calls
    │   │   └── automation/
    │   │       └── automation.routes.ts # /api/automations/*
    │   ├── schema/
    │   │   └── zUserSchema.ts  # Zod schemas for user input
    │   ├── types/
    │   │   └── userTypes.ts    # Enums: UserRole, AuthProvider
    │   └── utils/
    │       └── jwt.ts          # JWT generate / verify helpers
    ├── docker-compose.yml      # MongoDB + Redis containers
    ├── webhook_debug.log       # Persistent HTTP request log (all requests logged here)
    └── .env                    # Server environment variables
```

---

## 3. Authentication Flow

InstaFlowAI uses a **local email/password** system (Google OAuth is scaffolded but not wired to a Google Strategy at runtime).

```
User registers/logs in
        │
        ▼
POST /api/auth/register  or  POST /api/auth/login
        │
        ▼
AuthService validates credentials (bcrypt compare for login)
        │
        ▼
JwtService.generateToken({ userId, email, role })
        │   expires in 30 days
        ▼
{ token: "eyJ...", user: { id, name, email, role, instagramConnected } }
        │
        ▼
Client stores token in localStorage
        │
        ▼
All authenticated API calls include:
  Authorization: Bearer <token>
```

**Key files:**
- `server/src/modules/auth/auth.routes.ts` — POST /register, POST /login, GET /me, GET /verify, POST /logout
- `server/src/modules/auth/auth.service.ts` — Business logic
- `server/src/middleware/authMiddleware.ts` — Validates JWT on every protected route
- `server/src/models/User.ts` — MongoDB schema for users

---

## 4. Instagram Account Connection Process

The app uses the **Instagram OAuth (Instagram Login)** flow — *not* the Facebook Login + Page Token flow. This authenticates directly against `www.instagram.com/oauth/authorize`.

```
1. User clicks "Connect Instagram" in the dashboard
        │
        ▼
2. GET /api/instagram/auth  →  returns { url: "https://www.instagram.com/oauth/authorize?..." }
   Scopes requested:
     - instagram_business_basic
     - instagram_business_manage_comments
     - instagram_business_manage_messages

3. Browser redirects to Instagram. User approves permissions.

4. Instagram redirects to:
   FACEBOOK_REDIRECT_URI?code=<auth_code>&state=<userId>

5. GET /api/instagram/callback (public, no auth)
   - Extracts `code` and `state` (userId)
   - Calls instagramService.handleCallback(code, userId)

6. handleCallback:
   a. Exchange code → short-lived token
      POST https://api.instagram.com/oauth/access_token
   b. Exchange short-lived → long-lived token (60-day)
      GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token&...
   c. Fetch IG profile: GET https://graph.instagram.com/v20.0/me?fields=id,username
   d. Upsert InstagramAccount in DB (userId, instagramUserId, username, accessToken, tokenExpiresAt)
   e. Mark user.instagramConnected = true
   f. Subscribe to webhooks: POST /{igUserId}/subscribed_apps?subscribed_fields=comments,messages

7. Browser redirected to /dashboard?ig_connected=true
```

**Key files:**
- `server/src/modules/instagram/instagram.service.ts` — `getAuthUrl()`, `handleCallback()`, `subscribeToWebhook()`
- `server/src/models/InstagramAccounts.ts` — DB model

---

## 5. Access Token Generation & Management

| Token Type       | Validity   | How Obtained                                              |
|------------------|------------|-----------------------------------------------------------|
| Short-lived      | ~1 hour    | `POST https://api.instagram.com/oauth/access_token`       |
| Long-lived       | ~60 days   | `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token` |
| Refreshed token  | Resets 60d | `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` |

**Current implementation:**
- The long-lived token is stored in `InstagramAccount.accessToken`.
- `tokenExpiresAt` is set to 60 days from connection time.
- ⚠️ **There is no automatic token refresh logic.** Once the 60-day window passes, all API calls (comment replies, DM sends, reel fetches) will fail with a `#190 OAuthException: Token expired`.

---

## 6. Webhook Setup & Event Handling

### How Meta Webhooks Work

Meta webhooks require **two things** to work:

1. **App-level subscription** — The Meta App must subscribe to the `instagram` product with the specific fields (`comments`, `messages`) configured in the Meta Developer console.
2. **Account-level subscription** — Each individual Instagram account must grant permission via `POST /{igUserId}/subscribed_apps`.

The server handles both a **verification request** (GET) and **event delivery** (POST) on the same endpoint `/api/instagram/webhook`.

### Webhook Verification (GET)

When you configure a webhook URL in Meta's dashboard, Meta sends a one-time verification:

```
GET /api/instagram/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<number>
```

The server checks `hub.mode === "subscribe"` and `hub.verify_token === FACEBOOK_WEBHOOK_VERIFY_TOKEN`. If matched, it echoes back the `hub.challenge` value as a plain-text `200` response. This was **confirmed working** (see first entry in `webhook_debug.log`).

### Webhook Event Delivery (POST)

When a comment or DM arrives, Meta sends:

```json
POST /api/instagram/webhook
{
  "object": "instagram",
  "entry": [
    {
      "id": "<igUserId>",
      "time": 1234567890,
      "changes": [/* comment events */],
      "messaging": [/* DM events */]
    }
  ]
}
```

The handler:
1. Iterates `entry.changes` → calls `handleCommentWebhook()`
2. Iterates `entry.messaging` → calls `handleMessagingWebhook()`

> ⚠️ **The webhook endpoint must be publicly accessible (HTTPS) for Meta to POST to it.** When running locally, you must use `ngrok` or a similar tunnel.

---

## 7. Why DM & Comment Automation Is Failing — Root Cause Analysis

After a full code and log audit, **multiple distinct issues** are preventing automation from triggering. Here they are in order of severity:

---

### 🔴 Issue 1: App Not in Live Mode (Most Likely Root Cause)

**What it means:** Meta Apps in **Development Mode** only deliver webhook events to users who are listed as testers or developers of the app. Events from real Instagram users outside the app are **silently dropped** — Meta never sends the POST to your webhook.

**How to verify:**
- Go to [Meta for Developers](https://developers.facebook.com/apps/) → your app → top bar.
- If it shows **"In Development"**, webhook events from non-tester accounts will never arrive.

**Fix:**
1. Complete the App Review process and request `instagram_business_manage_comments` and `instagram_business_manage_messages` permissions.
2. Switch the app to **Live Mode**.

> Until the app is Live, even a perfectly working webhook will never fire for external accounts.

---

### 🔴 Issue 2: Webhook Not Subscribed at the App Level in Meta Dashboard

**What it means:** The `subscribed_apps` API call (account-level subscription) tells Meta to route events to *your registered webhook URL*, but that URL must first be configured in the Meta Developer console at the **App level**.

**Required steps in Meta Developer console:**
1. App Dashboard → **Add Product** → **Webhooks**
2. Select object type: **Instagram**
3. Set Callback URL: `https://your-ngrok-url.ngrok-free.dev/api/instagram/webhook`
4. Set Verify Token: matches `FACEBOOK_WEBHOOK_VERIFY_TOKEN` in your `.env`
5. Click **Verify and Save** (this triggers the GET verification)
6. After verification, **Subscribe** to the `comments` and `messages` fields

**The `subscribeToWebhook()` call in code cannot replace this step.** It only registers the app on the account after the app-level webhook URL is already configured.

---

### 🔴 Issue 3: ngrok URL Changes on Every Restart

**What it means:** The free tier of ngrok generates a new random URL every time you start it (unless you use a static domain). The `.env` file currently contains:

```
FACEBOOK_REDIRECT_URI=https://penpal-strength-skimpily.ngrok-free.dev/api/instagram/callback
```

This URL is registered in Meta as a **valid OAuth Redirect URI** and as the **webhook callback URL**. If ngrok is restarted with a different URL, all webhook deliveries will fail with `ECONNREFUSED` on Meta's side.

**Fix:** Use a **static ngrok domain** (available on free tier):
```bash
ngrok http --domain=your-static-domain.ngrok-free.app 5000
```

Or use a proper deployment (Railway, Render, VPS) with a fixed URL.

---

### 🟡 Issue 4: `subscribeToWebhook()` May Use the Wrong API Base URL

**Current code in `instagram.service.ts`:**
```typescript
const IG_GRAPH_API_BASE = "https://graph.instagram.com/v20.0";

// subscribeToWebhook:
POST https://graph.instagram.com/v20.0/{igUserId}/subscribed_apps
```

**The problem:** The `/{id}/subscribed_apps` endpoint for **Instagram-scoped OAuth** may require using the `graph.facebook.com` base URL instead of `graph.instagram.com`, depending on the app type. Some Meta documentation versions require:

```
POST https://graph.facebook.com/v20.0/{igUserId}/subscribed_apps?subscribed_fields=comments,messages&access_token=...
```

**Fix:** Check the `subscribeToWebhook()` response in your server logs after account connection. If it returns an error object, switch the base URL to `graph.facebook.com`.

---

### 🟡 Issue 5: Comment `reelId` Matching May Fail Due to ID Format

**In `handleCommentWebhook()`:**
```typescript
const reelMatch = automation.reelId === media_id;
```

The `reelId` stored in the `Automation` model comes from the user selecting a Reel in the UI (sourced from `Reel.reelId`, which is the Instagram media ID string). The `media_id` in the webhook payload comes from `val.media?.id || val.media_id || val.post_id`.

**Potential mismatch:** The `feed` field type (`change.field === "feed"`) uses `val.post_id` as the media identifier, while the `comments` field type uses `val.media?.id`. If the webhook fires as a `feed` event instead of a `comments` event, the ID field is different.

**Fix:** Log both values explicitly and ensure the automation is created with the exact media ID that Meta sends in webhooks.

---

### 🟡 Issue 6: Schema Inconsistency — `active` vs `enabled`

**In `automation.routes.ts` (POST create):**
```typescript
enabled: parsed.data.active ?? true,  // input field name: 'active'
```

**In `automation.routes.ts` (PUT update):**
```typescript
enabled: z.boolean().optional(),  // input field name: 'enabled'
```

The create schema uses `active` (mapped to `enabled` in DB), but if a client sends `enabled` in the create payload it will be silently ignored by Zod. This is not causing automation failure directly, but it is an inconsistency.

---

### 🟡 Issue 7: Typo in Environment Variable Name

**In `.env`:**
```
INSTAGRAM_APP_SECREAT=...  # typo: "SECREAT" not "SECRET"
```

**In `instagram.service.ts`:**
```typescript
const clientSecret = process.env.INSTAGRAM_APP_SECREAT || process.env.FACEBOOK_APP_SECRET!;
```

The code handles this with a fallback, but this should be standardized.

---

### Summary of Root Causes

| # | Issue | Severity | Where to Fix |
|---|-------|----------|--------------|
| 1 | App in Development Mode — Meta drops events from non-testers | 🔴 Critical | Meta Developer Dashboard |
| 2 | Webhook not subscribed at App level in Meta Dashboard | 🔴 Critical | Meta Developer Dashboard |
| 3 | ngrok URL changes on restart, breaking registered callback URL | 🔴 Critical | Use static ngrok domain or deploy |
| 4 | `subscribed_apps` may need `graph.facebook.com` base URL | 🟡 Medium | `instagram.service.ts` |
| 5 | `reelId` matching may fail for `feed` vs `comments` event types | 🟡 Medium | `instagram.routes.ts` |
| 6 | Create uses `active`, update uses `enabled` — schema inconsistency | 🟡 Low | `automation.routes.ts` |
| 7 | Typo in env var name `INSTAGRAM_APP_SECREAT` | 🟡 Low | `.env` + `instagram.service.ts` |

---

### Actionable Fix Checklist

```
[ ] 1. Go to Meta for Developers → submit your app for review / switch to Live Mode
[ ] 2. In Meta Dashboard → App → Webhooks → Instagram → configure callback URL + verify token
[ ] 3. Subscribe to the 'comments' and 'messages' fields in the Meta Dashboard
[ ] 4. Use a static ngrok domain (ngrok http --domain=<your-domain> 5000)
[ ] 5. Update FACEBOOK_REDIRECT_URI and webhook callback URL in .env with the static domain
[ ] 6. Re-authenticate the Instagram account (to re-run subscribeToWebhook with the correct URL)
[ ] 7. Verify subscribeToWebhook() response in server logs — fix base URL if it returns an error
[ ] 8. Test with a tester account (same app) to confirm end-to-end flow before going live
```

---

## 8. Reels Data Fetching Flow

```
User visits /reels page
        │
        ▼
GET /api/instagram/reels  (authenticated)
        │
        ▼
instagramService.fetchAndSyncReels(userId)
  1. Find InstagramAccount for userId
  2. Auto-subscribe webhook (fire-and-forget)
  3. GET https://graph.instagram.com/v20.0/me/media
       ?fields=id,caption,thumbnail_url,permalink,like_count,
               comments_count,media_type,media_product_type
       &access_token=<token>
  4. For each media item, upsert into Reel collection
  5. Return all Reels for user from DB
        │
        ▼
Response mapped to snake_case shape expected by client:
  { id, caption, thumbnail_url, media_url, like_count, comments_count, permalink, timestamp }
        │
        ▼
Client renders Reels grid — user selects a Reel to create a COMMENT automation
```

**Note:** All media types are fetched and stored. The `reelId` stored is the Instagram media ID string (e.g. `"17854360229135492"`).

---

## 9. Comment Automation Flow

### Setup
1. User goes to the Reels page.
2. Selects a Reel.
3. Configures: `commentReply` (public reply text) and/or `dmMessage` (private DM to commenter), plus optional `keywords`.
4. POSTs to `POST /api/automations` with `{ type: "COMMENT", reelId, keywords, commentReply, dmMessage }`.
5. Automation saved in MongoDB.

### Trigger (via webhook)
```
Instagram user comments on the Reel
        │
        ▼
Meta sends POST /api/instagram/webhook
  body.entry[].changes[] where change.field === "comments" or "feed"
        │
        ▼
handleCommentWebhook(change, entry):
  1. Extract: comment_id, sender_id, commenterUsername, message, media_id
  2. Find InstagramAccount by entry.id (the IG user ID who owns the post)
  3. Log COMMENT_RECEIVED ExecutionLog
  4. Query: Automation.find({ type: "COMMENT", enabled: true })
  5. For each automation:
     - Check reelMatch: automation.reelId === media_id
     - Check keywordMatch: message contains one of automation.keywords (or no keywords → match all)
     - If both match:
       a. Call instagramService.replyToComment(comment_id, commentReply, accessToken)
          → POST https://graph.instagram.com/v20.0/{comment_id}/replies
          → Log COMMENT_REPLY ExecutionLog
       b. Call instagramService.sendPrivateDM(igUserId, comment_id, dmMessage, accessToken)
          → POST https://graph.instagram.com/v20.0/{igUserId}/messages
          → body: { recipient: { comment_id }, message: { text } }
          → Log SEND_DM ExecutionLog
```

---

## 10. DM Automation Flow

### Setup
1. User goes to Dashboard → Automations tab.
2. Creates automation with `{ type: "DM", keywords: [...], dmReplyMessage: "..." }`.
3. No `reelId` is needed for DM automations.

### Trigger (via webhook)
```
Instagram user sends a DM to the connected account
        │
        ▼
Meta sends POST /api/instagram/webhook
  body.entry[].messaging[] (NOT entry[].changes[])
        │
        ▼
handleMessagingWebhook(messagingEvent, entry):
  1. Extract: senderId, recipientId (the IG account's user ID), messageText
  2. Skip echo messages (is_echo === true)
  3. Skip if no senderId or messageText
  4. Find InstagramAccount by instagramUserId === recipientId
  5. Log DM_RECEIVED ExecutionLog
  6. Query: Automation.find({ type: "DM", enabled: true, userId: igAccount.userId })
  7. For each automation:
     - Check keywordMatch: messageText contains one of automation.keywords (or no keywords → match all)
     - If matched and dmReplyMessage set:
       → Call instagramService.sendDMReply(igUserId, senderId, dmReplyMessage, accessToken)
          → POST https://graph.instagram.com/v20.0/{igUserId}/messages
          → body: { recipient: { id: senderId }, message: { text } }
       → Log DM_AUTO_REPLY ExecutionLog
```

**Important:** For DM events, Meta delivers the payload under `entry[].messaging[]` — this is the Messenger Platform format. The webhook subscription for Instagram DMs uses the `messages` field.

---

## 11. Server-Side Request Lifecycle

```
Request arrives
        │
        ▼
Global logging middleware (webhook_debug.log)
  — Logs: timestamp, method, URL, headers, body
        │
        ▼
CORS middleware
  — Allows origin: CLIENT_URL
  — Credentials: true
        │
        ▼
Helmet (security headers)
        │
        ▼
Compression (gzip)
        │
        ▼
express.json() (body parsing)
        │
        ▼
Route matching:
  /api/auth/*        → authRoutes
  /api/instagram/*   → instagramRoutes
  /api/automations/* → automationRoutes (authMiddleware applied via router.use())
        │
        ▼
authMiddleware (for protected routes):
  1. Extract Bearer token from Authorization header
  2. JwtService.verifyToken(token)
  3. User.findById(payload.userId) — verify user exists and isActive
  4. Attach req.user = { userId, id, email, role }
  5. Call next()
        │
        ▼
Route handler executes business logic
        │
        ▼
JSON response returned
```

---

## 12. API Endpoints Reference

### Auth Routes — `/api/auth`

| Method | Path        | Auth | Description                        |
|--------|-------------|------|------------------------------------|
| POST   | /register   | No   | Create account (email/password)    |
| POST   | /login      | No   | Login, returns JWT                 |
| GET    | /me         | Yes  | Get current user profile           |
| GET    | /verify     | Yes  | Check if token is still valid      |
| POST   | /logout     | Yes  | Logout (stateless — client removes token) |

**POST /api/auth/register body:**
```json
{ "name": "John Doe", "email": "john@example.com", "password": "strongpassword" }
```

**POST /api/auth/login body:**
```json
{ "email": "john@example.com", "password": "strongpassword" }
```

---

### Instagram Routes — `/api/instagram`

| Method | Path           | Auth | Description                                        |
|--------|----------------|------|----------------------------------------------------|
| GET    | /auth          | Yes  | Get Instagram OAuth redirect URL                  |
| GET    | /callback      | No   | OAuth callback (Meta redirects here)              |
| DELETE | /disconnect    | Yes  | Remove connected Instagram account                |
| GET    | /reels         | Yes  | Fetch & sync user's Reels from Instagram API      |
| GET    | /account       | Yes  | Get connected Instagram account info              |
| GET    | /conversations | Yes  | Fetch DM/conversation logs                        |
| POST   | /message       | Yes  | Send a manual DM reply from the portal            |
| GET    | /webhook       | No   | Meta webhook verification endpoint                |
| POST   | /webhook       | No   | Meta webhook event delivery endpoint              |

**POST /api/instagram/message body:**
```json
{ "recipientId": "123456789", "text": "Hello from InstaFlowAI!" }
```

---

### Automation Routes — `/api/automations` (all require auth)

| Method | Path    | Description                                  |
|--------|---------|----------------------------------------------|
| GET    | /       | List all automations for the user            |
| POST   | /       | Create a new automation                      |
| PUT    | /:id    | Update an automation                         |
| DELETE | /:id    | Delete an automation                         |
| GET    | /logs   | Fetch execution logs for user's automations  |

**POST /api/automations — Create COMMENT automation:**
```json
{
  "type": "COMMENT",
  "reelId": "17854360229135492",
  "keywords": ["price", "buy"],
  "commentReply": "Thanks for your comment! DM us for more info.",
  "dmMessage": "Hey! Here's the link you asked for: https://..."
}
```

**POST /api/automations — Create DM automation:**
```json
{
  "type": "DM",
  "keywords": ["help", "support"],
  "dmReplyMessage": "Thanks for reaching out! Our team will reply shortly."
}
```

---

## 13. Environment Variables

### Server (`server/.env`)

| Variable                        | Required | Description                                                     |
|---------------------------------|----------|-----------------------------------------------------------------|
| `PORT`                          | No       | Express server port (default: 5000)                            |
| `NODE_ENV`                      | No       | `development` or `production`                                  |
| `CLIENT_URL`                    | Yes      | Frontend URL for CORS and OAuth redirect (e.g. `http://localhost:5173`) |
| `MONGO_URI`                     | Yes      | MongoDB connection string                                       |
| `JWT_SECRET`                    | Yes      | Secret key for signing JWTs — use a strong random value in prod |
| `REDIS_HOST`                    | No       | Redis host (default: localhost)                                 |
| `REDIS_PORT`                    | No       | Redis port (default: 6379)                                      |
| `FACEBOOK_APP_ID`               | Yes      | Meta App ID (from Meta Developer Dashboard)                     |
| `FACEBOOK_APP_SECRET`           | Yes      | Meta App Secret                                                 |
| `FACEBOOK_REDIRECT_URI`         | Yes      | OAuth callback URL — must match exactly in Meta dashboard (must be HTTPS) |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | Yes      | Any string you choose; must match the verify token in Meta webhook config |
| `INSTAGRAM_APP_ID`              | Yes      | Instagram App ID (same or different from `FACEBOOK_APP_ID`)    |
| `INSTAGRAM_APP_SECREAT`         | Yes      | Instagram App Secret (note: current code has typo — "SECREAT") |

### Client (`client/.env`)

| Variable       | Required | Description                                    |
|----------------|----------|------------------------------------------------|
| `VITE_API_URL` | Yes      | Base URL of the backend API (e.g. `http://localhost:5000`) |

---

## 14. Setup & Installation Instructions

### Prerequisites

- Node.js ≥ 18
- npm or pnpm
- Docker & Docker Compose (for MongoDB + Redis)
- ngrok (for local webhook testing)
- A Meta Developer account with an app that has the Instagram product added
- Instagram Business or Creator account (Personal accounts are not supported by the API)

### Step 1: Clone & Install

```bash
git clone https://github.com/rahulkardile/instaflowai.git
cd instaFlowAI

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Step 2: Start Infrastructure

```bash
cd server
docker-compose up -d   # Starts MongoDB on :27017 and Redis on :6379
```

### Step 3: Configure Environment Variables

Create `server/.env` using the table in Section 13. Minimum required:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/instagram_automation
JWT_SECRET=<random-strong-secret>
FACEBOOK_APP_ID=<your-meta-app-id>
FACEBOOK_APP_SECRET=<your-meta-app-secret>
FACEBOOK_REDIRECT_URI=https://<your-ngrok-domain>/api/instagram/callback
FACEBOOK_WEBHOOK_VERIFY_TOKEN=<any-string-you-choose>
INSTAGRAM_APP_ID=<your-instagram-app-id>
INSTAGRAM_APP_SECREAT=<your-instagram-app-secret>
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### Step 4: Start ngrok with a Static Domain

```bash
# Get a free static domain at: https://dashboard.ngrok.com/cloud-edge/domains
ngrok http --domain=your-static-domain.ngrok-free.app 5000
```

Your webhook and redirect URI will be:
- Redirect URI: `https://your-static-domain.ngrok-free.app/api/instagram/callback`
- Webhook URL: `https://your-static-domain.ngrok-free.app/api/instagram/webhook`

### Step 5: Configure Meta Developer App

1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Select your app → **Instagram** product → **API Setup with Instagram Login**
3. Under **Valid OAuth Redirect URIs**, add: `https://your-static-domain.ngrok-free.app/api/instagram/callback`
4. Under **Webhooks** → select **Instagram** object
5. Set **Callback URL**: `https://your-static-domain.ngrok-free.app/api/instagram/webhook`
6. Set **Verify Token**: same value as `FACEBOOK_WEBHOOK_VERIFY_TOKEN` in `.env`
7. Click **Verify and Save**
8. Subscribe to fields: **`comments`** and **`messages`**

### Step 6: Run the Applications

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend available at: `http://localhost:5173`

### Step 7: Connect Your Instagram Account

1. Register / login in the web app.
2. Click **Connect Instagram** on the dashboard.
3. Authorize in the Instagram OAuth popup.
4. You'll be redirected back to `/dashboard?ig_connected=true`.
5. Check server logs for: `[subscribeToWebhook] Successfully subscribed IG user...`

### Step 8: Create an Automation

1. Go to **Reels** → click a Reel → configure comment automation → save.
2. Or go to **Dashboard** → **Automations** tab → create a DM automation.

### Step 9: Test with a Tester Account (Development Mode)

Since the app is in Development Mode, only registered testers can trigger events:

1. Meta App → **Roles** → **Testers** → invite the secondary Instagram account.
2. Have that account comment on your Reel or send you a DM.
3. Watch server logs for:
   - `[webhook] Comment event —`
   - `[webhook-dm] DM received —`

---

## 15. Common Issues & Troubleshooting

### Webhook events never arrive

**Symptom:** No `POST /api/instagram/webhook` entries in `webhook_debug.log` (only the initial GET verification).

**Checklist:**
1. ✅ Is the app in **Live Mode**? Development mode silently drops events from non-testers.
2. ✅ Is the webhook URL registered AND verified in Meta Dashboard with a ✅ checkmark?
3. ✅ Are `comments` and `messages` fields explicitly **subscribed** (not just configured)?
4. ✅ Is ngrok running and is the URL the same one registered in Meta?
5. ✅ Did `subscribeToWebhook()` succeed? Check logs for `[subscribeToWebhook] Response:`.

---

### "No Instagram account found" in webhook handler

**Symptom:** `[webhook-dm] No IG account found for recipient <id>`

**Cause:** The `recipientId` in the webhook doesn't match `InstagramAccount.instagramUserId` in the DB. This can happen if the account was connected before a fix or if the ID format differs.

**Fix:** Disconnect and reconnect the Instagram account. The `handleCallback()` method now fetches the correct string ID from the Graph API.

---

### Token expired errors / `#190 OAuthException`

**Cause:** The 60-day long-lived token has expired.

**Fix (immediate):** Disconnect and reconnect Instagram to get a fresh token.

**Fix (long-term):** Implement automatic token refresh (see Section 16).

---

### Comment auto-reply returns "API Error (#200)"

**Cause:** `instagram_business_manage_comments` permission was not granted, or the account is not a Business/Creator account.

**Fix:**
1. Ensure the Instagram account type is Business or Creator (not Personal).
2. Verify the OAuth scope was approved when connecting.
3. In Live Mode, this permission requires Meta App Review approval.

---

### DM auto-reply returns "API Error (#10): Not enough permissions"

**Cause:** `instagram_business_manage_messages` requires:
1. The Instagram account to have DMs enabled (Settings → Privacy → Messages).
2. The permission to be approved via App Review (for Live Mode).
3. The sender must be within the 24-hour messaging window for certain interaction types.

---

### `reelMatch` always false — no COMMENT automations trigger

**Symptom:** Server logs show `Automation X: reelMatch=false` for every automation.

**Debug:**
1. Compare `automation.reelId` (from DB) with `media_id` (from webhook log).
2. Check if the webhook uses `change.field === "feed"` (uses `val.post_id`) vs `"comments"` (uses `val.media?.id`).

**Fix:** Ensure the Media ID stored in automations matches exactly what the webhook delivers. Subscribe to the `comments` field specifically (not `feed`) for comment events.

---

### CORS errors in the browser

**Cause:** `CLIENT_URL` in `server/.env` doesn't exactly match the frontend origin.

**Fix:** Ensure `CLIENT_URL=http://localhost:5173` with no trailing slash.

---

## 16. Current Limitations & Possible Improvements

### Current Limitations

| Limitation | Detail |
|------------|--------|
| **No token refresh** | Long-lived tokens expire after 60 days. All automation silently breaks without a reconnect. |
| **App Review required for production** | `instagram_business_manage_messages` and `instagram_business_manage_comments` require Meta App Review before working for non-tester accounts. |
| **24-hour DM window** | Instagram enforces a 24-hour messaging window. Auto-replies to DMs older than 24 hours will be rejected. |
| **No rate limit handling** | High-volume accounts may hit Instagram API hourly rate limits without exponential backoff. |
| **BullMQ not wired** | BullMQ + Redis are installed but the queue is unused. All webhook processing is synchronous. |
| **Single Instagram account per user** | `InstagramAccount.findOne({ userId })` — only one account per user is supported. |
| **No webhook signature verification** | Meta signs webhook payloads with `X-Hub-Signature-256`. The server does not verify this, which is a security vulnerability. |
| **Log file grows unbounded** | `webhook_debug.log` logs every HTTP request indefinitely — it was 358KB after a few sessions. |
| **No test suite** | No unit or integration tests exist. |

### Recommended Improvements

**1. Implement automatic token refresh:**
```typescript
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token=<current_long_lived_token>
```
Schedule this as a cron job every 50 days using `node-cron` or BullMQ repeatable jobs.

**2. Add webhook signature verification:**
```typescript
import crypto from "crypto";
const sig = req.headers["x-hub-signature-256"] as string;
const body = JSON.stringify(req.body);
const expected = "sha256=" + crypto
  .createHmac("sha256", process.env.FACEBOOK_APP_SECRET!)
  .update(body)
  .digest("hex");
if (sig !== expected) return res.sendStatus(403);
```

**3. Use raw body for signature verification:**
Signature verification requires the raw request body before JSON parsing. Add `express.raw({ type: 'application/json' })` specifically for the webhook route.

**4. Wire BullMQ for async automation processing:**
- Webhook handler enqueues a job with the parsed event data.
- Worker processes the job: comment reply + DM send.
- Adds retry logic, dead-letter queues, and decouples webhook response time.

**5. Add rate limit handling:**
- Track API call counts in Redis.
- Implement exponential backoff when receiving `#32 Application Request Limit Reached`.

**6. Support multiple Instagram accounts per user.**

**7. Submit for Meta App Review:**
- Prepare a demo video showing the use of `instagram_business_manage_comments` and `instagram_business_manage_messages`.
- Submit both permissions for review before going to production.

**8. Deploy to a persistent public server:**
- Railway, Render, or a VPS eliminates the ngrok URL-change problem permanently.
- Enables `NODE_ENV=production` mode.

**9. Add structured logging** using `pino` instead of `console.log` + raw file appends.

**10. Add a unit/integration test suite:**
- Unit tests for `handleCommentWebhook()` and `handleMessagingWebhook()` with mock payloads.
- Integration tests for the OAuth callback flow.
- Use a test MongoDB via `mongodb-memory-server`.

**11. Fix the environment variable typo:**
Rename `INSTAGRAM_APP_SECREAT` → `INSTAGRAM_APP_SECRET` everywhere.

**12. Unify the `active`/`enabled` schema inconsistency:**
Use `enabled` consistently in both the create and update schemas.

---

*Last updated: August 2026 — InstaFlowAI v1.0*
