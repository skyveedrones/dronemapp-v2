/**
 * Test for marker clustering functionality
 * Verifies that the marker clustering library is properly integrated
 */

import { describe, it, expect } from "vitest";

describe("Marker Clustering", () => {
  it("should have @googlemaps/markerclusterer package installed", async () => {
    // Verify the package can be imported
    const markerClusterer = await import("@googlemaps/markerclusterer");
    expect(markerClusterer).toBeDefined();
    expect(markerClusterer.MarkerClusterer).toBeDefined();
  });

  it("should export MarkerClusterer class", async () => {
    const { MarkerClusterer } = await import("@googlemaps/markerclusterer");
    expect(typeof MarkerClusterer).toBe("function");
  });
});
