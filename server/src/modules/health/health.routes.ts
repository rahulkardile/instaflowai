import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import os from "os";
import { META_API_VERSION } from "../../constants";

export const healthRoutes = Router();

const startTime = Date.now();

/**
 * Format uptime seconds into human readable breakdown (days, hours, minutes, seconds)
 * dynamically formatted depending on value.
 */
function formatUptime(uptimeSeconds: number) {
  const d = Math.floor(uptimeSeconds / (3600 * 24));
  const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = Math.floor(uptimeSeconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d} day${d > 1 ? "s" : ""}`);
  if (h > 0) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m > 0) parts.push(`${m} min${m > 1 ? "s" : ""}`);
  parts.push(`${s} sec${s !== 1 ? "s" : ""}`);

  return {
    totalSeconds: uptimeSeconds,
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
    formatted: parts.join(" "),
  };
}

/**
 * Format bytes to MB or GB string
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

  // Uptime
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const uptimeFormatted = formatUptime(uptimeSeconds);

  // Memory
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const systemMemUsagePct = ((usedMem / totalMem) * 100).toFixed(2);

  // CPU
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : "Unknown CPU";
  const cpuCores = cpus.length;
  const loadAvg = os.loadavg();
  const processCpu = process.cpuUsage();

  const isHealthy = isDbConnected;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    success: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    service: "InstaFlow AI Backend",
    version: "1.0.0",
    metaGraphApiVersion: META_API_VERSION,
    timestamp: new Date().toISOString(),
    uptime: uptimeFormatted,
    system: {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV || "development",
    },
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      loadAverage: {
        "1m": +loadAvg[0].toFixed(2),
        "5m": +loadAvg[1].toFixed(2),
        "15m": +loadAvg[2].toFixed(2),
      },
      processCpuTimeMs: {
        user: Math.round(processCpu.user / 1000),
        system: Math.round(processCpu.system / 1000),
      },
    },
    memory: {
      process: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss),
        external: formatBytes(memUsage.external),
        arrayBuffers: formatBytes(memUsage.arrayBuffers || 0),
        heapUsedMB: +(memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: +(memUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: +(memUsage.rss / 1024 / 1024).toFixed(2),
      },
      system: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        usagePercentage: `${systemMemUsagePct}%`,
      },
    },
    checks: {
      database: {
        status: dbStatusMap[dbState] || "unknown",
        readyState: dbState,
        dbName: mongoose.connection.name || null,
        host: mongoose.connection.host || null,
      },
    },
  });
});
