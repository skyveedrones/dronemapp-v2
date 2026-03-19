import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  updateProjectLogo: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Project",
    logoUrl: "https://s3.example.com/projects/1/logo/abc123.png",
    logoKey: "projects/1/logo/abc123.png",
  }),
  deleteProjectLogo: vi.fn().mockResolvedValue("projects/1/logo/abc123.png"),
  getProjectLogo: vi.fn().mockResolvedValue({
    logoUrl: "https://s3.example.com/projects/1/logo/abc123.png",
    logoKey: "projects/1/logo/abc123.png",
  }),
  getUserProject: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "Test Project",
    logoUrl: null,
    logoKey: null,
  }),
}));

import { updateProjectLogo, deleteProjectLogo, getProjectLogo } from "./db";

describe("projectLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProjectLogo", () => {
    it("should update project logo with valid data", async () => {
      const result = await updateProjectLogo(
        1,
        1,
        "https://s3.example.com/projects/1/logo/abc123.png",
        "projects/1/logo/abc123.png"
      );

      expect(result).toBeDefined();
      expect(result?.logoUrl).toBe("https://s3.example.com/projects/1/logo/abc123.png");
      expect(result?.logoKey).toBe("projects/1/logo/abc123.png");
    });

    it("should call updateProjectLogo with correct parameters", async () => {
      await updateProjectLogo(
        1,
        1,
        "https://s3.example.com/test.png",
        "projects/1/logo/test.png"
      );

      expect(updateProjectLogo).toHaveBeenCalledWith(
        1,
        1,
        "https://s3.example.com/test.png",
        "projects/1/logo/test.png"
      );
    });
  });

  describe("deleteProjectLogo", () => {
    it("should delete project logo and return the key", async () => {
      const result = await deleteProjectLogo(1, 1);

      expect(result).toBe("projects/1/logo/abc123.png");
    });

    it("should call deleteProjectLogo with correct parameters", async () => {
      await deleteProjectLogo(1, 1);

      expect(deleteProjectLogo).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("getProjectLogo", () => {
    it("should return project logo data", async () => {
      const result = await getProjectLogo(1, 1);

      expect(result).toBeDefined();
      expect(result?.logoUrl).toBe("https://s3.example.com/projects/1/logo/abc123.png");
      expect(result?.logoKey).toBe("projects/1/logo/abc123.png");
    });

    it("should call getProjectLogo with correct parameters", async () => {
      await getProjectLogo(1, 1);

      expect(getProjectLogo).toHaveBeenCalledWith(1, 1);
    });
  });
});
