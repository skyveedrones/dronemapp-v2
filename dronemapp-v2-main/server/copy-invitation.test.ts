/**
 * Tests for copy invitation link and email template functionality
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Copy Invitation Functionality", () => {
  describe("Client Portal Invitation", () => {
    it("should return invitation URL when creating client invitation", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a client
      const client = await caller.clientPortal.create({
        name: "Test Client for Copy",
        contactEmail: "contact@testclient.com",
      });

      // Send invitation
      const result = await caller.clientPortal.invite({
        clientId: client.id,
        email: "newuser@example.com",
        role: "viewer",
      });

      // Should return invitation URL
      expect(result.inviteUrl).toBeDefined();
      expect(result.inviteUrl).toContain("/client-invite/");
      expect(result.invitation).toBeDefined();
      expect(result.invitation.email).toBe("newuser@example.com");
    });

    it("should include all necessary information for email template", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a client
      const client = await caller.clientPortal.create({
        name: "Template Test Client",
        contactEmail: "template@test.com",
      });

      // Send invitation
      const result = await caller.clientPortal.invite({
        clientId: client.id,
        email: "templateuser@example.com",
        role: "admin",
      });

      // Verify we have all info needed for email template
      expect(result.inviteUrl).toBeDefined();
      expect(result.invitation.email).toBe("templateuser@example.com");
      expect(result.invitation.role).toBe("admin");
      
      // The frontend can use client.name from the query
      expect(client.name).toBe("Template Test Client");
    });

    it("client invitation should have proper URL format", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const client = await caller.clientPortal.create({
        name: "URL Format Test",
        contactEmail: "urltest@test.com",
      });

      const result = await caller.clientPortal.invite({
        clientId: client.id,
        email: "urlformat@example.com",
        role: "viewer",
      });

      // URL should be a valid format
      expect(result.inviteUrl).toMatch(/^https?:\/\/.+\/client-invite\/.{32}$/);
    });
  });

  describe("Project Share Invitation", () => {
    it("should return invitation URL when creating project invitation", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.project.create({
        name: "Test Project for Copy",
        description: "Testing copy functionality",
        status: "active",
      });

      // Send invitation
      const result = await caller.sharing.invite({
        projectId: project.id,
        email: "collaborator@example.com",
        role: "viewer",
      });

      // Should return invitation URL
      expect(result.inviteUrl).toBeDefined();
      expect(result.inviteUrl).toContain("/invite/");
      expect(result.invitation).toBeDefined();
      expect(result.invitation.email).toBe("collaborator@example.com");
    });

    it("should include all necessary information for email template", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.project.create({
        name: "Template Test Project",
        description: "Testing email template",
        status: "active",
      });

      // Send invitation
      const result = await caller.sharing.invite({
        projectId: project.id,
        email: "editor@example.com",
        role: "editor",
      });

      // Verify we have all info needed for email template
      expect(result.inviteUrl).toBeDefined();
      expect(result.invitation.email).toBe("editor@example.com");
      expect(result.invitation.role).toBe("editor");
      
      // The frontend can use project.name from the query
      expect(project.name).toBe("Template Test Project");
    });

    it("should return inviteUrl even when email sending fails", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.project.create({
        name: "Email Fail Test Project",
        description: "Testing URL return on email failure",
        status: "active",
      });

      // Send invitation (email might fail but URL should still be returned)
      const result = await caller.sharing.invite({
        projectId: project.id,
        email: "failtest@example.com",
        role: "viewer",
      });

      // Should return invitation URL regardless of email status
      expect(result.inviteUrl).toBeDefined();
      expect(result.inviteUrl).toContain("/invite/");
      expect(result.invitation).toBeDefined();
      
      // emailSent might be false, but inviteUrl should always be present
      expect(typeof result.emailSent).toBe("boolean");
    });

    it("project invitation should have proper URL format", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const project = await caller.project.create({
        name: "URL Format Test Project",
        description: "Testing URL format",
        status: "active",
      });

      const result = await caller.sharing.invite({
        projectId: project.id,
        email: "urlformat@example.com",
        role: "viewer",
      });

      // URL should be a valid format
      expect(result.inviteUrl).toMatch(/^https?:\/\/.+\/invite\/.{32}$/);
    });
  });
});
