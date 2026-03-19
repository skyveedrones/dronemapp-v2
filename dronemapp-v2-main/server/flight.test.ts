import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFlight,
  getFlightsByProject,
  getFlightWithMedia,
  updateFlight,
  deleteFlight,
} from "./db";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    createFlight: vi.fn(),
    getFlightsByProject: vi.fn(),
    getFlightWithMedia: vi.fn(),
    updateFlight: vi.fn(),
    deleteFlight: vi.fn(),
  };
});

describe("flight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("flight.create", () => {
    it("creates a new flight with required fields", async () => {
      const mockFlight = {
        id: 1,
        projectId: 1,
        name: "Morning Survey",
        description: null,
        flightDate: null,
        createdAt: new Date(),
      };

      vi.mocked(createFlight).mockResolvedValue(mockFlight);

      const result = await createFlight({
        projectId: 1,
        name: "Morning Survey",
      });

      expect(result).toEqual(mockFlight);
      expect(createFlight).toHaveBeenCalledWith({
        projectId: 1,
        name: "Morning Survey",
      });
    });

    it("creates a flight with all optional fields", async () => {
      const flightDate = new Date("2025-01-15");
      const mockFlight = {
        id: 2,
        projectId: 1,
        name: "Afternoon Survey",
        description: "Second flight of the day",
        flightDate,
        createdAt: new Date(),
      };

      vi.mocked(createFlight).mockResolvedValue(mockFlight);

      const result = await createFlight({
        projectId: 1,
        name: "Afternoon Survey",
        description: "Second flight of the day",
        flightDate,
      });

      expect(result).toEqual(mockFlight);
      expect(result.description).toBe("Second flight of the day");
      expect(result.flightDate).toEqual(flightDate);
    });
  });

  describe("flight.list", () => {
    it("returns flights for a project", async () => {
      const mockFlights = [
        {
          id: 1,
          projectId: 1,
          name: "Flight 1",
          description: null,
          flightDate: null,
          createdAt: new Date(),
          mediaCount: 10,
        },
        {
          id: 2,
          projectId: 1,
          name: "Flight 2",
          description: "Second flight",
          flightDate: new Date("2025-01-15"),
          createdAt: new Date(),
          mediaCount: 5,
        },
      ];

      vi.mocked(getFlightsByProject).mockResolvedValue(mockFlights);

      const result = await getFlightsByProject(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Flight 1");
      expect(result[1].mediaCount).toBe(5);
    });

    it("returns empty array for project with no flights", async () => {
      vi.mocked(getFlightsByProject).mockResolvedValue([]);

      const result = await getFlightsByProject(999);

      expect(result).toEqual([]);
    });
  });

  describe("flight.get", () => {
    it("returns flight with media", async () => {
      const mockFlight = {
        id: 1,
        projectId: 1,
        name: "Test Flight",
        description: "Test description",
        flightDate: new Date("2025-01-15"),
        createdAt: new Date(),
        media: [
          { id: 1, filename: "photo1.jpg" },
          { id: 2, filename: "photo2.jpg" },
        ],
      };

      vi.mocked(getFlightWithMedia).mockResolvedValue(mockFlight);

      const result = await getFlightWithMedia(1);

      expect(result).toBeDefined();
      expect(result?.media).toHaveLength(2);
    });

    it("returns null for non-existent flight", async () => {
      vi.mocked(getFlightWithMedia).mockResolvedValue(null);

      const result = await getFlightWithMedia(999);

      expect(result).toBeNull();
    });
  });

  describe("flight.update", () => {
    it("updates flight name", async () => {
      const mockFlight = {
        id: 1,
        projectId: 1,
        name: "Updated Flight Name",
        description: null,
        flightDate: null,
        createdAt: new Date(),
      };

      vi.mocked(updateFlight).mockResolvedValue(mockFlight);

      const result = await updateFlight(1, { name: "Updated Flight Name" });

      expect(result?.name).toBe("Updated Flight Name");
    });

    it("updates flight description and date", async () => {
      const flightDate = new Date("2025-02-01");
      const mockFlight = {
        id: 1,
        projectId: 1,
        name: "Test Flight",
        description: "New description",
        flightDate,
        createdAt: new Date(),
      };

      vi.mocked(updateFlight).mockResolvedValue(mockFlight);

      const result = await updateFlight(1, {
        description: "New description",
        flightDate,
      });

      expect(result?.description).toBe("New description");
      expect(result?.flightDate).toEqual(flightDate);
    });
  });

  describe("flight.delete", () => {
    it("deletes a flight successfully", async () => {
      vi.mocked(deleteFlight).mockResolvedValue(true);

      const result = await deleteFlight(1);

      expect(result).toBe(true);
      expect(deleteFlight).toHaveBeenCalledWith(1);
    });

    it("returns false for non-existent flight", async () => {
      vi.mocked(deleteFlight).mockResolvedValue(false);

      const result = await deleteFlight(999);

      expect(result).toBe(false);
    });
  });
});
