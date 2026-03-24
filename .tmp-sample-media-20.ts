import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.execute(sql.raw("SELECT id, filename, latitude, longitude, LEFT(url,120) AS url, LEFT(thumbnailUrl,120) AS thumbnailUrl FROM media WHERE projectId=1020001 AND deletedAt IS NULL ORDER BY id DESC LIMIT 20"));
  console.log(JSON.stringify((rows as any)?.[0] || [], null, 2));
})();
