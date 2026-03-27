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

const clientDistPath = path.resolve(process.cwd(), 'client/dist/public');

// --- PLACE THIS AT THE VERY TOP OF YOUR ROUTES ---
app.get('/app-auth', (req, res) => {
  // 1. Try to find the file using the CLIENT_DIST variable you have in Railway
  const clientDist = process.env.CLIENT_DIST || path.join(process.cwd(), 'client/dist/public');
  const indexPath = path.join(clientDist, 'index.html');

  console.log(`Checking for index at: ${indexPath}`);

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // 2. If that fails, try the absolute path from your previous logs
  const fallbackPath = '/app/client/dist/public/index.html';
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }

  // 3. Last resort: Send the diagnostic info so we can see it in the browser
  res.status(404).send(`
    <h2>Path Diagnostic</h2>
    <ul>
      <li><b>CWD:</b> ${process.cwd()}</li>
      <li><b>CLIENT_DIST Env:</b> ${process.env.CLIENT_DIST}</li>
      <li><b>Checked Path 1:</b> ${indexPath}</li>
      <li><b>Checked Path 2:</b> ${fallbackPath}</li>
    </ul>
  `);
});

// 1. Serve all static files (CSS, JS, Images)
app.use(express.static(clientDistPath));

// 2. Catch-all for /app-auth or any other sub-routes
app.get('/app-auth', (req, res) => {
  const root = process.cwd();
  const pathsToTry = [
    path.join(root, 'client/dist/public/index.html'),
    path.join(root, '../client/dist/public/index.html'),
    path.join(root, 'dist/public/index.html')
  ];

  const validPath = pathsToTry.find(p => fs.existsSync(p));

  if (validPath) {
    console.log(`[Success] Serving auth from: ${validPath}`);
    return res.sendFile(validPath);
  }

  console.error(`[Error] 404 - Could not find index.html. Tried: ${pathsToTry.join(', ')}`);
  res.status(404).send("Auth page not found. Check server logs for tried paths.");
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
