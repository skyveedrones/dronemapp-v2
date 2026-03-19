import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import { Request, Response, Router } from "express";
import path from "path";
import fs from "fs/promises";
import { storagePut } from "./storage";

// Temporary upload directory
const UPLOAD_DIR = "/tmp/tus-uploads";

// Store for upload metadata (to pass info back to client)
const uploadMetadataStore = new Map<string, {
  finalUrl: string;
  thumbnailUrl: string | null;
  filename: string;
  fileSize: number;
  mimeType: string;
}>();

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    // Directory may already exist
  }
}

// Extract thumbnail from video using canvas (client will handle this)
// Server just stores the video and returns URL

const tusServer = new Server({
  path: "/api/video-upload",
  datastore: new FileStore({
    directory: UPLOAD_DIR,
  }),
  respectForwardedHeaders: true,
  maxSize: 5 * 1024 * 1024 * 1024, // 5GB max

  onUploadCreate: async (req, upload) => {
    await ensureUploadDir();
    
    // Get metadata from upload
    const metadata = upload.metadata;
    const filetype = metadata?.filetype;
    const projectId = metadata?.projectId;

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      "video/x-matroska", // .mkv
      "video/webm",
    ];

    if (filetype && !allowedTypes.includes(filetype)) {
      throw new Error("Only video files are allowed (MP4, MOV, AVI, MKV, WebM)");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    return upload;
  },

  onUploadFinish: async (req, upload) => {
    try {
      const metadata = upload.metadata || {};
      const filename = metadata.filename || `video-${Date.now()}.mp4`;
      const filetype = metadata.filetype || "video/mp4";
      const projectId = metadata.projectId;

      // Read the uploaded file
      const tusFilePath = path.join(UPLOAD_DIR, upload.id);
      const fileBuffer = await fs.readFile(tusFilePath);
      const fileSize = fileBuffer.length;

      // Generate storage key
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storageKey = `projects/${projectId}/videos/${timestamp}-${sanitizedFilename}`;

      // Upload to S3
      const { url } = await storagePut(storageKey, fileBuffer, filetype);

      // Store metadata for client retrieval
      uploadMetadataStore.set(upload.id, {
        finalUrl: url,
        thumbnailUrl: null, // Client will generate thumbnail
        filename,
        fileSize,
        mimeType: filetype,
      });

      // Clean up temp file
      try {
        await fs.unlink(tusFilePath);
        // Also try to remove the .json metadata file
        await fs.unlink(tusFilePath + ".json").catch(() => {});
      } catch (err) {
        console.error("Error cleaning up temp file:", err);
      }

      console.log(`Video uploaded successfully: ${url}`);
      return {};
    } catch (err) {
      console.error("Error processing uploaded video:", err);
      throw err;
    }
  },
});

// Create Express router
export const tusRouter = Router();

// Handle TUS requests
tusRouter.all("/video-upload", async (req: Request, res: Response) => {
  try {
    await tusServer.handle(req, res);
  } catch (err) {
    console.error("TUS error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

tusRouter.all("/video-upload/*", async (req: Request, res: Response) => {
  try {
    await tusServer.handle(req, res);
  } catch (err) {
    console.error("TUS error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Endpoint to get upload metadata after completion
tusRouter.get("/video-upload-metadata/:uploadId", (req: Request, res: Response) => {
  const { uploadId } = req.params;
  const metadata = uploadMetadataStore.get(uploadId);

  if (!metadata) {
    res.status(404).json({ error: "Upload metadata not found" });
    return;
  }

  // Clean up after retrieval
  uploadMetadataStore.delete(uploadId);

  res.json(metadata);
});

// Clean up old metadata entries periodically (every hour)
setInterval(() => {
  // Keep store from growing too large
  if (uploadMetadataStore.size > 1000) {
    const entries = Array.from(uploadMetadataStore.entries());
    // Remove oldest half
    entries.slice(0, 500).forEach(([key]) => uploadMetadataStore.delete(key));
  }
}, 60 * 60 * 1000);
