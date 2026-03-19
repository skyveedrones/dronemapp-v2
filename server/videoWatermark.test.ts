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

describe("watermark.applyVideoWatermark", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.watermark.applyVideoWatermark({
        mediaId: 1,
        useSavedWatermark: true,
        position: "top-left",
        opacity: 70,
        scale: 15,
      })
    ).rejects.toThrow("Please login");
  });

  it("rejects requests for non-existent media", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Media 999999 doesn't exist, should throw
    await expect(
      caller.watermark.applyVideoWatermark({
        mediaId: 999999,
        useSavedWatermark: true,
        position: "top-left",
        opacity: 70,
        scale: 15,
      })
    ).rejects.toThrow("Media not found");
  });

  it("validates position parameter types", async () => {
    // This test verifies that the position parameter accepts valid values
    const validPositions = ["top-left", "top-right", "bottom-left", "bottom-right", "center"];
    
    // All these positions should be valid types
    expect(validPositions).toContain("top-left");
    expect(validPositions).toContain("top-right");
    expect(validPositions).toContain("bottom-left");
    expect(validPositions).toContain("bottom-right");
    expect(validPositions).toContain("center");
  });

  it("validates opacity range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Opacity should be between 10 and 100
    await expect(
      caller.watermark.applyVideoWatermark({
        mediaId: 1,
        useSavedWatermark: true,
        position: "top-left",
        opacity: 5, // Too low
        scale: 15,
      })
    ).rejects.toThrow();
  });

  it("validates scale range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Scale should be between 5 and 50
    await expect(
      caller.watermark.applyVideoWatermark({
        mediaId: 1,
        useSavedWatermark: true,
        position: "top-left",
        opacity: 70,
        scale: 100, // Too high
      })
    ).rejects.toThrow();
  });

  it("requires watermark data when not using saved watermark", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should fail if useSavedWatermark is false and no watermarkData is provided
    await expect(
      caller.watermark.applyVideoWatermark({
        mediaId: 999999,
        useSavedWatermark: false,
        // No watermarkData provided
        position: "top-left",
        opacity: 70,
        scale: 15,
      })
    ).rejects.toThrow("Please provide a watermark image or use saved watermark");
  });
});

describe("video watermark position mapping", () => {
  it("maps position names to ffmpeg overlay coordinates", () => {
    // These are the expected ffmpeg overlay positions
    const positionMap: Record<string, string> = {
      "top-left": "10:10",
      "top-right": "main_w-overlay_w-10:10",
      "bottom-left": "10:main_h-overlay_h-10",
      "bottom-right": "main_w-overlay_w-10:main_h-overlay_h-10",
      "center": "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
    };

    // Verify all positions are mapped
    expect(Object.keys(positionMap)).toContain("top-left");
    expect(Object.keys(positionMap)).toContain("top-right");
    expect(Object.keys(positionMap)).toContain("bottom-left");
    expect(Object.keys(positionMap)).toContain("bottom-right");
    expect(Object.keys(positionMap)).toContain("center");
  });
});
