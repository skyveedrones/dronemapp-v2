/**
 * Image Proxy Route
 * 
 * This module provides a server-side proxy for fetching images from S3/CloudFront
 * when direct public access is not available (403 Forbidden).
 * 
 * The proxy fetches images using the authenticated storage API and streams them
 * to the client, bypassing CloudFront access restrictions.
 */

import { Router, Request, Response } from "express";
import { ENV } from "./_core/env";

const router = Router();

// Cache for storing fetched images temporarily (in-memory, clears on restart)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Proxy endpoint for fetching images
 * GET /api/image-proxy?key=<fileKey>
 * 
 * The fileKey should be the relative path stored in the database (e.g., "1/media/image.jpg")
 */
router.get("/image-proxy", async (req: Request, res: Response) => {
  try {
    const fileKey = req.query.key as string;
    
    if (!fileKey) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    // Check cache first
    const cached = imageCache.get(fileKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("X-Proxy-Cache", "HIT");
      return res.send(cached.data);
    }

    // Build the storage download URL
    const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
    const apiKey = ENV.forgeApiKey;

    if (!baseUrl || !apiKey) {
      console.error("[ImageProxy] Missing storage configuration");
      return res.status(500).json({ error: "Storage configuration missing" });
    }

    // First, get the download URL from the storage API
    const downloadApiUrl = new URL("v1/storage/downloadUrl", baseUrl + "/");
    downloadApiUrl.searchParams.set("path", fileKey);

    const urlResponse = await fetch(downloadApiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!urlResponse.ok) {
      const errorText = await urlResponse.text();
      console.error("[ImageProxy] Failed to get download URL:", urlResponse.status, errorText);
      return res.status(urlResponse.status).json({ error: "Failed to get download URL" });
    }

    const { url: imageUrl } = await urlResponse.json();

    // Fetch the actual image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        // Add authorization header in case it's needed
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!imageResponse.ok) {
      // If direct fetch fails, try fetching through the storage API's download endpoint
      console.log("[ImageProxy] Direct fetch failed, trying storage download endpoint");
      
      // Try alternative: fetch directly with API auth
      const directDownloadUrl = new URL("v1/storage/download", baseUrl + "/");
      directDownloadUrl.searchParams.set("path", fileKey);
      
      const directResponse = await fetch(directDownloadUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      
      if (!directResponse.ok) {
        console.error("[ImageProxy] All fetch methods failed for:", fileKey);
        return res.status(404).json({ error: "Image not found" });
      }
      
      const buffer = Buffer.from(await directResponse.arrayBuffer());
      const contentType = directResponse.headers.get("content-type") || "image/jpeg";
      
      // Cache the result
      imageCache.set(fileKey, { data: buffer, contentType, timestamp: Date.now() });
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("X-Proxy-Cache", "MISS");
      return res.send(buffer);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Cache the result
    imageCache.set(fileKey, { data: buffer, contentType, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (imageCache.size > 100) {
      const now = Date.now();
      const keysToDelete: string[] = [];
      imageCache.forEach((value, key) => {
        if (now - value.timestamp > CACHE_TTL) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => imageCache.delete(key));
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Proxy-Cache", "MISS");
    return res.send(buffer);

  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Proxy endpoint for fetching images by full URL
 * GET /api/image-proxy-url?url=<encodedUrl>
 * 
 * This endpoint takes a full CloudFront URL and proxies it through the server
 */
router.get("/image-proxy-url", async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    // Check cache first
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("X-Proxy-Cache", "HIT");
      return res.send(cached.data);
    }

    const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
    const apiKey = ENV.forgeApiKey;

    if (!baseUrl || !apiKey) {
      console.error("[ImageProxy] Missing storage configuration");
      return res.status(500).json({ error: "Storage configuration missing" });
    }

    // Try to fetch the image with authorization header
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!imageResponse.ok) {
      // Extract the file key from the URL and try the storage API
      // URL format: https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/{fileKey}
      const urlParts = new URL(imageUrl);
      const pathParts = urlParts.pathname.split('/');
      // Skip the first 3 parts (empty, appId, bucketId) to get the fileKey
      const fileKey = pathParts.slice(3).join('/');
      
      if (fileKey) {
        const downloadApiUrl = new URL("v1/storage/downloadUrl", baseUrl + "/");
        downloadApiUrl.searchParams.set("path", fileKey);

        const urlResponse = await fetch(downloadApiUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (urlResponse.ok) {
          const { url: newUrl } = await urlResponse.json();
          const retryResponse = await fetch(newUrl);
          
          if (retryResponse.ok) {
            const buffer = Buffer.from(await retryResponse.arrayBuffer());
            const contentType = retryResponse.headers.get("content-type") || "image/jpeg";
            
            imageCache.set(imageUrl, { data: buffer, contentType, timestamp: Date.now() });
            
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=300");
            res.setHeader("X-Proxy-Cache", "MISS");
            return res.send(buffer);
          }
        }
      }
      
      console.error("[ImageProxy] Failed to fetch image:", imageResponse.status);
      return res.status(404).json({ error: "Image not found" });
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Cache the result
    imageCache.set(imageUrl, { data: buffer, contentType, timestamp: Date.now() });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Proxy-Cache", "MISS");
    return res.send(buffer);

  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as imageProxyRouter };
