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
import fs from 'fs';

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

// Update static asset mapping to dist/public
app.use(express.static(path.join(process.cwd(), 'dist/public')));

const clientDistPath = path.resolve(process.cwd(), 'dist/public'); 

// Single /app-auth route with intelligent fallback paths
app.get('/app-auth', (req, res) => {
  // Look for index.html in dist/public
  const indexPath = path.join(process.cwd(), 'dist/public/index.html');

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Diagnostic if it still fails
  res.status(404).send(`File not found at: ${indexPath}`);
});

// Serve all static files (CSS, JS, Images)
app.use(express.static(clientDistPath));

// Health check endpoint
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
