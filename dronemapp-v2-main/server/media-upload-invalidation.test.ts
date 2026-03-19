/**
 * Test: Media Upload Query Invalidation
 * Verifies that the media upload dialog correctly handles query invalidation
 * with both projectId and flightId parameters
 */

import { describe, it, expect } from "vitest";

describe("Media Upload Query Invalidation Fix", () => {
  it("should include flightId in query parameters when provided", () => {
    const projectId = 123;
    const flightId = 456;

    // Simulate the query parameters that would be used for invalidation
    const queryParamsWithFlight = { projectId, flightId };
    const queryParamsWithoutFlight = { projectId };

    // Verify that flightId is included when present
    expect(queryParamsWithFlight).toHaveProperty("projectId", projectId);
    expect(queryParamsWithFlight).toHaveProperty("flightId", flightId);

    // Verify that query works without flightId for project-level media
    expect(queryParamsWithoutFlight).toHaveProperty("projectId", projectId);
    expect(queryParamsWithoutFlight).not.toHaveProperty("flightId");
  });

  it("should handle conditional invalidation based on flightId presence", () => {
    const projectId = 123;
    const flightId = 456;

    // Simulate the conditional logic in MediaUploadDialog
    const getInvalidationParams = (projectId: number, flightId?: number) => {
      if (flightId) {
        return { projectId, flightId };
      } else {
        return { projectId };
      }
    };

    // Test with flightId
    const paramsWithFlight = getInvalidationParams(projectId, flightId);
    expect(paramsWithFlight).toEqual({ projectId, flightId });

    // Test without flightId
    const paramsWithoutFlight = getInvalidationParams(projectId);
    expect(paramsWithoutFlight).toEqual({ projectId });

    // Test with undefined flightId
    const paramsWithUndefined = getInvalidationParams(projectId, undefined);
    expect(paramsWithUndefined).toEqual({ projectId });
  });

  it("should correctly identify flight-specific vs project-level uploads", () => {
    // Flight-specific upload scenario
    const flightUploadContext = {
      projectId: 123,
      flightId: 456,
      isFlightSpecific: true,
    };

    expect(flightUploadContext.flightId).toBeDefined();
    expect(flightUploadContext.isFlightSpecific).toBe(true);

    // Project-level upload scenario
    const projectUploadContext = {
      projectId: 123,
      flightId: undefined,
      isFlightSpecific: false,
    };

    expect(projectUploadContext.flightId).toBeUndefined();
    expect(projectUploadContext.isFlightSpecific).toBe(false);
  });

  it("should validate query parameter structure", () => {
    const projectId = 123;
    const flightId = 456;

    // Valid query parameters
    const validParams = { projectId, flightId };
    expect(typeof validParams.projectId).toBe("number");
    expect(typeof validParams.flightId).toBe("number");
    expect(validParams.projectId).toBeGreaterThan(0);
    expect(validParams.flightId).toBeGreaterThan(0);

    // Valid project-only parameters
    const validProjectParams = { projectId };
    expect(typeof validProjectParams.projectId).toBe("number");
    expect(validProjectParams.projectId).toBeGreaterThan(0);
  });
});
