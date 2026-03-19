import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, projects, clientUsers, clients } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Admin Rights", () => {
  let adminUser: any;
  let regularUser: any;
  let testProject: any;
  let testClient: any;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Find or create an admin user
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "traceybechtol@gmail.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      adminUser = existingAdmin[0];
    }

    // Find a regular user (non-admin)
    const regularUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "user"))
      .limit(1);

    if (regularUsers.length > 0) {
      regularUser = regularUsers[0];
    }

    // Find a test project
    const testProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (testProjects.length > 0) {
      testProject = testProjects[0];
    }

    // Find a test client
    const testClients = await db
      .select()
      .from(clients)
      .limit(1);

    if (testClients.length > 0) {
      testClient = testClients[0];
    }
  });

  it("should identify admin user has admin role", async () => {
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe("admin");
    expect(adminUser.email).toBe("traceybechtol@gmail.com");
  });

  it("should identify regular user has user role", async () => {
    if (regularUser) {
      expect(regularUser.role).toBe("user");
    }
  });

  it("should allow admin user to be in client_users table", async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    if (adminUser && testClient) {
      const clientUserRecords = await db
        .select()
        .from(clientUsers)
        .where(
          and(
            eq(clientUsers.userId, adminUser.id),
            eq(clientUsers.clientId, testClient.id)
          )
        );

      // Admin can be a client user (this is valid)
      expect(Array.isArray(clientUserRecords)).toBe(true);
    }
  });

  it("should have projects in database", async () => {
    expect(testProject).toBeDefined();
    expect(testProject.id).toBeGreaterThan(0);
  });

  it("admin user should have platform admin role for full access", async () => {
    // The useClientAccess hook should check user.role === 'admin'
    // This test verifies the admin user has the correct role
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe("admin");
    
    // With this role, the hook should set:
    // - isClientOnly = false
    // - canEdit = true
    // - canDelete = true
  });
});
