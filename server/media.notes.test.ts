import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite for media notes functionality
 * Tests the ability to add and update notes on media files
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    logoUrl: null,
    logoKey: null,
    watermarkUrl: null,
    watermarkKey: null,
    defaultDronePilot: null,
    defaultFaaLicenseNumber: null,
    defaultLaancAuthNumber: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Media Notes", () => {
  let testProjectId: number;
  let testMediaId: number;

  beforeAll(async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get an existing project for testing
    const projects = await caller.project.list();
    if (projects.length === 0) {
      throw new Error("No projects found for testing. Please create a project first.");
    }
    testProjectId = projects[0].id;

    // Get an existing media file for testing
    const mediaList = await caller.media.list({ projectId: testProjectId });
    if (mediaList.length === 0) {
      throw new Error("No media files found for testing. Please upload media first.");
    }
    testMediaId = mediaList[0].id;
  });

  it("should update notes for a media file", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const testNotes = "This is a test note for the media file";

    const result = await caller.media.updateNotes({
      id: testMediaId,
      notes: testNotes,
    });

    expect(result).toBeDefined();
    expect(result.notes).toBe(testNotes);
    expect(result.id).toBe(testMediaId);
  });

  it("should retrieve media with updated notes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const testNotes = "Updated test note";

    // Update notes
    await caller.media.updateNotes({
      id: testMediaId,
      notes: testNotes,
    });

    // Retrieve media list and verify notes
    const mediaList = await caller.media.list({ projectId: testProjectId });
    const media = mediaList.find(m => m.id === testMediaId);
    
    expect(media).toBeDefined();
    expect(media?.notes).toBe(testNotes);
  });

  it("should allow clearing notes by setting to null", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First set a note
    await caller.media.updateNotes({
      id: testMediaId,
      notes: "Note to be cleared",
    });

    // Then clear it
    const result = await caller.media.updateNotes({
      id: testMediaId,
      notes: null,
    });

    expect(result.notes).toBeNull();
  });

  it("should fail to update notes for non-existent media", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const nonExistentId = 999999;

    await expect(
      caller.media.updateNotes({
        id: nonExistentId,
        notes: "This should fail",
      })
    ).rejects.toThrow();
  });

  it("should preserve other media fields when updating notes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get original media
    const originalMediaList = await caller.media.list({ projectId: testProjectId });
    const originalMedia = originalMediaList.find(m => m.id === testMediaId);
    expect(originalMedia).toBeDefined();

    const originalFilename = originalMedia!.filename;
    const originalFileSize = originalMedia!.fileSize;

    // Update notes
    await caller.media.updateNotes({
      id: testMediaId,
      notes: "New note",
    });

    // Verify other fields unchanged
    const updatedMediaList = await caller.media.list({ projectId: testProjectId });
    const updatedMedia = updatedMediaList.find(m => m.id === testMediaId);
    
    expect(updatedMedia?.filename).toBe(originalFilename);
    expect(updatedMedia?.fileSize).toBe(originalFileSize);
    expect(updatedMedia?.notes).toBe("New note");
  });
});
