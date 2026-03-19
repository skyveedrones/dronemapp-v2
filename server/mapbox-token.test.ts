import { describe, it, expect } from "vitest";

describe("Mapbox Token Validation", () => {
  it("should have VITE_MAPBOX_TOKEN set and starting with pk.", () => {
    const token = process.env.VITE_MAPBOX_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
    expect(token!.startsWith("pk.")).toBe(true);
  });

  it("should be accepted by the Mapbox API", async () => {
    const token = process.env.VITE_MAPBOX_TOKEN;
    // Hit the Mapbox geocoding API with a simple query to validate the token
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/Dallas.json?access_token=${token}&limit=1`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.features).toBeDefined();
    expect(data.features.length).toBeGreaterThan(0);
  });
});
