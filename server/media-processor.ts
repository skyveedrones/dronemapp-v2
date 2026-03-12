import sharp from "sharp";
import { getDb } from "./db";
import { media } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

/**
 * Media processing configuration
 */
export const MEDIA_PROCESSING_CONFIG = {
  thumbnail: {
    width: 300,
    height: 300,
    quality: 80,
  },
  optimized: {
    width: 1920,
    height: 1920,
    quality: 85,
  },
  highRes: {
    quality: 95,
  },
};

/**
 * Process image: generate thumbnail and optimized versions
 */
export async function processImage(
  buffer: Buffer,
  filename: string,
  mediaId: number,
  projectId: number
): Promise<{
  originalWidth: number;
  originalHeight: number;
  thumbnailUrl: string;
  thumbnailKey: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  highResUrl: string;
  highResKey: string;
  highResFileSize: number;
}> {
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(MEDIA_PROCESSING_CONFIG.thumbnail.width, MEDIA_PROCESSING_CONFIG.thumbnail.height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: MEDIA_PROCESSING_CONFIG.thumbnail.quality })
      .toBuffer();

    const thumbnailKey = `projects/${projectId}/media/${mediaId}/thumbnail.jpg`;
    const { url: thumbnailUrl } = await storagePut(thumbnailKey, thumbnailBuffer, "image/jpeg");

    // Generate optimized version
    const optimizedBuffer = await sharp(buffer)
      .resize(MEDIA_PROCESSING_CONFIG.optimized.width, MEDIA_PROCESSING_CONFIG.optimized.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: MEDIA_PROCESSING_CONFIG.optimized.quality })
      .toBuffer();

    // Store optimized as the main URL
    const mainKey = `projects/${projectId}/media/${mediaId}/${filename}`;
    const { url: mainUrl } = await storagePut(mainKey, optimizedBuffer, "image/jpeg");

    // Store high-resolution version
    const highResKey = `projects/${projectId}/media/${mediaId}/highres-${filename}`;
    const { url: highResUrl } = await storagePut(highResKey, buffer, "image/jpeg");

    return {
      originalWidth,
      originalHeight,
      thumbnailUrl,
      thumbnailKey,
      thumbnailWidth: MEDIA_PROCESSING_CONFIG.thumbnail.width,
      thumbnailHeight: MEDIA_PROCESSING_CONFIG.thumbnail.height,
      highResUrl,
      highResKey,
      highResFileSize: buffer.length,
    };
  } catch (error) {
    console.error("Image processing failed:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Process video: generate thumbnail from first frame
 */
export async function processVideo(
  buffer: Buffer,
  filename: string,
  mediaId: number,
  projectId: number
): Promise<{
  highResUrl: string;
  highResKey: string;
  highResFileSize: number;
}> {
  try {
    // For videos, we store the original file as high-res
    const highResKey = `projects/${projectId}/media/${mediaId}/${filename}`;
    const { url: highResUrl } = await storagePut(highResKey, buffer, "video/mp4");

    // Note: Generating thumbnail from video requires FFmpeg
    // This would be handled separately or by a background job
    // For now, we just store the video file

    return {
      highResUrl,
      highResKey,
      highResFileSize: buffer.length,
    };
  } catch (error) {
    console.error("Video processing failed:", error);
    throw new Error("Failed to process video");
  }
}

/**
 * Update media record with processing results
 */
export async function updateMediaWithProcessingResults(
  mediaId: number,
  processingResults: {
    originalWidth?: number;
    originalHeight?: number;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
    highResUrl: string;
    highResKey: string;
    highResFileSize: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(media)
    .set({
      originalWidth: processingResults.originalWidth,
      originalHeight: processingResults.originalHeight,
      thumbnailUrl: processingResults.thumbnailUrl,
      thumbnailKey: processingResults.thumbnailKey,
      thumbnailWidth: processingResults.thumbnailWidth,
      thumbnailHeight: processingResults.thumbnailHeight,
      highResUrl: processingResults.highResUrl,
      highResKey: processingResults.highResKey,
      highResFileSize: processingResults.highResFileSize,
      isHighResolution: 1,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));
}

/**
 * Process media file (image or video)
 */
export async function processMediaFile(
  buffer: Buffer,
  filename: string,
  mediaType: "photo" | "video",
  mediaId: number,
  projectId: number
): Promise<void> {
  try {
    let results;

    if (mediaType === "photo") {
      results = await processImage(buffer, filename, mediaId, projectId);
    } else {
      results = await processVideo(buffer, filename, mediaId, projectId);
    }

    await updateMediaWithProcessingResults(mediaId, results);
  } catch (error) {
    console.error("Media processing failed:", error);
    throw error;
  }
}

/**
 * Check if media needs reprocessing
 */
export async function needsReprocessing(mediaId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const mediaItem = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);

  if (!mediaItem.length) return false;

  const item = mediaItem[0];

  // Media needs reprocessing if it doesn't have high-res URL
  return !item.highResUrl;
}
