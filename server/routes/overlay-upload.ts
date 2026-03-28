/**
 * Overlay Upload Route
 * POST /api/overlay/upload
 *
 * Accepts a multipart form with:
 *   - file: PDF, PNG, or JPG file
 *   - projectId: number
 *
 * If the file is a PDF, it is rendered to a high-resolution PNG using
 * pdf-to-png-converter (pure JS, zero native deps) so that Google Maps
 * can display it as a GroundOverlay raster image.  PNG/JPG files are
 * stored as-is.
 *
 * The resulting image URL and GPS-derived corner coordinates are saved
 * to the project_overlays table.
 */
import express, { Router, Request, Response } from "express";
import { Buffer } from "buffer";
import multer from "multer";
import { getDb } from "../db";
import { projectOverlays, projects, media } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { sdk } from "../_core/sdk";

const router = Router();

// ── Multer config — store files in memory (max 50 MB) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── Session helper via SDK ────────────────────────────────────────────────
async function getSessionUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (e) {
    console.error("[Overlay Upload] Auth error:", e);
    return null;
  }
}

// ── Convert PDF to PNG: tries pdftoppm first, falls back to pure-JS ────────
// ── Try pdftoppm (poppler-utils) first — fast & high-quality ─────────────
async function pdfToPngViaPdftoppm(pdfBuffer: Buffer): Promise<Buffer> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { mkdtemp, readdir, readFile, rm } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const execFileAsync = promisify(execFile);

  const tmpDir = await mkdtemp(join(tmpdir(), "overlay-"));
  const inputPath = join(tmpDir, "input.pdf");
  const outputPrefix = join(tmpDir, "page");

  try {
    await import("fs/promises").then((fs) => fs.writeFile(inputPath, pdfBuffer));
    // -r 200 = 200 DPI, -f 1 -l 1 = first page only, -png = PNG output
    await execFileAsync("pdftoppm", ["-r", "200", "-f", "1", "-l", "1", "-png", inputPath, outputPrefix]);
    const files = (await readdir(tmpDir)).filter((f) => f.endsWith(".png"));
    if (files.length === 0) throw new Error("pdftoppm produced no PNG files");
    const pngBuffer = await readFile(join(tmpDir, files[0]));
    return pngBuffer;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Pure-JS fallback: pdf-to-png-converter (no native deps) ───────────────
async function pdfToPngViaJs(pdfBuffer: Buffer): Promise<Buffer> {
  const { pdfToPng: convert } = await import("pdf-to-png-converter");
  const arrayBuffer = (file.buffer as any).buffer;
  const pages = await convert(arrayBuffer, {
    viewportScale: 2.0,
    pagesToProcess: [1],
    disableFontFace: true,
    verbosityLevel: 0,
  });
  if (!pages || pages.length === 0 || !pages[0].content) {
    throw new Error("pdf-to-png-converter produced no output");
  }
  return Buffer.from(pages[0].content);
}

// ── Main converter: tries pdftoppm first, falls back to pure-JS ───────────
async function pdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const result = await pdfToPngViaPdftoppm(pdfBuffer);
    console.log("[Overlay Upload] PDF converted via pdftoppm");
    return result;
  } catch (err: any) {
    console.warn("[Overlay Upload] pdftoppm failed, falling back to pdf-to-png-converter:", err?.message);
  }
  const result = await pdfToPngViaJs(pdfBuffer);
  console.log("[Overlay Upload] PDF converted via pdf-to-png-converter (JS fallback)");
  return result;
}

// ── Build a bounding box around a center point with given half-size ──────
function buildBoundingBox(
  centerLat: number,
  centerLng: number,
  halfLat: number,
  halfLng: number
): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [centerLng - halfLng, centerLat + halfLat], // TL
    [centerLng + halfLng, centerLat + halfLat], // TR
    [centerLng + halfLng, centerLat - halfLat], // BR
    [centerLng - halfLng, centerLat - halfLat], // BL
  ];
}

