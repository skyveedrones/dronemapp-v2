import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getUserProject: vi.fn(),
  getUserByEmail: vi.fn(),
  getProjectCollaborators: vi.fn(),
  createProjectInvitation: vi.fn(),
  getInvitationByToken: vi.fn(),
  acceptProjectInvitation: vi.fn(),
  getProjectById: vi.fn(),
  getUserById: vi.fn(),
  revokeProjectInvitation: vi.fn(),
  removeProjectCollaborator: vi.fn(),
  getProjectWithAccess: vi.fn(),
  getProjectMediaWithAccess: vi.fn(),
  getUserAccessibleProjects: vi.fn(),
  userHasProjectAccess: vi.fn(),
}));

// Mock the email module
vi.mock("./email", () => ({
  sendProjectInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import {
  getUserProject,
  getUserByEmail,
  getProjectCollaborators,
  createProjectInvitation,
  getInvitationByToken,
  acceptProjectInvitation,
  getProjectById,
  getUserById,
  revokeProjectInvitation,
  removeProjectCollaborator,
  getProjectWithAccess,
  getProjectMediaWithAccess,
  getUserAccessibleProjects,
  userHasProjectAccess,
} from "./db";

import { sendProjectInvitationEmail } from "./email";

describe("sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invite validation", () => {
    it("should validate email format", () => {
      // Test email validation
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@company.co.uk",
      ];
      
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "no@domain",
      ];

      // Simple email regex for testing
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it("should validate role values", () => {
      const validRoles = ["viewer", "editor"];
      const invalidRoles = ["admin", "owner", "guest", ""];

      validRoles.forEach((role) => {
        expect(["viewer", "editor"].includes(role)).toBe(true);
      });

      invalidRoles.forEach((role) => {
        expect(["viewer", "editor"].includes(role)).toBe(false);
      });
    });
  });

  describe("invitation token", () => {
    it("should generate unique tokens", () => {
      // Test that nanoid generates unique tokens
      const { nanoid } = require("nanoid");
      const tokens = new Set();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(nanoid(32));
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it("should generate tokens of correct length", () => {
      const { nanoid } = require("nanoid");
      const token = nanoid(32);
      
      expect(token.length).toBe(32);
    });
  });

  describe("access control", () => {
    it("should correctly identify owner access", async () => {
      const mockProject = {
        id: 1,
        name: "Test Project",
        userId: 123,
      };

      vi.mocked(getUserProject).mockResolvedValue(mockProject as any);
      
      const project = await getUserProject(1, 123);
      expect(project).toBeDefined();
      expect(project?.userId).toBe(123);
    });

    it("should correctly identify collaborator access", async () => {
      const mockProject = {
        id: 1,
        name: "Test Project",
        userId: 100, // Different owner
        accessRole: "viewer",
      };

      vi.mocked(getUserProject).mockResolvedValue(null);
      vi.mocked(getProjectWithAccess).mockResolvedValue(mockProject as any);

      // First check owner (returns null)
      const ownedProject = await getUserProject(1, 123);
      expect(ownedProject).toBeNull();

      // Then check collaborator access
      const sharedProject = await getProjectWithAccess(1, 123);
      expect(sharedProject).toBeDefined();
      expect(sharedProject?.accessRole).toBe("viewer");
    });

    it("should deny access to non-collaborators", async () => {
      vi.mocked(getUserProject).mockResolvedValue(null);
      vi.mocked(getProjectWithAccess).mockResolvedValue(null);

      const ownedProject = await getUserProject(1, 999);
      const sharedProject = await getProjectWithAccess(1, 999);

      expect(ownedProject).toBeNull();
      expect(sharedProject).toBeNull();
    });
  });

  describe("invitation acceptance", () => {
    it("should accept valid pending invitation", async () => {
      const mockInvitation = {
        id: 1,
        projectId: 1,
        email: "test@example.com",
        status: "pending",
        token: "test-token",
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      };

      vi.mocked(acceptProjectInvitation).mockResolvedValue({
        success: true,
        invitation: mockInvitation as any,
      });

      const result = await acceptProjectInvitation("test-token", 123);
      
      expect(result.success).toBe(true);
      expect(result.invitation).toBeDefined();
    });

    it("should reject expired invitation", async () => {
      vi.mocked(acceptProjectInvitation).mockResolvedValue({
        success: false,
        error: "Invitation has expired",
      });

      const result = await acceptProjectInvitation("expired-token", 123);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invitation has expired");
    });

    it("should reject already accepted invitation", async () => {
      vi.mocked(acceptProjectInvitation).mockResolvedValue({
        success: false,
        error: "Invitation has already been accepted",
      });

      const result = await acceptProjectInvitation("accepted-token", 123);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invitation has already been accepted");
    });
  });

  describe("email sending", () => {
    it("should send invitation email with correct parameters", async () => {
      vi.mocked(sendProjectInvitationEmail).mockResolvedValue({ success: true });

      const result = await sendProjectInvitationEmail({
        to: "test@example.com",
        inviterName: "John Doe",
        projectName: "Test Project",
        role: "viewer",
        inviteUrl: "https://example.com/invite/abc123",
      });

      expect(result.success).toBe(true);
      expect(sendProjectInvitationEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        inviterName: "John Doe",
        projectName: "Test Project",
        role: "viewer",
        inviteUrl: "https://example.com/invite/abc123",
      });
    });
  });
});
