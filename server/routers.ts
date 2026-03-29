import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import ExifParser from "exif-parser";
import { nanoid } from "nanoid";
import { z } from "zod";
// Temporary Mock for missing plan features file
const PLAN_FEATURES = {
  free: { maxProjects: 3, maxFlights: 10 },
  pro: { maxProjects: 25, maxFlights: 100 },
  enterprise: { maxProjects: 999, maxFlights: 999 },
};
import { PLAN_LIMITS } from "./planLimits";
import { getDb } from "./db";
import { media, clientUsers, clients, projectOverlays, users, projectCollaborators, projects, referrals, organizations } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  acceptProjectInvitation,
  addProjectCollaborator,
  assignMediaToFlight,
  createFlight,
  createMedia,
  createProject,
  createProjectInvitation,
  deleteFlight,
  deleteMedia,
  deleteProject,
  getFlightById,
  getFlightMedia,
  getInvitationByToken,
  getMediaById,
  getMediaByFlight,
  getProjectById,
  getProjectCollaborators,
  getProjectFlights,
  getProjectInvitations,
  getProjectMedia,
  getProjectMediaWithAccess,
  getProjectUnassignedMedia,
  getProjectWithAccess,
  getUserAccessibleProjects,
  getUserById,
  getUserByEmail,
  getUserFlight,
  getUserProject,
  getUserProjectCount,
  getUserProjects,
  getUserClientProjects,
  removeProjectCollaborator,
  revokeProjectInvitation,
  updateFlight,
  updateFlightMediaCount,
  updateMediaGPS,
  updateMediaNotes,
  updateMediaPriority,
  updateMediaFilename,
  updateProject,
  userHasFlightAccess,
  userHasProjectAccess,
  updateUserLogo,
  deleteUserLogo,
  getUserLogo,
  createWarrantyReminder,
  getProjectWarrantyReminder,
  updateWarrantyReminder,
  deleteWarrantyReminder,
  getDueWarrantyReminders,
  updateProjectWarranty,
  updateMediaUrls,
  updateUserWatermark,
  getUserWatermark,
  deleteUserWatermark,
  updateProjectLogo,
  deleteProjectLogo,
  getProjectLogo,
  // Client functions
  createClient,
  getOwnerClients,
  getClientById,
  getOwnerClient,
  updateClient,
  deleteClient,
  getClientProjects,
  assignProjectToClient,
  userHasClientAccess,
  getUserClientAccess,
  addClientUser,
  removeClientUser,
  getClientUsers,
  createClientInvitation,
  getClientInvitationByToken,
  acceptClientInvitation,
  getClientPendingInvitations,
  revokeClientInvitation,
  userHasClientProjectAccess,
  updateClientLogo,
  deleteClientLogo,
  getClientLogo,
  updateUserPilotSettings,
  getUserPilotSettings,
  getUserRoleForProject,
  // Soft-delete & audit
  softDeleteProject,
  softDeleteMedia,
  softDeleteFlight,
  softDeleteClient,
  restoreProject,
  restoreMedia,
  restoreFlight,
  restoreClient,
  listTrashItems,
  permanentlyDeleteTrashItem,
  createAuditLogEntry,
  listAuditLog,
  countAuditLog,
} from "./db";
import { sendProjectInvitationEmail, sendClientWelcomeEmail, sendProjectWelcomeEmail, sendTestEmail } from "./email";
import { storagePut, storageGet } from "./storage";
import { v2 as cloudinary } from "cloudinary";
import { applyWatermark, WatermarkOptions, generateThumbnail } from "./watermark";
import { applyVideoWatermarkFromBuffers, VideoWatermarkOptions } from "./videoWatermark";
import { uploadHighResolutionMedia } from "./highres-upload";
import { extractImageMetadata, formatMetadataForDisplay, isMapGradeAccuracy } from "./metadataExtractor";

// Validation schemas for project operations
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  flightDate: z.date().optional(),
});

const updateProjectSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  clientName: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  flightDate: z.date().nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
  dronePilot: z.string().max(255).nullable().optional(),
  faaLicenseNumber: z.string().max(100).nullable().optional(),
  laancAuthNumber: z.string().max(100).nullable().optional(),
});

// Helper function to extract EXIF GPS data from photo buffer
async function extractExifData(buffer: Buffer): Promise<{
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  capturedAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
}> {
  try {
    const metadata = await extractImageMetadata(buffer);
    
    return {
      latitude: metadata.gpsLatitude ?? null,
      longitude: metadata.gpsLongitude ?? null,
      altitude: metadata.gpsAltitude ?? null,
      capturedAt: metadata.dateTime ?? null,
      cameraMake: metadata.make ?? null,
      cameraModel: metadata.model ?? null,
    };
  } catch (error) {
    console.error("[EXIF] Failed to extract EXIF data:", error instanceof Error ? error.message : error);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      capturedAt: null,
      cameraMake: null,
      cameraModel: null,
    };
  }
}

// Helper to determine media type from MIME type
function getMediaType(mimeType: string): "photo" | "video" {
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "photo";
}

// Helper to normalize media GPS coordinates from strings to numbers
// Drizzle ORM returns DECIMAL fields as strings, but the client expects numbers
function normalizeMediaGPS(mediaItem: any) {
  if (!mediaItem) return mediaItem;
  return {
    ...mediaItem,
    latitude: mediaItem.latitude ? parseFloat(String(mediaItem.latitude)) : null,
    longitude: mediaItem.longitude ? parseFloat(String(mediaItem.longitude)) : null,
    altitude: mediaItem.altitude ? parseFloat(String(mediaItem.altitude)) : null,
  };
}

// Helper to normalize an array of media items
function normalizeMediaArrayGPS(mediaArray: any[] | null) {
  return (mediaArray || []).map(normalizeMediaGPS);
}

// GPS Export format types
type MediaWithGPS = {
  id: number;
  filename: string;
  latitude: string | null;
  longitude: string | null;
  altitude: string | null;
  capturedAt: Date | null;
  mediaType: string;
  url: string;
};

