import { startServer as startCoreServer } from "./_core/index.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Start the main API/tRPC server logic (registers all API routes)
  const { app, server } = await startCoreServer({
    skipListen: true, // We'll handle listen here
  });

  // Serve static files from absolute path to dist/public
  const publicPath = path.resolve(__dirname, "../dist/public");
  app.use(express.static(publicPath));

  // SPA fallback: serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(publicPath, "index.html"));
  });

  const port = process.env.PORT || 8080;
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    console.log(`🚀 Server is officially live at http://${host}:${port}`);
  });
}

startServer().catch(console.error);
