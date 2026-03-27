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

// Single /app-auth route with intelligent fallback paths
app.get('/app-auth', (req, res) => {
  const root = process.cwd();
  
  // Try paths in order of likelihood on Railway
  // Railway's build output is typically at dist/public, not client/dist/public
  const pathsToTry = [
    path.join(root, 'dist/public/index.html'),           // Production build output (Railway standard)
    path.join(root, 'client/dist/public/index.html'),    // Local dev structure
    path.join(root, '../client/dist/public/index.html'), // Parent directory
    path.join(root, '../dist/public/index.html'),        // Alternative parent
  ];

  const validPath = pathsToTry.find(p => fs.existsSync(p));

  if (validPath) {
    console.log(`[Auth] Successfully serving from: ${validPath}`);
    return res.sendFile(validPath);
  }

  // Diagnostic response with all attempted paths
  console.error(`[Auth 404] File not found. Attempted paths:`);
  pathsToTry.forEach((p, idx) => {
    console.error(`  ${idx + 1}. ${p} - ${fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'}`);
  });
  
  res.status(404).json({ 
    error: "Auth page not found",
    message: "index.html could not be located in any expected directory",
    attempted_paths: pathsToTry,
    current_working_directory: root,
    hint: "Ensure 'npm run build' completed successfully and dist/public/index.html exists"
  });
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
