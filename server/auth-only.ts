import express from "express";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeRedisClient, closeRedisClient } from "./_core/rateLimiter";
import * as db from "./db";
import emailRouter from "./routes/email";
import overlayUploadRouter from "./routes/overlay-upload";
import { tusRouter } from "./tusUploadRoute";
import photoUploadRouter from "./photoUploadRoute";
import { imageProxyRouter } from "./imageProxy";
import { handleStripeWebhook } from "./stripe-webhook";
import path from 'path';

const app = express();

// Core middleware
app.use(express.json({ limit: "1500mb" }));
app.use(express.urlencoded({ limit: "1500mb", extended: true }));

// Auth-related routes only
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use("/api", overlayUploadRouter);
app.use("/api", tusRouter);
app.use("/api/upload", photoUploadRouter);
app.use("/api", imageProxyRouter);
app.use("/api", emailRouter);

// Add the missing OAuth Portal route
app.get('/app-auth', (req, res) => {
  // This serves your main index.html which contains the login UI logic
  res.sendFile(path.resolve(process.cwd(), 'client/dist/public/index.html'));
});

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

const port = Number(process.env.PORT) || 8080;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[Auth-Only Server] Running on http://0.0.0.0:${port}/`);
});

process.on('SIGTERM', () => {
  console.log('[Auth-Only Server] SIGTERM received, closing connections...');
  server.close(() => {
    closeRedisClient();
    console.log('[Auth-Only Server] Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('[Auth-Only Server] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Auth-Only Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
