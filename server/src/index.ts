import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { connectDB } from "./config/db";
import { authRoutes } from "./modules/auth/auth.routes";
import { instagramRoutes } from "./modules/instagram/instagram.routes";
import { automationRoutes } from "./modules/automation/automation.routes";

const app = express();
dotenv.config();
console.log(process.env.CLIENT_URL);
app.use(
  cors({
    origin: process.env.CLIENT_URL?.replace(/\/$/, "") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(compression());
app.use(express.json());

import fs from "fs";
import path from "path";

app.use((req, res, next) => {
  const WEBHOOK_LOG_FILE = path.join(process.cwd(), "webhook_debug.log");
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] REQUEST: ${req.method} ${req.originalUrl} - Headers: ${JSON.stringify(req.headers)} - Body: ${JSON.stringify(req.body)}\n`;
  try {
    fs.appendFileSync(WEBHOOK_LOG_FILE, logLine);
  } catch (err) {
    console.error("Failed to write request log:", err);
  }
  next();
});
import { healthRoutes } from "./modules/health/health.routes";

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/automations", automationRoutes);


const PORT = Number(process.env.PORT) || 5000;

import { startHealthCron } from "./services/healthCron";

async function bootstrap() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            startHealthCron();
        });
    } catch (error) {

        console.error(error);
        process.exit(1);
    }
}

bootstrap();
