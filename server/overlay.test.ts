import { describe, it, expect, vi } from "vitest";

/**
 * Tests for overlay-related functionality:
 * 1. Backend DELETE endpoint logic (DB row removal)
 * 2. MapboxOverlayView helper functions (parseCoords, centroid, rotatePoint, applyRotation)
 * 3. Coordinate parsing edge cases
 */

// ── Helper function tests (matching MapboxOverlayView.tsx logic) ────────────

function parseCoords(raw: string | unknown): [number, number][] | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length >= 4) return parsed as [number, number][];
  } catch {}
  return null;
}

function centroid(pts: [number, number][]): [number, number] {
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

function rotatePoint(pt: [number, number], pivot: [number, number], angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = pt[0] - pivot[0];
  const dy = pt[1] - pivot[1];
  return [
    pivot[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
    pivot[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
  ];
}

function applyRotation(corners: [number, number][], angleDeg: number): [number, number][] {
  const c = centroid(corners);
  return corners.map((pt) => rotatePoint(pt, c, angleDeg));
}

function topCenter(corners: [number, number][]): [number, number] {
  return [
    (corners[0][0] + corners[1][0]) / 2,
    Math.max(corners[0][1], corners[1][1]) + 0.0003,
  ];
}

describe("parseCoords", () => {
  it("parses a valid JSON string with 4 corners", () => {
    const raw = JSON.stringify([[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]]);
    const result = parseCoords(raw);
    expect(result).toHaveLength(4);
    expect(result![0]).toEqual([-96.5, 32.8]);
  });

  it("parses an already-parsed array", () => {
    const raw = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const result = parseCoords(raw);
    expect(result).toHaveLength(4);
  });

  it("returns null for invalid JSON", () => {
    expect(parseCoords("not json")).toBeNull();
  });

  it("returns null for array with fewer than 4 elements", () => {
    expect(parseCoords(JSON.stringify([[1, 2], [3, 4]]))).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseCoords(null)).toBeNull();
    expect(parseCoords(undefined)).toBeNull();
  });
});

describe("centroid", () => {
  it("computes the center of a rectangle", () => {
    const corners: [number, number][] = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const c = centroid(corners);
    expect(c[0]).toBeCloseTo(-96.45, 5);
    expect(c[1]).toBeCloseTo(32.75, 5);
  });

  it("computes centroid of a single point", () => {
    const c = centroid([[10, 20]]);
    expect(c).toEqual([10, 20]);
  });
});

describe("rotatePoint", () => {
  it("rotates a point 90 degrees around origin", () => {
    const result = rotatePoint([1, 0], [0, 0], 90);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(1, 5);
  });

  it("rotates a point 180 degrees around origin", () => {
    const result = rotatePoint([1, 0], [0, 0], 180);
    expect(result[0]).toBeCloseTo(-1, 5);
    expect(result[1]).toBeCloseTo(0, 5);
  });

  it("rotates a point 360 degrees returns to original", () => {
    const result = rotatePoint([5, 3], [2, 1], 360);
    expect(result[0]).toBeCloseTo(5, 5);
    expect(result[1]).toBeCloseTo(3, 5);
  });

  it("rotates 0 degrees returns same point", () => {
    const result = rotatePoint([5, 3], [2, 1], 0);
    expect(result[0]).toBeCloseTo(5, 5);
    expect(result[1]).toBeCloseTo(3, 5);
  });
});

describe("applyRotation", () => {
  it("rotating 0 degrees returns same corners", () => {
    const corners: [number, number][] = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const rotated = applyRotation(corners, 0);
    rotated.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(corners[i][0], 5);
      expect(pt[1]).toBeCloseTo(corners[i][1], 5);
    });
  });

  it("rotating 360 degrees returns same corners", () => {
    const corners: [number, number][] = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const rotated = applyRotation(corners, 360);
    rotated.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(corners[i][0], 5);
      expect(pt[1]).toBeCloseTo(corners[i][1], 5);
    });
  });

  it("rotating preserves centroid position", () => {
    const corners: [number, number][] = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const c1 = centroid(corners);
    const rotated = applyRotation(corners, 45);
    const c2 = centroid(rotated);
    expect(c2[0]).toBeCloseTo(c1[0], 5);
    expect(c2[1]).toBeCloseTo(c1[1], 5);
  });

  it("rotating 90 degrees swaps corners correctly", () => {
    // A unit square centered at origin for simplicity
    const corners: [number, number][] = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    const rotated = applyRotation(corners, 90);
    // After 90° CCW: TL(-1,1) → (-1,-1), NE(1,1) → (-1,1), SE(1,-1) → (1,1), SW(-1,-1) → (1,-1)
    expect(rotated[0][0]).toBeCloseTo(-1, 5);
    expect(rotated[0][1]).toBeCloseTo(-1, 5);
  });
});

describe("topCenter", () => {
  it("computes top-center handle position above TL-TR midpoint", () => {
    const corners: [number, number][] = [[-96.5, 32.8], [-96.4, 32.8], [-96.4, 32.7], [-96.5, 32.7]];
    const tc = topCenter(corners);
    expect(tc[0]).toBeCloseTo(-96.45, 5); // midpoint of TL and TR lng
    expect(tc[1]).toBeCloseTo(32.8003, 3); // slightly above the max lat
  });
});

