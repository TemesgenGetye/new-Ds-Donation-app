import dotenv from "dotenv";

import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { connectRabbitMQ } from "./config/messaging";
import { errorHandler } from "./middleware/error.middleware";
import healthRoutes from "./routes/health.routes";
import messageRoutes from "./routes/message.routes";
import { logger } from "./utils/logger";

// MUST call dotenv.config() immediately, before any imports that use process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Swagger UI
try {
  const swaggerPath = path.resolve(__dirname, "../swagger.yaml");
  logger.info(`📄 Attempting to load Swagger from: ${swaggerPath}`);

  if (!fs.existsSync(swaggerPath)) {
    throw new Error(`Swagger file not found at: ${swaggerPath}`);
  }

  const swaggerDocument = YAML.load(swaggerPath);

  if (!swaggerDocument) {
    throw new Error("Swagger document is empty or invalid");
  }

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Messaging Service API Documentation",
    })
  );
  logger.info("📚 Swagger UI available at /api-docs");
  logger.info(`✅ Swagger file loaded successfully from: ${swaggerPath}`);
} catch (err: any) {
  logger.error(
    "⚠️  Swagger documentation not found, skipping Swagger UI setup"
  );
  logger.error(`Error details: ${err?.message || err}`);
}

// Routes
app.use("/health", healthRoutes);
app.use("/api/messages", messageRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "messaging-service",
    version: process.env.SERVICE_VERSION || "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      messages: "/api/messages",
      apiDocs: "/api-docs",
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to RabbitMQ (this also starts the consumer)
    await connectRabbitMQ();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Messaging Service running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`👂 Consumer is listening for campaign events...`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

startServer();

