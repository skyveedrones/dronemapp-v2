import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getUserRoleForProject } from "./db";
import { getDb } from "./db";
import { users, projects, projectCollaborators, clients, clientUsers, clientProjectAssignments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("getUserRoleForProject", () => {
  let testUserId: number;
  let testProjectId: number;
  let testClientId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const userResult = await db.insert(users).values({
      email: "test-role-user@example.com",
      name: "Test Role User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testUserId = userResult[0].insertId;

    // Create test project (owned by test user)
    const projectResult = await db.insert(projects).values({
      userId: testUserId,
      name: "Test Project for Role",
      status: "active",
      mediaCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testProjectId = projectResult[0].insertId;

    // Create test client
    const clientResult = await db.insert(clients).values({
      userId: testUserId,
      name: "Test Client",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testClientId = clientResult[0].insertId;
  });

  afterAll(async () => {
    if (!db) return;
    // Cleanup
    await db.delete(clientProjectAssignments).where(eq(clientProjectAssignments.projectId, testProjectId));
    await db.delete(projectCollaborators).where(eq(projectCollaborators.projectId, testProjectId));
    await db.delete(projects).where(eq(projects.id, testProjectId));
    await db.delete(clientUsers).where(eq(clientUsers.clientId, testClientId));
    await db.delete(clients).where(eq(clients.id, testClientId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return 'owner' for project owner", async () => {
    const role = await getUserRoleForProject(testProjectId, testUserId);
    expect(role).toBe("owner");
  });

  it("should return 'collaborator' for project collaborator", async () => {
    // Create another user
    const otherUserResult = await db.insert(users).values({
      email: "collaborator@example.com",
      name: "Collaborator User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const collaboratorId = otherUserResult[0].insertId;

    // Add as collaborator
    await db.insert(projectCollaborators).values({
      projectId: testProjectId,
      userId: collaboratorId,
      role: "editor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const role = await getUserRoleForProject(testProjectId, collaboratorId);
    expect(role).toBe("collaborator");

    // Cleanup
    await db.delete(projectCollaborators).where(eq(projectCollaborators.userId, collaboratorId));
    await db.delete(users).where(eq(users.id, collaboratorId));
  });

  it("should return client role for client user", async () => {
    // Create another user
    const clientUserResult = await db.insert(users).values({
      email: "client-user@example.com",
      name: "Client User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const clientUserId = clientUserResult[0].insertId;

    // Add user to client with 'user' role
    await db.insert(clientUsers).values({
      clientId: testClientId,
      userId: clientUserId,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assign project to client
    await db.insert(clientProjectAssignments).values({
      projectId: testProjectId,
      clientId: testClientId,
    });

    const role = await getUserRoleForProject(testProjectId, clientUserId);
    expect(role).toBe("user");

    // Cleanup
    await db.delete(clientProjectAssignments).where(eq(clientProjectAssignments.projectId, testProjectId));
    await db.delete(clientUsers).where(eq(clientUsers.userId, clientUserId));
    await db.delete(users).where(eq(users.id, clientUserId));
  });

  it("should return null for user with no access", async () => {
    // Create another user with no access
    const noAccessUserResult = await db.insert(users).values({
      email: "no-access@example.com",
      name: "No Access User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const noAccessUserId = noAccessUserResult[0].insertId;

    const role = await getUserRoleForProject(testProjectId, noAccessUserId);
    expect(role).toBeNull();

    // Cleanup
    await db.delete(users).where(eq(users.id, noAccessUserId));
  });

  it("should block viewers from editing", async () => {
    // Create another user
    const viewerUserResult = await db.insert(users).values({
      email: "viewer@example.com",
      name: "Viewer User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const viewerUserId = viewerUserResult[0].insertId;

    // Add user to client with 'viewer' role
    await db.insert(clientUsers).values({
      clientId: testClientId,
      userId: viewerUserId,
      role: "viewer",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assign project to client
    await db.insert(clientProjectAssignments).values({
      projectId: testProjectId,
      clientId: testClientId,
    });

    const role = await getUserRoleForProject(testProjectId, viewerUserId);
    expect(role).toBe("viewer");
    expect(role === "viewer").toBe(true); // Should be blocked from editing

    // Cleanup
    await db.delete(clientProjectAssignments).where(eq(clientProjectAssignments.projectId, testProjectId));
    await db.delete(clientUsers).where(eq(clientUsers.userId, viewerUserId));
    await db.delete(users).where(eq(users.id, viewerUserId));
  });
});
