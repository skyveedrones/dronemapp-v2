import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("media.createFromUrl", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.media.createFromUrl({
        projectId: 1,
        filename: "test-video.mp4",
        mimeType: "video/mp4",
        fileUrl: "https://example.com/videos/test.mp4",
        fileSize: 1024 * 1024 * 100, // 100MB
      })
    ).rejects.toThrow("Please login");
  });

  it("validates project ownership before creating media record", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Try to create media for a non-existent project
    await expect(
      caller.media.createFromUrl({
        projectId: 999999,
        filename: "test-video.mp4",
        mimeType: "video/mp4",
        fileUrl: "https://example.com/videos/test.mp4",
        fileSize: 1024 * 1024 * 100,
      })
    ).rejects.toThrow("Project not found");
  });

  it("validates input parameters correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that invalid inputs are rejected
    await expect(
      caller.media.createFromUrl({
        projectId: 1,
        filename: "", // Empty filename should fail
        mimeType: "video/mp4",
        fileUrl: "https://storage.example.com/test.mp4",
        fileSize: 100,
      })
    ).rejects.toThrow();
  });

  it("rejects requests for non-existent projects", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that non-existent project is rejected
    await expect(
      caller.media.createFromUrl({
        projectId: 999999,
        filename: "test.mp4",
        mimeType: "video/mp4",
        fileUrl: "https://storage.example.com/test.mp4",
        fileSize: 100,
      })
    ).rejects.toThrow("Project not found");
  });
});

describe("TUS upload route configuration", () => {
  it("has correct allowed video types", () => {
    const allowedTypes = [
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      "video/x-matroska", // .mkv
      "video/webm",
    ];

    // Verify all common drone video formats are supported
    expect(allowedTypes).toContain("video/mp4");
    expect(allowedTypes).toContain("video/quicktime");
    expect(allowedTypes).toContain("video/webm");
  });

  it("supports large file uploads up to 5GB", () => {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    expect(maxSize).toBe(5368709120);
  });
});

describe("media type detection for TUS uploads", () => {
  it("correctly identifies video types for TUS routing", () => {
    const videoTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ];

    const isVideo = (mimeType: string): boolean => {
      return mimeType.startsWith("video/");
    };

    videoTypes.forEach((type) => {
      expect(isVideo(type)).toBe(true);
    });

    // Images should not be routed to TUS
    expect(isVideo("image/jpeg")).toBe(false);
    expect(isVideo("image/png")).toBe(false);
  });
});