// Helper to generate KML format
function generateKML(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const placemarks = gpsMedia.map((m, index) => {
    const lat = parseFloat(m.latitude!);
    const lng = parseFloat(m.longitude!);
    const alt = m.altitude ? parseFloat(m.altitude) : 0;
    const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
    
    return `    <Placemark>
      <name>${escapeXml(m.filename)}</name>
      <description><![CDATA[
        Type: ${m.mediaType}
        ${timestamp ? `Captured: ${timestamp}` : ''}
        Altitude: ${alt}m
      ]]></description>
      <Point>
        <coordinates>${lng},${lat},${alt}</coordinates>
      </Point>
      ${timestamp ? `<TimeStamp><when>${timestamp}</when></TimeStamp>` : ''}
    </Placemark>`;
  }).join('\n');

  // Generate flight path line if multiple points
  let lineString = '';
  if (gpsMedia.length > 1) {
    const coordinates = gpsMedia.map(m => {
      const lat = parseFloat(m.latitude!);
      const lng = parseFloat(m.longitude!);
      const alt = m.altitude ? parseFloat(m.altitude) : 0;
      return `${lng},${lat},${alt}`;
    }).join(' ');

    lineString = `
    <Placemark>
      <name>Flight Path</name>
      <Style>
        <LineStyle>
          <color>ff00ff00</color>
          <width>3</width>
        </LineStyle>
      </Style>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(projectName)}</name>
    <description>GPS data exported from SkyVee Drone Mapping</description>
    <Style id="dronePoint">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/camera.png</href>
        </Icon>
      </IconStyle>
    </Style>
${placemarks}
${lineString}
  </Document>
</kml>`;
}

// Helper to generate CSV format
function generateCSV(media: MediaWithGPS[]): string {
  const headers = ['filename', 'latitude', 'longitude', 'altitude', 'captured_at', 'media_type', 'url'];
  const rows = media
    .filter(m => m.latitude && m.longitude)
    .map(m => [
      `"${m.filename.replace(/"/g, '""')}"`,
      m.latitude,
      m.longitude,
      m.altitude || '',
      m.capturedAt ? new Date(m.capturedAt).toISOString() : '',
      m.mediaType,
      `"${m.url}"`,
    ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// Helper to generate GeoJSON format
function generateGeoJSON(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const features = gpsMedia.map(m => ({
    type: 'Feature',
    properties: {
      name: m.filename,
      mediaType: m.mediaType,
      altitude: m.altitude ? parseFloat(m.altitude) : null,
      capturedAt: m.capturedAt ? new Date(m.capturedAt).toISOString() : null,
      url: m.url,
    },
    geometry: {
      type: 'Point',
      coordinates: [
        parseFloat(m.longitude!),
        parseFloat(m.latitude!),
        m.altitude ? parseFloat(m.altitude) : 0,
      ],
    },
  }));

  // Add flight path as LineString if multiple points
  if (gpsMedia.length > 1) {
    features.push({
      type: 'Feature',
      properties: {
        name: 'Flight Path',
        mediaType: 'path',
        altitude: null,
        capturedAt: null,
        url: '',
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: gpsMedia.map(m => [
          parseFloat(m.longitude!),
          parseFloat(m.latitude!),
          m.altitude ? parseFloat(m.altitude) : 0,
        ]),
      },
    } as any);
  }

  return JSON.stringify({
    type: 'FeatureCollection',
    name: projectName,
    features,
  }, null, 2);
}

// Helper to generate GPX format
function generateGPX(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const waypoints = gpsMedia.map(m => {
    const lat = parseFloat(m.latitude!);
    const lng = parseFloat(m.longitude!);
    const alt = m.altitude ? parseFloat(m.altitude) : 0;
    const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
    
    return `  <wpt lat="${lat}" lon="${lng}">
    <ele>${alt}</ele>
    <name>${escapeXml(m.filename)}</name>
    <desc>Type: ${m.mediaType}</desc>
    ${timestamp ? `<time>${timestamp}</time>` : ''}
  </wpt>`;
  }).join('\n');

  // Generate track if multiple points
  let track = '';
  if (gpsMedia.length > 1) {
    const trackpoints = gpsMedia.map(m => {
      const lat = parseFloat(m.latitude!);
      const lng = parseFloat(m.longitude!);
      const alt = m.altitude ? parseFloat(m.altitude) : 0;
      const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
      
      return `      <trkpt lat="${lat}" lon="${lng}">
        <ele>${alt}</ele>
        ${timestamp ? `<time>${timestamp}</time>` : ''}
      </trkpt>`;
    }).join('\n');

    track = `
  <trk>
    <name>Flight Path</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SkyVee Drone Mapping"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(projectName)}</name>
    <desc>GPS data exported from SkyVee Drone Mapping</desc>
  </metadata>
${waypoints}
${track}
</gpx>`;
}

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


// Helper function to check client user role
async function getClientUserRole(userId: number, clientId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({ role: clientUsers.role })
    .from(clientUsers)
    .where(and(eq(clientUsers.userId, userId), eq(clientUsers.clientId, clientId)))
    .limit(1);
  
  return result.length > 0 ? result[0].role : null;
}

// Helper function to check if user has required role
function hasRequiredRole(userRole: string | null, requiredRole: string): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<string, number> = {
    'viewer': 1,
    'user': 2,
    'admin': 3,
  };
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

export const appRouter = router({
  system: systemRouter,
  
  users: router({
    getOwnerUsers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can manage users' });
      }
      const { getOwnerUsers } = await import('./db');
      return getOwnerUsers(ctx.user.id);
    }),
    getUserDetails: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can view user details' });
        }
        const { getUserDetailsById } = await import('./db');
        return getUserDetailsById(input.userId);
      }),
    updateUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(1),
        role: z.enum(['user', 'admin', 'webmaster', 'client']),
        companyName: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can update users' });
        }
        const { updateUserDetails } = await import('./db');
        return updateUserDetails(input.userId, {
          name: input.name,
          role: input.role,
          companyName: input.companyName,
          department: input.department,
          phone: input.phone,
        });
      }),
    setPassword: protectedProcedure
      .input(z.object({
        userId: z.number(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can set passwords' });
        }
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(input.password, 10);
        const { setUserPassword } = await import('./db');
        return setUserPassword(input.userId, hash);
      }),
    assignProject: protectedProcedure
      .input(z.object({
        userId: z.number(),
        projectId: z.number(),
        role: z.enum(['viewer', 'editor', 'vendor']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can assign projects' });
        }
        const { assignUserToProject } = await import('./db');
        return assignUserToProject(input.userId, input.projectId, input.role || 'viewer');
      }),
    unassignProject: protectedProcedure
      .input(z.object({
        userId: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can unassign projects' });
        }
        const { removeUserFromProject } = await import('./db');
        return removeUserFromProject(input.userId, input.projectId);
      }),
    getAvailableProjects: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can view projects' });
        }
        const { getUserProjects } = await import('./db');
        return getUserProjects(ctx.user.id);
      }),
    inviteUserToProjects: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can invite users' });
        }
        return { success: true };
      }),
    removeUserFromProjects: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin and webmaster roles can remove users' });
        }
        return { success: true };
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Version information endpoint
  payment: router({
    createCheckoutSession: protectedProcedure
      .input(
        z.object({
          priceId: z.string(),
          planId: z.string(),
          planName: z.string().optional(),
          referralId: z.string().optional(),
          trialDays: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const stripe = await import("stripe").then(m => new m.default(process.env.STRIPE_SECRET_KEY || ""));
        
        if (!ctx.user?.email) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User email not found" });
        }

        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
              {
                price: input.priceId,
                quantity: 1,
              },
            ],
            mode: "subscription",
            subscription_data: {
              trial_period_days: input.trialDays ?? 14,
              metadata: {
                plan_type: input.planName || input.planId,
                ...(input.referralId ? { referrer: input.referralId } : { referrer: "none" }),
              },
            },
            allow_promotion_codes: true,
            success_url: `${ctx.req.headers.origin || "http://localhost:3000"}/dashboard?payment=success`,
            cancel_url: `${ctx.req.headers.origin || "http://localhost:3000"}/pricing?payment=cancelled`,
            customer_email: ctx.user.email,
            client_reference_id: ctx.user.id.toString(),
            metadata: {
              user_id: ctx.user.id.toString(),
              customer_email: ctx.user.email,
              customer_name: ctx.user.name || "",
              plan_id: input.planId,
              ...(input.referralId ? { referral_id: input.referralId } : {}),
            },
          });

          if (!session.url) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
          }

          return {
            checkoutUrl: session.url,
            sessionId: session.id,
          };
        } catch (error) {
          console.error("Stripe checkout error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
        }
      }),
    createPortalSession: protectedProcedure
      .mutation(async ({ ctx }) => {
        const stripe = await import("stripe").then(m => new m.default(process.env.STRIPE_SECRET_KEY || ""));
        const stripeCustomerId = (ctx.user as any).stripeCustomerId;
        if (!stripeCustomerId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found. Please subscribe to a plan first." });
        }
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${ctx.req.headers.origin || "http://localhost:3000"}/account`,
          });
          return { portalUrl: session.url };
        } catch (error) {
          console.error("Stripe portal error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create billing portal session" });
        }
      }),
  }),

  account: router({
    getUsageStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Count owned projects
      const ownedProjects = await db.select().from(projects).where(eq(projects.userId, ctx.user.id));
      const projectCount = ownedProjects.length;
      // Count total media across owned projects
      const allMedia = await db.select().from(media).where(inArray(media.projectId, ownedProjects.length > 0 ? ownedProjects.map(p => p.id) : [-1]));
      const totalMedia = allMedia.length;
      // Count team members (collaborators across all projects)
      const allCollabs = await db.select().from(projectCollaborators).where(inArray(projectCollaborators.projectId, ownedProjects.length > 0 ? ownedProjects.map(p => p.id) : [-1]));
      const uniqueCollaborators = new Set(allCollabs.map(c => c.userId));
      const teamMemberCount = uniqueCollaborators.size;
      // Estimate storage used (sum of media file sizes if available, otherwise estimate from count)
      // Since we don't store file sizes, estimate: photos ~5MB, videos ~50MB
      let estimatedStorageGB = 0;
      for (const m of allMedia) {
        if ((m as any).mediaType === 'video') {
          estimatedStorageGB += 0.05; // ~50MB per video
        } else {
          estimatedStorageGB += 0.005; // ~5MB per photo
        }
      }
      estimatedStorageGB = Math.round(estimatedStorageGB * 100) / 100;
      return {
        projectCount,
        totalMedia,
        teamMemberCount,
        estimatedStorageGB,
      };
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        organization: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.organization !== undefined) updateData.organization = input.organization;
        if (Object.keys(updateData).length === 0) return { success: true };
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),

  version: router({
    getInfo: publicProcedure.query(async () => {
      try {
        const { APP_VERSION } = await import("../shared/version");
        return {
          version: APP_VERSION.version,
          commit: APP_VERSION.commit,
          branch: APP_VERSION.branch,
          buildDate: APP_VERSION.buildDate,
          buildTimestamp: APP_VERSION.buildTimestamp,
        };
      } catch (error) {
        console.error("Failed to get version info:", error);
        return {
          version: "unknown",
          commit: "unknown",
          branch: "unknown",
          buildDate: new Date().toISOString(),
          buildTimestamp: Date.now(),
        };
      }
    }),
  }),

  // Project management procedures
  project: router({
    // Get demo project without authentication
    getDemo: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        // Only allow access to demo project (ID: 1)
        if (input.id !== 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only demo project is publicly accessible",
          });
        }
        const demoProject = await getProjectById(1);
        if (!demoProject) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demo project not found",
          });
        }
        return { ...demoProject, logoUrl: demoProject.logoUrl, accessRole: 'demo' as const, isDemoProject: true };
      }),
    // List all projects for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      // Get projects owned by the user and shared with them (collaborator)
      const { owned: ownedProjects, shared: sharedProjects } = await getUserAccessibleProjects(ctx.user.id);
      
      // Get projects accessible through client memberships
      const clientProjects = await getUserClientProjects(ctx.user.id);
      
      // Combine all three sources: owned, shared (collaborator), and client projects
      const allProjects = [...ownedProjects, ...sharedProjects, ...clientProjects];
      
      // Deduplicate by project ID
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.id, p])).values()
      );
      
      // Sort: pinned projects first, then by updatedAt descending
      return uniqueProjects.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }),
    // Toggle pin/favorite status for a project
    togglePin: protectedProcedure
      .input(z.object({ id: z.number(), isPinned: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Verify ownership — only the project owner can pin
        const project = await getUserProject(input.id, ctx.user.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        await db
          .update(projects)
          .set({ isPinned: input.isPinned })
          .where(eq(projects.id, input.id));
        return { id: input.id, isPinned: input.isPinned };
      }),

    // Get project count for the current user
    count: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjectCount(ctx.user.id);
    }),

    // Get a single project by ID (owner or collaborator)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Helper: fetch overlays for a project
        const fetchOverlays = async (projectId: number) => {
          const db = await getDb();
          if (!db) return [];
          return db.select().from(projectOverlays).where(eq(projectOverlays.projectId, projectId));
        };

        // Allow public access to demo project (ID: 1)
        if (input.id === 1) {
          const demoProject = await getProjectById(1);
          if (demoProject) {
            const overlays = await fetchOverlays(demoProject.id);
            let logoUrl = demoProject.logoUrl;
            return { ...demoProject, logoUrl, overlays, accessRole: 'demo' as const, isDemoProject: true };
          }
        }
        // First check if user is owner
        const ownedProject = await getUserProject(input.id, ctx.user.id);
        if (ownedProject) {
          const overlays = await fetchOverlays(ownedProject.id);
          let logoUrl = ownedProject.logoUrl;
          return { ...ownedProject, logoUrl, overlays, accessRole: 'owner' as const };
        }
        
        // Check if user is a collaborator
        const sharedProject = await getProjectWithAccess(input.id, ctx.user.id);
        if (sharedProject) {
          const overlays = await fetchOverlays(sharedProject.id);
          let logoUrl = sharedProject.logoUrl;
          return { ...sharedProject, logoUrl, overlays };
        }
        
        // Check if user is a client user with access to this project
        const hasClientAccess = await userHasClientProjectAccess(ctx.user.id, input.id);
        if (hasClientAccess) {
          const project = await getProjectById(input.id);
          if (project) {
            const overlays = await fetchOverlays(project.id);
            let logoUrl = project.logoUrl;
            return { ...project, logoUrl, overlays, accessRole: 'client' as const };
          }
        }
        
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access",
        });
      }),

    // Create a new project
    create: protectedProcedure
      .input(createProjectSchema)
      .mutation(async ({ ctx, input }) => {
        // Get the tier from the user (e.g., "free") and convert to uppercase (e.g., "FREE")
        const userTier = (ctx.user.subscriptionTier?.toUpperCase() || "FREE") as keyof typeof PLAN_LIMITS;
        // PLAN_LIMITS[userTier] is just the number of projects allowed
        const maxProjectsAllowed = PLAN_LIMITS[userTier];
        const projectCount = await getUserProjectCount(ctx.user.id);

        if (projectCount >= maxProjectsAllowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Plan limit reached. Your ${userTier} plan allows ${maxProjectsAllowed} projects.`,
          });
        }

        const project = await createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          location: input.location ?? null,
          clientName: input.clientName ?? null,
          flightDate: input.flightDate ?? null,
        });
        return project;
      }),

    // Update an existing project
    update: protectedProcedure
      .input(updateProjectSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const project = await updateProject(id, ctx.user.id, updates);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission to update it",
          });
        }
        return project;
      }),

    // Delete a project (soft-delete, admin/webmaster only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can delete projects' });
        }
        const project = await getUserProject(input.id, ctx.user.id);
        const success = await softDeleteProject(input.id, ctx.user.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission to delete it",
          });
        }
        await createAuditLogEntry({
          action: 'delete',
          entityType: 'project',
          entityId: input.id,
          entityName: project?.name ?? 'Unknown',
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true };
      }),

    // Update overlay coordinates after manual alignment
    updateOverlayCoordinates: protectedProcedure
      .input(
        z.object({
          overlayId: z.number(),
          projectId: z.number(),
          coordinates: z.array(z.tuple([z.number(), z.number()])).length(4),
          rotation: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        // Verify the user owns or has editor access to this project
        const ownedProject = await getUserProject(input.projectId, ctx.user.id);
        const sharedProject = !ownedProject ? await getProjectWithAccess(input.projectId, ctx.user.id) : null;
        if (!ownedProject && !sharedProject && ctx.user.role !== "webmaster" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
        }

        const updateData: Record<string, unknown> = { coordinates: input.coordinates };
        if (input.rotation !== undefined) updateData.rotation = String(input.rotation);

        await db
          .update(projectOverlays)
          .set(updateData as any)
          .where(and(eq(projectOverlays.id, input.overlayId), eq(projectOverlays.projectId, input.projectId)));

        return { success: true };
      }),

    // Update overlay opacity
    updateOverlayOpacity: protectedProcedure
      .input(
        z.object({
          overlayId: z.number(),
          projectId: z.number(),
          opacity: z.number().min(0).max(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const ownedProject = await getUserProject(input.projectId, ctx.user.id);
        const sharedProject = !ownedProject ? await getProjectWithAccess(input.projectId, ctx.user.id) : null;
        if (!ownedProject && !sharedProject && ctx.user.role !== "webmaster" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
        }

        await db
          .update(projectOverlays)
          .set({ opacity: String(input.opacity) })
          .where(and(eq(projectOverlays.id, input.overlayId), eq(projectOverlays.projectId, input.projectId)));

        return { success: true };
      }),

    // Delete an overlay
    deleteOverlay: protectedProcedure
      .input(z.object({ overlayId: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const ownedProject = await getUserProject(input.projectId, ctx.user.id);
        if (!ownedProject && ctx.user.role !== "webmaster" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
        }

        await db
          .delete(projectOverlays)
          .where(and(eq(projectOverlays.id, input.overlayId), eq(projectOverlays.projectId, input.projectId)));

        return { success: true };
      }),

    // Rename an overlay
    renameOverlay: protectedProcedure
      .input(z.object({ overlayId: z.number(), projectId: z.number(), label: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const ownedProject = await getUserProject(input.projectId, ctx.user.id);
        const sharedProject = !ownedProject ? await getProjectWithAccess(input.projectId, ctx.user.id) : null;
        if (!ownedProject && !sharedProject && ctx.user.role !== "webmaster" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
        }

        await db
          .update(projectOverlays)
          .set({ label: input.label })
          .where(and(eq(projectOverlays.id, input.overlayId), eq(projectOverlays.projectId, input.projectId)));

        return { success: true };
      }),
  }),

  // Media management procedures
  media: router({
    // List media for demo project without authentication
    listDemo: publicProcedure
      .input(z.object({ projectId: z.number(), flightId: z.number().optional(), includeFlightMedia: z.boolean().optional() }))
      .query(async ({ input }) => {
        // Only allow access to demo project (ID: 1)
        if (input.projectId !== 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only demo project media is publicly accessible",
          });
        }
        
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }
        
        // Build where conditions
        const conditions = [eq(media.projectId, input.projectId)];
        
        // Add flight filter if provided
        if (input.flightId !== undefined) {
          conditions.push(eq(media.flightId, input.flightId));
        }
        
        // Query media for demo project with SQL filtering
        const mediaList = await db
          .select()
          .from(media)
          .where(and(...conditions))
          .orderBy(desc(media.createdAt));
        
        return mediaList || [];
      }),
    // List all media for a project (owner or collaborator)
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), flightId: z.number().optional(), includeFlightMedia: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        // Allow public access to demo project (ID: 1)
        let hasAccess = input.projectId === 1;
        
        // Check if user has access (owner, collaborator, or client user)
        if (!hasAccess) {
          hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        }
        const hasClientAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        
        if (!hasAccess && !hasClientAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        
        // Use the access-aware function to get media
        const media = await getProjectMediaWithAccess(input.projectId, ctx.user.id);
        
        // Normalize GPS coordinates from strings to numbers
        const normalizedMedia = normalizeMediaArrayGPS(media);
        
        // Filter by flight if flightId provided
        if (input.flightId !== undefined) {
          return (normalizedMedia || []).filter(m => m.flightId === input.flightId);
        }
        
        // By default, exclude media assigned to flights (show only unassigned media on project page)
        // Unless includeFlightMedia is explicitly set to true
        if (!input.includeFlightMedia) {
          return (normalizedMedia || []).filter(m => m.flightId === null);
        }
        
        return normalizedMedia || [];
      }),

    // Get a single media item
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }
        return normalizeMediaGPS(mediaItem);
      }),

    // Upload a chunk of a large file (chunked upload for videos)
    uploadChunk: protectedProcedure
      .input(z.object({
        uploadId: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
        chunkData: z.string(), // Base64 encoded chunk
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Store chunk in temporary storage
        const chunkBuffer = Buffer.from(input.chunkData, "base64");
        const chunkKey = `temp-chunks/${input.uploadId}/chunk-${input.chunkIndex.toString().padStart(5, '0')}`;
        await storagePut(chunkKey, chunkBuffer, "application/octet-stream");

        return { 
          success: true, 
          chunkIndex: input.chunkIndex,
          totalChunks: input.totalChunks 
        };
      }),

    // Finalize chunked upload - combine chunks and create media record
    finalizeChunkedUpload: protectedProcedure
      .input(z.object({
        uploadId: z.string(),
        projectId: z.number(),
        flightId: z.number().optional(),
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        thumbnailData: z.string().optional(),
        // GPS metadata extracted client-side before upload
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        altitude: z.number().optional(),
        capturedAt: z.string().optional(), // ISO date string
        cameraMake: z.string().optional(),
        cameraModel: z.string().optional(),
        // MD5 hash of the full file computed client-side for integrity check
        clientMd5: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Generate unique file key for reference
        const uniqueId = nanoid(12);
        const folder = `mapit/projects/${input.projectId}/media`;

        // Fetch and combine all chunks from S3 temp storage
        const totalChunks = Math.ceil(input.fileSize / (5 * 1024 * 1024)); // 5MB chunks (must match client)
        const chunks: Buffer[] = [];
        
        for (let i = 0; i < totalChunks; i++) {
          const chunkKey = `temp-chunks/${input.uploadId}/chunk-${i.toString().padStart(5, '0')}`;
          const { url: chunkUrl } = await storageGet(chunkKey);
          const response = await fetch(chunkUrl);
          const arrayBuffer = await response.arrayBuffer();
          chunks.push(Buffer.from(arrayBuffer));
        }

        // Combine chunks
        const combinedBuffer = Buffer.concat(chunks);

        // Upload to Cloudinary
        let url: string;
        let fileKey: string;
        let thumbnailUrl: string | null = null;

        const isVideo = input.mimeType.startsWith("video/");
        const isPhoto = input.mimeType.startsWith("photo/");

        // Upload to S3
        fileKey = `projects/${input.projectId}/media/${uniqueId}-${input.filename}`;
        const result = await storagePut(fileKey, combinedBuffer, input.mimeType);
        url = result.url;

        // Generate thumbnail for images
        if (isPhoto) {
          try {
            const thumbBuffer = await generateThumbnail(combinedBuffer, 250);
            const thumbKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
            const thumbResult = await storagePut(thumbKey, thumbBuffer, "photo/jpeg");
            thumbnailUrl = thumbResult.url;
          } catch (error) {
            console.error("Failed to generate thumbnail:", error);
            thumbnailUrl = url; // Fall back to original photo
          }
        }

        // If client provided a thumbnail (for videos), use it
        if (input.thumbnailData && isVideo) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const thumbKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbResult = await storagePut(thumbKey, thumbnailBuffer, "photo/jpeg");
          thumbnailUrl = thumbResult.url;
        }

        // MD5 integrity check — verify no bytes were dropped during chunked transfer
        if (input.clientMd5) {
          const crypto = await import('crypto');
          const serverMd5 = crypto.createHash('md5').update(combinedBuffer).digest('hex');
          if (serverMd5 !== input.clientMd5) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Integrity check failed: file hash mismatch. Upload may be corrupted. Please retry.`,
            });
          }
          console.log(`[Upload] MD5 integrity verified: ${serverMd5}`);
        }

        // Create media record in database (with GPS metadata from client)
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: input.latitude != null ? String(input.latitude) : null,
          longitude: input.longitude != null ? String(input.longitude) : null,
          altitude: input.altitude != null ? String(input.altitude) : null,
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
          cameraMake: input.cameraMake ?? null,
          cameraModel: input.cameraModel ?? null,
          thumbnailUrl,
        });

        // Assign to flight if flightId provided
        if (input.flightId) {
          await assignMediaToFlight(mediaItem.id, input.flightId);
        }

        return mediaItem;
      }),

    // Upload a new media file (for smaller files - base64 method)
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        flightId: z.number().optional(),
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
        thumbnailData: z.string().optional(), // Base64 encoded thumbnail for videos
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Extract EXIF data for images
        let exifData = {
          latitude: null as number | null,
          longitude: null as number | null,
          altitude: null as number | null,
          capturedAt: null as Date | null,
          cameraMake: null as string | null,
          cameraModel: null as string | null,
        };

        if (input.mimeType.startsWith("photo/")) {
          exifData = await extractExifData(buffer);
        }

        // Generate unique file key for reference
        const uniqueId = nanoid(12);
        const folder = `mapit/projects/${input.projectId}/media`;

        // Upload to S3
        let url: string;
        let fileKey: string;
        let thumbnailUrl: string | null = null;

        const isVideo = input.mimeType.startsWith("video/");
        const isPhoto = input.mimeType.startsWith("photo/");

        fileKey = `projects/${input.projectId}/media/${uniqueId}-${input.filename}`;
        const result = await storagePut(fileKey, buffer, input.mimeType);
        url = result.url;

        // Generate thumbnail for images
        if (isPhoto) {
          try {
            const response = await fetch(fileKey);
            const arrayBuffer = await response.arrayBuffer();
            const thumbBuffer = await generateThumbnail(buffer, 250);
            const thumbKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
            const thumbResult = await storagePut(thumbKey, thumbBuffer, "photo/jpeg");
            thumbnailUrl = thumbResult.url;
          } catch (error) {
            console.error("[Photo Upload] Failed to generate thumbnail:", error);
            thumbnailUrl = fileKey; // Fall back to original
          }
        }

        // If client provided a thumbnail (for videos), use it
        if (input.thumbnailData && isVideo) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const thumbKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbResult = await storagePut(thumbKey, thumbnailBuffer, "photo/jpeg");
          thumbnailUrl = thumbResult.url;
        }

        // Create media record in database
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: (exifData.latitude && !isNaN(exifData.latitude)) ? exifData.latitude.toString() : null,
          longitude: (exifData.longitude && !isNaN(exifData.longitude)) ? exifData.longitude.toString() : null,
          altitude: (exifData.altitude && !isNaN(exifData.altitude)) ? exifData.altitude.toString() : null,
          capturedAt: exifData.capturedAt,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          thumbnailUrl,
        });

        // Assign to flight if flightId provided
        if (input.flightId) {
          await assignMediaToFlight(mediaItem.id, input.flightId);
        }

        return mediaItem;
      }),

    // Delete a media item
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is a client user and has viewer role
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0) {
          // User is a client user - check their role
          const userRole = clientAccess[0].role;
          if (userRole === 'viewer') {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Viewers cannot delete media",
            });
          }
        }

        // Get media to check project
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }
        
        // Verify user has access to the project
        const hasAccess = await userHasProjectAccess(mediaItem.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete media from this project",
          });
        }
        
        const deleted = await softDeleteMedia(input.id, ctx.user.id, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found or you don't have permission to delete it",
          });
        }
        await createAuditLogEntry({
          action: 'delete',
          entityType: 'media',
          entityId: input.id,
          entityName: mediaItem.filename ?? 'Unknown',
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true, deleted };
      }),

    // Finalize photo upload from direct-to-S3 upload
    finalizePhotoUpload: protectedProcedure
      .input(z.object({
        uploadId: z.string(),
        projectId: z.number(),
        flightId: z.number().optional(),
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        s3Key: z.string(),
        // Client-side extracted telemetry (takes precedence over server-side EXIF extraction)
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        absoluteAltitude: z.number().optional(),
        relativeAltitude: z.number().optional(),
        gimbalPitch: z.number().optional(),
        capturedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user has access to project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Get the S3 URL for the uploaded file
        const { url: fileUrl } = await storageGet(input.s3Key);

        // Use client-side extracted telemetry if available, otherwise fall back to server-side EXIF extraction
        let exifData = {
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          altitude: input.absoluteAltitude ?? null,
          capturedAt: input.capturedAt ?? null,
          cameraMake: null as string | null,
          cameraModel: null as string | null,
        };

        // If client didn't provide GPS data, try to extract EXIF data from S3
        if (!input.latitude && !input.longitude && input.mimeType.startsWith("photo/")) {
          console.log(`[Photo Upload] No client-side telemetry provided, attempting server-side EXIF extraction`);
          try {
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const serverExifData = await extractExifData(buffer);
            // Merge server-extracted data with client data (client takes precedence)
            exifData = {
              latitude: exifData.latitude ?? serverExifData.latitude,
              longitude: exifData.longitude ?? serverExifData.longitude,
              altitude: exifData.altitude ?? serverExifData.altitude,
              capturedAt: exifData.capturedAt ?? serverExifData.capturedAt,
              cameraMake: serverExifData.cameraMake,
              cameraModel: serverExifData.cameraModel,
            };
          } catch (error) {
            console.error("[Photo Upload] Failed to extract EXIF:", error);
            // Continue without EXIF data
          }
        } else if (input.latitude && input.longitude) {
          console.log(`[Photo Upload] Using client-side telemetry: GPS (${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}), Alt: ${input.absoluteAltitude}m`);
        }

        // Generate thumbnail for images
        let thumbnailUrl: string | null = null;
        if (input.mimeType.startsWith("photo/")) {
          try {
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const thumbBuffer = await generateThumbnail(buffer, 250);
            const thumbKey = `projects/${input.projectId}/thumbnails/${nanoid(12)}-thumb.jpg`;
            const thumbResult = await storagePut(thumbKey, thumbBuffer, "photo/jpeg");
            thumbnailUrl = thumbResult.url;
          } catch (error) {
            console.error("[Photo Upload] Failed to generate thumbnail:", error);
            thumbnailUrl = fileUrl; // Fall back to original
          }
        }

        // Create media record
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey: input.s3Key,
          url: fileUrl,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: exifData.latitude ? exifData.latitude.toString() : null,
          longitude: exifData.longitude ? exifData.longitude.toString() : null,
          altitude: exifData.altitude ? exifData.altitude.toString() : null,
          capturedAt: exifData.capturedAt,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          thumbnailUrl,
        });

        // Assign to flight if provided
        if (input.flightId) {
          await assignMediaToFlight(mediaItem.id, input.flightId);
        }

        return mediaItem;
      }),

    // Create media record from URL (used after TUS upload)
    createFromUrl: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        thumbnailUrl: z.string().nullable().optional(),
        thumbnailData: z.string().optional(), // Base64 encoded thumbnail
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Upload thumbnail if provided as base64
        let thumbnailUrl = input.thumbnailUrl || null;
        if (input.thumbnailData && !thumbnailUrl) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const uniqueId = nanoid(12);
          const thumbnailKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbnailResult = await storagePut(thumbnailKey, thumbnailBuffer, "photo/jpeg");
          thumbnailUrl = thumbnailResult.url;
        }

        // Extract file key from URL
        const urlParts = new URL(input.fileUrl);
        const fileKey = urlParts.pathname.replace(/^\//, "");

        // Create media record in database
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url: input.fileUrl,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: null,
          longitude: null,
          altitude: null,
          capturedAt: null,
          cameraMake: null,
          cameraModel: null,
          thumbnailUrl,
        });

        return mediaItem;
      }),

    // Update GPS coordinates for a media item
    updateGPS: protectedProcedure
      .input(z.object({
        id: z.number(),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
        altitude: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot update
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot modify media",
          });
        }

        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Verify user owns the project (not just collaborator)
        const project = await getUserProject(mediaItem.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project owners can edit GPS coordinates",
          });
        }

        // Update the media item with new GPS coordinates
        const updated = await updateMediaGPS(input.id, {
          latitude: input.latitude?.toString() ?? null,
          longitude: input.longitude?.toString() ?? null,
          altitude: input.altitude?.toString() ?? null,
        });

        return updated;
      }),

    // Update notes for a media item
    updateNotes: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          notes: z.string().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get the media item to verify ownership
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Get user's role for this specific project
        const userRole = await getUserRoleForProject(mediaItem.projectId, ctx.user.id);
        if (!userRole) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to edit this media",
          });
        }

        // Check if user is a viewer - viewers cannot modify media
        if (userRole === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot modify media",
          });
        }

        // Update the media item with new notes
        const updated = await updateMediaNotes(input.id, input.notes);

        return updated;
      }),

    // Update priority for a media item
    updatePriority: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          priority: z.enum(["none", "low", "high"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
      // Get the media item to verify it exists
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Get user's role for this specific project
        const userRole = await getUserRoleForProject(mediaItem.projectId, ctx.user.id);
        if (!userRole) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to edit this media",
          });
        }

        // Check if user is a viewer - viewers cannot modify media
        if (userRole === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot modify media",
          });
        }

        // Update the media item with new priority
        const updated = await updateMediaPriority(input.id, input.priority);

        return updated;
      }),

    // Rename a media file
    rename: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          filename: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot update
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot modify media",
          });
        }

        // Get the media item to verify ownership
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Verify user has access to the project (owner or collaborator)
        const hasAccess = await userHasProjectAccess(mediaItem.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project owners and collaborators can rename media",
          });
        }

        const updated = await updateMediaFilename(input.id, input.filename);
        return updated;
      }),

    // Regenerate missing thumbnails for a project
    regenerateThumbnails: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot update
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot modify media",
          });
        }

        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        // Import and call the regeneration function
        const { regenerateMissingThumbnails } = await import("./regenerate-thumbnails");
        const results = await regenerateMissingThumbnails(input.projectId);

        return {
          success: true,
          successCount: results.success.length,
          failCount: results.failed.length,
          failed: results.failed,
        };
      }),

    // Upload high-resolution version of existing media
    uploadHighResolution: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        fileData: z.string(),
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        const project = await getUserProject(mediaItem.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to upload high-resolution files for this media",
          });
        }

        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;
        // Only allow 'photo' or 'video' as mediaType
        let mediaType: "photo" | "video" = "photo";
        if (input.mimeType && input.mimeType.startsWith("video/")) {
          mediaType = "video";
        }
        const uploadResult = await uploadHighResolutionMedia(
          buffer,
          input.filename,
          mediaType,
          ctx.user.id,
          mediaItem.projectId
        );

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        await db
          .update(media)
          .set({
            highResUrl: uploadResult.url,
            highResKey: uploadResult.fileKey,
            highResFileSize: fileSize,
            originalWidth: uploadResult.width || null,
            originalHeight: uploadResult.height || null,
            updatedAt: new Date(),
          })
          .where(eq(media.id, input.mediaId));

        const [updated] = await db
          .select()
          .from(media)
          .where(eq(media.id, input.mediaId));

        return updated;
      }),

    // Get Cloudinary upload signature for direct browser uploads
    getUploadSignature: protectedProcedure
      .mutation(async () => {
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

        if (!apiSecret || !apiKey || !cloudName) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Cloudinary env vars are missing: CLOUDINARY_API_SECRET, CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME",
          });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request(
          {
            timestamp: timestamp,
            source: "uw",
            folder: "signed_upload_demo_uw",
          },
          apiSecret
        );

        return {
          signature,
          timestamp,
          apiKey,
          cloudName,
        };
      }),
  }),

  // Project Sharing procedures
  sharing: router({
    // Get project collaborators
    getCollaborators: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }
        return getProjectCollaborators(input.projectId);
      }),

    // Get project invitations
    getInvitations: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }
        return getProjectInvitations(input.projectId);
      }),

    // Send a project invitation
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email(),
        role: z.enum(["viewer", "editor"]).default("viewer"),
        sendEmail: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        // Check if the email belongs to an existing user who is already a collaborator
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          // Check if already a collaborator
          const collaborators = await getProjectCollaborators(input.projectId);
          const isAlreadyCollaborator = collaborators.some(c => c.userId === existingUser.id);
          if (isAlreadyCollaborator) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This user is already a collaborator on this project",
            });
          }
        }

        // Don't allow inviting yourself
        if (input.email.toLowerCase() === ctx.user.email?.toLowerCase()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot invite yourself to your own project",
          });
        }

        // Generate unique token
        const token = nanoid(32);
        
        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create the invitation
        const { invitation, isNew } = await createProjectInvitation({
          projectId: input.projectId,
          invitedBy: ctx.user.id,
          email: input.email.toLowerCase(),
          token,
          role: input.role,
          expiresAt,
        });

        // Build the accept URL
        const baseUrl = process.env.VITE_APP_URL || 'https://skyveemapit.manus.space';
        const acceptUrl = `${baseUrl}/invite/${invitation.token}`;

        // Send the invitation email (only if sendEmail is true)
        let emailResult: { success: boolean; error?: string } = { success: false, error: 'Email sending skipped' };
        if (input.sendEmail !== false) {
          emailResult = await sendProjectInvitationEmail({
            to: input.email,
            inviterName: ctx.user.name || 'A Mapit user',
            projectName: project.name,
            inviteLink: acceptUrl,
          });

          if (!emailResult.success) {
            console.error('[Sharing] Failed to send invitation email:', emailResult.error);
            // Don't throw - invitation is still created, just email failed
          }
        }

        return {
          success: true,
          invitation,
          isNew,
          emailSent: emailResult.success,
          inviteUrl: acceptUrl,
        };
      }),

    // Accept an invitation (called after user logs in)
    acceptInvitation: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Get the invitation to verify it exists and get the email
        const invitation = await getInvitationByToken(input.token);
        
        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }

        // If user is not authenticated, they need to log in first
        // Store the token in session storage for after login
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please log in first to accept this invitation",
          });
        }

        const result = await acceptProjectInvitation(input.token, ctx.user.id);
        
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to accept invitation",
          });
        }

        // Get the project details to return
        const project = await getProjectById(result.invitation!.projectId);
        
        // Send welcome email to the new project collaborator
        if (project && result.invitation) {
          try {
            // Get inviter details
            const inviter = await getUserById(result.invitation.invitedBy);
            
            // Get the project URL
            const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || 'https://skyveemapit.manus.space';
            const projectUrl = `${baseUrl}/project/${project.id}`;
            
            // Send welcome email (only if user has email)
            if (ctx.user.email) {
              console.log(`[Project Welcome] Attempting to send welcome email to ${ctx.user.email}`);
              const emailResult = await sendProjectWelcomeEmail({
                to: ctx.user.email,
                projectName: project.name,
                projectLink: projectUrl,
              });
              
              if (emailResult.success) {
                console.log(`[Project Welcome] Successfully sent welcome email to ${ctx.user.email}`);
              } else {
                console.error(`[Project Welcome] Failed to send welcome email to ${ctx.user.email}:`, emailResult.error);
              }
            } else {
              console.log('[Project Welcome] Skipping welcome email - user has no email address');
            }
          } catch (emailError) {
            // Log error but don't fail the invitation acceptance
            console.error('[Project Welcome] Exception while sending welcome email:', emailError);
          }
        }

        return {
          success: true,
          project,
        };
      }),

    // Get invitation details by token (public - for showing invitation info before login)
    getInvitationByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invitation = await getInvitationByToken(input.token);
        
        if (!invitation) {
          return null;
        }

        // Get project details
        const project = await getProjectById(invitation.projectId);
        
        // Get inviter details
        const inviter = await getUserById(invitation.invitedBy);

        return {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
          project: project ? {
            id: project.id,
            name: project.name,
            description: project.description,
          } : null,
          inviter: inviter ? {
            name: inviter.name,
          } : null,
        };
      }),

    // Revoke an invitation
    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await revokeProjectInvitation(input.invitationId, ctx.user.id);
        
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to revoke invitation",
          });
        }

        return { success: true };
      }),

    // Remove a collaborator
    removeCollaborator: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const removed = await removeProjectCollaborator(input.projectId, input.userId);
        
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collaborator not found",
          });
        }

        return { success: true };
      }),

    // Get a shared project (for collaborators)
    getSharedProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectWithAccess(input.projectId, ctx.user.id);
        
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return project;
      }),

    // Get media for a shared project
    getSharedProjectMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const media = await getProjectMediaWithAccess(input.projectId, ctx.user.id);
        
        if (media === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return normalizeMediaArrayGPS(media);
      }),

    // Get all projects shared with the current user
    getSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
      const { shared } = await getUserAccessibleProjects(ctx.user.id);
      return shared;
    }),
  }),

  // GPS Export procedures
  export: router({
    // Export GPS data as KML
    kml: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const kmlContent = generateKML(project.name, media);
        
        return {
          content: kmlContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.kml`,
          mimeType: 'application/vnd.google-earth.kml+xml',
        };
      }),

    // Export GPS data as CSV
    csv: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const csvContent = generateCSV(media);
        
        return {
          content: csvContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.csv`,
          mimeType: 'text/csv',
        };
      }),

    // Export GPS data as GeoJSON
    geojson: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const geojsonContent = generateGeoJSON(project.name, media);
        
        return {
          content: geojsonContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.geojson`,
          mimeType: 'application/geo+json',
        };
      }),

    // Export GPS data as GPX
    gpx: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const gpxContent = generateGPX(project.name, media);
        
        return {
          content: gpxContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.gpx`,
          mimeType: 'application/gpx+xml',
        };
      }),
  }),

  // Flight procedures
  flight: router({
    // List flights for demo project without authentication
    listDemo: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        // Only allow access to demo project (ID: 1)
        if (input.projectId !== 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only demo project flights are publicly accessible",
          });
        }
        
        return await getProjectFlights(input.projectId);
      }),
    // Get single flight for demo project without authentication
    getDemo: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const flight = await getFlightById(input.id);
        if (!flight) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found",
          });
        }
        
        // Only allow access to demo project flights (project ID: 1)
        if (flight.projectId !== 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only demo project flights are publicly accessible",
          });
        }
        
        const media = await getFlightMedia(input.id);
        return { ...flight, media };
      }),
    // Create a new flight within a project
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1, "Flight name is required").max(255),
        description: z.string().max(5000).optional(),
        flightDate: z.date().optional(),
        dronePilot: z.string().max(255).optional(),
        faaLicenseNumber: z.string().max(100).optional(),
        laancAuthNumber: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const flight = await createFlight({
          projectId: input.projectId,
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          flightDate: input.flightDate || null,
          dronePilot: input.dronePilot || null,
          faaLicenseNumber: input.faaLicenseNumber || null,
          laancAuthNumber: input.laancAuthNumber || null,
        });

        return flight;
      }),

    // List all flights for a project
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Allow public access to demo project (ID: 1)
        let hasAccess = input.projectId === 1;
        
        // Check if user has access to the project (owner, collaborator, or client user)
        if (!hasAccess) {
          hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        }
        const hasClientAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        
        if (!hasAccess && !hasClientAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return getProjectFlights(input.projectId);
      }),

    // Get a single flight with its media
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const flight = await getFlightById(input.id);
        if (!flight) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found",
          });
        }

        // Check if user has access to the parent project
        const hasAccess = await userHasProjectAccess(flight.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have access",
          });
        }

        const media = await getFlightMedia(input.id);
        return { ...flight, media };
      }),

    // Update a flight
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(5000).nullable().optional(),
        flightDate: z.date().nullable().optional(),
        dronePilot: z.string().max(255).nullable().optional(),
        faaLicenseNumber: z.string().max(100).nullable().optional(),
        laancAuthNumber: z.string().max(100).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const updated = await updateFlight(id, ctx.user.id, updates);

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have permission",
          });
        }

        return updated;
      }),

    // Delete a flight (soft-delete, admin/webmaster only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can delete flights' });
        }
        const flight = await getFlightById(input.id);
        const deleted = await softDeleteFlight(input.id, ctx.user.id, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have permission to delete it",
          });
        }
        await createAuditLogEntry({
          action: 'delete',
          entityType: 'flight',
          entityId: input.id,
          entityName: flight?.name ?? 'Unknown',
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true, deleted };
      }),

    // Get media for a flight
    getMedia: protectedProcedure
      .input(z.object({ flightId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await userHasFlightAccess(input.flightId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have access",
          });
        }

        return getFlightMedia(input.flightId);
      }),

    // Get unassigned media for a project (media not in any flight)
    getUnassignedMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return getProjectUnassignedMedia(input.projectId);
      }),

    // Assign media to a flight
    assignMedia: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        flightId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the media item
        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found or you don't have permission",
          });
        }

        // If assigning to a flight, verify the flight exists and belongs to the same project
        if (input.flightId) {
          const flight = await getFlightById(input.flightId);
          if (!flight || flight.projectId !== mediaItem.projectId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid flight or flight doesn't belong to the same project",
            });
          }
        }

        const updated = await assignMediaToFlight(input.mediaId, input.flightId);
        return updated;
      }),

    // Bulk assign media to a flight
    assignMediaBulk: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1),
        flightId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; error?: string }[] = [];

        for (const mediaId of input.mediaIds) {
          try {
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            if (input.flightId) {
              const flight = await getFlightById(input.flightId);
              if (!flight || flight.projectId !== mediaItem.projectId) {
                results.push({ mediaId, success: false, error: "Invalid flight" });
                continue;
              }
            }

            await assignMediaToFlight(mediaId, input.flightId);
            results.push({ mediaId, success: true });
          } catch (error) {
            results.push({ mediaId, success: false, error: "Failed" });
          }
        }

        // Update flight media count if assigning to a flight
        if (input.flightId) {
          await updateFlightMediaCount(input.flightId);
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),
  }),

  // Watermark procedures
  watermark: router({
    // Get user's saved watermark
    getSavedWatermark: protectedProcedure
      .query(async ({ ctx }) => {
        const watermark = await getUserWatermark(ctx.user.id);
        return watermark;
      }),

    // Save/update user's watermark photo
    saveWatermark: protectedProcedure
      .input(z.object({
        watermarkData: z.string(), // Base64 encoded watermark photo
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Decode watermark from base64
          const watermarkBuffer = Buffer.from(input.watermarkData, "base64");

          // Generate unique filename
          const timestamp = Date.now();
          const fileKey = `${ctx.user.id}/watermarks/watermark_${timestamp}.png`;

          // Upload watermark to S3
          const { url } = await storagePut(
            fileKey,
            watermarkBuffer,
            "photo/png"
          );

          // Update user's watermark in database
          await updateUserWatermark(ctx.user.id, url, fileKey);

          return {
            success: true,
            url,
            fileKey,
          };
        } catch (error) {
          console.error("[Watermark] Failed to save watermark:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save watermark",
          });
        }
      }),

    // Delete user's saved watermark
    deleteWatermark: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          await deleteUserWatermark(ctx.user.id);
          return { success: true };
        } catch (error) {
          console.error("[Watermark] Failed to delete watermark:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete watermark",
          });
        }
      }),

    // Apply watermark permanently to selected media (replaces original files)
    applyPermanent: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1).max(50),
        watermarkData: z.string().optional(), // Base64 encoded watermark photo (optional if using saved)
        useSavedWatermark: z.boolean().default(false),
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; error?: string }[] = [];
        
        // Get watermark buffer
        let watermarkBuffer: Buffer;
        
        if (input.useSavedWatermark) {
          // Fetch saved watermark from S3
          const savedWatermark = await getUserWatermark(ctx.user.id);
          if (!savedWatermark?.watermarkUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No saved watermark found. Please upload a watermark first.",
            });
          }
          const wmResponse = await fetch(savedWatermark.watermarkUrl);
          if (!wmResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch saved watermark",
            });
          }
          watermarkBuffer = Buffer.from(await wmResponse.arrayBuffer());
        } else if (input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a watermark photo or use saved watermark",
          });
        }

        for (const mediaId of input.mediaIds) {
          try {
            // Get the media item
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            // Only process photos
            if (mediaItem.mediaType !== "photo") {
              results.push({ mediaId, success: false, error: "Not a photo" });
              continue;
            }

            // Fetch the original photo
            const imageResponse = await fetch(mediaItem.url);
            if (!imageResponse.ok) {
              results.push({ mediaId, success: false, error: "Failed to fetch" });
              continue;
            }
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Apply watermark to full photo
            const watermarkedBuffer = await applyWatermark(imageBuffer, watermarkBuffer, {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            });

            // Generate watermarked thumbnail
            const thumbnailBuffer = await generateThumbnail(watermarkedBuffer, 400);

            // Upload watermarked photo to S3 (replace original)
            const timestamp = Date.now();
            const ext = mediaItem.filename.split(".").pop() || "jpg";
            const baseName = mediaItem.filename.replace(/\.[^.]+$/, "").replace(/_watermarked_\d+$/, "");
            const newFilename = `${baseName}_wm_${timestamp}.${ext}`;
            const fileKey = `${ctx.user.id}/media/${newFilename}`;
            const thumbnailKey = `${ctx.user.id}/thumbnails/${newFilename}`;

            const { url: newUrl } = await storagePut(
              fileKey,
              watermarkedBuffer,
              "photo/jpeg"
            );

            const { url: newThumbnailUrl } = await storagePut(
              thumbnailKey,
              thumbnailBuffer,
              "photo/jpeg"
            );

            // Update media record in database with new URLs
            await updateMediaUrls(mediaId, {
              url: newUrl,
              fileKey: fileKey,
              thumbnailUrl: newThumbnailUrl,
            });

            results.push({ mediaId, success: true });
          } catch (error) {
            console.error(`[Watermark] Failed for media ${mediaId}:`, error);
            results.push({ mediaId, success: false, error: "Processing failed" });
          }
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),

    // Apply watermark to video files permanently
    applyVideoWatermark: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        watermarkData: z.string().optional(), // Base64 encoded watermark photo (optional if using saved)
        useSavedWatermark: z.boolean().default(false),
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get watermark buffer
        let watermarkBuffer: Buffer;
        
        if (input.useSavedWatermark) {
          // Fetch saved watermark from S3
          const savedWatermark = await getUserWatermark(ctx.user.id);
          if (!savedWatermark?.watermarkUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No saved watermark found. Please upload a watermark first.",
            });
          }
          const wmResponse = await fetch(savedWatermark.watermarkUrl);
          if (!wmResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch saved watermark",
            });
          }
          watermarkBuffer = Buffer.from(await wmResponse.arrayBuffer());
        } else if (input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a watermark photo or use saved watermark",
          });
        }

        // Get the media item
        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Only process videos
        if (mediaItem.mediaType !== "video") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This media is not a video",
          });
        }

        try {
          // Fetch the original video
          console.log(`[VideoWatermark] Fetching video: ${mediaItem.url}`);
          const videoResponse = await fetch(mediaItem.url);
          if (!videoResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch video",
            });
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          console.log(`[VideoWatermark] Video size: ${Math.round(videoBuffer.length / 1024 / 1024)}MB`);

          // Apply watermark to video
          console.log(`[VideoWatermark] Applying watermark...`);
          const watermarkedBuffer = await applyVideoWatermarkFromBuffers(
            videoBuffer,
            watermarkBuffer,
            {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            }
          );
          console.log(`[VideoWatermark] Watermarked video size: ${Math.round(watermarkedBuffer.length / 1024 / 1024)}MB`);

          // Upload watermarked video to S3
          const timestamp = Date.now();
          const ext = mediaItem.filename.split(".").pop() || "mp4";
          const baseName = mediaItem.filename.replace(/\.[^.]+$/, "").replace(/_wm_\d+$/, "");
          const newFilename = `${baseName}_wm_${timestamp}.${ext}`;
          const fileKey = `projects/${mediaItem.projectId}/videos/${newFilename}`;

          console.log(`[VideoWatermark] Uploading to S3: ${fileKey}`);
          const { url: newUrl } = await storagePut(
            fileKey,
            watermarkedBuffer,
            "video/mp4"
          );

          // Update media record in database with new URL
          await updateMediaUrls(input.mediaId, {
            url: newUrl,
            fileKey: fileKey,
          });

          console.log(`[VideoWatermark] Successfully watermarked video: ${newFilename}`);
          return {
            success: true,
            url: newUrl,
            filename: newFilename,
          };
        } catch (error) {
          console.error(`[VideoWatermark] Failed for media ${input.mediaId}:`, error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to watermark video",
          });
        }
      }),

    // Legacy: Apply watermark and return for download (not permanent)
    applyBatch: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1).max(50),
        watermarkData: z.string(), // Base64 encoded watermark photo
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; url?: string; filename?: string; error?: string }[] = [];
        const watermarkBuffer = Buffer.from(input.watermarkData, "base64");

        for (const mediaId of input.mediaIds) {
          try {
            // Get the media item
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            // Only process photos
            if (mediaItem.mediaType !== "photo") {
              results.push({ mediaId, success: false, error: "Not a photo" });
              continue;
            }

            // Fetch the original photo
            const imageResponse = await fetch(mediaItem.url);
            if (!imageResponse.ok) {
              results.push({ mediaId, success: false, error: "Failed to fetch" });
              continue;
            }
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Apply watermark
            const watermarkedBuffer = await applyWatermark(imageBuffer, watermarkBuffer, {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            });

            // Generate new filename for download
            const timestamp = Date.now();
            const ext = mediaItem.filename.split(".").pop() || "jpg";
            const baseName = mediaItem.filename.replace(/\.[^.]+$/, "");
            const newFilename = `${baseName}_watermarked_${timestamp}.${ext}`;
            const fileKey = `${ctx.user.id}/temp/${newFilename}`;

            // Upload watermarked photo to S3 temp folder
            const { url: newUrl } = await storagePut(
              fileKey,
              watermarkedBuffer,
              "photo/jpeg"
            );

            results.push({
              mediaId,
              success: true,
              url: newUrl,
              filename: newFilename,
            });
          } catch (error) {
            console.error(`[Watermark] Failed for media ${mediaId}:`, error);
            results.push({ mediaId, success: false, error: "Processing failed" });
          }
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),
  }),

  // Report generation procedures
  report: router({
    // Generate project report
    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        mediaIds: z.array(z.number()),
        resolution: z.enum(["high", "medium", "low", "thumbnail"]).default("medium"),
        mapStyle: z.enum(["roadmap", "satellite", "hybrid", "terrain"]).default("hybrid"),
        showFlightPath: z.boolean().default(true),
        includeWatermark: z.boolean().default(false),
        watermarkData: z.string().optional(),
        watermarkPosition: z.enum(["top-left", "top-right", "center", "bottom-left", "bottom-right"]).default("bottom-right"),
        watermarkOpacity: z.number().min(10).max(100).default(70),
        watermarkScale: z.number().min(5).max(50).default(15),
        userLogoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user has access to the project
        const project = await getProjectWithAccess(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        // Get selected media
        const allMedia = await getProjectMediaWithAccess(input.projectId, ctx.user.id) || [];
        const selectedMedia = input.mediaIds.length > 0
          ? allMedia.filter(m => input.mediaIds.includes(m.id))
          : allMedia;

        // Import report functions
        const { generateReportHtml, processImageForReport, generateStaticMapUrl, RESOLUTION_PRESETS } = await import("./report");

        // Prepare watermark buffer if needed
        let watermarkBuffer: Buffer | undefined;
        if (input.includeWatermark && input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        }

        // Process media images
        const mediaImages: { filename: string; dataUrl: string; media: typeof selectedMedia[0] }[] = [];
        for (const media of selectedMedia) {
          if (media.mediaType !== "photo") continue;

          try {
            // Fetch original photo
            const response = await fetch(media.url);
            if (!response.ok) continue;
            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Process photo (resize and optionally watermark)
            const processedBuffer = await processImageForReport(
              imageBuffer,
              input.resolution,
              watermarkBuffer ? {
                watermarkBuffer,
                position: input.watermarkPosition,
                opacity: input.watermarkOpacity,
                scale: input.watermarkScale,
              } : undefined
            );

            // Convert to base64 data URL
            const dataUrl = `data:photo/jpeg;base64,${processedBuffer.toString("base64")}`;
            mediaImages.push({ filename: media.filename, dataUrl, media });
          } catch (error) {
            console.error(`[Report] Failed to process media ${media.id}:`, error);
          }
        }

        // Generate static map photo
        let mapImageDataUrl: string | null = null;
        const gpsMedia = selectedMedia.filter(m => m.latitude && m.longitude);
        if (gpsMedia.length > 0) {
          const { fetchStaticMapAsDataUrl } = await import("./report");
          mapImageDataUrl = await fetchStaticMapAsDataUrl(selectedMedia, {
            mapStyle: input.mapStyle,
            showFlightPath: input.showFlightPath,
          });
        }

        // Use project logo if available, otherwise fall back to user-provided logo
        const logoUrl = project.logoUrl || input.userLogoUrl;

        // Load MAPIT logo as base64 data URL
        let skyVeeLogoDataUrl: string | undefined;
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const possiblePaths = [
            path.join(process.cwd(), 'client', 'public', 'images', 'mapit-logo-header.png'),
            path.join(process.cwd(), 'public', 'images', 'mapit-logo-header.png'),
            path.join(process.cwd(), 'dist', 'public', 'images', 'mapit-logo-header.png'),
          ];
          let logoBuffer: Buffer | null = null;
          for (const logoPath of possiblePaths) {
            try {
              logoBuffer = await fs.readFile(logoPath);
              console.log('[Report] Loaded MAPIT logo from:', logoPath);
              break;
            } catch (e) {
              // Try next path
            }
          }
          if (logoBuffer) {
            skyVeeLogoDataUrl = `data:photo/png;base64,${logoBuffer.toString('base64')}`;
          }
        } catch (error) {
          console.error('[Report] Failed to load MAPIT logo:', error);
        }

        // Generate HTML report
        const html = generateReportHtml(
          project,
          mediaImages,
          mapImageDataUrl || null,
          new Date(),
          logoUrl || undefined,
          skyVeeLogoDataUrl
        );

        return {
          html,
          projectName: project.name,
          mediaCount: mediaImages.length,
          resolution: RESOLUTION_PRESETS[input.resolution].label,
        };
      }),

    // Get resolution presets
    getResolutionPresets: publicProcedure.query(async () => {
      const { RESOLUTION_PRESETS } = await import("./report");
      return Object.entries(RESOLUTION_PRESETS).map(([key, value]) => ({
        key,
        ...value,
      }));
    }),

    // Generate PDF from HTML report
    downloadPdf: protectedProcedure
      .input(z.object({
        html: z.string(),
        projectName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePdfFromHtml } = await import("./pdfGenerator");
        
        // Log HTML size for debugging
        const htmlSizeMB = (input.html.length / 1024 / 1024).toFixed(2);
        console.log(`[Report] Generating PDF from HTML (${htmlSizeMB} MB)`);
        
        // Warn if HTML is very large (>50MB)
        if (input.html.length > 50 * 1024 * 1024) {
          console.warn(`[Report] WARNING: HTML size is very large (${htmlSizeMB} MB), this may cause timeout or memory issues`);
        }
        
        try {
          const pdfBuffer = await generatePdfFromHtml(input.html);
          
          console.log(`[Report] PDF generated successfully (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
          
          // Return as base64 encoded string
          return {
            pdfData: pdfBuffer.toString("base64"),
            filename: `${input.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_Report_${new Date().toISOString().split("T")[0]}.pdf`,
          };
        } catch (error: any) {
          console.error("[Report] Failed to generate PDF:", error);
          console.error("[Report] Error details:", {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n'),
            htmlSize: htmlSizeMB + ' MB',
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate PDF: ${error.message || 'Unknown error'}`,
          });
        }
      }),

    // Email PDF report
    emailReport: protectedProcedure
      .input(z.object({
        html: z.string(),
        projectName: z.string(),
        recipientEmail: z.string().email(),
        pdfBase64: z.string().optional(), // Client-generated PDF
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendReportEmail } = await import("./emailReport");
        
        // Log size for debugging
        if (input.pdfBase64) {
          const pdfSizeMB = (input.pdfBase64.length * 0.75 / 1024 / 1024).toFixed(2);
          console.log(`[Email Report] Using client-generated PDF (${pdfSizeMB} MB) to ${input.recipientEmail}`);
        } else {
          const htmlSizeMB = (input.html.length / 1024 / 1024).toFixed(2);
          console.log(`[Email Report] Preparing to email report (HTML: ${htmlSizeMB} MB) to ${input.recipientEmail}`);
          
          if (input.html.length > 50 * 1024 * 1024) {
            console.warn(`[Email Report] WARNING: HTML size is very large (${htmlSizeMB} MB), this may cause timeout or memory issues`);
          }
        }
        
        try {
          const result = await sendReportEmail({
            to: input.recipientEmail,
            projectName: input.projectName,
            html: input.html,
            pdfBase64: input.pdfBase64, // Pass client-generated PDF
            senderName: ctx.user.name || 'Mapit User',
            userId: ctx.user.id,
          });
          
          if (!result.success) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: result.error || 'Failed to send email',
            });
          }
          
          console.log(`[Email Report] Report emailed successfully to ${input.recipientEmail}`);
          
          return {
            success: true,
            message: `Report sent to ${input.recipientEmail}`,
          };
        } catch (error: any) {
          console.error("[Email Report] Failed to email report:", error);
          console.error("[Email Report] Error details:", {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n'),
            hasPdfBase64: !!input.pdfBase64,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to email report: ${error.message || 'Unknown error'}`,
          });
        }
      }),

    // Generate flight report
    generateFlight: protectedProcedure
      .input(z.object({
        flightId: z.number(),
        mediaIds: z.array(z.number()),
        resolution: z.enum(["high", "medium", "low", "thumbnail"]).default("medium"),
        mapStyle: z.enum(["roadmap", "satellite", "hybrid", "terrain"]).default("hybrid"),
        showFlightPath: z.boolean().default(true),
        includeWatermark: z.boolean().default(false),
        watermarkData: z.string().optional(),
        watermarkPosition: z.enum(["top-left", "top-right", "center", "bottom-left", "bottom-right"]).default("bottom-right"),
        watermarkOpacity: z.number().min(10).max(100).default(70),
        watermarkScale: z.number().min(5).max(50).default(15),
        userLogoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get flight with access check
        const flight = await getFlightById(input.flightId);
        if (!flight) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have access",
          });
        }

        // Get flight media
        const allMedia = await getMediaByFlight(input.flightId, ctx.user.id) || [];
        const selectedMedia = input.mediaIds.length > 0
          ? allMedia.filter(m => input.mediaIds.includes(m.id))
          : allMedia;

        // Import report functions
        const { generateReportHtml, processImageForReport, generateStaticMapUrl, RESOLUTION_PRESETS } = await import("./report");

        // Prepare watermark buffer if needed
        let watermarkBuffer: Buffer | undefined;
        if (input.includeWatermark && input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        }

        // Process media images
        const mediaImages: { filename: string; dataUrl: string; media: typeof selectedMedia[0] }[] = [];
        for (const media of selectedMedia) {
          if (media.mediaType !== "photo") continue;

          try {
            // Fetch original photo
            const response = await fetch(media.url);
            if (!response.ok) continue;
            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Process photo (resize and optionally watermark)
            const processedBuffer = await processImageForReport(
              imageBuffer,
              input.resolution,
              watermarkBuffer ? {
                watermarkBuffer,
                position: input.watermarkPosition,
                opacity: input.watermarkOpacity,
                scale: input.watermarkScale,
              } : undefined
            );

            // Convert to base64 data URL
            const dataUrl = `data:photo/jpeg;base64,${processedBuffer.toString("base64")}`;
            mediaImages.push({ filename: media.filename, dataUrl, media });
          } catch (error) {
            console.error(`[Report] Failed to process media ${media.id}:`, error);
          }
        }

        // Generate static map photo
        let mapImageDataUrl: string | null = null;
        const gpsMedia = selectedMedia.filter(m => m.latitude && m.longitude);
        if (gpsMedia.length > 0) {
          const { fetchStaticMapAsDataUrl } = await import("./report");
          mapImageDataUrl = await fetchStaticMapAsDataUrl(selectedMedia, {
            mapStyle: input.mapStyle,
            showFlightPath: input.showFlightPath,
          });
        }

        // Load logos
        const logoUrl = input.userLogoUrl;
        let skyVeeLogoDataUrl: string | undefined;
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const possiblePaths = [
            path.join(process.cwd(), 'client', 'public', 'images', 'mapit-logo-header.png'),
            path.join(process.cwd(), 'public', 'images', 'mapit-logo-header.png'),
            path.join(process.cwd(), 'dist', 'public', 'images', 'mapit-logo-header.png'),
          ];
          let logoBuffer: Buffer | null = null;
          for (const logoPath of possiblePaths) {
            try {
              logoBuffer = await fs.readFile(logoPath);
              console.log('[Report] Loaded MAPIT logo from:', logoPath);
              break;
            } catch (e) {
              // Try next path
            }
          }
          if (logoBuffer) {
            skyVeeLogoDataUrl = `data:photo/png;base64,${logoBuffer.toString('base64')}`;
          }
        } catch (error) {
          console.error('[Report] Failed to load MAPIT logo:', error);
        }

        // Get the parent project for full report data
        const project = await getProjectById(flight.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent project not found",
          });
        }

        // Create a project-like object for the report generator with flight info
        const projectForReport = {
          ...project,
          name: `${project.name} - ${flight.name}`,
          dronePilot: flight.dronePilot || project.dronePilot || '',
          faaLicenseNumber: flight.faaLicenseNumber || project.faaLicenseNumber || '',
          laancAuthNumber: flight.laancAuthNumber || project.laancAuthNumber || '',
        };

        // Generate HTML report
        const html = generateReportHtml(
          projectForReport,
          mediaImages,
          mapImageDataUrl || null,
          new Date(),
          logoUrl || undefined,
          skyVeeLogoDataUrl
        );

        return {
          html,
          projectName: flight.name,
          mediaCount: mediaImages.length,
          resolution: RESOLUTION_PRESETS[input.resolution].label,
        };
      }),
  }),

  // ==================== Project Logo ====================
  projectLogo: router({
    // Get project logo
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const logo = await getProjectLogo(input.projectId, ctx.user.id);
        return logo;
      }),

    // Upload project logo
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        // Validate file type
        if (!input.mimeType.startsWith("photo/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only photo files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Upload to S3
        const fileKey = `projects/${input.projectId}/logo-${nanoid()}.${input.filename.split('.').pop()}`;
        const result = await storagePut(fileKey, fileBuffer, input.mimeType);
        const url = result.url;

        // Update project record
        const updated = await updateProjectLogo(input.projectId, ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete project logo
    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deletedKey = await deleteProjectLogo(input.projectId, ctx.user.id);
        return { success: true, deletedKey };
      }),
  }),

  // ==================== User Logo ====================
  logo: router({
    // Get current user's logo
    get: protectedProcedure.query(async ({ ctx }) => {
      const logo = await getUserLogo(ctx.user.id);
      return logo;
    }),

    // Upload user logo
    upload: protectedProcedure
      .input(z.object({
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
      // Check if user is a client user with viewer role - viewers cannot upload
        const clientAccess = await getUserClientAccess(ctx.user.id);
        if (clientAccess.length > 0 && clientAccess[0].role === 'viewer') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Viewers cannot upload media",
          });
        }

        // Validate file type
        if (!input.mimeType.startsWith("photo/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only photo files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Delete existing logo if present
        const existingLogo = await getUserLogo(ctx.user.id);
        if (existingLogo?.logoKey) {
          // Note: We don't delete from S3 to avoid orphaned files issues
          // The old logo will be replaced
        }

        // Upload to S3
        const fileKey = `users/${ctx.user.id}/logo-${nanoid()}.${input.filename.split('.').pop()}`;
        const result = await storagePut(fileKey, fileBuffer, input.mimeType);
        const url = result.url;

        // Update user record
        const updated = await updateUserLogo(ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete user logo
    delete: protectedProcedure.mutation(async ({ ctx }) => {
      const deletedKey = await deleteUserLogo(ctx.user.id);
      return { success: true, deletedKey };
    }),
  }),

  // ==================== User Pilot Settings ====================
  pilotSettings: router({
    // Get current user's pilot settings
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserPilotSettings(ctx.user.id);
      return settings;
    }),

    // Update user pilot settings
    update: protectedProcedure
      .input(z.object({
        defaultDronePilot: z.string().max(255).nullable().optional(),
        defaultFaaLicenseNumber: z.string().max(100).nullable().optional(),
        defaultLaancAuthNumber: z.string().max(100).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateUserPilotSettings(ctx.user.id, {
          defaultDronePilot: input.defaultDronePilot,
          defaultFaaLicenseNumber: input.defaultFaaLicenseNumber,
          defaultLaancAuthNumber: input.defaultLaancAuthNumber,
        });
        return {
          success: true,
          defaultDronePilot: updated.defaultDronePilot,
          defaultFaaLicenseNumber: updated.defaultFaaLicenseNumber,
          defaultLaancAuthNumber: updated.defaultLaancAuthNumber,
        };
      }),
  }),

  // Warranty management procedures
  warranty: router({
    // Get warranty reminder for a project
    getReminder: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user has access to project
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        return getProjectWarrantyReminder(input.projectId);
      }),

    // Update project warranty dates
    updateWarrantyDates: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        warrantyStartDate: z.string().nullable(),
        warrantyEndDate: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const startDate = input.warrantyStartDate ? new Date(input.warrantyStartDate) : null;
        const endDate = input.warrantyEndDate ? new Date(input.warrantyEndDate) : null;

        await updateProjectWarranty(input.projectId, ctx.user.id, startDate, endDate);
        return { success: true };
      }),

    // Create or update warranty reminder
    saveReminder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        reminderEmail: z.string().email(),
        intervals: z.array(z.number()), // [3, 6, 9] months before expiry
        emailSubject: z.string().optional(),
        emailMessage: z.string().optional(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        // Check if warranty dates are set
        if (!project.warrantyEndDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please set warranty dates before configuring reminders",
          });
        }

        // Calculate next reminder date based on intervals
        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        let nextReminderDate: Date | null = null;

        // Sort intervals in descending order (9, 6, 3)
        const sortedIntervals = [...input.intervals].sort((a, b) => b - a);
        
        for (const monthsBefore of sortedIntervals) {
          const reminderDate = new Date(warrantyEndDate);
          reminderDate.setMonth(reminderDate.getMonth() - monthsBefore);
          
          if (reminderDate > now) {
            nextReminderDate = reminderDate;
          }
        }

        const intervalsJson = JSON.stringify(input.intervals);

        // Check if reminder already exists
        const existingReminder = await getProjectWarrantyReminder(input.projectId);

        if (existingReminder) {
          // Update existing reminder
          await updateWarrantyReminder(existingReminder.id, ctx.user.id, {
            reminderEmail: input.reminderEmail,
            intervals: intervalsJson,
            emailSubject: input.emailSubject || null,
            emailMessage: input.emailMessage || null,
            enabled: input.enabled ? "yes" : "no",
            nextReminderDate,
          });
          return { success: true, id: existingReminder.id };
        } else {
          // Create new reminder
          const id = await createWarrantyReminder({
            projectId: input.projectId,
            userId: ctx.user.id,
            reminderEmail: input.reminderEmail,
            intervals: intervalsJson,
            emailSubject: input.emailSubject,
            emailMessage: input.emailMessage,
            enabled: input.enabled ? "yes" : "no",
            nextReminderDate,
          });
          return { success: true, id };
        }
      }),

    // Delete warranty reminder
    deleteReminder: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reminder = await getProjectWarrantyReminder(input.projectId);
        if (!reminder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Warranty reminder not found",
          });
        }

        await deleteWarrantyReminder(reminder.id, ctx.user.id);
        return { success: true };
      }),

    // Send test reminder email
    sendTestReminder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        if (!project.warrantyStartDate || !project.warrantyEndDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Warranty dates must be set to send test reminder",
          });
        }

        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        const monthsRemaining = Math.ceil(
          (warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || "https://skyveemapit.manus.space";
        const projectUrl = `${baseUrl}/project/${project.id}`;

        // Warranty reminder email - using test email for now
        const result = await sendTestEmail({
          to: input.email,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to send test email",
          });
        }

        return { success: true };
      }),

    // Process due reminders (called by scheduled job)
    processDueReminders: protectedProcedure.mutation(async ({ ctx }) => {
      // Only allow admin users to trigger this
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can trigger reminder processing",
        });
      }

      const dueReminders = await getDueWarrantyReminders();
      const results: { projectId: number; success: boolean; error?: string }[] = [];

      for (const { reminder, project, user } of dueReminders) {
        if (!project.warrantyStartDate || !project.warrantyEndDate) continue;

        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        const monthsRemaining = Math.ceil(
          (warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || "https://skyveemapit.manus.space";
        const projectUrl = `${baseUrl}/project/${project.id}`;

        // Warranty reminder email - using test email for now
        const result = await sendTestEmail({
          to: reminder.reminderEmail,
        });

        results.push({
          projectId: project.id,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          // Calculate next reminder date
          const intervals: number[] = JSON.parse(reminder.intervals);
          const sortedIntervals = [...intervals].sort((a, b) => b - a);
          let nextReminderDate: Date | null = null;

          for (const monthsBefore of sortedIntervals) {
            const reminderDate = new Date(warrantyEndDate);
            reminderDate.setMonth(reminderDate.getMonth() - monthsBefore);
            
            if (reminderDate > now) {
              nextReminderDate = reminderDate;
            }
          }

          // Update reminder with last sent time and next reminder date
          await updateWarrantyReminder(reminder.id, reminder.userId, {
            lastSentAt: now,
            nextReminderDate,
          });
        }
      }

      return { processed: results.length, results };
    }),
  }),

  // Client portal management
  clientPortal: router({
    // List all clients for the current user (owner)
    list: protectedProcedure.query(async ({ ctx }) => {
      return getOwnerClients(ctx.user.id);
    }),

    // Get current user's client access (roles and permissions)
    getUserAccess: protectedProcedure.query(async ({ ctx }) => {
      return getUserClientAccess(ctx.user.id);
    }),

    // Get a single client by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.id, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return client;
      }),

    // Create a new client
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Client name is required").max(255),
          contactName: z.string().max(255).optional(),
          contactEmail: z.string().email().optional().or(z.literal("")),
          phone: z.string().max(50).optional(),
          address: z.string().max(500).optional(),
          logoUrl: z.string().max(500).optional(),
          logoKey: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createClient({
          ownerId: ctx.user.id,
          name: input.name,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          phone: input.phone || null,
          address: input.address || null,
          logoUrl: input.logoUrl || null,
          logoKey: input.logoKey || null,
        });
      }),

    // Update a client
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          contactName: z.string().max(255).nullable().optional(),
          contactEmail: z.string().email().nullable().optional().or(z.literal("")),
          phone: z.string().max(50).nullable().optional(),
          address: z.string().max(500).nullable().optional(),
          logoUrl: z.string().max(500).nullable().optional(),
          logoKey: z.string().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const client = await updateClient(id, ctx.user.id, updates);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return client;
      }),

    // Delete a client (webmaster only, soft-delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only webmaster can delete clients' });
        }
        const client = await getOwnerClient(input.id, ctx.user.id);
        const success = await softDeleteClient(input.id, ctx.user.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        await createAuditLogEntry({
          action: 'delete',
          entityType: 'client',
          entityId: input.id,
          entityName: client?.name ?? 'Unknown',
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true };
      }),

    // Get client logo
    getLogo: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const logo = await getClientLogo(input.clientId, ctx.user.id);
        return logo;
      }),

    // Upload client logo
    uploadLogo: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file type
        if (!input.mimeType.startsWith("photo/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only photo files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Upload to S3
        const fileKey = `clients/${input.clientId}/logo-${nanoid()}.${input.filename.split('.').pop()}`;
        const result = await storagePut(fileKey, fileBuffer, input.mimeType);
        const url = result.url;

        // Update client record
        const updated = await updateClientLogo(input.clientId, ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete client logo
    deleteLogo: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deletedKey = await deleteClientLogo(input.clientId, ctx.user.id);
        return { success: true, deletedKey };
      }),

    // Get projects assigned to a client
    getProjects: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user has access to this client (owner or client user)
        const hasAccess = await userHasClientAccess(input.clientId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this client",
          });
        }
        return getClientProjects(input.clientId);
      }),

    // Assign a project to a client
    assignProject: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          clientId: z.number().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await assignProjectToClient(
          input.projectId,
          input.clientId,
          ctx.user.id
        );
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project or client not found",
          });
        }
        return project;
      }),

    // Get clients the current user has access to (as a client user)
    getMyClientAccess: protectedProcedure.query(async ({ ctx }) => {
      return getUserClientAccess(ctx.user.id);
    }),

    // Get users for a client
    getUsers: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return getClientUsers(input.clientId);
      }),

    // Change a user's role in a client
    changeUserRole: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          newRole: z.enum(["viewer", "user", "admin"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        
        // Update the user's role in the client_users table
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }
        const result = await db
          .update(clientUsers)
          .set({ role: input.newRole })
          .where(
            and(
              eq(clientUsers.clientId, input.clientId),
              eq(clientUsers.userId, input.userId)
            )
          )
          .execute();
        
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found in this client",
          });
        }
        
        // Log the role change for audit trail
        console.log(`[Audit] User ${input.userId} role changed to ${input.newRole} in client ${input.clientId} by ${ctx.user.id}`);
        
        return { success: true, newRole: input.newRole, changedUserId: input.userId };
      }),

    // Remove a user from a client
    removeUser: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        await removeClientUser(input.clientId, input.userId);
        return { success: true };
      }),

    // Invite a user to a client
    invite: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          email: z.string().email(),
          role: z.enum(["viewer", "user", "admin"]).default("viewer"),
          sendEmail: z.boolean().optional().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await createClientInvitation({
          clientId: input.clientId,
          email: input.email,
          role: input.role,
          token,
          invitedBy: ctx.user.id,
          expiresAt,
        });

        // Send invitation email (only if sendEmail is true)
        const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || 'https://skyveemapit.manus.space';
        const inviteUrl = `${baseUrl}/client-invite/${token}`;
        
        let emailResult: { success: boolean; error?: string } = { success: false, error: 'Email sending skipped' };
        if (input.sendEmail !== false) {
          emailResult = await sendProjectInvitationEmail({
            to: input.email,
            inviterName: ctx.user.name || 'Mapit User',
            projectName: client.name,
            inviteLink: inviteUrl,
          });

          if (!emailResult.success) {
            console.error('[Client Invite] Failed to send email:', emailResult.error);
            // Still return success since invitation was created
          }
        }

        return {
          invitation,
          inviteUrl,
          emailSent: emailResult.success,
        };
      }),

    // Accept a client invitation
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await acceptClientInvitation(input.token, ctx.user.id);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to accept invitation",
          });
        }
        
        // Send welcome email to the new client user
        if (result.client) {
          try {
            // Get the number of projects assigned to this client
            const projects = await getClientProjects(result.client.id);
            const projectCount = projects.length;
            
            // Get the dashboard URL
            const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || 'https://skyveemapit.manus.space';
            const dashboardUrl = `${baseUrl}/dashboard`;
            
            // Send welcome email (only if user has email)
            if (ctx.user.email) {
              console.log(`[Client Welcome] Attempting to send welcome email to ${ctx.user.email}`);
              const emailResult = await sendClientWelcomeEmail({
                to: ctx.user.email,
                clientName: result.client.name,
                projectName: 'Your Project',
                loginUrl: dashboardUrl,
              });
              
              if (emailResult.success) {
                console.log(`[Client Welcome] Successfully sent welcome email to ${ctx.user.email}`);
              } else {
                console.error(`[Client Welcome] Failed to send welcome email to ${ctx.user.email}:`, emailResult.error);
              }
            } else {
              console.log('[Client Welcome] Skipping welcome email - user has no email address');
            }
          } catch (emailError) {
            // Log error but don't fail the invitation acceptance
            console.error('[Client Welcome] Exception while sending welcome email:', emailError);
          }
        }
        
        return result;
      }),

    // Get pending invitations for a client
    getPendingInvitations: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return getClientPendingInvitations(input.clientId);
      }),

    // Revoke a client invitation
    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await revokeClientInvitation(input.invitationId, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }
        return { success: true };
      }),

    // Assign multiple projects to a client
    assignProjects: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          projectIds: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this client
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        // Assign each project
        const results = [];
        for (const projectId of input.projectIds) {
          const project = await assignProjectToClient(projectId, input.clientId, ctx.user.id);
          if (project) {
            results.push(project);
          }
        }
        return results;
      }),

    // Unassign a project from a client
    unassignProject: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          projectId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this client
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        // Unassign by setting clientId to null
        const project = await assignProjectToClient(input.projectId, null, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return { success: true };
      }),

    // Get client portal data for the current user (client user view)
    getMyPortal: protectedProcedure.query(async ({ ctx }) => {
      // Get all clients this user has access to
      const clientAccess = await getUserClientAccess(ctx.user.id);
      
      // For each client, get their assigned projects
      const clientsWithProjects = await Promise.all(
        clientAccess.map(async (access) => {
          const projects = await getClientProjects(access.client.id);
          return {
            client: access.client,
            role: access.role,
            projects,
          };
        })
      );
      
      return { clients: clientsWithProjects };
    }),

    // Get a specific project for client portal view (read-only)
    getPortalProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has client access to this project
        const hasAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        
        const project = await getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        
        return project;
      }),

    // Get client invitation details by token (public - for showing invitation info before login)
    getInvitationByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invitationData = await getClientInvitationByToken(input.token);
        
        if (!invitationData) {
          return null;
        }

        const { invitation, client } = invitationData;
        
        // Get inviter details
        const inviter = await getUserById(invitation.invitedBy);

        return {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
          client: {
            id: client.id,
            name: client.name,
            logoUrl: client.logoUrl,
          },
          inviter: inviter ? {
            id: inviter.id,
            name: inviter.name,
          } : null,
        };
      }),

    // Get media for a project in client portal (read-only)
    getPortalProjectMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has client access to this project
        const hasAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        
        // Use 0 as userId since we already verified client access above
        // The getProjectMedia function requires userId but we've already authorized via client access
        const project = await getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return getProjectMedia(input.projectId, project.userId);
      }),

    // Get all users with their project assignments for a client
    getUsersWithAssignments: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { getClientUsersWithAssignments } = await import("./db");
        return getClientUsersWithAssignments(input.clientId);
      }),

    // Get projects assigned to a specific user
    getUserProjects: protectedProcedure
      .input(z.object({ clientId: z.number(), userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { getUserAssignedProjects } = await import("./db");
        return getUserAssignedProjects(input.clientId, input.userId);
      }),

    // Get all projects in client folder (for assignment UI)
    getClientProjectsForAssignment: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { getClientProjectsForAssignment } = await import("./db");
        return getClientProjectsForAssignment(input.clientId);
      }),

    // Assign a project to a user
    assignProjectToUser: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          projectId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { assignProjectToUser } = await import("./db");
        return assignProjectToUser(
          input.clientId,
          input.userId,
          input.projectId,
          ctx.user.id
        );
      }),

    // Unassign a project from a user
    unassignProjectFromUser: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          projectId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { unassignProjectFromUser } = await import("./db");
        return unassignProjectFromUser(
          input.clientId,
          input.userId,
          input.projectId
        );
      }),

    // Transfer a project between users
    transferProject: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          fromUserId: z.number(),
          toUserId: z.number(),
          projectId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { transferProjectBetweenUsers } = await import("./db");
        return transferProjectBetweenUsers(
          input.clientId,
          input.fromUserId,
          input.toUserId,
          input.projectId,
          ctx.user.id
        );
      }),

    // Bulk assign multiple projects to a user
    bulkAssignProjects: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          projectIds: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { bulkAssignProjects } = await import("./db");
        return bulkAssignProjects(
          input.clientId,
          input.userId,
          input.projectIds,
          ctx.user.id
        );
      }),

    // Bulk unassign multiple projects from a user
    bulkUnassignProjects: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          projectIds: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        const { bulkUnassignProjects } = await import("./db");
        return bulkUnassignProjects(
          input.clientId,
          input.userId,
          input.projectIds
        );
      }),
  }),

  // Project templates
  template: router({
    // List all templates for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getTemplates } = await import("./templateDb");
      return getTemplates(ctx.user.id);
    }),

    // Get a single template by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getTemplateById } = await import("./templateDb");
        const template = await getTemplateById(input.id, ctx.user.id);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }
        return template;
      }),

    // Create a new template
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          category: z.string().optional(),
          config: z.any(), // TemplateConfig object
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createTemplate } = await import("./templateDb");
        return createTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          config: input.config,
        });
      }),

    // Update an existing template
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          config: z.any().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { updateTemplate } = await import("./templateDb");
        return updateTemplate(input.id, ctx.user.id, {
          name: input.name,
          description: input.description,
          category: input.category,
          config: input.config,
        });
      }),

    // Delete a template
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteTemplate } = await import("./templateDb");
        await deleteTemplate(input.id, ctx.user.id);
        return { success: true };
      }),

    // Create a project from a template
    createProjectFromTemplate: protectedProcedure
      .input(
        z.object({
          templateId: z.number(),
          name: z.string().min(1).max(255),
          location: z.string().optional(),
          clientName: z.string().optional(),
          flightDate: z.string().optional(),
          overrides: z.any().optional(), // Additional field overrides
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getTemplateById, incrementTemplateUse, parseTemplateConfig } = await import("./templateDb");
        
        // Get the template
        const template = await getTemplateById(input.templateId, ctx.user.id);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        // Parse template config
        const config = parseTemplateConfig(template.config);

        // Create project with template defaults and user overrides
        const project = await createProject({
          userId: ctx.user.id,
          name: input.name,
          description: config.description || input.overrides?.description,
          location: input.location || config.location,
          clientName: input.clientName || config.clientName,
          status: config.status || "active",
          flightDate: input.flightDate ? new Date(input.flightDate) : undefined,
          dronePilot: config.dronePilot || input.overrides?.dronePilot,
          faaLicenseNumber: config.faaLicenseNumber || input.overrides?.faaLicenseNumber,
          laancAuthNumber: config.laancAuthNumber || input.overrides?.laancAuthNumber,
          logoUrl: config.logoUrl || input.overrides?.logoUrl,
          logoKey: config.logoKey || input.overrides?.logoKey,
        });

        // Increment template use count
        await incrementTemplateUse(input.templateId, ctx.user.id);

        return project;
      }),
  }),

  // ─── Municipal Lead Capture ───
  municipal: router({
    submitBriefingRequest: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          title: z.string().min(1),
          city: z.string().min(1),
          department: z.string().min(1),
          primaryInterest: z.string().min(1),
          timeline: z.string().optional(),
          message: z.string().optional(),
        })
      )

      .mutation(async ({ input }) => {
        const { notifyOwner } = await import('./_core/notification');
        const { sendEmail } = await import('./_core/email');

        // 1. Notify Clay (admin) via in-app notification
        const adminTitle = `[MUNICIPAL LEAD] New Request from ${input.city}`;
        const adminContent = [
          `Name: ${input.name}`,
          `Title: ${input.title}`,
          `City/Municipality: ${input.city}`,
          `Department: ${input.department}`,
          `Primary Interest: ${input.primaryInterest}`,
          input.timeline ? `Timeline: ${input.timeline}` : null,
          input.message ? `Message: ${input.message}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        // Send in-app notification
        try {
          await notifyOwner({ title: adminTitle, content: adminContent });
        } catch (e) {
          console.warn('[Municipal] notifyOwner failed:', e);
        }

        // 2. Send admin email notification to Clay
        const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background-color:#0b1120;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#111b2e;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#0891b2 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:2px;">New Municipal Lead</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;text-transform:uppercase;letter-spacing:1px;">from ${input.city}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:#e2e8f0;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#94a3b8;width:140px;">Name</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.name}</td></tr>
                <tr><td style="padding:8px 0;color:#94a3b8;">Title</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.title}</td></tr>
                <tr><td style="padding:8px 0;color:#94a3b8;">City</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.city}</td></tr>
                <tr><td style="padding:8px 0;color:#94a3b8;">Department</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.department}</td></tr>
                <tr><td style="padding:8px 0;color:#94a3b8;">Interest</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.primaryInterest}</td></tr>
                ${input.timeline ? `<tr><td style="padding:8px 0;color:#94a3b8;">Timeline</td><td style="padding:8px 0;color:#f1f5f9;font-weight:600;">${input.timeline}</td></tr>` : ''}
                ${input.message ? `<tr><td style="padding:8px 0;color:#94a3b8;vertical-align:top;">Message</td><td style="padding:8px 0;color:#f1f5f9;">${input.message}</td></tr>` : ''}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px;background-color:#0b1120;text-align:center;border-top:1px solid #1e3a5f;">
              <p style="margin:0;font-size:12px;color:#64748b;">MAPIT Municipal Lead Capture</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Send admin email (Clay gets notified)
        try {
          await sendEmail({
            to: 'clay@skyveedrones.com',
            subject: adminTitle,
            html: adminEmailHtml,
          });
        } catch (e) {
          console.warn('[Municipal] Admin email failed:', e);
        }

        // 3. Auto-responder to the lead
        const autoResponderHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background-color:#f8fafc;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#0891b2 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:2px;">MAP<span style="color:#22d3ee;">i</span>T</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Municipal Solutions</p>
            </td>
          </tr>
          <tr>
            <td style="padding:35px 30px;color:#334155;">
              <h2 style="margin:0 0 16px;color:#1e40af;font-size:22px;font-weight:600;">
                Hey ${input.name}!
              </h2>
              
              <p style="margin:0 0 20px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #ffffff;">${input.name}</strong> thinks you'd love Mapit &mdash; the drone mapping platform that turns aerial footage into powerful, interactive maps and project data.
              </p>
              
              <p style="margin:0 0 10px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #04B16F;">Here's the deal:</strong>
              </p>
              
              <div style="background-color: #051419; border: 1px solid #117660; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <p style="margin: 0; line-height: 1.6; font-size: 15px; color: #b0b0b0;">
                  Sign up and upgrade to a Pro plan, and <strong style="color: #ffffff;">both you and ${input.name} get 1 month free</strong>. That's GPS tagging, interactive maps, flight path tracking, PDF overlays, and more &mdash; on the house.
                </p>
              </div>
              
              <p style="margin: 0 0 8px 0; line-height: 1.6; font-size: 14px; color: #808080;">
                What you get with Mapit:
              </p>
              <ul style="margin: 0 0 30px 0; padding-left: 20px; line-height: 1.8; font-size: 15px; color: #b0b0b0;">
                <li>Upload drone photos &amp; videos with automatic GPS extraction</li>
                <li>Interactive maps with markers, popups, and flight paths</li>
                <li>Export GPS data in KML, CSV, GeoJSON, and GPX</li>
                <li>Overlay construction plans on satellite maps</li>
                <li>Generate professional PDF reports</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #04B16F 0%, #14E114 100%);">
                    <a href="${input.inviteUrl}" style="display: inline-block; padding: 16px 40px; color: #09323B; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                      Get Started Free &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; line-height: 1.6; font-size: 13px; color: #606060; text-align: center;">
                Or copy this link: <a href="${input.inviteUrl}" style="color: #04B16F; text-decoration: none; word-break: break-all;">${input.inviteUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #051419; text-align: center; border-top: 1px solid #117660;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #808080;">
                &copy; 2026 Mapit by SkyVee Drones. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #606060;">
                Precision drone mapping &amp; geospatial data solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          await sendEmail({
            to: input.email,
            subject: `Municipal Briefing Request Received — ${input.city}`,
            html: autoResponderHtml,
          });
        } catch (e) {
          console.warn('[Municipal] Auto-responder email failed:', e);
        }

        console.log(`[Municipal] Lead captured: ${input.name} from ${input.city}`);

        return { success: true };
      }),
  }),

  // ==================== Trash (Soft-deleted items) ====================
  trash: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can view trash' });
      }
      return listTrashItems(ctx.user.id);
    }),
    restore: protectedProcedure
      .input(z.object({ entityType: z.enum(['project', 'media', 'flight', 'client']), entityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can restore items' });
        }
        let success = false;
        switch (input.entityType) {
          case 'project': success = await restoreProject(input.entityId); break;
          case 'media': success = !!(await restoreMedia(input.entityId)); break;
          case 'flight': success = await restoreFlight(input.entityId); break;
          case 'client': success = await restoreClient(input.entityId); break;
        }
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found in trash' });
        }
        await createAuditLogEntry({
          action: 'restore',
          entityType: input.entityType,
          entityId: input.entityId,
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true };
      }),
    permanentDelete: protectedProcedure
      .input(z.object({ entityType: z.enum(['project', 'media', 'flight', 'client']), entityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only webmaster can permanently delete items' });
        }
        await permanentlyDeleteTrashItem(input.entityType, input.entityId);
        await createAuditLogEntry({
          action: 'permanent_delete',
          entityType: input.entityType,
          entityId: input.entityId,
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
        });
        return { success: true };
      }),
  }),

  // ==================== Audit Log ====================
  auditLog: router({
    list: protectedProcedure
      .input(z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        action: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can view audit log' });
        }
        return listAuditLog(input ?? {});
      }),
    count: protectedProcedure
      .input(z.object({
        entityType: z.string().optional(),
        action: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'webmaster') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin or webmaster can view audit log' });
        }
        return countAuditLog(input ?? {});
      }),
  }),

  referral: router({
    /** Send a referral email and store the referral in the database */
    send: protectedProcedure
      .input(z.object({
        refereeName: z.string().min(1).max(255),
        refereeEmail: z.string().email().max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check if this email was already referred by this user
        const existing = await db.select()
          .from(referrals)
          .where(and(
            eq(referrals.referrerId, ctx.user.id),
            eq(referrals.refereeEmail, input.refereeEmail.toLowerCase())
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You have already sent a referral to this email address.',
          });
        }

        // Build referral slug
        const firstName = (ctx.user.name ?? 'pilot').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const slug = `${firstName}${ctx.user.id}`;
        const referralLink = `https://mapit.skyveedrones.com/signup?ref=${slug}`;

        // Build branded email HTML
        const emailHtml = buildReferralEmailHtml({
          referrerName: ctx.user.name ?? 'A Mapit user',
          refereeName: input.refereeName,
          referralLink,
        });

        // Send the email
        const { sendEmail } = await import('./_core/email');
        const emailSent = await sendEmail({
          to: input.refereeEmail.toLowerCase(),
          subject: `${ctx.user.name ?? 'A colleague'} invited you to try Mapit`,
          html: emailHtml,
        });

        // Store the referral
        const [inserted] = await db.insert(referrals).values({
          referrerId: ctx.user.id,
          refereeName: input.refereeName,
          refereeEmail: input.refereeEmail.toLowerCase(),
          status: 'pending',
          emailSent,
        });

        return {
          id: inserted.insertId,
          emailSent,
          message: emailSent
            ? `Referral email sent to ${input.refereeName}!`
            : `Referral saved but email could not be sent. They can still use your link.`,
        };
      }),

    /** List all referrals sent by the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const rows = await db.select()
        .from(referrals)
        .where(eq(referrals.referrerId, ctx.user.id))
        .orderBy(desc(referrals.createdAt));
      return rows;
    }),

    /** Get referral stats for the current user */
    stats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const rows = await db.select()
        .from(referrals)
        .where(eq(referrals.referrerId, ctx.user.id));

      const totalSent = rows.length;
      const signedUp = rows.filter(r => r.status === 'signed_up' || r.status === 'converted').length;
      const converted = rows.filter(r => r.status === 'converted').length;

      return { totalSent, signedUp, converted, monthsEarned: converted };
    }),
  }),

  organization: router({
    /** Get the current user's organization (null if not onboarded) */
    getMyOrg: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.organizationId) return null;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const rows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId)).limit(1);
      return rows[0] ?? null;
    }),

    /** Create a new organization and link it to the current user */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        logoUrl: z.string().url().optional(),
        brandColor: z.string().max(20).optional(),
        type: z.enum(['drone_service_provider', 'municipality', 'engineering_firm', 'other']).default('drone_service_provider'),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const [result] = await db.insert(organizations).values({
          name: input.name,
          logoUrl: input.logoUrl,
          brandColor: input.brandColor,
          type: input.type,
        });
        const orgId = (result as { insertId: number }).insertId;
        await db.update(users)
          .set({ organizationId: orgId, orgRole: 'PROVIDER' })
          .where(eq(users.id, ctx.user.id));
        const rows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        return rows[0];
      }),

    /** Update an existing organization */
    update: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        logoUrl: z.string().url().optional().nullable(),
        brandColor: z.string().max(20).optional().nullable(),
        type: z.enum(['drone_service_provider', 'municipality', 'engineering_firm', 'other']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.organizationId) throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization linked' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
        if (input.brandColor !== undefined) updateData.brandColor = input.brandColor;
        if (input.type !== undefined) updateData.type = input.type;
        await db.update(organizations).set(updateData).where(eq(organizations.id, ctx.user.organizationId));
        const rows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId)).limit(1);
        return rows[0];
      }),

    /** Upload logo to S3 and return URL */
    uploadLogo: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const buffer = Buffer.from(input.base64, 'base64');
        const ext = input.fileName.split('.').pop() || 'png';
        const key = `org-logos/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key };
      }),
    /**
     * Returns the provider org's branding (logo + brand color) for the client portal.
     * The provider is the owner of the client that the current user belongs to.
     */
    getProviderBranding: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      // Find the client(s) this user has access to and get the owner (provider)
      const clientUserRows = await db
        .select({ ownerId: clients.ownerId })
        .from(clientUsers)
        .innerJoin(clients, eq(clientUsers.clientId, clients.id))
        .where(eq(clientUsers.userId, ctx.user.id))
        .limit(1);
      if (!clientUserRows.length) return null;
      const providerId = clientUserRows[0].ownerId;
      // Get the provider's organizationId
      const providerRows = await db
        .select({ organizationId: users.organizationId })
        .from(users)
        .where(eq(users.id, providerId))
        .limit(1);
      if (!providerRows.length || !providerRows[0].organizationId) return null;
      // Return only the branding fields needed by the client portal header
      const orgRows = await db
        .select({
          name: organizations.name,
          logoUrl: organizations.logoUrl,
          brandColor: organizations.brandColor,
        })
        .from(organizations)
        .where(eq(organizations.id, providerRows[0].organizationId))
        .limit(1);
      return orgRows[0] ?? null;
    }),
  }),
});

/** Build the branded referral email HTML */
function buildReferralEmailHtml(params: {
  referrerName: string;
  refereeName: string;
  referralLink: string;
}): string {
  const { referrerName, refereeName, referralLink } = params;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Mapit</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09323B;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #0a1f26; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #117660 0%, #04B16F 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 2px;">
                MAP<span style="color: #14E114;">i</span>T
              </h1>
              <p style="margin: 10px 0 0; color: #e0f2f1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Elevate Your Vision
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #e0e0e0;">
              <h2 style="margin: 0 0 20px 0; color: #04B16F; font-size: 24px; font-weight: 600;">
                Hey ${refereeName}!
              </h2>
              
              <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #ffffff;">${referrerName}</strong> thinks you'd love Mapit &mdash; the drone mapping platform that turns aerial footage into powerful, interactive maps and project data.
              </p>
              
              <p style="margin: 0 0 10px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #04B16F;">Here's the deal:</strong>
              </p>
              
              <div style="background-color: #051419; border: 1px solid #117660; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <p style="margin: 0; line-height: 1.6; font-size: 15px; color: #b0b0b0;">
                  Sign up and upgrade to a Pro plan, and <strong style="color: #ffffff;">both you and ${refereeName} get 1 month free</strong>. That's GPS tagging, interactive maps, flight path tracking, PDF overlays, and more &mdash; on the house.
                </p>
              </div>
              
              <p style="margin: 0 0 8px 0; line-height: 1.6; font-size: 14px; color: #808080;">
                What you get with Mapit:
              </p>
              <ul style="margin: 0 0 30px 0; padding-left: 20px; line-height: 1.8; font-size: 15px; color: #b0b0b0;">
                <li>Upload drone photos &amp; videos with automatic GPS extraction</li>
                <li>Interactive maps with markers, popups, and flight paths</li>
                <li>Export GPS data in KML, CSV, GeoJSON, and GPX</li>
                <li>Overlay construction plans on satellite maps</li>
                <li>Generate professional PDF reports</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #04B16F 0%, #14E114 100%);">
                    <a href="${referralLink}" style="display: inline-block; padding: 16px 40px; color: #09323B; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                      Get Started Free &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; line-height: 1.6; font-size: 13px; color: #606060; text-align: center;">
                Or copy this link: <a href="${referralLink}" style="color: #04B16F; text-decoration: none; word-break: break-all;">${referralLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #051419; text-align: center; border-top: 1px solid #117660;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #808080;">
                &copy; 2026 Mapit by SkyVee Drones. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #606060;">
                Precision drone mapping &amp; geospatial data solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export type AppRouter = typeof appRouter;
