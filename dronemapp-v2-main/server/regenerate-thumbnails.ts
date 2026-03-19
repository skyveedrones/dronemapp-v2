/**
 * Utility script to regenerate missing thumbnails for media files
 * This fixes the issue where some media has NULL thumbnailUrl values
 */

import { getDb } from "./db";
import { media } from "../drizzle/schema";
import { isNull, eq, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { generateThumbnail } from "./watermark";
import { nanoid } from "nanoid";

/**
 * Fetch image from URL and return buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Regenerate thumbnails for media files with NULL thumbnailUrl
 */
export async function regenerateMissingThumbnails(projectId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }
  
  // Find media with NULL thumbnailUrl OR Cloudinary URLs (broken after migration)
  const mediaWithoutThumbnails = projectId
    ? await db
        .select()
        .from(media)
        .where(sql`(${media.thumbnailUrl} IS NULL OR ${media.thumbnailUrl} LIKE '%cloudinary%') AND ${media.projectId} = ${projectId}`)
    : await db
        .select()
        .from(media)
        .where(sql`${media.thumbnailUrl} IS NULL OR ${media.thumbnailUrl} LIKE '%cloudinary%'`);

  
  console.log(`Found ${mediaWithoutThumbnails.length} media files with missing or broken thumbnails`);
  
  const results = {
    success: [] as number[],
    failed: [] as { id: number; error: string }[],
  };
  
  for (const mediaItem of mediaWithoutThumbnails) {
    try {
      // Only process images (skip videos for now)
      if (!mediaItem.mimeType.startsWith("image/")) {
        console.log(`Skipping non-image media ${mediaItem.id}: ${mediaItem.mimeType}`);
        continue;
      }
      
      console.log(`Processing media ${mediaItem.id}: ${mediaItem.filename}`);
      
      // Fetch the original image
      const imageBuffer = await fetchImageBuffer(mediaItem.url);
      
      // Generate thumbnail
      const thumbBuffer = await generateThumbnail(imageBuffer, 300);
      
      // Upload thumbnail to S3
      const uniqueId = nanoid(12);
      const thumbKey = `projects/${mediaItem.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
      const thumbResult = await storagePut(thumbKey, thumbBuffer, "image/jpeg");
      
      // Update media record
      await db
        .update(media)
        .set({
          thumbnailUrl: thumbResult.url,
          updatedAt: new Date(),
        })
        .where(eq(media.id, mediaItem.id));
      
      console.log(`✓ Generated thumbnail for media ${mediaItem.id}: ${thumbResult.url}`);
      results.success.push(mediaItem.id);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to generate thumbnail for media ${mediaItem.id}:`, errorMessage);
      results.failed.push({ id: mediaItem.id, error: errorMessage });
    }
  }
  
  console.log(`\n=== Results ===`);
  console.log(`  ✓ Success: ${results.success.length}`);
  console.log(`  ✗ Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\nFailed items:`);
    results.failed.forEach(f => console.log(`  - Media ${f.id}: ${f.error}`));
  }
  
  return results;
}

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  
  regenerateMissingThumbnails(projectId)
    .then((results) => {
      console.log("\nThumbnail regeneration complete!");
      process.exit(results.failed.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
