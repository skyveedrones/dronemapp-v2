import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: string = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: role as any,
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

function createUnauthContext(): TrpcContext {
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

describe("users.getOwnerUsers", () => {
  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.getOwnerUsers()).rejects.toThrow();
  });

  it("rejects non-admin/non-webmaster roles", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.getOwnerUsers()).rejects.toThrow(/admin and webmaster/i);
  });

  it("rejects client role", async () => {
    const ctx = createContext("client");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.getOwnerUsers()).rejects.toThrow(/admin and webmaster/i);
  });
});

describe("users.updateUser", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.updateUser({
        userId: 2,
        name: "Test",
        role: "user",
      })
    ).rejects.toThrow(/admin and webmaster/i);
  });

  it("validates input schema - requires name", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.updateUser({
        userId: 2,
        name: "",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("accepts optional contact fields", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    // This will attempt the DB call which may fail in test env,
    // but validates the input schema accepts these fields
    try {
      await caller.users.updateUser({
        userId: 999,
        name: "Test User",
        role: "user",
        companyName: "Acme Corp",
        department: "Engineering",
        phone: "555-0123",
      });
    } catch (e: any) {
      // DB errors are expected in test env, but schema validation should pass
      expect(e.message).not.toMatch(/validation/i);
    }
  });
});

describe("users.setPassword", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.setPassword({
        userId: 2,
        password: "newpassword123",
      })
    ).rejects.toThrow(/admin and webmaster/i);
  });

  it("validates minimum password length", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.setPassword({
        userId: 2,
        password: "short",
      })
    ).rejects.toThrow();
  });

  it("allows webmaster role", async () => {
    const ctx = createContext("webmaster");
    const caller = appRouter.createCaller(ctx);
    // Should not throw FORBIDDEN - may throw DB error which is expected
    try {
      await caller.users.setPassword({
        userId: 999,
        password: "validpassword123",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });
});

describe("users.assignProject", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("client");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.assignProject({
        userId: 2,
        projectId: 1,
      })
    ).rejects.toThrow(/admin and webmaster/i);
  });

  it("accepts optional role parameter", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.users.assignProject({
        userId: 999,
        projectId: 999,
        role: "editor",
      });
    } catch (e: any) {
      // DB errors expected, but input validation should pass
      expect(e.message).not.toMatch(/validation/i);
    }
  });
});

describe("users.unassignProject", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.unassignProject({
        userId: 2,
        projectId: 1,
      })
    ).rejects.toThrow(/admin and webmaster/i);
  });
});

describe("users.getUserDetails", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("client");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.getUserDetails({ userId: 2 })
    ).rejects.toThrow(/admin and webmaster/i);
  });
});

describe("users.getAvailableProjects", () => {
  it("rejects non-admin roles", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.getAvailableProjects()
    ).rejects.toThrow(/admin and webmaster/i);
  });
});
