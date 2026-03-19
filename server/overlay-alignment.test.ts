/**
 * Tests for MapboxOverlayView alignment helpers
 * - parseCoords
 * - centroid
 * - rotatePoint
 * - applyRotation
 * - topCenter
 * - calculateTwoPointTransform
 */
import { describe, it, expect } from "vitest";

// We import the pure helper functions from the client component.
// They are exported and have zero DOM/React dependencies.
import {
  parseCoords,
  centroid,
  rotatePoint,
  applyRotation,
  topCenter,
  calculateTwoPointTransform,
} from "../client/src/components/MapboxOverlayView";

describe("parseCoords", () => {
  it("parses a JSON string with 4 coordinate pairs", () => {
    const raw = '[[-96.8, 32.78], [-96.79, 32.78], [-96.79, 32.77], [-96.8, 32.77]]';
    const result = parseCoords(raw);
    expect(result).toHaveLength(4);
    expect(result![0]).toEqual([-96.8, 32.78]);
  });

  it("parses an already-parsed array", () => {
    const arr = [[-96.8, 32.78], [-96.79, 32.78], [-96.79, 32.77], [-96.8, 32.77]];
    const result = parseCoords(arr);
    expect(result).toHaveLength(4);
  });

  it("returns null for invalid input", () => {
    expect(parseCoords("not json")).toBeNull();
    expect(parseCoords("[]")).toBeNull();
    expect(parseCoords([[1, 2]])).toBeNull(); // only 1 point
  });

  it("returns null for empty string", () => {
    expect(parseCoords("")).toBeNull();
  });
});

describe("centroid", () => {
  it("computes the center of a rectangle", () => {
    const pts: [number, number][] = [
      [-96.8, 32.78],
      [-96.79, 32.78],
      [-96.79, 32.77],
      [-96.8, 32.77],
    ];
    const c = centroid(pts);
    expect(c[0]).toBeCloseTo(-96.795, 4);
    expect(c[1]).toBeCloseTo(32.775, 4);
  });

  it("handles a single point", () => {
    const c = centroid([[10, 20]]);
    expect(c).toEqual([10, 20]);
  });
});

describe("rotatePoint", () => {
  it("rotates a point 90° around origin", () => {
    const result = rotatePoint([1, 0], [0, 0], 90);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(1, 5);
  });

  it("rotates a point 180° around origin", () => {
    const result = rotatePoint([1, 0], [0, 0], 180);
    expect(result[0]).toBeCloseTo(-1, 5);
    expect(result[1]).toBeCloseTo(0, 5);
  });

  it("rotates a point 0° (no change)", () => {
    const result = rotatePoint([5, 3], [0, 0], 0);
    expect(result[0]).toBeCloseTo(5, 5);
    expect(result[1]).toBeCloseTo(3, 5);
  });

  it("rotates around a non-origin pivot", () => {
    // Rotate (2,0) around (1,0) by 90° → should give (1,1)
    const result = rotatePoint([2, 0], [1, 0], 90);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(1, 5);
  });
});

describe("applyRotation", () => {
  it("rotates all 4 corners by 0° (no change)", () => {
    const corners: [number, number][] = [
      [0, 1], [1, 1], [1, 0], [0, 0],
    ];
    const rotated = applyRotation(corners, 0);
    rotated.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(corners[i][0], 5);
      expect(pt[1]).toBeCloseTo(corners[i][1], 5);
    });
  });

  it("rotates all 4 corners by 360° (back to original)", () => {
    const corners: [number, number][] = [
      [-96.8, 32.78], [-96.79, 32.78], [-96.79, 32.77], [-96.8, 32.77],
    ];
    const rotated = applyRotation(corners, 360);
    rotated.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(corners[i][0], 5);
      expect(pt[1]).toBeCloseTo(corners[i][1], 5);
    });
  });

  it("preserves centroid after rotation", () => {
    const corners: [number, number][] = [
      [0, 2], [2, 2], [2, 0], [0, 0],
    ];
    const rotated = applyRotation(corners, 45);
    const c1 = centroid(corners);
    const c2 = centroid(rotated);
    expect(c2[0]).toBeCloseTo(c1[0], 5);
    expect(c2[1]).toBeCloseTo(c1[1], 5);
  });
});

