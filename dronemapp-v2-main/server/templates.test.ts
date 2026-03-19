/**
 * Project Templates Test Suite
 * Tests template CRUD operations and project creation from templates
 */

import { beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

// Mock authenticated user context
const mockUser = {
  id: 1,
  openId: "test-open-id",
  name: "Test User",
  email: "test@example.com",
  role: "user" as const,
};

const createMockContext = (): TrpcContext => ({
  user: mockUser,
  req: {} as any,
  res: {} as any,
});

describe("Project Templates", () => {
  let createdTemplateId: number;

  describe("Template CRUD Operations", () => {
    it("should list templates for authenticated user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const templates = await caller.template.list();

      expect(Array.isArray(templates)).toBe(true);
      // Should include the seeded Water Line Mapping template
      expect(templates.length).toBeGreaterThanOrEqual(1);
      
      const waterLineTemplate = templates.find(t => t.name === "Water Line Mapping");
      expect(waterLineTemplate).toBeDefined();
      expect(waterLineTemplate?.category).toBe("Municipal Infrastructure");
      expect(waterLineTemplate?.isSystem).toBe("yes");
    });

    it("should create a new template", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const newTemplate = await caller.template.create({
        name: "Test Construction Template",
        description: "Template for construction site surveys",
        category: "Construction",
        config: {
          clientName: "ABC Construction",
          dronePilot: "Test Pilot",
          faaLicenseNumber: "TEST123",
        },
      });

      expect(newTemplate).toBeDefined();
      expect(newTemplate.name).toBe("Test Construction Template");
      expect(newTemplate.category).toBe("Construction");
      expect(newTemplate.userId).toBe(mockUser.id);
      expect(newTemplate.isSystem).toBe("no");
      expect(newTemplate.useCount).toBe(0);

      createdTemplateId = newTemplate.id;
    });

    it("should get a template by id", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const template = await caller.template.get({ id: createdTemplateId });

      expect(template).toBeDefined();
      expect(template.id).toBe(createdTemplateId);
      expect(template.name).toBe("Test Construction Template");
      
      const config = JSON.parse(template.config);
      expect(config.clientName).toBe("ABC Construction");
      expect(config.dronePilot).toBe("Test Pilot");
    });

    it("should update a template", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const updatedTemplate = await caller.template.update({
        id: createdTemplateId,
        name: "Updated Construction Template",
        description: "Updated description",
        category: "Commercial Construction",
        config: {
          clientName: "XYZ Construction",
          dronePilot: "Updated Pilot",
          faaLicenseNumber: "UPDATED456",
        },
      });

      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate.name).toBe("Updated Construction Template");
      expect(updatedTemplate.category).toBe("Commercial Construction");
      
      const config = JSON.parse(updatedTemplate.config);
      expect(config.clientName).toBe("XYZ Construction");
    });

    it("should delete a template", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await caller.template.delete({ id: createdTemplateId });

      // Verify template is deleted by trying to get it
      await expect(
        caller.template.get({ id: createdTemplateId })
      ).rejects.toThrow();
    });
  });

  describe("Create Project from Template", () => {
    it("should create project with template values", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Get the Water Line Mapping template
      const templates = await caller.template.list();
      const waterLineTemplate = templates.find(t => t.name === "Water Line Mapping");
      
      if (!waterLineTemplate) {
        throw new Error("Water Line Mapping template not found");
      }

      // Create project from template
      const project = await caller.template.createProjectFromTemplate({
        templateId: waterLineTemplate.id,
        name: "Test Water Line Project",
      });

      expect(project).toBeDefined();
      expect(project.name).toBe("Test Water Line Project");
      expect(project.clientName).toBe("City of Forney");
      expect(project.dronePilot).toBe("Edward Clay Bechtol");
      expect(project.faaLicenseNumber).toBe("5205636");

      // Verify template use count was incremented
      const updatedTemplate = await caller.template.get({ id: waterLineTemplate.id });
      expect(updatedTemplate.useCount).toBeGreaterThan(waterLineTemplate.useCount);
      expect(updatedTemplate.lastUsedAt).toBeDefined();
    });

    it("should throw error for non-existent template", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.template.createProjectFromTemplate({
          templateId: 99999,
          name: "Test Project",
        })
      ).rejects.toThrow();
    });
  });

  describe("Template Access Control", () => {
    it("should only show user's own templates", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Create a template
      const template = await caller.template.create({
        name: "User Template",
        description: "Template for testing access control",
        category: "Test",
        config: { test: "value" },
      });

      // Create another user context
      const otherUserContext: TrpcContext = {
        user: { ...mockUser, id: 999, openId: "other-user" },
        req: {} as any,
        res: {} as any,
      };
      const otherCaller = appRouter.createCaller(otherUserContext);

      // Other user should not see this template (except system templates)
      const otherUserTemplates = await otherCaller.template.list();
      const foundTemplate = otherUserTemplates.find(t => t.id === template.id);
      expect(foundTemplate).toBeUndefined();

      // Clean up
      await caller.template.delete({ id: template.id });
    });

    it("should not allow updating other user's templates", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Create a template
      const template = await caller.template.create({
        name: "User Template",
        description: "Template for testing access control",
        category: "Test",
        config: { test: "value" },
      });

      // Try to update as different user
      const otherUserContext: TrpcContext = {
        user: { ...mockUser, id: 999, openId: "other-user" },
        req: {} as any,
        res: {} as any,
      };
      const otherCaller = appRouter.createCaller(otherUserContext);

      await expect(
        otherCaller.template.update({
          id: template.id,
          name: "Hacked Template",
        })
      ).rejects.toThrow();

      // Clean up
      await caller.template.delete({ id: template.id });
    });
  });

  describe("Template Configuration Validation", () => {
    it("should handle templates with empty config", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const template = await caller.template.create({
        name: "Empty Config Template",
        description: "Template with minimal config",
        category: "Test",
        config: {},
      });

      expect(template).toBeDefined();
      const parsedConfig = JSON.parse(template.config);
      expect(parsedConfig).toEqual({});

      // Clean up
      await caller.template.delete({ id: template.id });
    });

    it("should preserve complex config structures", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const complexConfig = {
        clientName: "Test Client",
        dronePilot: "Test Pilot",
        faaLicenseNumber: "12345",
        nested: {
          field1: "value1",
          field2: 42,
          array: [1, 2, 3],
        },
      };

      const template = await caller.template.create({
        name: "Complex Config Template",
        description: "Template with complex nested config",
        category: "Test",
        config: complexConfig,
      });

      const retrieved = await caller.template.get({ id: template.id });
      const parsedConfig = JSON.parse(retrieved.config);
      
      expect(parsedConfig.clientName).toBe(complexConfig.clientName);
      expect(parsedConfig.dronePilot).toBe(complexConfig.dronePilot);
      expect(parsedConfig.faaLicenseNumber).toBe(complexConfig.faaLicenseNumber);
      expect(parsedConfig.nested.array).toEqual([1, 2, 3]);

      // Clean up
      await caller.template.delete({ id: template.id });
    });
  });
});
