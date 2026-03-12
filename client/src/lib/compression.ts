/**
 * File Compression Utilities
 * Compresses images and videos client-side before upload to stay within Cloudinary's 10MB limit
 */

import imageCompression from 'browser-image-compression';

// Cloudinary free tier limit
export const CLOUDINARY_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const TARGET_SIZE = 8 * 1024 * 1024; // Target 8MB to have some buffer

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // If file is already small enough, return as-is
  if (file.size <= TARGET_SIZE) {
    return file;
  }

  const options = {
    maxSizeMB: TARGET_SIZE / (1024 * 1024), // Convert to MB
    maxWidthOrHeight: 4096, // Max dimension
    useWebWorker: true,
    fileType: file.type as any,
    onProgress: onProgress ? (progress: number) => onProgress(progress) : undefined,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`[Compression] Image compressed: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)}`);
    return compressedFile;
  } catch (error) {
    console.error('[Compression] Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Videos are uploaded in chunks without compression
 * Videos must be under 10MB (no compression applied)
 */
export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // Videos are not compressed - they must be under 10MB
  // Return file as-is for chunked upload
  return file;
}

/**
 * Check if file needs compression
 */
export function needsCompression(file: File): boolean {
  return file.size > TARGET_SIZE;
}

/**
 * Check if file exceeds Cloudinary limit
 */
export function exceedsLimit(file: File): boolean {
  return file.size > CLOUDINARY_MAX_SIZE;
}

/**
 * Get compression info for a file
 */
export function getCompressionInfo(file: File): {
  needsCompression: boolean;
  exceedsLimit: boolean;
  currentSize: string;
  targetSize: string;
  limitSize: string;
} {
  return {
    needsCompression: needsCompression(file),
    exceedsLimit: exceedsLimit(file),
    currentSize: formatBytes(file.size),
    targetSize: formatBytes(TARGET_SIZE),
    limitSize: formatBytes(CLOUDINARY_MAX_SIZE),
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
