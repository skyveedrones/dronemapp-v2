/**
 * Tests for gallery performance utilities and GPS data watcher logic
 */
import { describe, it, expect } from "vitest";

// ── Cloudinary thumbnail helper (mirrored from client for testability) ─────────
function cloudinaryGalleryThumb(url: string): string {
  if (!url) return url;
  const match = url.match(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.*)$/
  );
  if (!match) return url;
  const [, base, , rest] = match;
  const stripped = rest.replace(/^([a-z][a-z0-9]*_[^/,]+)(,[a-z][a-z0-9]*_[^/,]+)*\//, "");
  return `${base}w_400,h_400,c_fill,q_auto,f_auto/${stripped}`;
}

// ── GPS data watcher key builder (mirrors component logic) ─────────────────────
function buildMarkerKey(mediaIds: number[]): string {
  return mediaIds.join(",");
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("cloudinaryGalleryThumb", () => {
  it("inserts w_400,h_400,c_fill,q_auto,f_auto transform into image URL", () => {
    const input =
      "https://res.cloudinary.com/mycloud/image/upload/v1234567890/projects/photo.jpg";
    const result = cloudinaryGalleryThumb(input);
    expect(result).toContain("w_400,h_400,c_fill,q_auto,f_auto");
    expect(result).toContain("projects/photo.jpg");
  });

  it("inserts transform into video URL", () => {
    const input =
      "https://res.cloudinary.com/mycloud/video/upload/v1234567890/projects/clip.mp4";
    const result = cloudinaryGalleryThumb(input);
    expect(result).toContain("w_400,h_400,c_fill,q_auto,f_auto");
  });

  it("strips existing transformation segment before inserting new one", () => {
    const input =
      "https://res.cloudinary.com/mycloud/image/upload/w_300,h_200,c_fill/v1234567890/photo.jpg";
    const result = cloudinaryGalleryThumb(input);
    // Should not have duplicate transforms
    const transformCount = (result.match(/w_/g) || []).length;
    expect(transformCount).toBe(1);
    expect(result).toContain("w_400,h_400,c_fill,q_auto,f_auto");
  });

  it("returns non-Cloudinary URLs unchanged", () => {
    const s3Url = "https://mybucket.s3.amazonaws.com/photo.jpg";
    expect(cloudinaryGalleryThumb(s3Url)).toBe(s3Url);
  });

  it("returns empty string unchanged", () => {
    expect(cloudinaryGalleryThumb("")).toBe("");
  });
});

describe("GPS data watcher key builder", () => {
  it("produces stable key for same IDs", () => {
    const ids = [1, 2, 3, 4, 5];
    expect(buildMarkerKey(ids)).toBe("1,2,3,4,5");
    expect(buildMarkerKey(ids)).toBe(buildMarkerKey(ids));
  });

  it("produces different key when IDs change", () => {
    const key1 = buildMarkerKey([1, 2, 3]);
    const key2 = buildMarkerKey([1, 2, 4]);
    expect(key1).not.toBe(key2);
  });

  it("produces empty string for empty array", () => {
    expect(buildMarkerKey([])).toBe("");
  });

  it("detects new media arriving after initial empty state", () => {
    const emptyKey = buildMarkerKey([]);
    const loadedKey = buildMarkerKey([10, 11, 12]);
    // The data watcher checks: if newKey === markersRenderedForRef.current, skip
    // Empty vs loaded should always trigger a re-render
    expect(emptyKey).not.toBe(loadedKey);
  });
});