// ── Default 4-corner coordinates centred on project GPS data ───────────────
// Falls back to project.location geocode, then a ±0.0005° box if no GPS media
async function getDefaultCoordinates(
  projectId: number
): Promise<[[number, number], [number, number], [number, number], [number, number]]> {
  const db = await getDb();
  if (!db) return buildBoundingBox(32.7767, -96.797, 0.005, 0.005);

  // ── 1. Try GPS media for this project ────────────────────────────────
  const rows = await db
    .select({ lat: media.latitude, lng: media.longitude })
    .from(media)
    .where(eq(media.projectId, projectId))
    .limit(200);

  const valid = rows.filter((r) => r.lat != null && r.lng != null);
  const lats = valid.map((r) => parseFloat(String(r.lat))).filter((v) => !isNaN(v));
  const lngs = valid.map((r) => parseFloat(String(r.lng))).filter((v) => !isNaN(v));

  if (lats.length > 0 && lngs.length > 0) {
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Add 10% padding so the overlay extends slightly beyond the markers
    const latPad = (maxLat - minLat) * 0.10 || 0.0005;
    const lngPad = (maxLng - minLng) * 0.10 || 0.0005;
    console.log(`[Overlay Upload] Coordinates from ${lats.length} GPS media points`);
    return buildBoundingBox(
      (minLat + maxLat) / 2,
      (minLng + maxLng) / 2,
      (maxLat - minLat) / 2 + latPad,
      (maxLng - minLng) / 2 + lngPad
    );
  }

  // ── 2. Fall back to project.location via geocoding ───────────────────
  // Try to geocode the project's location string using Google Maps Geocoding API
  const [project] = await db
    .select({ location: projects.location })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project?.location) {
    try {
      const { makeRequest } = await import("../_core/map");
      type GeoResult = { results: Array<{ geometry: { location: { lat: number; lng: number } } }> };
      const geoResult = await makeRequest<GeoResult>(
        `/maps/api/geocode/json?address=${encodeURIComponent(project.location)}`
      );
      const loc = geoResult?.results?.[0]?.geometry?.location;
      if (loc?.lat && loc?.lng) {
        console.log(`[Overlay Upload] Coordinates from geocoded location: "${project.location}" → ${loc.lat}, ${loc.lng}`);
        return buildBoundingBox(loc.lat, loc.lng, 0.0005, 0.0005);
      }
    } catch (geoErr: any) {
      console.warn("[Overlay Upload] Geocoding failed:", geoErr?.message);
    }
  }

  // ── 3. Last resort: GPS centroid of ALL media in the system for this user ─
  console.warn("[Overlay Upload] No GPS data or geocodable location — using default Dallas coords");
  return buildBoundingBox(32.7767, -96.797, 0.0005, 0.0005);
}

