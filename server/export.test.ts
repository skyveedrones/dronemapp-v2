import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

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

describe("export.kml", () => {
  it("rejects requests for non-existent projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Project 999999 doesn't exist, should throw
    await expect(caller.export.kml({ projectId: 999999 })).rejects.toThrow("Project not found");
  });
});

describe("export.csv", () => {
  it("rejects requests for non-existent projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.export.csv({ projectId: 999999 })).rejects.toThrow("Project not found");
  });
});

describe("export.geojson", () => {
  it("rejects requests for non-existent projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.export.geojson({ projectId: 999999 })).rejects.toThrow("Project not found");
  });
});

describe("export.gpx", () => {
  it("rejects requests for non-existent projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.export.gpx({ projectId: 999999 })).rejects.toThrow("Project not found");
  });
});
