import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getMediaById, getMediaDownloadUrl } from "./media-helpers";
import { generatePresignedDownloadUrl } from "./s3-helpers";
import { TRPCError } from "@trpc/server";

/**
 * Media download router with presigned URL support
 */
export const mediaDownloadRouter = router({
  /**
   * Get presigned download URL for high-resolution media
   */
  getHighResDownloadUrl: protectedProcedure
    .input(
      z.object({
        mediaId: z.number(),
        expiresIn: z.number().optional().default(3600), // 1 hour default
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);

        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        if (!mediaItem.highResKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "High-resolution version not available",
          });
        }

        const presignedUrl = await generatePresignedDownloadUrl(
          mediaItem.highResKey,
          input.expiresIn
        );

        return {
          url: presignedUrl,
          filename: mediaItem.filename,
          fileSize: mediaItem.highResFileSize,
          expiresIn: input.expiresIn,
          expiresAt: new Date(Date.now() + input.expiresIn * 1000),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to generate download URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download link",
        });
      }
    }),

  /**
   * Get presigned download URL for thumbnail
   */
  getThumbnailDownloadUrl: publicProcedure
    .input(
      z.object({
        mediaId: z.number(),
        expiresIn: z.number().optional().default(86400), // 24 hours for thumbnails
      })
    )
    .query(async ({ input }) => {
      try {
        const mediaItem = await getMediaById(input.mediaId);

        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        if (!mediaItem.thumbnailKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Thumbnail not available",
          });
        }

        const presignedUrl = await generatePresignedDownloadUrl(
          mediaItem.thumbnailKey,
          input.expiresIn
        );

        return {
          url: presignedUrl,
          filename: `thumbnail-${mediaItem.filename}`,
          expiresIn: input.expiresIn,
          expiresAt: new Date(Date.now() + input.expiresIn * 1000),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to generate thumbnail URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate thumbnail link",
        });
      }
    }),

  /**
   * Get media metadata for viewer
   */
  getMediaMetadata: publicProcedure
    .input(z.object({ mediaId: z.number() }))
    .query(async ({ input }) => {
      try {
        const mediaItem = await getMediaById(input.mediaId);

        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        return {
          id: mediaItem.id,
          filename: mediaItem.filename,
          mediaType: mediaItem.mediaType,
          originalWidth: mediaItem.originalWidth,
          originalHeight: mediaItem.originalHeight,
          thumbnailUrl: mediaItem.thumbnailUrl,
          url: mediaItem.url,
          capturedAt: mediaItem.capturedAt,
          cameraMake: mediaItem.cameraMake,
          cameraModel: mediaItem.cameraModel,
          altitude: mediaItem.altitude,
          latitude: mediaItem.latitude,
          longitude: mediaItem.longitude,
          hasHighRes: !!mediaItem.highResUrl,
          highResFileSize: mediaItem.highResFileSize,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to get media metadata:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load media metadata",
        });
      }
    }),

  /**
   * Batch get presigned URLs for multiple media items
   */
  getBatchDownloadUrls: protectedProcedure
    .input(
      z.object({
        mediaIds: z.array(z.number()),
        expiresIn: z.number().optional().default(3600),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const results: Array<{
          mediaId: number;
          url?: string;
          error?: string;
        }> = [];

        for (const mediaId of input.mediaIds) {
          try {
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem || !mediaItem.highResKey) {
              results.push({
                mediaId,
                error: "High-resolution version not available",
              });
              continue;
            }

            const presignedUrl = await generatePresignedDownloadUrl(
              mediaItem.highResKey,
              input.expiresIn
            );

            results.push({
              mediaId,
              url: presignedUrl,
            });
          } catch (error) {
            results.push({
              mediaId,
              error: "Failed to generate download URL",
            });
          }
        }

        return results;
      } catch (error) {
        console.error("Failed to generate batch URLs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download links",
        });
      }
    }),
});
