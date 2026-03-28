import { v2 as cloudinaryV2 } from "cloudinary";
import { ENV } from './_core/env';

/**
 * Upload high-resolution media file without compression
 * Stores the file in Cloudinary with quality settings to preserve original quality
 */
export async function uploadHighResolutionMedia(
  file: Buffer | string,
  filename: string,
  mediaType: "photo" | "video",
  userId: number,
  projectId: number
): Promise<{
  url: string;
  fileKey: string;
  fileSize: number;
  width?: number;
  height?: number;
}> {
  try {
    // Configure Cloudinary
    cloudinaryV2.config({
      cloud_name: ENV.cloudinaryCloudName,
      api_key: ENV.cloudinaryApiKey,
      api_secret: ENV.cloudinaryApiSecret,
    });

    // Determine resource type based on media type
    const resourceType = mediaType === "video" ? "video" : "photo";

    // Upload with minimal compression to preserve quality
    const uploadOptions: any = {
      resource_type: resourceType,
      folder: `${userId}/projects/${projectId}/high-res`,
      public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension
      overwrite: true,
      // Preserve quality settings
      quality: "auto:best", // Use best quality
      fetch_format: "auto", // Auto-detect best format
      flags: "immutable", // Prevent future modifications
    };

    // For images, add additional quality preservation
    if (mediaType === "photo") {
      uploadOptions.format = "jpg"; // Store as JPG with quality
      uploadOptions.quality = 95; // 95% quality to minimize compression
      uploadOptions.fetch_format = "jpg"; // Ensure JPG output
    } else if (mediaType === "video") {
      // For videos, preserve original codec and quality
      uploadOptions.video_codec = "auto"; // Auto-detect best codec
      uploadOptions.bit_rate = "auto"; // Auto-detect best bitrate
    }

    // Upload the file
    let uploadResult;
    if (typeof file === "string") {
      // If it's a URL, upload from URL
      uploadResult = await cloudinaryV2.uploader.upload(file, uploadOptions);
    } else {
      // If it's a buffer, convert to base64
      const base64 = file.toString("base64");
      const dataUrl = `data:${mediaType === "video" ? "video/mp4" : "photo/jpeg"};base64,${base64}`;
      uploadResult = await cloudinaryV2.uploader.upload(dataUrl, uploadOptions);
    }

    return {
      url: uploadResult.secure_url,
      fileKey: uploadResult.public_id,
      fileSize: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    console.error("[High-Res Upload] Failed to upload:", error);
    throw new Error(`Failed to upload high-resolution media: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update media record with high-resolution file information
 */
export async function updateMediaWithHighRes(
  mediaId: number,
  highResUrl: string,
  highResKey: string,
  highResFileSize: number,
  width?: number,
  height?: number
) {
  // This will be called from the database layer
  return {
    highResUrl,
    highResKey,
    highResFileSize,
    originalWidth: width,
    originalHeight: height,
  };
}
