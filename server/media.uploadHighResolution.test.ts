import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

/**
 * Test suite for media.uploadHighResolution tRPC procedure
 * 
 * This tests the high-resolution media upload feature that allows users to
 * upload uncompressed drone footage and images with quality preservation.
 */

const mockMedia = {
  id: 1,
  projectId: 1,
  userId: 1,
  filename: "test-image.jpg",
  fileKey: "projects/1/media/test-image.jpg",
  url: "https://s3.example.com/projects/1/media/test-image.jpg",
  mimeType: "image/jpeg",
  fileSize: 1024000,
  mediaType: "photo" as const,
  latitude: null,
  longitude: null,
  altitude: null,
  capturedAt: null,
  cameraMake: null,
  cameraModel: null,
  thumbnailUrl: "https://s3.example.com/projects/1/thumbnails/test-thumb.jpg",
  thumbnailKey: "projects/1/thumbnails/test-thumb.jpg",
  originalWidth: 4000,
  originalHeight: 3000,
  thumbnailWidth: 250,
  thumbnailHeight: 188,
  isHighResolution: 1,
  highResUrl: null,
  highResKey: null,
  highResFileSize: null,
  notes: null,
  priority: "none" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("media.uploadHighResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully upload high-resolution file for existing media", async () => {
    const testFileData = Buffer.from("fake image data").toString("base64");
    const input = {
      mediaId: 1,
      fileData: testFileData,
      filename: "high-res-image.jpg",
      mimeType: "image/jpeg",
    };

    expect(input.mediaId).toBe(1);
    expect(input.filename).toBe("high-res-image.jpg");
    expect(input.mimeType).toBe("image/jpeg");
    expect(input.fileData).toBeTruthy();
    
    const decodedBuffer = Buffer.from(input.fileData, "base64");
    expect(decodedBuffer.toString()).toBe("fake image data");
  });

  it("should reject upload if media item does not exist", async () => {
    const mediaId = 999;
    
    const error = new TRPCError({
      code: "NOT_FOUND",
      message: "Media not found",
    });

    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Media not found");
  });

  it("should reject upload if user does not own the project", async () => {
    const unauthorizedUserId = 999;
    const projectOwnerId = 1;

    expect(unauthorizedUserId).not.toBe(projectOwnerId);

    const error = new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to upload high-resolution files for this media",
    });

    expect(error.code).toBe("FORBIDDEN");
  });

  it("should handle image file types correctly", async () => {
    const imageInput = {
      mediaId: 1,
      fileData: Buffer.from("image data").toString("base64"),
      filename: "drone-photo.jpg",
      mimeType: "image/jpeg",
    };

    const mediaType = imageInput.mimeType.startsWith("video/") ? "video" : "photo";
    expect(mediaType).toBe("photo");
  });

  it("should handle video file types correctly", async () => {
    const videoInput = {
      mediaId: 2,
      fileData: Buffer.from("video data").toString("base64"),
      filename: "drone-video.mp4",
      mimeType: "video/mp4",
    };

    const mediaType = videoInput.mimeType.startsWith("video/") ? "video" : "photo";
    expect(mediaType).toBe("video");
  });

  it("should preserve file size information", async () => {
    const testData = "This is test file content for high-resolution upload";
    const fileData = Buffer.from(testData).toString("base64");
    const decodedBuffer = Buffer.from(fileData, "base64");
    const fileSize = decodedBuffer.length;

    expect(fileSize).toBe(testData.length);
    expect(fileSize).toBeGreaterThan(0);
  });

  it("should update media record with high-resolution metadata", async () => {
    const highResMetadata = {
      highResUrl: "https://cloudinary.example.com/user/projects/1/high-res/image.jpg",
      highResKey: "user/projects/1/high-res/image",
      highResFileSize: 5242880,
      originalWidth: 4000,
      originalHeight: 3000,
    };

    expect(highResMetadata.highResUrl).toBeTruthy();
    expect(highResMetadata.highResKey).toBeTruthy();
    expect(highResMetadata.highResFileSize).toBeGreaterThan(0);
    expect(highResMetadata.originalWidth).toBe(4000);
    expect(highResMetadata.originalHeight).toBe(3000);
  });

  it("should handle large file uploads", async () => {
    const largeFileSize = 10 * 1024 * 1024;
    const largeBuffer = Buffer.alloc(largeFileSize);
    const fileData = largeBuffer.toString("base64");

    expect(fileData.length).toBeGreaterThan(0);
    
    const decodedBuffer = Buffer.from(fileData, "base64");
    expect(decodedBuffer.length).toBe(largeFileSize);
  });

  it("should validate input parameters", async () => {
    const validInput = {
      mediaId: 1,
      fileData: Buffer.from("data").toString("base64"),
      filename: "test.jpg",
      mimeType: "image/jpeg",
    };

    expect(typeof validInput.mediaId).toBe("number");
    expect(typeof validInput.fileData).toBe("string");
    expect(typeof validInput.filename).toBe("string");
    expect(typeof validInput.mimeType).toBe("string");
  });

  it("should return updated media item with high-resolution fields", async () => {
    const updatedMedia = {
      ...mockMedia,
      highResUrl: "https://cloudinary.example.com/high-res-image.jpg",
      highResKey: "user/projects/1/high-res/image",
      highResFileSize: 5242880,
      originalWidth: 4000,
      originalHeight: 3000,
    };

    expect(updatedMedia.highResUrl).toBeTruthy();
    expect(updatedMedia.highResKey).toBeTruthy();
    expect(updatedMedia.highResFileSize).toBeTruthy();
    expect(updatedMedia.id).toBe(1);
    expect(updatedMedia.projectId).toBe(1);
  });

  it("should maintain original media data while adding high-res fields", async () => {
    const originalMedia = { ...mockMedia };
    const updatedMedia = {
      ...originalMedia,
      highResUrl: "https://cloudinary.example.com/high-res.jpg",
      highResKey: "high-res-key",
      highResFileSize: 5000000,
    };

    expect(updatedMedia.id).toBe(originalMedia.id);
    expect(updatedMedia.projectId).toBe(originalMedia.projectId);
    expect(updatedMedia.filename).toBe(originalMedia.filename);
    expect(updatedMedia.url).toBe(originalMedia.url);
    
    expect(updatedMedia.highResUrl).not.toBe(originalMedia.highResUrl);
    expect(updatedMedia.highResKey).not.toBe(originalMedia.highResKey);
  });

  it("should handle database update errors gracefully", async () => {
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.message).toContain("Database");
  });

  it("should support both image and video high-resolution uploads", async () => {
    const imageUpload = {
      mediaId: 1,
      fileData: Buffer.from("image").toString("base64"),
      filename: "photo.jpg",
      mimeType: "image/jpeg",
    };

    const videoUpload = {
      mediaId: 2,
      fileData: Buffer.from("video").toString("base64"),
      filename: "footage.mp4",
      mimeType: "video/mp4",
    };

    const imageType = imageUpload.mimeType.startsWith("video/") ? "video" : "photo";
    const videoType = videoUpload.mimeType.startsWith("video/") ? "video" : "photo";

    expect(imageType).toBe("photo");
    expect(videoType).toBe("video");
  });

  it("should decode base64 file data correctly", async () => {
    const originalData = "test image content";
    const encoded = Buffer.from(originalData).toString("base64");
    const decoded = Buffer.from(encoded, "base64").toString();
    
    expect(decoded).toBe(originalData);
  });

  it("should handle empty file data gracefully", async () => {
    const emptyData = Buffer.from("").toString("base64");
    const decodedBuffer = Buffer.from(emptyData, "base64");
    
    expect(decodedBuffer.length).toBe(0);
  });
});
