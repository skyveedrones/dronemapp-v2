import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { tusRouter } from "../tusUploadRoute";
import photoUploadRouter from "../photoUploadRoute";
import { imageProxyRouter } from "../imageProxy";
import { handleStripeWebhook } from "../stripe-webhook";
import { initializeVersion, getVersionJson } from "../version";
import { initializeRedisClient, createPerUserRateLimiter, createUploadRateLimiter, createConcurrentRequestsLimiter, closeRedisClient } from "./rateLimiter";
import { sdk } from "./sdk";
import emailRouter from "../routes/email";
import overlayUploadRouter from "../routes/overlay-upload";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for accurate rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  initializeVersion();
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);
  app.use("/api", overlayUploadRouter);
  app.use(express.json({ limit: "1500mb" }));
  app.use(express.urlencoded({ limit: "1500mb", extended: true }));
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: {
          message: 'File too large. Maximum file size is 1GB.',
          code: 'PAYLOAD_TOO_LARGE'
        }
      });
    }
    next(err);
  });
  app.use('/api/trpc', async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = await sdk.authenticateRequest(req);
      (req as any).user = user;
    } catch {
      // Not authenticated — will fall back to free tier limits
    }
    next();
  });
  app.use('/api/trpc', createPerUserRateLimiter());
  app.use('/api/trpc', createConcurrentRequestsLimiter());
  app.use("/api", tusRouter);
  app.use("/api/upload", createUploadRateLimiter());
  app.use("/api", photoUploadRouter);
  app.use("/api", imageProxyRouter);
  app.use("/api", emailRouter);
  app.get("/api/version", (req, res) => {
    res.json(getVersionJson());
  });
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { html, filename } = req.body;
      if (!html) {
        return res.status(400).json({ error: 'HTML content is required' });
      }
      req.socket.setTimeout(120000);
      const { generatePdfFromHtml } = await import('../pdfGenerator');
      const pdfBuffer = await generatePdfFromHtml(html);
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'report.pdf'}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.end(buffer, 'binary');
      console.log('[PDF] PDF sent successfully, size:', buffer.length, 'bytes');
    } catch (error: any) {
      console.error('[PDF Generation Error]:', error?.message || error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF. Please try again.' });
      }
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC Error] ${path}:`, error.message);
      },
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Use absolute path for static files
    const publicPath = path.resolve(__dirname, '../../dist/public');
    serveStatic(app, publicPath);
  }
  registerOAuthRoutes(app);
  const preferredPort = Number(process.env.PORT) || 8080;
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.setTimeout(120000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${port}/`);
  });
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, closing connections...');
    server.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });
  return { app, server };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  });
}
