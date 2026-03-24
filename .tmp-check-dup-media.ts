import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalRs = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM media WHERE projectId=1020001 AND deletedAt IS NULL"));
  const dupThumbRs = await db.execute(sql.raw("SELECT thumbnailUrl, COUNT(*) AS c FROM media WHERE projectId=1020001 AND deletedAt IS NULL AND thumbnailUrl IS NOT NULL GROUP BY thumbnailUrl HAVING COUNT(*) > 1 ORDER BY c DESC LIMIT 10"));
  const dupUrlRs = await db.execute(sql.raw("SELECT url, COUNT(*) AS c FROM media WHERE projectId=1020001 AND deletedAt IS NULL GROUP BY url HAVING COUNT(*) > 1 ORDER BY c DESC LIMIT 10"));
  const dupCoordRs = await db.execute(sql.raw("SELECT latitude, longitude, COUNT(*) AS c FROM media WHERE projectId=1020001 AND deletedAt IS NULL GROUP BY latitude, longitude HAVING COUNT(*) > 1 ORDER BY c DESC LIMIT 10"));

  console.log(JSON.stringify({
    total: Number((((totalRs as any)?.[0] || [])[0] || {}).cnt || 0),
    duplicateThumbnailGroups: (dupThumbRs as any)?.[0] || [],
    duplicateUrlGroups: (dupUrlRs as any)?.[0] || [],
    duplicateCoordGroups: (dupCoordRs as any)?.[0] || []
  }, null, 2));
})();