// ── POST /api/overlay/upload ───────────────────────────────────────────────
router.post("/overlay/upload", upload.single("file"), async (req: Request, res: Response) => {
  console.log("[Overlay Upload] ── Request received ──");
  console.log("[Overlay Upload] Content-Type:", req.headers["content-type"]);

  try {
    // Auth check
    const user = await getSessionUser(req);
    if (!user) {
      console.log("[Overlay Upload] Auth failed — no user");
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log("[Overlay Upload] User:", user.id, user.email, "role:", user.role);

    // Role check — only webmaster, admin, and owner-role users may upload overlays
    const allowedRoles = ["webmaster", "admin", "user"];
    if (!allowedRoles.includes(user.role)) {
      console.log("[Overlay Upload] Role rejected:", user.role);
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Get form fields from multer
    const projectId = parseInt(req.body?.projectId, 10);
    console.log("[Overlay Upload] projectId:", projectId, "raw:", req.body?.projectId);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    console.log("[Overlay Upload] File:", file ? `${file.originalname} (${file.mimetype}, ${file.size} bytes)` : "NONE");

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate file type
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      console.log("[Overlay Upload] Rejected mimetype:", file.mimetype);
      return res.status(400).json({ error: "Only PDF, PNG, and JPG files are supported" });
    }

    // Verify the project exists
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      console.log("[Overlay Upload] Project not found:", projectId);
      return res.status(404).json({ error: "Project not found" });
    }
    if (project.userId !== user.id && user.role !== "webmaster" && user.role !== "admin") {
      return res.status(403).json({ error: "You do not own this project" });
    }

    // ── Convert PDF to PNG if needed ─────────────────────────────────────
    let uploadBuffer: Buffer = file.buffer;
    let uploadMimetype: string = file.mimetype;
    let uploadExt: string = file.originalname.split(".").pop()?.toLowerCase() || "bin";

    if (file.mimetype === "application/pdf") {
      console.log("[Overlay Upload] Converting PDF to PNG via pdf-to-png-converter...");
      try {
        uploadBuffer = await pdfToPng(file.buffer);
        uploadMimetype = "image/png";
        uploadExt = "png";
        console.log("[Overlay Upload] PDF → PNG success, size:", uploadBuffer.length, "bytes");
      } catch (convErr: any) {
        console.error("[Overlay Upload] PDF conversion failed:", convErr?.message || convErr);
        return res.status(500).json({ error: "Failed to convert PDF to image. Please upload a PNG or JPG instead." });
      }
    }

    // Upload file to storage
    const storageKey = `overlays/${user.id}/${projectId}/${nanoid(10)}.${uploadExt}`;
    console.log("[Overlay Upload] Uploading to S3, key:", storageKey);
    const { url: fileUrl } = await storagePut(storageKey, uploadBuffer, uploadMimetype);
    console.log("[Overlay Upload] S3 upload success, url:", fileUrl);

    // Get existing overlay count for version numbering
    const existingOverlays = await db
      .select({ id: projectOverlays.id })
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId));
    const versionNumber = existingOverlays.length + 1;

    // Build default corner coordinates from project GPS data
    const coordinates = await getDefaultCoordinates(projectId);
    console.log("[Overlay Upload] Coordinates:", JSON.stringify(coordinates));

    // Insert overlay record (save originalCoordinates for Reset to Default)
    await db.insert(projectOverlays).values({
      projectId,
      fileUrl,
      opacity: "0.5",
      coordinates,
      originalCoordinates: coordinates,
      isActive: 1,
      label: `Plan v${versionNumber}`,
      version_number: versionNumber,
    } as any);
    console.log("[Overlay Upload] DB insert success");

    // Fetch the inserted record
    const [inserted] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId))
      .orderBy(projectOverlays.id)
      .limit(1)
      .offset(versionNumber - 1);

    console.log("[Overlay Upload] ✓ Complete — overlay id:", inserted?.id, "url:", fileUrl);
    return res.json({ success: true, overlay: inserted });
  } catch (err: any) {
    console.error("[Overlay Upload] Unhandled error:", err?.message || err);
    console.error("[Overlay Upload] Stack:", err?.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/projects/:projectId/overlays/:overlayId ─────────────────
router.delete("/projects/:projectId/overlays/:overlayId", express.json(), async (req: Request, res: Response) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = parseInt(req.params.projectId, 10);
  const overlayId = parseInt(req.params.overlayId, 10);
  if (isNaN(projectId) || isNaN(overlayId)) {
    return res.status(400).json({ error: "Invalid projectId or overlayId" });
  }

  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    // 1. Fetch the overlay to get the S3 file URL
    const [overlay] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.id, overlayId))
      .limit(1);

    if (!overlay) return res.status(404).json({ error: "Overlay not found" });

    // 2. Delete from S3 — extract the key from the URL
    if (overlay.fileUrl) {
      try {
        const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          region: process.env.AWS_REGION || "us-east-1",
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
          },
          forcePathStyle: true,
        });
        // Extract key: everything after the bucket domain
        const urlObj = new URL(overlay.fileUrl);
        const s3Key = urlObj.pathname.replace(/^\//, ""); // strip leading slash
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME || "",
          Key: s3Key,
        }));
        console.log(`[Overlay DELETE] S3 object deleted: ${s3Key}`);
      } catch (s3Err: any) {
        // Non-fatal: log but continue with DB delete
        console.warn(`[Overlay DELETE] S3 delete failed (continuing): ${s3Err?.message}`);
      }
    }

    // 3. Delete from database
    await db
      .delete(projectOverlays)
      .where(eq(projectOverlays.id, overlayId));

    console.log(`[Overlay DELETE] Deleted overlay ${overlayId} from project ${projectId}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Overlay DELETE] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to delete overlay" });
  }
});

// ── POST /api/projects/:projectId/overlays/:overlayId/reset ───────────────
// Resets coordinates back to originalCoordinates (GPS-derived bounds at upload time)
router.post("/projects/:projectId/overlays/:overlayId/reset", express.json(), async (req: Request, res: Response) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = parseInt(req.params.projectId, 10);
  const overlayId = parseInt(req.params.overlayId, 10);
  if (isNaN(projectId) || isNaN(overlayId)) {
    return res.status(400).json({ error: "Invalid projectId or overlayId" });
  }

  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const [overlay] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.id, overlayId));

    if (!overlay) return res.status(404).json({ error: "Overlay not found" });

    const resetCoords = (overlay as any).originalCoordinates || overlay.coordinates;

    await db
      .update(projectOverlays)
      .set({ coordinates: resetCoords, rotation: "0" } as any)
      .where(eq(projectOverlays.id, overlayId));

    console.log(`[Overlay RESET] Reset overlay ${overlayId} to original coordinates`);
    return res.json({ success: true, coordinates: resetCoords });
  } catch (err: any) {
    console.error("[Overlay RESET] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to reset overlay" });
  }
});

// ── PUT /api/projects/:projectId/overlays/:overlayId ─────────────────────
// Accepts EITHER:
//   { coordinates: [[lng,lat],[lng,lat],[lng,lat],[lng,lat]], rotation? }  ← preferred (raw 4-corner array)
//   { north, south, east, west, rotation? }  ← legacy cardinal bounds
// express.json() is applied inline because the router is registered before the global body parser
router.put("/projects/:projectId/overlays/:overlayId", express.json(), async (req: Request, res: Response) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = parseInt(req.params.projectId, 10);
  const overlayId = parseInt(req.params.overlayId, 10);
  if (isNaN(projectId) || isNaN(overlayId)) {
    return res.status(400).json({ error: "Invalid projectId or overlayId" });
  }

  const { coordinates: rawCoords, north, south, east, west, rotation } = req.body as {
    coordinates?: [number, number][];
    north?: number; south?: number; east?: number; west?: number; rotation?: number;
  };

  let coordinates: [number, number][];

  if (Array.isArray(rawCoords) && rawCoords.length === 4) {
    // Preferred: raw 4-corner array [[lng,lat], ...]
    coordinates = rawCoords;
  } else if (north != null && south != null && east != null && west != null) {
    // Legacy: cardinal bounds → convert to 4-corner array [TL, TR, BR, BL]
    coordinates = [
      [west, north],  // TL (NW)
      [east, north],  // TR (NE)
      [east, south],  // BR (SE)
      [west, south],  // BL (SW)
    ];
  } else {
    return res.status(400).json({ error: "Missing required: either 'coordinates' (4-corner array) or 'north, south, east, west'" });
  }

  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const updateData: Record<string, unknown> = { coordinates };
    if (rotation !== undefined) updateData.rotation = String(rotation);

    await db
      .update(projectOverlays)
      .set(updateData as any)
      .where(
        eq(projectOverlays.id, overlayId)
      );

    console.log(`[Overlay PUT] Saved coordinates for overlay ${overlayId}: ${JSON.stringify(coordinates)}`);
    return res.json({ success: true, coordinates, rotation });
  } catch (err: any) {
    console.error("[Overlay PUT] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to save overlay bounds" });
  }
});

export default router;
