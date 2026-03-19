/**
 * Tests for S3 storage migration
 * Verify that all upload functionality works with S3 instead of Cloudinary
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { storagePut } from "./storage";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "testowner@example.com",
    name: "Test Owner",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      headers: {
        origin: "https://test.manus.space",
      },
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

// Create a small test image (1x1 PNG)
const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const testImageBuffer = Buffer.from(testImageBase64, "base64");

describe("S3 Storage Migration", () => {
  describe("Media Upload", () => {
    it("should upload image media to S3 and return accessible URL", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project first
      const project = await caller.project.create({
        name: "S3 Test Project",
        description: "Testing S3 storage",
        status: "active",
      });

      // Upload an image
      const result = await caller.media.upload({
        projectId: project.id,
        filename: "test-image.png",
        mimeType: "image/png",
        fileSize: testImageBuffer.length,
        fileData: testImageBase64,
      });

      // Verify the upload result
      expect(result.url).toBeDefined();
      expect(result.url).toContain("cloudfront.net");
      expect(result.fileKey).toBeDefined();
      expect(result.fileKey).toContain(`projects/${project.id}/media`);

      // Verify the URL is accessible
      const response = await fetch(result.url);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    }, 30000);

    it("should generate thumbnail for uploaded image", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.project.create({
        name: "Thumbnail Test Project",
        description: "Testing thumbnail generation",
        status: "active",
      });

      // Upload an image
      const result = await caller.media.upload({
        projectId: project.id,
        filename: "test-with-thumb.png",
        mimeType: "image/png",
        fileSize: testImageBuffer.length,
        fileData: testImageBase64,
      });

      // Verify thumbnail was generated
      expect(result.thumbnailUrl).toBeDefined();
      expect(result.thumbnailUrl).toContain("cloudfront.net");
      expect(result.thumbnailUrl).toContain("thumbnails");

      // Verify thumbnail URL is accessible
      if (result.thumbnailUrl) {
        const response = await fetch(result.thumbnailUrl);
        expect(response.ok).toBe(true);
      }
    }, 30000);
  });

  describe("Logo Upload", () => {
    it("should upload project logo to S3 and return accessible URL", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.project.create({
        name: "Logo Test Project",
        description: "Testing logo upload",
        status: "active",
      });

      // Upload a logo
      const result = await caller.projectLogo.upload({
        projectId: project.id,
        filename: "logo.png",
        mimeType: "image/png",
        fileData: testImageBase64,
      });

      // Verify the upload result
      expect(result.logoUrl).toBeDefined();
      expect(result.logoUrl).toContain("cloudfront.net");
      expect(result.logoKey).toBeDefined();
      expect(result.logoKey).toContain(`projects/${project.id}/logo`);

      // Verify the URL is accessible
      const response = await fetch(result.logoUrl!);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    }, 30000);

    it("should upload user logo to S3 and return accessible URL", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a user logo
      const result = await caller.logo.upload({
        filename: "user-logo.png",
        mimeType: "image/png",
        fileData: testImageBase64,
      });

      // Verify the upload result
      expect(result.logoUrl).toBeDefined();
      expect(result.logoUrl).toContain("cloudfront.net");
      expect(result.logoKey).toBeDefined();
      expect(result.logoKey).toContain(`users/${ctx.user.id}/logo`);

      // Verify the URL is accessible
      const response = await fetch(result.logoUrl!);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    }, 30000);

    it("should upload client logo to S3 and return accessible URL", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a client
      const client = await caller.clientPortal.create({
        name: "Logo Test Client",
        contactEmail: "logo@test.com",
      });

      // Upload a client logo
      const result = await caller.clientPortal.uploadLogo({
        clientId: client.id,
        filename: "client-logo.png",
        mimeType: "image/png",
        fileData: testImageBase64,
      });

      // Verify the upload result
      expect(result.logoUrl).toBeDefined();
      expect(result.logoUrl).toContain("cloudfront.net");
      expect(result.logoKey).toBeDefined();
      expect(result.logoKey).toContain(`clients/${client.id}/logo`);

      // Verify the URL is accessible
      const response = await fetch(result.logoUrl!);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    }, 30000);
  });

  describe("S3 Storage Helper", () => {
    it("should upload file to S3 and return accessible URL", async () => {
      const testKey = `test-${Date.now()}.txt`;
      const testContent = "Test content for S3 storage";

      const result = await storagePut(testKey, testContent, "text/plain");

      expect(result.key).toBe(testKey);
      expect(result.url).toBeDefined();
      expect(result.url).toContain("cloudfront.net");

      // Verify the URL is accessible
      const response = await fetch(result.url);
      expect(response.ok).toBe(true);
      const content = await response.text();
      expect(content).toBe(testContent);
    });
  });
});
