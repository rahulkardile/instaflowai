import http from "http";
import https from "https";

/**
 * Health Check Cron Service
 * Continuously pings the server's health API endpoint at random intervals
 * between 30 and 45 seconds. Reads the target URL from HEALTH_CHECK_URL environment variable.
 */

const MIN_INTERVAL_MS = 30_000; // 30 seconds
const MAX_INTERVAL_MS = 45_000; // 45 seconds

function getRandomInterval(min: number = MIN_INTERVAL_MS, max: number = MAX_INTERVAL_MS): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function startHealthCron() {
  const port = process.env.PORT || 5000;
  const targetUrl =
    process.env.HEALTH_CHECK_URL ||
    process.env.SERVER_URL ||
    `http://localhost:${port}/health`;

  console.log(`[HealthCron] Initialized. Target URL: ${targetUrl}`);

  function pingHealthApi() {
    const nextIntervalMs = getRandomInterval();
    const nextIntervalSec = (nextIntervalMs / 1000).toFixed(1);
    const isHttps = targetUrl.startsWith("https");
    const client = isHttps ? https : http;

    const req = client.get(targetUrl, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        const timestamp = new Date().toISOString();
        let payload: unknown = body;
        try {
          payload = JSON.parse(body);
        } catch {
          // Keep raw string body if not JSON
        }
        console.log(`\n[HealthCron] 🟢 [${timestamp}] HTTP ${res.statusCode} - Pinged: ${targetUrl}`);
        console.log(`[HealthCron] Response:`, JSON.stringify(payload));
        console.log(`[HealthCron] Next ping scheduled in ${nextIntervalSec}s\n`);

        setTimeout(pingHealthApi, nextIntervalMs);
      });
    });

    req.on("error", (err) => {
      const timestamp = new Date().toISOString();
      console.error(`\n[HealthCron] 🔴 [${timestamp}] ERROR pinging ${targetUrl}: ${err.message}`);
      console.log(`[HealthCron] Next ping scheduled in ${nextIntervalSec}s\n`);

      setTimeout(pingHealthApi, nextIntervalMs);
    });

    req.end();
  }

  // Initial delay of 5 seconds after bootstrap
  setTimeout(pingHealthApi, 5000);
}
