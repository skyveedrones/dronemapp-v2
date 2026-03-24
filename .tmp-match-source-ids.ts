import fs from "node:fs/promises";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const raw = await fs.readFile("scripts/holford-road-gps-points.json", "utf8");
  const data = JSON.parse(raw);
  const features = Array.isArray(data.features) ? data.features : [];
  const ids = features.map((f:any) => Number(f?.properties?.id)).filter((n:number)=>Number.isFinite(n));
  const unique = Array.from(new Set(ids));
  const first = unique.slice(0, 200);
  if (!first.length) throw new Error("No numeric ids in payload");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inClause = first.join(",");
  const rs = await db.execute(sql.raw(`SELECT id, projectId, filename, fileSize, LEFT(url,180) AS url, LEFT(thumbnailUrl,180) AS thumbnailUrl, LEFT(highResUrl,180) AS highResUrl FROM media WHERE id IN (${inClause}) ORDER BY id ASC LIMIT 50`));
  const existsCount = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM media WHERE id IN (${inClause})`));

  console.log(JSON.stringify({
    payloadIdsChecked: first.length,
    sourceRowsFound: Number((((existsCount as any)?.[0] || [])[0] || {}).cnt || 0),
    sample: (rs as any)?.[0] || []
  }, null, 2));
})();
