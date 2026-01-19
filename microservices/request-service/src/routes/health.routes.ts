import { Router, Request, Response } from "express";
import { testConnection } from "../config/database";
import { getChannel } from "../config/messaging";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await testConnection();
    let messagingHealth = false;

    try {
      getChannel();
      messagingHealth = true;
    } catch (error) {
      messagingHealth = false;
    }

    const isHealthy = dbHealth && messagingHealth;

    const health = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      service: "request-service",
      version: process.env.SERVICE_VERSION || "1.0.0",
      checks: {
        database: dbHealth ? "connected" : "disconnected",
        messaging: messagingHealth ? "connected" : "disconnected",
      },
    };

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      service: "request-service",
      error: "Health check failed",
    });
  }
});

export default router;

