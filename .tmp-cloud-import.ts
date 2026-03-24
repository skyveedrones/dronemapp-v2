import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

type GpsFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    id?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number | null;
    thumbnailUrl?: string | null;
  };
};

type GpsPayload = {
  totalPoints?: number;
  features?: GpsFeature[];
};

function sqlToString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const root = path.dirname(fileURLToPath(import.meta.url));
  const payloadPath = path.join(root, "scripts", "holford-road-gps-points.json");
  const payload = JSON.parse(await fs.readFile(payloadPath, "utf8")) as GpsPayload;
  const features = Array.isArray(payload.features) ? payload.features : [];

  const dbFingerprint = await db.execute(sql.raw("SELECT DATABASE() AS db, USER() AS dbUser, @@hostname AS host, @@port AS port"));

  await db.execute(sql.raw("DELETE FROM media WHERE projectId = 1020001 AND filename LIKE 'HOLFORD_IMPORT_%'"));

  let inserted = 0;
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const [lngFromGeom, latFromGeom] = f.geometry?.coordinates ?? [undefined, undefined];
    const latitude = Number(f.properties?.latitude ?? latFromGeom);
    const longitude = Number(f.properties?.longitude ?? lngFromGeom);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const altitude = f.properties?.altitude;
    const altitudeSql = Number.isFinite(altitude as number) ? String(Number(altitude).toFixed(2)) : "NULL";
    const originalId = f.properties?.id ?? `idx-${i + 1}`;
    const safeId = String(originalId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `HOLFORD_IMPORT_${String(i + 1).padStart(3, "0")}_${safeId}.jpg`;
    const fileKey = `holford-import/${safeId}.jpg`;
    const fallbackUrl = `https://example.com/holford/${safeId}.jpg`;
    const thumbnailUrl = f.properties?.thumbnailUrl || fallbackUrl;

    await db.execute(sql.raw(
      `INSERT INTO media (projectId, userId, filename, fileKey, url, mimeType, fileSize, mediaType, latitude, longitude, altitude, thumbnailUrl)
       VALUES (1020001, 1, ${sqlToString(filename)}, ${sqlToString(fileKey)}, ${sqlToString(fallbackUrl)}, 'image/jpeg', 1, 'photo', ${latitude.toFixed(9)}, ${longitude.toFixed(9)}, ${altitudeSql}, ${sqlToString(thumbnailUrl)})`
    ));
    inserted++;
  }

  const countRs = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM media WHERE projectId=1020001 AND filename LIKE 'HOLFORD_IMPORT_%'"));
  const sampleRs = await db.execute(sql.raw("SELECT filename, latitude, longitude, altitude FROM media WHERE projectId=1020001 AND filename LIKE 'HOLFORD_IMPORT_%' ORDER BY filename ASC LIMIT 10"));

  const result = {
    declaredTotalPoints: payload.totalPoints ?? null,
    featuresInPayload: features.length,
    inserted,
    countAfterImport: Number(((countRs as any)?.[0] || [])[0]?.cnt ?? 0),
    dbFingerprint: ((dbFingerprint as any)?.[0] || [])[0] || null,
    sampleFirst10: (sampleRs as any)?.[0] || []
  };

  await fs.writeFile(path.join(root, ".tmp-cloud-import-result.json"), JSON.stringify(result, null, 2), "utf8");
  console.log("WROTE .tmp-cloud-import-result.json");
})();
