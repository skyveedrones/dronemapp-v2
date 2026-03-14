/**
 * Overlay Upload Route
 * POST /api/overlay/upload
 *
 * Accepts a multipart form with:
 *   - file: PDF, PNG, or JPG file
 *   - projectId: number
 *
 * Uploads the file to the Manus storage proxy, then inserts a row
 * into project_overlays with default corner coordinates derived from
 * the project's GPS bounding box (or [0,0] if no media exists yet).
 */
import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { projectOverlays, projects, media } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { sdk } from "../_core/sdk";

const router = Router();

// ── Session helper via SDK ────────────────────────────────────────────────
async function getSessionUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

// ── Parse raw multipart body manually (no multer dependency) ───────────────
function parseMultipart(
  req: Request
): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; originalname: string; mimetype: string } | null }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return reject(new Error("No multipart boundary found"));
    }
    const boundary = boundaryMatch[1];
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts: Buffer[] = [];
        let start = 0;
        while (start < body.length) {
          const idx = body.indexOf(boundaryBuf, start);
          if (idx === -1) break;
          if (start > 0) parts.push(body.slice(start, idx - 2)); // strip \r\n before boundary
          start = idx + boundaryBuf.length + 2; // skip boundary + \r\n
        }
        const fields: Record<string, string> = {};
        let file: { buffer: Buffer; originalname: string; mimetype: string } | null = null;
        for (const part of parts) {
          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;
          const headerStr = part.slice(0, headerEnd).toString("utf-8");
          const content = part.slice(headerEnd + 4);
          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
          if (!nameMatch) continue;
          const name = nameMatch[1];
          if (filenameMatch) {
            file = {
              buffer: content,
              originalname: filenameMatch[1],
              mimetype: mimeMatch?.[1]?.trim() || "application/octet-stream",
            };
          } else {
            fields[name] = content.toString("utf-8");
          }
        }
        resolve({ fields, file });
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// ── Default 4-corner coordinates centred on project GPS data ───────────────
async function getDefaultCoordinates(
  projectId: number
): Promise<[[number, number], [number, number], [number, number], [number, number]]> {
  const db = await getDb();
  if (!db) return [[-97.1, 32.8], [-97.0, 32.8], [-97.0, 32.7], [-97.1, 32.7]];

  const rows = await db
    .select({ lat: media.latitude, lng: media.longitude })
    .from(media)
    .where(and(eq(media.projectId, projectId)))
    .limit(200);

  const valid = rows.filter((r) => r.lat != null && r.lng != null) as { lat: number; lng: number }[];
  if (valid.length === 0) {
    return [[-97.1, 32.8], [-97.0, 32.8], [-97.0, 32.7], [-97.1, 32.7]];
  }

  const lats = valid.map((r) => r.lat);
  const lngs = valid.map((r) => r.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Mapbox expects [lng, lat] corner order: TL, TR, BR, BL
  return [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
  ];
}

// ── POST /api/overlay/upload ───────────────────────────────────────────────
router.post("/overlay/upload", async (req: Request, res: Response) => {
  try {
    // Auth check
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Role check — only webmaster, admin, and owner-role users may upload overlays
    const allowedRoles = ["webmaster", "admin", "user"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Parse multipart body
    const { fields, file } = await parseMultipart(req);
    const projectId = parseInt(fields.projectId, 10);
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: "projectId is required" });
    }
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate file type
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: "Only PDF, PNG, and JPG files are supported" });
    }

    // Verify the project belongs to this user (or user is webmaster)
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (project.userId !== user.id && user.role !== "webmaster" && user.role !== "admin") {
      return res.status(403).json({ error: "You do not own this project" });
    }

    // Upload file to storage
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
    const storageKey = `overlays/${user.id}/${projectId}/${nanoid(10)}.${ext}`;
    const { url: fileUrl } = await storagePut(storageKey, file.buffer, file.mimetype);

    // Get existing overlay count for version numbering
    const existingOverlays = await db
      .select({ id: projectOverlays.id })
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId));
    const versionNumber = existingOverlays.length + 1;

    // Build default corner coordinates from project GPS data
    const coordinates = await getDefaultCoordinates(projectId);

    // Insert overlay record
    await db.insert(projectOverlays).values({
      projectId,
      fileUrl,
      opacity: "0.5",
      coordinates,
      isActive: 1,
      label: `Plan v${versionNumber}`,
      version_number: versionNumber,
    });

    // Fetch the inserted record
    const [inserted] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId))
      .orderBy(projectOverlays.id)
      .limit(1)
      .offset(versionNumber - 1);

    return res.json({ success: true, overlay: inserted });
  } catch (err) {
    console.error("[Overlay Upload] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
