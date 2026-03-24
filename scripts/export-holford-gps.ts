/**
 * export-holford-gps.ts
 * Exports all GPS points from the HOLFORD ROAD RECONSTRUCTION project as GeoJSON.
 * Run: npx tsx scripts/export-holford-gps.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";
import { writeFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const [rows] = await conn.execute<mysql.RowDataPacket[]>(
  `SELECT id, filename, latitude, longitude, altitude, mediaType, capturedAt, createdAt,
          cloudinaryUrl, cloudinaryPublicId, notes
   FROM media
   WHERE projectId = 540001
     AND latitude IS NOT NULL
     AND longitude IS NOT NULL
   ORDER BY capturedAt ASC, createdAt ASC`
);

await conn.end();

const geojson = {
  type: "FeatureCollection",
  project: "HOLFORD ROAD RECONSTRUCTION",
  projectId: 540001,
  exportedAt: new Date().toISOString(),
  totalPoints: rows.length,
  features: rows.map((r) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
    },
    properties: {
      id: r.id,
      filename: r.filename,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      altitude: r.altitude ? parseFloat(r.altitude) : null,
      mediaType: r.mediaType,
      capturedAt: r.capturedAt ?? null,
      createdAt: r.createdAt,
      cloudinaryUrl: r.cloudinaryUrl ?? null,
      cloudinaryPublicId: r.cloudinaryPublicId ?? null,
      notes: r.notes ?? null,
    },
  })),
};

const outPath = "holford-road-gps-points.json";
writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Exported ${rows.length} GPS points → ${outPath}`);
