import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Generate a presigned URL for downloading a file from S3
 * Presigned URLs are time-limited and don't require AWS credentials to access
 */
export async function generatePresignedDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600 // Default 1 hour
): Promise<string> {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || "mapit-media",
    Key: s3Key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    throw new Error("Failed to generate download link");
  }
}

/**
 * Generate presigned URLs for multiple files
 */
export async function generatePresignedDownloadUrls(
  s3Keys: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  for (const key of s3Keys) {
    try {
      const url = await generatePresignedDownloadUrl(key, expiresIn);
      urls.set(key, url);
    } catch (error) {
      console.error(`Failed to generate URL for ${key}:`, error);
    }
  }

  return urls;
}

/**
 * Generate a presigned URL with custom metadata
 * Useful for tracking downloads
 */
export async function generatePresignedDownloadUrlWithMetadata(
  s3Key: string,
  _metadata: Record<string, string> = {},
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || "mapit-media",
    Key: s3Key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    // Metadata could be added as query parameters if needed
    return url;
  } catch (error) {
    console.error("Failed to generate presigned URL with metadata:", error);
    throw new Error("Failed to generate download link");
  }
}

/**
 * Validate if a presigned URL is still valid
 * Returns true if URL is valid, false if expired
 */
export function isPresignedUrlValid(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get("X-Amz-Expires");
    const dateParam = urlObj.searchParams.get("X-Amz-Date");

    if (!expiresParam || !dateParam) {
      return false;
    }

    const signedDate = new Date(dateParam.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z"));
    const expiresSeconds = parseInt(expiresParam);
    const expirationTime = new Date(signedDate.getTime() + expiresSeconds * 1000);

    return expirationTime > new Date();
  } catch {
    return false;
  }
}
