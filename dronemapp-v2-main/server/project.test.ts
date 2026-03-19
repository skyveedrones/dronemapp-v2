import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock user for testing
const mockUser: AuthenticatedUser = {
  id: 1,
  openId: "test-user-123",
  email: "test@skyvee.com",
  name: "Test Pilot",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockUser2: AuthenticatedUser = {
  id: 2,
  openId: "test-user-456",
  email: "other@skyvee.com",
  name: "Other Pilot",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createAuthContext(user: AuthenticatedUser = mockUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
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

describe("project.create", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.create({
        name: "Test Project",
      })
    ).rejects.toThrow();
  });

  it("validates project name is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.create({
        name: "",
      })
    ).rejects.toThrow();
  });

  it("validates project name max length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longName = "a".repeat(256);
    await expect(
      caller.project.create({
        name: longName,
      })
    ).rejects.toThrow();
  });
});

describe("project.list", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.project.list()).rejects.toThrow();
  });
});

describe("project.get", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.project.get({ id: 1 })).rejects.toThrow();
  });

  it("validates project id is a number", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // @ts-expect-error - Testing invalid input
    await expect(caller.project.get({ id: "invalid" })).rejects.toThrow();
  });
});

describe("project.update", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.update({
        id: 1,
        name: "Updated Name",
      })
    ).rejects.toThrow();
  });

  it("validates status enum values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.update({
        id: 1,
        // @ts-expect-error - Testing invalid status
        status: "invalid_status",
      })
    ).rejects.toThrow();
  });

  it("accepts valid status values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // These should not throw validation errors (may throw NOT_FOUND if project doesn't exist)
    const validStatuses = ["active", "completed", "archived"] as const;
    
    for (const status of validStatuses) {
      try {
        await caller.project.update({ id: 999999, status });
      } catch (error: any) {
        // Should fail with NOT_FOUND, not validation error
        expect(error.code).toBe("NOT_FOUND");
      }
    }
  });
});

describe("project.delete", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.project.delete({ id: 1 })).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.project.delete({ id: 999999 })).rejects.toThrow("Project not found");
  });
});

describe("project.count", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.project.count()).rejects.toThrow();
  });
});
