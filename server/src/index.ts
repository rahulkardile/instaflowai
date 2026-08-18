import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { connectDB } from "./config/db";
import { authRoutes } from "./modules/auth/auth.routes";
import { instagramRoutes } from "./modules/instagram/instagram.routes";
import { automationRoutes } from "./modules/automation/automation.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { startHealthCron } from "./services/healthCron";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Exiting.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters in production. Exiting.");
  process.exit(1);
}


const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim().replace(/\/$/, ""))
  : ["http://localhost:5173"];

const app = express();

app.set("trust proxy", 1);

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

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // Structured HTTP logs

// ─── Global API rate limiter (skips /webhook) ─────────────────────────────
app.use("/api", apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/admin", adminRoutes);

// ─── Global error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`);
      startHealthCron();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