describe("topCenter", () => {
  it("returns the midpoint above TL-TR edge", () => {
    const corners: [number, number][] = [
      [-96.8, 32.78],   // TL
      [-96.79, 32.78],  // TR
      [-96.79, 32.77],  // BR
      [-96.8, 32.77],   // BL
    ];
    const tc = topCenter(corners);
    expect(tc[0]).toBeCloseTo(-96.795, 4); // midpoint lng
    expect(tc[1]).toBeGreaterThan(32.78);   // above the top edge
  });
});

describe("calculateTwoPointTransform", () => {
  it("translates overlay when both anchors map to same-distance targets", () => {
    const coords: [number, number][] = [
      [0, 1], [1, 1], [1, 0], [0, 0],
    ];
    // Shift everything by +10 in lng, +5 in lat
    const result = calculateTwoPointTransform(
      { lng: 0, lat: 0 },   // anchorA on plan
      { lng: 10, lat: 5 },  // targetA on map
      { lng: 1, lat: 0 },   // anchorB on plan
      { lng: 11, lat: 5 },  // targetB on map (same distance, same angle → pure translation)
      coords
    );
    expect(result[0][0]).toBeCloseTo(10, 5);
    expect(result[0][1]).toBeCloseTo(6, 5);
    expect(result[3][0]).toBeCloseTo(10, 5);
    expect(result[3][1]).toBeCloseTo(5, 5);
  });

  it("scales overlay by 2x when target distance is double", () => {
    const coords: [number, number][] = [
      [0, 1], [1, 1], [1, 0], [0, 0],
    ];
    // anchorA at origin, anchorB at (1,0)
    // targetA at origin, targetB at (2,0) → 2x scale, no rotation
    const result = calculateTwoPointTransform(
      { lng: 0, lat: 0 },
      { lng: 0, lat: 0 },
      { lng: 1, lat: 0 },
      { lng: 2, lat: 0 },
      coords
    );
    // BL stays at origin (anchorA = targetA = origin)
    expect(result[3][0]).toBeCloseTo(0, 5);
    expect(result[3][1]).toBeCloseTo(0, 5);
    // TR should be at (2, 2) — doubled
    expect(result[1][0]).toBeCloseTo(2, 5);
    expect(result[1][1]).toBeCloseTo(2, 5);
  });

  it("rotates overlay 90° when target vector is perpendicular", () => {
    const coords: [number, number][] = [
      [0, 1], [1, 1], [1, 0], [0, 0],
    ];
    // anchorA at origin, anchorB at (1,0) → horizontal
    // targetA at origin, targetB at (0,1) → vertical → 90° rotation
    const result = calculateTwoPointTransform(
      { lng: 0, lat: 0 },
      { lng: 0, lat: 0 },
      { lng: 1, lat: 0 },
      { lng: 0, lat: 1 },
      coords
    );
    // Original TL (0,1) → rotated 90° around origin → (-1, 0)
    expect(result[0][0]).toBeCloseTo(-1, 5);
    expect(result[0][1]).toBeCloseTo(0, 5);
    // Original TR (1,1) → rotated 90° → (-1, 1)
    expect(result[1][0]).toBeCloseTo(-1, 5);
    expect(result[1][1]).toBeCloseTo(1, 5);
  });

  it("returns original coords when plan distance is zero (degenerate)", () => {
    const coords: [number, number][] = [
      [0, 1], [1, 1], [1, 0], [0, 0],
    ];
    const result = calculateTwoPointTransform(
      { lng: 5, lat: 5 },
      { lng: 10, lat: 10 },
      { lng: 5, lat: 5 }, // same as anchorA → zero distance
      { lng: 20, lat: 20 },
      coords
    );
    // Should return original coords unchanged
    result.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(coords[i][0], 5);
      expect(pt[1]).toBeCloseTo(coords[i][1], 5);
    });
  });
});
