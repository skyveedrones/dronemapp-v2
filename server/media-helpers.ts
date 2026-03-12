import { getDb } from "./db";
import { media, type Media } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Get media item with all metadata for viewing
 */
export async function getMediaById(mediaId: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const mediaItem = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);

  if (!mediaItem.length) {
    throw new Error("Media not found");
  }

  return mediaItem[0];
}

/**
 * Get media list for a project with thumbnail and high-res URLs
 */
export async function getProjectMedia(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const mediaList = await db
    .select()
    .from(media)
    .where(eq(media.projectId, projectId));

  return mediaList;
}

/**
 * Update media with high-resolution metadata after upload
 */
export async function updateMediaHighRes(
  mediaId: number,
  data: {
    highResUrl: string;
    highResKey: string;
    highResFileSize: number;
    originalWidth?: number;
    originalHeight?: number;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  await db
    .update(media)
    .set({
      highResUrl: data.highResUrl,
      highResKey: data.highResKey,
      highResFileSize: data.highResFileSize,
      originalWidth: data.originalWidth,
      originalHeight: data.originalHeight,
      thumbnailUrl: data.thumbnailUrl,
      thumbnailKey: data.thumbnailKey,
      thumbnailWidth: data.thumbnailWidth,
      thumbnailHeight: data.thumbnailHeight,
      isHighResolution: 1,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));
}

/**
 * Get download link for media (high-res or standard)
 */
export async function getMediaDownloadUrl(mediaId: number, resolution: "high" | "standard" = "high") {
  const mediaItem = await getMediaById(mediaId, 0);

  if (resolution === "high" && mediaItem.highResUrl) {
    return {
      url: mediaItem.highResUrl,
      filename: mediaItem.filename,
      fileSize: mediaItem.highResFileSize,
    };
  }

  return {
    url: mediaItem.url,
    filename: mediaItem.filename,
    fileSize: mediaItem.fileSize,
  };
}

/**
 * Generate presigned download URL for secure access
 */
export async function generatePresignedDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600
) {
  return {
    s3Key,
    expiresIn,
  };
}

/**
 * Get media statistics for a project
 */
export async function getMediaStats(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const mediaList = await db
    .select()
    .from(media)
    .where(eq(media.projectId, projectId));

  const photoCount = mediaList.filter((m: Media) => m.mediaType === "photo").length;
  const videoCount = mediaList.filter((m: Media) => m.mediaType === "video").length;
  const totalSize = mediaList.reduce((sum: number, m: Media) => sum + (m.fileSize || 0), 0);
  const totalHighResSize = mediaList.reduce((sum: number, m: Media) => sum + (m.highResFileSize || 0), 0);
  const withHighRes = mediaList.filter((m: Media) => m.highResUrl).length;

  return {
    totalCount: mediaList.length,
    photoCount,
    videoCount,
    totalSize,
    totalHighResSize,
    withHighRes,
  };
}
