import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

type ColumnFix = {
  table: string;
  column: string;
  definition: string;
};

const COLUMN_FIXES: ColumnFix[] = [
  { table: "users", column: "companyName", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "department", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "phone", definition: "VARCHAR(50) NULL" },
  { table: "users", column: "passwordHash", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "logoKey", definition: "VARCHAR(500) NULL" },
  { table: "users", column: "watermarkUrl", definition: "VARCHAR(500) NULL" },
  { table: "users", column: "watermarkKey", definition: "VARCHAR(500) NULL" },
  { table: "users", column: "defaultDronePilot", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "defaultFaaLicenseNumber", definition: "VARCHAR(100) NULL" },
  { table: "users", column: "defaultLaancAuthNumber", definition: "VARCHAR(100) NULL" },
  { table: "users", column: "stripeCustomerId", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "stripeSubscriptionId", definition: "VARCHAR(255) NULL" },
  { table: "users", column: "subscriptionTier", definition: "ENUM('free','starter','professional','business','enterprise') NOT NULL DEFAULT 'free'" },
  { table: "users", column: "subscriptionStatus", definition: "ENUM('active','canceled','past_due','trialing','incomplete') NULL" },
  { table: "users", column: "billingPeriod", definition: "ENUM('monthly','annual') NULL" },
  { table: "users", column: "currentPeriodStart", definition: "TIMESTAMP NULL" },
  { table: "users", column: "currentPeriodEnd", definition: "TIMESTAMP NULL" },
  { table: "users", column: "cancelAtPeriodEnd", definition: "ENUM('yes','no') NULL DEFAULT 'no'" },
  { table: "users", column: "organizationId", definition: "INT NULL" },
  { table: "users", column: "orgRole", definition: "ENUM('PROVIDER','ORG_ADMIN','ORG_USER') NULL" },

  { table: "projects", column: "organizationId", definition: "INT NULL" },
  { table: "projects", column: "isPinned", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
  { table: "projects", column: "deletedAt", definition: "TIMESTAMP NULL" },
  { table: "projects", column: "deletedBy", definition: "INT NULL" },

  { table: "media", column: "deletedAt", definition: "TIMESTAMP NULL" },
  { table: "media", column: "deletedBy", definition: "INT NULL" },

  { table: "flights", column: "deletedAt", definition: "TIMESTAMP NULL" },
  { table: "flights", column: "deletedBy", definition: "INT NULL" },

  { table: "clients", column: "deletedAt", definition: "TIMESTAMP NULL" },
  { table: "clients", column: "deletedBy", definition: "INT NULL" },
];

const KEY_TABLES = [
  "organizations",
  "users",
  "projects",
  "media",
  "flights",
  "clients",
  "client_users",
  "client_project_assignments",
  "project_collaborators",
  "project_invitations",
  "client_invitations",
  "project_overlays",
];

async function getCount(db: any, table: string): Promise<number | null> {
  try {
    const rs = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM \`${table}\``));
    return Number(((rs as any)?.[0] || [])[0]?.cnt ?? 0);
  } catch {
    return null;
  }
}

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const report: any = {
    startedAt: new Date().toISOString(),
    dbIdentity: null,
    schemaFixes: {
      attempted: 0,
      applied: [] as string[],
      skippedExisting: [] as string[],
      errors: [] as string[],
    },
    dataRebuild: {
      ownerUserId: null as number | null,
      organizationUpserted: false,
      project1020001Upserted: false,
      holfordImport: null as null | {
        payloadFeatures: number;
        inserted: number;
        finalCount: number;
      },
    },
    countsBefore: {} as Record<string, number | null>,
    countsAfter: {} as Record<string, number | null>,
    columnsByTable: {} as Record<string, string[]>,
    finishedAt: null as string | null,
  };

  const dbIdRs = await db.execute(sql.raw("SELECT DATABASE() AS db, USER() AS dbUser, @@hostname AS host, @@port AS port"));
  report.dbIdentity = ((dbIdRs as any)?.[0] || [])[0] || null;

  // Baseline counts
  for (const t of KEY_TABLES) {
    report.countsBefore[t] = await getCount(db, t);
  }

  // Apply additive schema fixes only when missing
  for (const fix of COLUMN_FIXES) {
    report.schemaFixes.attempted++;
    try {
      const existsRs = await db.execute(sql.raw(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${fix.table}' AND COLUMN_NAME = '${fix.column}'`
      ));
      const exists = Number(((existsRs as any)?.[0] || [])[0]?.cnt ?? 0) > 0;
      const key = `${fix.table}.${fix.column}`;
      if (exists) {
        report.schemaFixes.skippedExisting.push(key);
        continue;
      }

      await db.execute(sql.raw(`ALTER TABLE \`${fix.table}\` ADD COLUMN \`${fix.column}\` ${fix.definition}`));
      report.schemaFixes.applied.push(key);
    } catch (e: any) {
      report.schemaFixes.errors.push(`${fix.table}.${fix.column}: ${e?.message || String(e)}`);
    }
  }

  // Ensure base org + owner user + project exist and are connected
  await db.execute(sql.raw(
    "INSERT INTO organizations (id, name, subscriptionTier, type) VALUES (100, 'SkyVee', 'professional', 'drone_service_provider') ON DUPLICATE KEY UPDATE name=VALUES(name), subscriptionTier=VALUES(subscriptionTier), type=VALUES(type)"
  ));
  report.dataRebuild.organizationUpserted = true;

  // Ensure owner exists
  await db.execute(sql.raw(
    "INSERT INTO users (openId, name, email, role, organizationId, orgRole, subscriptionTier, subscriptionStatus, billingPeriod) VALUES ('dev-owner-local', 'Clay B', 'clay@skyveedrones.com', 'admin', 100, 'ORG_ADMIN', 'enterprise', 'active', 'annual') ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), role=VALUES(role), organizationId=VALUES(organizationId), orgRole=VALUES(orgRole), subscriptionTier=VALUES(subscriptionTier), subscriptionStatus=VALUES(subscriptionStatus), billingPeriod=VALUES(billingPeriod)"
  ));

  const ownerRs = await db.execute(sql.raw("SELECT id FROM users WHERE openId='dev-owner-local' LIMIT 1"));
  const ownerId = Number(((ownerRs as any)?.[0] || [])[0]?.id ?? 0) || null;
  report.dataRebuild.ownerUserId = ownerId;
  if (!ownerId) throw new Error("Failed to resolve owner user id");

  // Upsert project 1020001
  await db.execute(sql.raw(
    `INSERT INTO projects (id, userId, name, status, organizationId) VALUES (1020001, ${ownerId}, 'Holford Road Project', 'active', 100) ON DUPLICATE KEY UPDATE userId=VALUES(userId), name=VALUES(name), status=VALUES(status), organizationId=VALUES(organizationId)`
  ));
  report.dataRebuild.project1020001Upserted = true;

  // Re-import Holford media payload if present
  const payloadPath = path.join(process.cwd(), "scripts", "holford-road-gps-points.json");
  try {
    const raw = await fs.readFile(payloadPath, "utf8");
    const payload = JSON.parse(raw) as any;
    const features: any[] = Array.isArray(payload?.features) ? payload.features : [];

    await db.execute(sql.raw("DELETE FROM media WHERE projectId = 1020001 AND filename LIKE 'HOLFORD_IMPORT_%'"));

    let inserted = 0;
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : [];
      const lngFromGeom = Number(coords[0]);
      const latFromGeom = Number(coords[1]);
      const latitude = Number.isFinite(Number(f?.properties?.latitude)) ? Number(f.properties.latitude) : latFromGeom;
      const longitude = Number.isFinite(Number(f?.properties?.longitude)) ? Number(f.properties.longitude) : lngFromGeom;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const altitude = Number(f?.properties?.altitude);
      const altitudeSql = Number.isFinite(altitude) ? altitude.toFixed(2) : "NULL";
      const originalId = String(f?.properties?.id ?? `idx-${i + 1}`);
      const safeId = originalId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `HOLFORD_IMPORT_${String(i + 1).padStart(3, "0")}_${safeId}.jpg`;
      const fileKey = `holford-import/${safeId}.jpg`;
      const fallbackUrl = `https://example.com/holford/${safeId}.jpg`;
      const thumb = String(f?.properties?.thumbnailUrl || fallbackUrl).replace(/'/g, "''");

      await db.execute(sql.raw(
        `INSERT INTO media (projectId, userId, filename, fileKey, url, mimeType, fileSize, mediaType, latitude, longitude, altitude, thumbnailUrl)
         VALUES (1020001, ${ownerId}, '${filename.replace(/'/g, "''")}', '${fileKey.replace(/'/g, "''")}', '${fallbackUrl.replace(/'/g, "''")}', 'image/jpeg', 1, 'photo', ${latitude.toFixed(9)}, ${longitude.toFixed(9)}, ${altitudeSql}, '${thumb}')`
      ));
      inserted++;
    }

    const finalCount = await getCount(db, "media");
    report.dataRebuild.holfordImport = {
      payloadFeatures: features.length,
      inserted,
      finalCount: finalCount ?? 0,
    };
  } catch {
    report.dataRebuild.holfordImport = null;
  }

  // Post counts + columns snapshot
  for (const t of KEY_TABLES) {
    report.countsAfter[t] = await getCount(db, t);
    try {
      const colsRs = await db.execute(sql.raw(`SHOW COLUMNS FROM \`${t}\``));
      report.columnsByTable[t] = ((colsRs as any)?.[0] || []).map((r: any) => String(r?.Field));
    } catch {
      report.columnsByTable[t] = [];
    }
  }

  report.finishedAt = new Date().toISOString();

  const outPath = path.join(process.cwd(), ".tmp-rebuild-report.json");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`WROTE ${outPath}`);
})();