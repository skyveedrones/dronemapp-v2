import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock sharp module
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    resize: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-image-data")),
  }));
  return { default: mockSharp };
});

import { applyWatermark, createTextWatermark, batchApplyWatermark, generateThumbnail } from "./watermark";

describe("watermark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyWatermark", () => {
    it("should apply watermark with default options", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      const result = await applyWatermark(imageBuffer, watermarkBuffer);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should apply watermark with custom position", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      const positions = ["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const;

      for (const position of positions) {
        const result = await applyWatermark(imageBuffer, watermarkBuffer, { position });
        expect(result).toBeInstanceOf(Buffer);
      }
    });

    it("should apply watermark with custom opacity", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      const result = await applyWatermark(imageBuffer, watermarkBuffer, { opacity: 50 });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should apply watermark with custom scale", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      const result = await applyWatermark(imageBuffer, watermarkBuffer, { scale: 25 });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("createTextWatermark", () => {
    it("should create text watermark with default options", async () => {
      const result = await createTextWatermark("SkyVee");

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should create text watermark with custom options", async () => {
      const result = await createTextWatermark("SkyVee", {
        fontSize: 72,
        color: "rgba(0, 0, 0, 0.5)",
        fontFamily: "Helvetica",
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("batchApplyWatermark", () => {
    it("should apply watermark to multiple images", async () => {
      const images = [
        Buffer.from("image1"),
        Buffer.from("image2"),
        Buffer.from("image3"),
      ];
      const watermarkBuffer = Buffer.from("test-watermark");

      const results = await batchApplyWatermark(images, watermarkBuffer);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeInstanceOf(Buffer);
      });
    });

    it("should apply watermark with custom options to all images", async () => {
      const images = [Buffer.from("image1"), Buffer.from("image2")];
      const watermarkBuffer = Buffer.from("test-watermark");

      const results = await batchApplyWatermark(images, watermarkBuffer, {
        position: "center",
        opacity: 80,
        scale: 20,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe("generateThumbnail", () => {
    it("should generate thumbnail with default width", async () => {
      const imageBuffer = Buffer.from("test-image");

      const result = await generateThumbnail(imageBuffer);

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should generate thumbnail with custom width", async () => {
      const imageBuffer = Buffer.from("test-image");

      const result = await generateThumbnail(imageBuffer, 200);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("watermark options validation", () => {
    it("should use default options when none provided", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      // This should not throw
      const result = await applyWatermark(imageBuffer, watermarkBuffer, {});

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should merge custom options with defaults", async () => {
      const imageBuffer = Buffer.from("test-image");
      const watermarkBuffer = Buffer.from("test-watermark");

      // Only provide partial options
      const result = await applyWatermark(imageBuffer, watermarkBuffer, {
        position: "top-left",
        // opacity and scale should use defaults
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
