/**
 * Watermark Service
 * Applies watermarks to images using Sharp
 */

import sharp from "sharp";

export interface WatermarkOptions {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
  opacity: number; // 0-100
  scale: number; // Percentage of image width for watermark (5-50)
  padding: number; // Padding from edges in pixels
}

const DEFAULT_OPTIONS: WatermarkOptions = {
  position: "top-left",
  opacity: 70,
  scale: 15,
  padding: 20,
};

/**
 * Apply a watermark to an image
 * @param imageBuffer - The original image buffer
 * @param watermarkBuffer - The watermark image buffer (PNG with transparency recommended)
 * @param options - Watermark positioning and styling options
 * @returns Buffer of the watermarked image
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  watermarkBuffer: Buffer,
  options: Partial<WatermarkOptions> = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get original image metadata
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions");
  }

  // Calculate watermark size based on scale percentage
  const watermarkWidth = Math.round((metadata.width * opts.scale) / 100);

  // Resize watermark to target width while maintaining aspect ratio
  const resizedWatermark = await sharp(watermarkBuffer)
    .resize(watermarkWidth, null, { fit: "inside" })
    .toBuffer();

  // Get resized watermark dimensions
  const watermarkMeta = await sharp(resizedWatermark).metadata();
  const wmWidth = watermarkMeta.width || watermarkWidth;
  const wmHeight = watermarkMeta.height || watermarkWidth;

  // Calculate position with extra padding for corners to prevent cutoff
  let left: number;
  let top: number;
  // Use larger padding for corners to ensure watermark stays within bounds
  const cornerPadding = Math.max(opts.padding, Math.ceil(wmWidth * 0.15) + 10);

  switch (opts.position) {
    case "top-left":
      left = cornerPadding;
      top = cornerPadding;
      break;
    case "top-right":
      left = metadata.width - wmWidth - cornerPadding;
      top = cornerPadding;
      break;
    case "bottom-left":
      left = cornerPadding;
      top = metadata.height - wmHeight - cornerPadding;
      break;
    case "bottom-right":
      left = metadata.width - wmWidth - cornerPadding;
      top = metadata.height - wmHeight - cornerPadding;
      break;
    case "center":
      left = Math.round((metadata.width - wmWidth) / 2);
      top = Math.round((metadata.height - wmHeight) / 2);
      break;
    default:
      left = metadata.width - wmWidth - opts.padding;
      top = metadata.height - wmHeight - opts.padding;
  }

  // Apply opacity to watermark
  const watermarkWithOpacity = await sharp(resizedWatermark)
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round((opts.opacity / 100) * 255)]),
        raw: {
          width: 1,
          height: 1,
          channels: 4,
        },
        tile: true,
        blend: "dest-in",
      },
    ])
    .toBuffer();

  // Composite watermark onto image
  const result = await image
    .composite([
      {
        input: watermarkWithOpacity,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .toBuffer();

  return result;
}

/**
 * Create a text-based watermark
 * @param text - Text to use as watermark
 * @param options - Text styling options
 * @returns Buffer of the text watermark as PNG
 */
export async function createTextWatermark(
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    fontFamily?: string;
  } = {}
): Promise<Buffer> {
  const fontSize = options.fontSize || 48;
  const color = options.color || "rgba(255, 255, 255, 0.8)";
  const fontFamily = options.fontFamily || "Arial, sans-serif";

  // Create SVG text
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="${fontSize}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        fill="${color}"
        font-weight="bold"
      >${text}</text>
    </svg>
  `;

  // Convert SVG to PNG
  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return buffer;
}

/**
 * Batch apply watermark to multiple images
 * @param images - Array of image buffers
 * @param watermarkBuffer - The watermark image buffer
 * @param options - Watermark options
 * @returns Array of watermarked image buffers
 */
export async function batchApplyWatermark(
  images: Buffer[],
  watermarkBuffer: Buffer,
  options: Partial<WatermarkOptions> = {}
): Promise<Buffer[]> {
  const results = await Promise.all(
    images.map((img) => applyWatermark(img, watermarkBuffer, options))
  );
  return results;
}


/**
 * Generate a thumbnail from an image buffer
 * @param imageBuffer - The source image buffer
 * @param maxWidth - Maximum width of the thumbnail (default 400)
 * @returns Buffer of the thumbnail image
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  maxWidth: number = 400
): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(maxWidth, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70, progressive: true, mozjpeg: true })
    .toBuffer();
}
