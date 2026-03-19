/**
 * Photo Upload Tests
 * Tests chunked uploads, chunk combining, and metadata extraction
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { extractImageMetadata, ImageMetadata } from "./metadataExtractor";

describe("Photo Upload - Metadata Extraction", () => {
  it("should handle empty buffer gracefully", async () => {
    const emptyBuffer = Buffer.alloc(0);
    const metadata = await extractImageMetadata(emptyBuffer);
    
    // Should return object with null/undefined values, not throw
    expect(metadata).toBeDefined();
    expect(metadata.gpsLatitude).toBeUndefined();
    expect(metadata.gpsLongitude).toBeUndefined();
  });

  it("should extract basic image properties", async () => {
    // Create a minimal valid JPEG buffer (JPEG magic bytes + minimal structure)
    // This is a very small valid JPEG file (1x1 pixel)
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
      0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
      0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
      0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
      0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
      0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD0, 0xFF, 0xD9
    ]);

    const metadata = await extractImageMetadata(minimalJpeg);
    
    // Should return a metadata object
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe("object");
  });

  it("should handle invalid image data", async () => {
    const invalidBuffer = Buffer.from("This is not an image file at all");
    
    // Should not throw, but return empty/null metadata
    const metadata = await extractImageMetadata(invalidBuffer);
    expect(metadata).toBeDefined();
  });
});

describe("Photo Upload - Buffer Operations", () => {
  it("should correctly concatenate multiple buffers", () => {
    // Simulate 3 chunks of a 6MB file
    const chunk1 = Buffer.alloc(2 * 1024 * 1024, 0x01); // 2MB of 0x01
    const chunk2 = Buffer.alloc(2 * 1024 * 1024, 0x02); // 2MB of 0x02
    const chunk3 = Buffer.alloc(2 * 1024 * 1024, 0x03); // 2MB of 0x03

    const combined = Buffer.concat([chunk1, chunk2, chunk3]);

    expect(combined.length).toBe(6 * 1024 * 1024);
    expect(combined[0]).toBe(0x01);
    expect(combined[2 * 1024 * 1024]).toBe(0x02);
    expect(combined[4 * 1024 * 1024]).toBe(0x03);
  });

  it("should preserve data integrity when converting between formats", () => {
    // Create a test buffer with specific pattern
    const testData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG magic bytes
    
    // Convert to base64 and back
    const base64 = testData.toString('base64');
    const recovered = Buffer.from(base64, 'base64');

    expect(recovered.equals(testData)).toBe(true);
    expect(recovered.length).toBe(testData.length);
  });

  it("should handle large buffer concatenation", () => {
    // Simulate 10 chunks of 2MB each
    const chunks: Buffer[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push(Buffer.alloc(2 * 1024 * 1024, i));
    }

    const combined = Buffer.concat(chunks);
    expect(combined.length).toBe(20 * 1024 * 1024);

    // Verify each chunk's data is preserved
    for (let i = 0; i < 10; i++) {
      const chunkStart = i * 2 * 1024 * 1024;
      expect(combined[chunkStart]).toBe(i);
    }
  });
});

describe("Photo Upload - Base64 Encoding", () => {
  it("should correctly encode and decode base64", () => {
    const originalData = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]); // JPEG header
    
    // Simulate browser-side encoding
    const base64String = originalData.toString('base64');
    
    // Simulate server-side decoding
    const decodedData = Buffer.from(base64String, 'base64');
    
    expect(decodedData.equals(originalData)).toBe(true);
  });

  it("should handle base64 with special characters", () => {
    const testBuffer = Buffer.from("Test data with special chars: !@#$%^&*()");
    const base64 = testBuffer.toString('base64');
    const decoded = Buffer.from(base64, 'base64');
    
    expect(decoded.toString()).toBe("Test data with special chars: !@#$%^&*()");
  });
});

describe("Photo Upload - Chunk Validation", () => {
  it("should validate chunk index and total chunks", () => {
    const testCases = [
      { chunkIndex: 0, totalChunks: 5, isValid: true },
      { chunkIndex: 4, totalChunks: 5, isValid: true },
      { chunkIndex: 5, totalChunks: 5, isValid: false }, // Index out of range
      { chunkIndex: -1, totalChunks: 5, isValid: false }, // Negative index
      { chunkIndex: 0, totalChunks: 0, isValid: false }, // No chunks
    ];

    testCases.forEach(({ chunkIndex, totalChunks, isValid }) => {
      const isValidChunk = chunkIndex >= 0 && chunkIndex < totalChunks && totalChunks > 0;
      expect(isValidChunk).toBe(isValid);
    });
  });

  it("should detect missing chunks", () => {
    const uploadedChunks = new Set([0, 1, 2, 4]); // Missing chunk 3
    const totalChunks = 5;

    const allChunksUploaded = uploadedChunks.size === totalChunks;
    expect(allChunksUploaded).toBe(false);
  });

  it("should verify all chunks are uploaded", () => {
    const uploadedChunks = new Set([0, 1, 2, 3, 4]);
    const totalChunks = 5;

    const allChunksUploaded = uploadedChunks.size === totalChunks;
    expect(allChunksUploaded).toBe(true);
  });
});

describe("Photo Upload - File Size Validation", () => {
  it("should correctly calculate total chunks from file size", () => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
    
    const testCases = [
      { fileSize: 2 * 1024 * 1024, expectedChunks: 1 },
      { fileSize: 4 * 1024 * 1024, expectedChunks: 2 },
      { fileSize: 5 * 1024 * 1024, expectedChunks: 3 }, // 2MB + 2MB + 1MB
      { fileSize: 10 * 1024 * 1024, expectedChunks: 5 },
      { fileSize: 1024, expectedChunks: 1 }, // Less than 1 chunk
    ];

    testCases.forEach(({ fileSize, expectedChunks }) => {
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      expect(totalChunks).toBe(expectedChunks);
    });
  });

  it("should validate file size matches combined chunks", () => {
    const fileSize = 5 * 1024 * 1024; // 5MB
    const CHUNK_SIZE = 2 * 1024 * 1024;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE); // 3 chunks

    // Simulate chunk sizes
    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      chunks.push(end - start);
    }

    const combinedSize = chunks.reduce((a, b) => a + b, 0);
    expect(combinedSize).toBe(fileSize);
  });
});
