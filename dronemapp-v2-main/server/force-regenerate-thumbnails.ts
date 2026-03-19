#!/usr/bin/env tsx
/**
 * Force regenerate ALL thumbnails for specified projects with optimized settings
 * Usage: npx tsx server/force-regenerate-thumbnails.ts <projectId1> <projectId2> ...
 */

import { getDb } from "./db";
import { media } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { generateThumbnail } from "./watermark";
import { nanoid } from "nanoid";

/**
 * Fetch image buffer from URL
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
 * Force regenerate thumbnails for all media in specified projects
 */
async function forceRegenerateThumbnails(projectIds: number[]) {
  const db = await getDb();
  
  if (!db) {
    console.error("Failed to connect to database");
    return;
  }
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const projectId of projectIds) {
    console.log(`\n=== Processing Project ID: ${projectId} ===`);
    
    // Get ALL image media for this project
    const mediaItems = await db
      .select()
      .from(media)
      .where(eq(media.projectId, projectId));
    
    const imageMedia = mediaItems.filter(m => m.mediaType === 'photo');
    console.log(`Found ${imageMedia.length} images to regenerate thumbnails for`);
    
    for (const mediaItem of imageMedia) {
      try {
        console.log(`Processing: ${mediaItem.filename}`);
        
        // Fetch original image
        const imageBuffer = await fetchImageBuffer(mediaItem.url);
        
        // Generate optimized thumbnail (250px, 70% quality, progressive)
        const thumbBuffer = await generateThumbnail(imageBuffer, 250);
        
        // Upload thumbnail to S3
        const uniqueId = nanoid(12);
        const thumbKey = `projects/${projectId}/thumbnails/${uniqueId}-thumb.jpg`;
        const thumbResult = await storagePut(thumbKey, thumbBuffer, "image/jpeg");
        
        // Update media record with new thumbnail URL
        await db
          .update(media)
          .set({ thumbnailUrl: thumbResult.url })
          .where(eq(media.id, mediaItem.id));
        
        console.log(`  ✓ Regenerated thumbnail: ${thumbResult.url}`);
        totalSuccess++;
      } catch (error) {
        console.error(`  ✗ Failed to regenerate thumbnail for ${mediaItem.filename}:`, error);
        totalFailed++;
      }
    }
  }
  
  console.log(`\n=== Results ===`);
  console.log(`  ✓ Success: ${totalSuccess}`);
  console.log(`  ✗ Failed: ${totalFailed}`);
  console.log(`Thumbnail regeneration complete!`);
}

// Get project IDs from command line arguments
const projectIds = process.argv.slice(2).map(id => parseInt(id, 10));

if (projectIds.length === 0 || projectIds.some(isNaN)) {
  console.error("Usage: npx tsx server/force-regenerate-thumbnails.ts <projectId1> <projectId2> ...");
  process.exit(1);
}

forceRegenerateThumbnails(projectIds)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
