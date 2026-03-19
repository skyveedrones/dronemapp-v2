/**
 * Direct-to-S3 Photo Upload Utility
 * Handles chunked uploads through server to S3
 * Preserves full metadata and HD quality without compression
 */

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export interface UploadProgress {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  uploadSpeed: number; // bytes per second
  eta: number; // seconds remaining
  bytesUploaded: number;
}

export interface ChunkUploadResponse {
  uploadId: string;
  chunkIndex: number;
  s3Key: string;
  publicUrl: string;
  uploadedChunks: number[];
  isComplete: boolean;
}

/**
 * Upload a single chunk to server (which uploads to S3)
 */
export async function uploadChunkToServer(
  projectId: number,
  filename: string,
  fileSize: number,
  chunkIndex: number,
  totalChunks: number,
  chunkData: ArrayBuffer,
  uploadId?: string
): Promise<ChunkUploadResponse> {
  const response = await fetch("/api/photo-upload/chunk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      filename,
      fileSize,
      chunkIndex,
      totalChunks,
      uploadId,
      chunk: arrayBufferToBase64(chunkData), // Send as base64 in JSON
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Photo Upload] Server error (${response.status}):`, errorBody);
    throw new Error(`Failed to upload chunk: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Upload a photo file in chunks
 */
export async function uploadPhotoToS3(
  projectId: number,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ uploadId: string; s3Key: string; publicUrl: string }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = generateUploadId();
  let uploadedChunks = 0;
  const startTime = Date.now();

  try {
    // Upload all chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const chunkBuffer = await chunk.arrayBuffer();

      const response = await uploadChunkToServer(
        projectId,
        file.name,
        file.size,
        chunkIndex,
        totalChunks,
        chunkBuffer,
        uploadId
      );

      uploadedChunks++;

      if (onProgress) {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const bytesUploaded = uploadedChunks * CHUNK_SIZE;
        const uploadSpeed = bytesUploaded / elapsed;
        const remainingBytes = file.size - bytesUploaded;
        const eta = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

        onProgress({
          uploadId,
          chunkIndex,
          totalChunks,
          uploadedChunks,
          progress: (uploadedChunks / totalChunks) * 100,
          uploadSpeed,
          eta,
          bytesUploaded,
        });
      }
    }

    // Finalize upload
    const finalizeResponse = await fetch("/api/photo-upload/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        uploadId,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    });

    if (!finalizeResponse.ok) {
      const errorBody = await finalizeResponse.text();
      throw new Error(`Failed to finalize upload: ${errorBody}`);
    }

    const finalizeData = await finalizeResponse.json();

    return {
      uploadId,
      s3Key: finalizeData.s3Key,
      publicUrl: finalizeData.publicUrl,
    };
  } catch (error) {
    console.error("[Photo Upload] Error:", error);
    throw error;
  }
}

/**
 * Convert ArrayBuffer to base64 string (browser-compatible)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

/**
 * Generate a unique upload ID
 */
function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
