import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getProjectMediaWithAccess, userHasClientProjectAccess } from "./db";
import { users, projects, media, clientUsers, clients } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Client User Media Access", () => {
  let clientUser: any;
  let testProject: any;
  let testClient: any;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Find traceybechtol@gmail.com
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "traceybechtol@gmail.com"))
      .limit(1);

    if (existingUser.length > 0) {
      clientUser = existingUser[0];
    }

    // Find a client that this user belongs to
    if (clientUser) {
      const clientUserRecords = await db
        .select()
        .from(clientUsers)
        .where(eq(clientUsers.userId, clientUser.id))
        .limit(1);

      if (clientUserRecords.length > 0) {
        const clientRecord = clientUserRecords[0];
        
        // Get the client details
        const clientDetails = await db
          .select()
          .from(clients)
          .where(eq(clients.id, clientRecord.clientId))
          .limit(1);

        if (clientDetails.length > 0) {
          testClient = clientDetails[0];
        }

        // Find a project assigned to this client
        const projectRecords = await db
          .select()
          .from(projects)
          .where(eq(projects.clientId, clientRecord.clientId))
          .limit(1);

        if (projectRecords.length > 0) {
          testProject = projectRecords[0];
        }
      }
    }
  });

  it("should find client user traceybechtol@gmail.com", () => {
    expect(clientUser).toBeDefined();
    expect(clientUser.email).toBe("traceybechtol@gmail.com");
  });

  it("should find client membership for user", () => {
    expect(testClient).toBeDefined();
    expect(testClient.id).toBeGreaterThan(0);
  });

  it("should find project assigned to client", () => {
    expect(testProject).toBeDefined();
    expect(testProject.id).toBeGreaterThan(0);
    expect(testProject.clientId).toBe(testClient.id);
  });

  it("should confirm user has client access to project", async () => {
    if (!clientUser || !testProject) {
      throw new Error("Test setup incomplete");
    }

    const hasAccess = await userHasClientProjectAccess(clientUser.id, testProject.id);
    expect(hasAccess).toBe(true);
  });

  it("should allow client user to get project media", async () => {
    if (!clientUser || !testProject) {
      throw new Error("Test setup incomplete");
    }

    const media = await getProjectMediaWithAccess(testProject.id, clientUser.id);
    
    // Media should not be null (even if empty array)
    expect(media).not.toBeNull();
    expect(Array.isArray(media)).toBe(true);
  });

  it("should return media if project has media files", async () => {
    if (!clientUser || !testProject) {
      throw new Error("Test setup incomplete");
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Check if project has media
    const mediaCount = await db
      .select()
      .from(media)
      .where(eq(media.projectId, testProject.id));

    const projectMedia = await getProjectMediaWithAccess(testProject.id, clientUser.id);

    if (mediaCount.length > 0) {
      // If project has media, client user should see it
      expect(projectMedia).not.toBeNull();
      expect(projectMedia!.length).toBeGreaterThan(0);
      expect(projectMedia!.length).toBe(mediaCount.length);
    } else {
      // If no media, should return empty array
      expect(projectMedia).not.toBeNull();
      expect(projectMedia!.length).toBe(0);
    }
  });
});
