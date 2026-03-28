/**
 * Cloudinary Storage Helper
 * 
 * This module provides storage functions using Cloudinary as the backend,
 * replacing the previous S3/CloudFront storage that became inaccessible.
 * 
 * Features:
 * - Image uploads with automatic optimization
 * - Video uploads with automatic thumbnail generation
 * - Automatic format conversion and CDN delivery
 * - Retry logic for connection issues
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: 'photo' | 'video' | 'raw';
  bytes: number;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upload a file to Cloudinary with retry logic
 * 
 * @param fileBuffer - The file data as a Buffer
 * @param options - Upload options
 * @param retries - Number of retries (default 5)
 * @returns Upload result with URLs and metadata
 */
export async function cloudinaryUpload(
  fileBuffer: Buffer,
  options: {
    folder: string;
    filename?: string;
    resourceType?: 'photo' | 'video' | 'auto' | 'raw';
    transformation?: object;
  },
  retries: number = 5
): Promise<CloudinaryUploadResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // WEBMASTER FIX: Use upload_stream for chunked uploading (bypasses 100MB limit)
      // This ensures large drone videos preserve GPS and telemetry metadata.
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",      // Essential for drone footage
            chunk_size: 20000000,        // 20MB chunks to prevent the 50% stall
            folder: options.folder,
            public_id: options.filename,
            image_metadata: true,        // Extracts GPS/EXIF data for Mapit
            raw_convert: "aspose",       // Indexes telemetry data
          },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        // Feed the file buffer into the stream
        uploadStream.end(fileBuffer);
      });

      return result as CloudinaryUploadResult;
    } catch (error: any) {
      lastError = error;
      console.error(`[Cloudinary] Upload attempt ${attempt}/${retries} failed:`, error.message);
      
      // Check if it's a retryable connection error
      const isRetryable = 
        error.message?.includes('socket') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('timeout') ||
        error.message?.includes('hang up');
      
      if (isRetryable && attempt < retries) {
        // True exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Cloudinary] Connection error detected. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
        continue;
      }
      
      // For non-retryable errors or last attempt, throw immediately
      if (!isRetryable || attempt === retries) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Cloudinary upload failed after retries');
}

/**
 * Upload with timeout wrapper
 */
async function uploadWithTimeout(
  fileBuffer: Buffer,
  options: {
    folder: string;
    filename?: string;
    resourceType?: 'image' | 'video' | 'auto' | 'raw';
    transformation?: object;
  },
  timeoutMs: number
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Cloudinary upload timeout'));
    }, timeoutMs);

    const uploadOptions: any = {
      folder: options.folder,
      resource_type: options.resourceType || 'auto',
      use_filename: true,
      unique_filename: true,
      timeout: 60000, // Cloudinary SDK timeout (60 seconds)
    };

    if (options.filename) {
      uploadOptions.public_id = options.filename.replace(/\.[^/.]+$/, ''); // Remove extension
    }

    // For images, apply optimization
    if (options.resourceType === 'photo' || !options.resourceType) {
      uploadOptions.transformation = options.transformation || {
        quality: 'auto',
        fetch_format: 'auto',
      };
    }

    // For videos, generate thumbnail
    if (options.resourceType === 'video') {
      uploadOptions.eager = [
        { width: 300, height: 200, crop: 'fill', format: 'jpg' }
      ];
      uploadOptions.eager_async = true;
    }

    // Convert buffer to base64 data URI for more reliable upload
    const mimeType = options.resourceType === 'video' ? 'video/mp4' : 'image/jpeg';
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Use upload instead of upload_stream for better reliability
    cloudinary.uploader.upload(
      dataUri,
      uploadOptions,
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        clearTimeout(timeout);
        
        if (error) {
          console.error('[Cloudinary] Upload error:', error);
          
          // Provide clearer error messages for common issues
          let errorMessage = error.message || 'Unknown error';
          
          if (errorMessage.includes('File size too large')) {
            const match = errorMessage.match(/Maximum is (\d+)/);
            const maxSize = match ? parseInt(match[1]) / (1024 * 1024) : 10;
            errorMessage = `File size exceeds ${maxSize}MB limit. Please compress the file or upgrade your Cloudinary plan.`;
          } else if (errorMessage.includes('socket') || errorMessage.includes('hang up')) {
            errorMessage = 'Connection error. Retrying...';
          } else if (errorMessage.includes('timeout')) {
            errorMessage = 'Upload timeout. Please check your connection and try again.';
          } else if (errorMessage.includes('Invalid image')) {
            errorMessage = 'Invalid or corrupted file. Please try a different file.';
          }
          
          reject(new Error(errorMessage));
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }

        // Generate thumbnail URL
        let thumbnailUrl = result.secure_url;
        if (result.resource_type === 'photo') {
          // For images, create a thumbnail transformation URL
          thumbnailUrl = cloudinary.url(result.public_id, {
            width: 300,
            height: 200,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto',
          });
        } else if (result.resource_type === 'video') {
          // For videos, use the eager transformation or generate poster
          thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            width: 300,
            height: 200,
            crop: 'fill',
            format: 'jpg',
          });
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType: result.resource_type as 'photo' | 'video' | 'raw',
          bytes: result.bytes,
        });
      }
    );
  });
}

/**
 * Upload an image to Cloudinary
 */
export async function cloudinaryUploadImage(
  fileBuffer: Buffer,
  folder: string,
  filename?: string
): Promise<CloudinaryUploadResult> {
  return cloudinaryUpload(fileBuffer, {
    folder,
    filename,
    resourceType: 'photo',
  });
}

/**
 * Upload a video to Cloudinary
 */
export async function cloudinaryUploadVideo(
  fileBuffer: Buffer,
  folder: string,
  filename?: string
): Promise<CloudinaryUploadResult> {
  return cloudinaryUpload(fileBuffer, {
    folder,
    filename,
    resourceType: 'video',
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function cloudinaryDelete(
  publicId: string,
  resourceType: 'photo' | 'video' | 'raw' = 'photo'
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error);
    return false;
  }
}

/**
 * Generate a thumbnail URL for an existing Cloudinary resource
 */
export function cloudinaryThumbnailUrl(
  publicId: string,
  resourceType: 'photo' | 'video' = 'photo',
  width: number = 300,
  height: number = 200
): string {
  if (resourceType === 'video') {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      width,
      height,
      crop: 'fill',
      format: 'jpg',
    });
  }
  
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}

/**
 * Test Cloudinary connection by pinging the API
 */
export async function testCloudinaryConnection(): Promise<boolean> {
  try {
    const result = await cloudinary.api.ping();
    return result.status === 'ok';
  } catch (error) {
    console.error('[Cloudinary] Connection test failed:', error);
    return false;
  }
}

/**
 * Get Cloudinary account usage info
 */
export async function getCloudinaryUsage(): Promise<{
  used_percent: number;
  storage_used: number;
  bandwidth_used: number;
} | null> {
  try {
    const result = await cloudinary.api.usage();
    return {
      used_percent: result.used_percent,
      storage_used: result.storage?.usage || 0,
      bandwidth_used: result.bandwidth?.usage || 0,
    };
  } catch (error) {
    console.error('[Cloudinary] Usage check failed:', error);
    return null;
  }
}

export { cloudinary };
