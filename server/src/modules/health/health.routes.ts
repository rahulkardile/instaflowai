import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { META_API_VERSION } from "../../constants";

export const healthRoutes = Router();

const startTime = Date.now();

/**
 * Health Check API
 * GET /api/health or /health
 */
healthRoutes.get("/", async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const isDbConnected = dbState === 1;

  const memUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const isHealthy = isDbConnected;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    success: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    service: "InstaFlow AI Backend",
    version: "1.0.0",
    metaGraphApiVersion: META_API_VERSION,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    checks: {
      database: {
        status: dbStatusMap[dbState] || "unknown",
        readyState: dbState,
      },
      memory: {
        heapUsedMB: +(memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: +(memUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: +(memUsage.rss / 1024 / 1024).toFixed(2),
      },
    },
  });
});