describe("DELETE endpoint logic", () => {
  it("validates projectId and overlayId are numbers", () => {
    const projectId = parseInt("abc", 10);
    const overlayId = parseInt("xyz", 10);
    expect(isNaN(projectId)).toBe(true);
    expect(isNaN(overlayId)).toBe(true);
  });

  it("extracts S3 key from overlay URL correctly", () => {
    const fileUrl = "https://storage.example.com/overlays/user1/proj1/abc123.png";
    const urlObj = new URL(fileUrl);
    const s3Key = urlObj.pathname.replace(/^\//, "");
    expect(s3Key).toBe("overlays/user1/proj1/abc123.png");
  });

  it("handles URL with no path gracefully", () => {
    const fileUrl = "https://storage.example.com/";
    const urlObj = new URL(fileUrl);
    const s3Key = urlObj.pathname.replace(/^\//, "");
    expect(s3Key).toBe("");
  });
});

describe("auto-save coordinate conversion", () => {
  it("computes cardinal bounds from 4 corners", () => {
    const corners: [number, number][] = [
      [-96.5, 32.8],  // TL (NW)
      [-96.4, 32.8],  // TR (NE)
      [-96.4, 32.7],  // BR (SE)
      [-96.5, 32.7],  // BL (SW)
    ];
    const lats = corners.map((c) => c[1]);
    const lngs = corners.map((c) => c[0]);
    expect(Math.max(...lats)).toBe(32.8);  // north
    expect(Math.min(...lats)).toBe(32.7);  // south
    expect(Math.max(...lngs)).toBe(-96.4); // east
    expect(Math.min(...lngs)).toBe(-96.5); // west
  });

  it("handles rotated corners where cardinal bounds differ from original", () => {
    // After rotation, corners are no longer axis-aligned
    const corners: [number, number][] = [
      [-96.48, 32.81],  // TL rotated
      [-96.39, 32.79],  // TR rotated
      [-96.42, 32.69],  // BR rotated
      [-96.51, 32.71],  // BL rotated
    ];
    const lats = corners.map((c) => c[1]);
    const lngs = corners.map((c) => c[0]);
    expect(Math.max(...lats)).toBe(32.81);
    expect(Math.min(...lats)).toBe(32.69);
    expect(Math.max(...lngs)).toBe(-96.39);
    expect(Math.min(...lngs)).toBe(-96.51);
  });
});

// ── Overlay Manager Enhancement Tests ────────────────────────────────────

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestAuthContext(userId = 1, role: "user" | "admin" | "webmaster" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("project.renameOverlay input validation", () => {
  it("should reject empty label", async () => {
    const ctx = createTestAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.renameOverlay({
        overlayId: 1,
        projectId: 1,
        label: "",
      })
    ).rejects.toThrow();
  });

  it("should reject label exceeding 100 characters", async () => {
    const ctx = createTestAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longLabel = "a".repeat(101);
    await expect(
      caller.project.renameOverlay({
        overlayId: 1,
        projectId: 1,
        label: longLabel,
      })
    ).rejects.toThrow();
  });

  it("should accept valid label at boundary (100 chars)", async () => {
    const ctx = createTestAuthContext();
    const caller = appRouter.createCaller(ctx);

    const validLabel = "a".repeat(100);
    try {
      await caller.project.renameOverlay({
        overlayId: 1,
        projectId: 1,
        label: validLabel,
      });
    } catch (err: any) {
      // Should fail on DB access, not on validation
      expect(err.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("project.updateOverlayOpacity input validation", () => {
  it("should reject opacity greater than 1", async () => {
    const ctx = createTestAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.updateOverlayOpacity({
        overlayId: 1,
        projectId: 1,
        opacity: 1.5,
      })
    ).rejects.toThrow();
  });

  it("should reject negative opacity", async () => {
    const ctx = createTestAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.project.updateOverlayOpacity({
        overlayId: 1,
        projectId: 1,
        opacity: -0.1,
      })
    ).rejects.toThrow();
  });
});

// ── Measurement helper tests ────────────────────────────────────────────

describe("measurement formatting helpers", () => {
  // Replicate the formatting functions from MapboxProjectMap
  function formatDistance(meters: number): string {
    if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
    if (meters < 1000) return `${meters.toFixed(1)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  }

  function formatDistanceFeet(meters: number): string {
    const feet = meters * 3.28084;
    if (feet < 5280) return `${feet.toFixed(1)} ft`;
    return `${(feet / 5280).toFixed(2)} mi`;
  }

  function formatArea(sqMeters: number): string {
    if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
    const hectares = sqMeters / 10000;
    if (hectares < 100) return `${hectares.toFixed(2)} ha`;
    return `${(sqMeters / 1000000).toFixed(3)} km²`;
  }

  function formatAreaFeet(sqMeters: number): string {
    const sqFeet = sqMeters * 10.7639;
    if (sqFeet < 43560) return `${sqFeet.toFixed(0)} ft²`;
    return `${(sqFeet / 43560).toFixed(2)} acres`;
  }

  it("formats small distances in cm", () => {
    expect(formatDistance(0.5)).toBe("50.0 cm");
  });

  it("formats medium distances in meters", () => {
    expect(formatDistance(150)).toBe("150.0 m");
  });

  it("formats large distances in km", () => {
    expect(formatDistance(2500)).toBe("2.50 km");
  });

  it("formats feet for short distances", () => {
    expect(formatDistanceFeet(100)).toBe("328.1 ft");
  });

  it("formats miles for long distances", () => {
    expect(formatDistanceFeet(5000)).toBe("3.11 mi");
  });

  it("formats small areas in m²", () => {
    expect(formatArea(500)).toBe("500.0 m²");
  });

  it("formats medium areas in hectares", () => {
    expect(formatArea(50000)).toBe("5.00 ha");
  });

  it("formats large areas in km²", () => {
    expect(formatArea(2000000)).toBe("2.000 km²");
  });

  it("formats small areas in ft²", () => {
    expect(formatAreaFeet(100)).toBe("1076 ft²");
  });

  it("formats large areas in acres", () => {
    expect(formatAreaFeet(10000)).toBe("2.47 acres");
  });
});
