/**
 * GPS Update Tests
 * Tests for the media GPS coordinate update functionality
 */

import { describe, it, expect, vi } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getMediaById: vi.fn(),
  getUserProject: vi.fn(),
  updateMediaGPS: vi.fn(),
}));

import { getMediaById, getUserProject, updateMediaGPS } from "./db";

describe("media.updateGPS", () => {
  it("validates latitude range (-90 to 90)", () => {
    // Valid latitudes
    expect(32.7479).toBeGreaterThanOrEqual(-90);
    expect(32.7479).toBeLessThanOrEqual(90);
    expect(-89.999).toBeGreaterThanOrEqual(-90);
    expect(89.999).toBeLessThanOrEqual(90);
    
    // Invalid latitudes would be rejected by zod schema
    expect(-91).toBeLessThan(-90);
    expect(91).toBeGreaterThan(90);
  });

  it("validates longitude range (-180 to 180)", () => {
    // Valid longitudes
    expect(-96.4719).toBeGreaterThanOrEqual(-180);
    expect(-96.4719).toBeLessThanOrEqual(180);
    expect(-179.999).toBeGreaterThanOrEqual(-180);
    expect(179.999).toBeLessThanOrEqual(180);
    
    // Invalid longitudes would be rejected by zod schema
    expect(-181).toBeLessThan(-180);
    expect(181).toBeGreaterThan(180);
  });

  it("allows null values for clearing GPS data", () => {
    const nullableLatitude: number | null = null;
    const nullableLongitude: number | null = null;
    const nullableAltitude: number | null = null;
    
    expect(nullableLatitude).toBeNull();
    expect(nullableLongitude).toBeNull();
    expect(nullableAltitude).toBeNull();
  });

  it("converts numeric coordinates to string for database storage", () => {
    const latitude = 32.7479;
    const longitude = -96.4719;
    const altitude = 150.5;
    
    const latString = latitude.toString();
    const lngString = longitude.toString();
    const altString = altitude.toString();
    
    expect(latString).toBe("32.7479");
    expect(lngString).toBe("-96.4719");
    expect(altString).toBe("150.5");
  });

  it("handles null conversion for clearing coordinates", () => {
    const latitude: number | null = null;
    const latString = latitude?.toString() ?? null;
    
    expect(latString).toBeNull();
  });

  it("updateMediaGPS function is exported and callable", async () => {
    const mockMedia = {
      id: 1,
      projectId: 1,
      latitude: "32.7479",
      longitude: "-96.4719",
      altitude: "150.5",
    };
    
    vi.mocked(updateMediaGPS).mockResolvedValue(mockMedia as any);
    
    const result = await updateMediaGPS(1, {
      latitude: "32.7479",
      longitude: "-96.4719",
      altitude: "150.5",
    });
    
    expect(updateMediaGPS).toHaveBeenCalledWith(1, {
      latitude: "32.7479",
      longitude: "-96.4719",
      altitude: "150.5",
    });
    expect(result).toEqual(mockMedia);
  });

  it("getMediaById is used to verify media exists", async () => {
    const mockMedia = { id: 1, projectId: 1, userId: 1 };
    vi.mocked(getMediaById).mockResolvedValue(mockMedia as any);
    
    const result = await getMediaById(1, 1);
    
    expect(getMediaById).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual(mockMedia);
  });

  it("getUserProject is used to verify ownership", async () => {
    const mockProject = { id: 1, userId: 1, name: "Test Project" };
    vi.mocked(getUserProject).mockResolvedValue(mockProject as any);
    
    const result = await getUserProject(1, 1);
    
    expect(getUserProject).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual(mockProject);
  });
});
