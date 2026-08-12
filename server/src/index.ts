import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { connectDB } from "./config/db";
import { authRoutes } from "./modules/auth/auth.routes";
import { instagramRoutes } from "./modules/instagram/instagram.routes";
import { automationRoutes } from "./modules/automation/automation.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { adminRoutes, seedInitialAdmin } from "./modules/admin/admin.routes";
import { startHealthCron } from "./services/healthCron";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from "./constants";

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((u) => u.trim().replace(/\/$/, ""))
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// ─── Trust proxy (needed for rate limiter behind a reverse proxy/Render) ────
app.set("trust proxy", 1);

// ─── Global rate limiter ───────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,  // 15 minutes
  max:      RATE_LIMIT_MAX,        // 200 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  // Skip rate limiting for webhook endpoints (Meta posts frequently)
  skip: (req) => req.path.includes("/webhook"),
});

app.use(globalLimiter);

// ─── Async request logger (buffered writes — NO sync I/O on hot path) ──────
const LOG_FILE = path.join(process.cwd(), "webhook_debug.log");
const writeQueue: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (writeQueue.length === 0) return;
    const batch = writeQueue.splice(0, writeQueue.length).join("");
    fs.appendFile(LOG_FILE, batch, (err) => {
      if (err) console.error("[Logger] Write failed:", err.message);
    });
  }, 2000); // Batch flush every 2 seconds
  flushTimer.unref();
}

scheduleFlush();

app.use((req, _res, next) => {
  const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  writeQueue.push(line);
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/api/health",      healthRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/instagram",   instagramRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/admin",       adminRoutes);

// Also mount health at root /health for the healthCron self-ping
app.use("/health", healthRoutes);

// ─── Global error handler ──────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Unhandled Error]", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  try {
    await connectDB();
    await seedInitialAdmin();   // Promote the configured admin user if needed

    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT} — env: ${process.env.NODE_ENV || "development"}`);
      startHealthCron();
    });
  } catch (error) {
    console.error("[Bootstrap] Fatal error:", error);
    process.exit(1);
  }
}

bootstrap();
