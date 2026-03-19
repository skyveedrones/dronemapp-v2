/**
 * Video Watermark Service
 * Applies watermarks to videos using FFmpeg
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { nanoid } from "nanoid";

export interface VideoWatermarkOptions {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
  opacity: number; // 0-100
  scale: number; // Percentage of video width for watermark (5-50)
  padding: number; // Padding from edges in pixels
}

const DEFAULT_OPTIONS: VideoWatermarkOptions = {
  position: "top-left",
  opacity: 70,
  scale: 15,
  padding: 20,
};

/**
 * Get FFmpeg overlay position string based on position option
 */
function getOverlayPosition(
  position: VideoWatermarkOptions["position"],
  padding: number
): string {
  switch (position) {
    case "top-left":
      return `${padding}:${padding}`;
    case "top-right":
      return `main_w-overlay_w-${padding}:${padding}`;
    case "bottom-left":
      return `${padding}:main_h-overlay_h-${padding}`;
    case "bottom-right":
      return `main_w-overlay_w-${padding}:main_h-overlay_h-${padding}`;
    case "center":
      return "(main_w-overlay_w)/2:(main_h-overlay_h)/2";
    default:
      return `${padding}:${padding}`;
  }
}

/**
 * Apply a watermark to a video file
 * @param videoPath - Path to the input video file
 * @param watermarkPath - Path to the watermark image file (PNG with transparency recommended)
 * @param outputPath - Path for the output video file
 * @param options - Watermark positioning and styling options
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise that resolves when watermarking is complete
 */
export async function applyVideoWatermark(
  videoPath: string,
  watermarkPath: string,
  outputPath: string,
  options: Partial<VideoWatermarkOptions> = {},
  onProgress?: (percent: number) => void
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    // Get video metadata first to calculate watermark size
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      if (!videoStream || !videoStream.width) {
        reject(new Error("Could not determine video dimensions"));
        return;
      }

      const videoWidth = videoStream.width;
      const watermarkWidth = Math.round((videoWidth * opts.scale) / 100);
      const overlayPosition = getOverlayPosition(opts.position, opts.padding);
      const opacityValue = opts.opacity / 100;

      // Build the filter complex string
      // Scale watermark, apply opacity, then overlay on video
      const filterComplex = [
        `[1:v]scale=${watermarkWidth}:-1,format=rgba,colorchannelmixer=aa=${opacityValue}[wm]`,
        `[0:v][wm]overlay=${overlayPosition}[outv]`,
      ].join(";");

      const command = ffmpeg(videoPath)
        .input(watermarkPath)
        .complexFilter(filterComplex)
        .outputOptions([
          "-map", "[outv]",
          "-map", "0:a?", // Include audio if present
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
        ])
        .output(outputPath);

      // Track progress
      if (onProgress) {
        command.on("progress", (progress) => {
          if (progress.percent) {
            onProgress(Math.min(100, Math.round(progress.percent)));
          }
        });
      }

      command
        .on("end", () => {
          console.log(`[VideoWatermark] Successfully watermarked video: ${outputPath}`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`[VideoWatermark] Error watermarking video:`, err);
          reject(new Error(`Failed to watermark video: ${err.message}`));
        })
        .run();
    });
  });
}

/**
 * Apply watermark to a video from buffers
 * @param videoBuffer - The video file as a buffer
 * @param watermarkBuffer - The watermark image as a buffer
 * @param options - Watermark options
 * @param onProgress - Optional progress callback
 * @returns Buffer of the watermarked video
 */
export async function applyVideoWatermarkFromBuffers(
  videoBuffer: Buffer,
  watermarkBuffer: Buffer,
  options: Partial<VideoWatermarkOptions> = {},
  onProgress?: (percent: number) => void
): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const uniqueId = nanoid(12);
  const inputPath = path.join(tempDir, `input_${uniqueId}.mp4`);
  const watermarkPath = path.join(tempDir, `watermark_${uniqueId}.png`);
  const outputPath = path.join(tempDir, `output_${uniqueId}.mp4`);

  try {
    // Write buffers to temp files
    await fs.promises.writeFile(inputPath, videoBuffer);
    await fs.promises.writeFile(watermarkPath, watermarkBuffer);

    // Apply watermark
    await applyVideoWatermark(inputPath, watermarkPath, outputPath, options, onProgress);

    // Read output file
    const outputBuffer = await fs.promises.readFile(outputPath);

    return outputBuffer;
  } finally {
    // Cleanup temp files
    try {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.unlink(watermarkPath).catch(() => {});
      await fs.promises.unlink(outputPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Get video duration from buffer
 */
export async function getVideoDurationFromBuffer(videoBuffer: Buffer): Promise<number> {
  const tempDir = os.tmpdir();
  const uniqueId = nanoid(12);
  const tempPath = path.join(tempDir, `probe_${uniqueId}.mp4`);

  try {
    await fs.promises.writeFile(tempPath, videoBuffer);
    return await getVideoDuration(tempPath);
  } finally {
    await fs.promises.unlink(tempPath).catch(() => {});
  }
}

/**
 * Estimate processing time based on video duration
 * @param durationSeconds - Video duration in seconds
 * @returns Estimated processing time in seconds
 */
export function estimateProcessingTime(durationSeconds: number): number {
  // Rough estimate: processing takes about 0.5-2x the video duration
  // depending on resolution and complexity
  return Math.ceil(durationSeconds * 1.5);
}
