/**
 * Photo Upload Routes
 * Handles chunked HD photo uploads with metadata extraction
 * Preserves full EXIF/GPS data for mapping accuracy
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storagePut, storageGet } from "./storage";
import { extractImageMetadata } from "./metadataExtractor";

const router = Router();

// Request validation schemas
const ChunkUploadRequest = z.object({
  projectId: z.number(),
  filename: z.string(),
  fileSize: z.number(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  uploadId: z.string().optional(),
  chunk: z.string(), // base64-encoded chunk data
});

const FinalizeUploadRequest = z.object({
  projectId: z.number(),
  uploadId: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

// In-memory session storage for tracking uploads
interface UploadSession {
  projectId: number;
  filename: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  s3Keys: Map<number, string>; // chunkIndex -> s3Key
  createdAt: Date;
}

const uploadSessions = new Map<string, UploadSession>();

// Clean up old sessions every 30 minutes
setInterval(() => {
  const now = new Date();
  const sessionsToDelete: string[] = [];
  uploadSessions.forEach((session, uploadId) => {
    const ageMs = now.getTime() - session.createdAt.getTime();
    if (ageMs > 30 * 60 * 1000) {
      sessionsToDelete.push(uploadId);
    }
  });
  sessionsToDelete.forEach(uploadId => {
    uploadSessions.delete(uploadId);
    console.log(`[Photo Upload] Cleaned up expired session: ${uploadId}`);
  });
}, 30 * 60 * 1000);

/**
 * POST /api/photo-upload/chunk
 * Upload a single chunk of a photo
 */
router.post("/photo-upload/chunk", async (req: Request, res: Response) => {
  try {
    const data = ChunkUploadRequest.parse(req.body);
    const { projectId, filename, fileSize, chunkIndex, totalChunks, uploadId: clientUploadId, chunk: base64Chunk } = data;

    if (chunkIndex === 0) {
      console.log(`[Photo Upload DEBUG] Chunk upload started: filename=${filename}, fileSize=${fileSize}`);
    }

    if (!base64Chunk) {
      return res.status(400).json({ error: "Missing chunk data" });
    }

    // Generate upload ID if not provided
    const uploadId = clientUploadId || `${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize or get upload session
    if (!uploadSessions.has(uploadId)) {
      uploadSessions.set(uploadId, {
        projectId,
        filename,
        fileSize,
        totalChunks,
        uploadedChunks: new Set(),
        s3Keys: new Map(),
        createdAt: new Date(),
      });
    }

    // Decode base64 chunk to binary buffer
    const chunkBuffer = Buffer.from(base64Chunk, 'base64');
    console.log(`[Photo Upload] Received chunk ${chunkIndex + 1}/${totalChunks} (${chunkBuffer.length} bytes) for upload ${uploadId}`);

    // Generate S3 key for this chunk
    const s3Key = `projects/${projectId}/photos/${uploadId}/chunk-${chunkIndex}`;

    // Upload chunk directly to S3
    const { url } = await storagePut(s3Key, chunkBuffer, "application/octet-stream");

    // Store the S3 key in the session
    const session = uploadSessions.get(uploadId)!;
    session.s3Keys.set(chunkIndex, s3Key);
    session.uploadedChunks.add(chunkIndex);

    console.log(`[Photo Upload] Chunk ${chunkIndex} uploaded to S3: ${s3Key}`);

    res.json({
      uploadId,
      chunkIndex,
      s3Key,
      publicUrl: url,
      uploadedChunks: Array.from(session.uploadedChunks).sort((a, b) => a - b),
      isComplete: session.uploadedChunks.size === session.totalChunks,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Photo Upload] Error uploading chunk:", msg);
    res.status(400).json({ error: `Failed to upload chunk: ${msg}` });
  }
});

/**
 * POST /api/photo-upload/finalize
 * Combine all chunks and finalize the upload
 */
router.post("/photo-upload/finalize", async (req: Request, res: Response) => {
  try {
    const data = FinalizeUploadRequest.parse(req.body);
    const { projectId, uploadId, filename, fileSize, mimeType } = data;
    console.log(`[Photo Upload DEBUG] Finalize request: filename=${filename}, mimeType=${mimeType}, fileSize=${fileSize}`);

    const session = uploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: "Upload session not found" });
    }

    // Verify all chunks were uploaded
    if (session.uploadedChunks.size !== session.totalChunks) {
      return res.status(400).json({
        error: `Not all chunks uploaded. Expected ${session.totalChunks}, got ${session.uploadedChunks.size}`,
      });
    }

    console.log(`[Photo Upload] Finalizing upload ${uploadId}: combining ${session.totalChunks} chunks...`);

    // Download all chunks from S3 and combine them
    const chunks: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const s3Key = session.s3Keys.get(i);
      if (!s3Key) {
        throw new Error(`Missing chunk ${i} in S3 keys map`);
      }

      try {
        // Get the download URL for this chunk
        const { url: downloadUrl } = await storageGet(s3Key);
        console.log(`[Photo Upload] Downloading chunk ${i} from: ${downloadUrl}`);

        // Fetch the chunk data
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download chunk ${i}: ${response.status} ${response.statusText}`);
        }

        const chunkBuffer = Buffer.from(await response.arrayBuffer());
        chunks.push(chunkBuffer);
        console.log(`[Photo Upload] Downloaded chunk ${i}: ${chunkBuffer.length} bytes`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Photo Upload] Error downloading chunk ${i}:`, msg);
        throw error;
      }
    }

    // Combine all chunks into a single buffer
    const finalBuffer = Buffer.concat(chunks);
    console.log(`[Photo Upload] Combined all chunks: ${finalBuffer.length} bytes total (expected: ${fileSize})`);

    if (finalBuffer.length !== fileSize) {
      console.warn(`[Photo Upload] Warning: Combined size (${finalBuffer.length}) doesn't match expected size (${fileSize})`);
    }

    // Upload the final combined image to S3
    const finalS3Key = `projects/${projectId}/photos/${uploadId}/final`;
    console.log(`[Photo Upload DEBUG] Uploading final image with mimeType=${mimeType}`);
    const { url: finalUrl } = await storagePut(finalS3Key, finalBuffer, mimeType);
    console.log(`[Photo Upload] Final image uploaded to S3: ${finalS3Key}, mimeType=${mimeType}`);

    // Extract metadata from the final image
    let metadata = null;
    try {
      console.log(`[Photo Upload DEBUG] Extracting metadata from buffer: ${finalBuffer.length} bytes, mimeType=${mimeType}`);
      metadata = await extractImageMetadata(finalBuffer);
      console.log(`[Photo Upload DEBUG] Metadata extracted:`, metadata);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Photo Upload] Warning: Failed to extract metadata: ${msg}`);
      // Don't fail the upload if metadata extraction fails
    }

    // Clean up session
    uploadSessions.delete(uploadId);

    console.log(`[Photo Upload DEBUG] Finalize response: s3Key=${finalS3Key}, mimeType=${mimeType}`);
    res.json({
      uploadId,
      filename,
      fileSize,
      mimeType,
      s3Key: finalS3Key,
      publicUrl: finalUrl,
      metadata,
      message: "Upload finalized successfully",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Photo Upload] Error finalizing upload:", msg);
    res.status(400).json({ error: msg });
  }
});

export default router;
