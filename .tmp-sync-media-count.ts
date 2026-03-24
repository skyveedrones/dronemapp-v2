import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql.raw("UPDATE projects SET mediaCount = (SELECT COUNT(*) FROM media WHERE projectId = 1020001 AND deletedAt IS NULL) WHERE id = 1020001"));

  const row = await db.execute(sql.raw("SELECT id, mediaCount FROM projects WHERE id = 1020001 LIMIT 1"));
  const mediaRow = await db.execute(sql.raw("SELECT COUNT(*) AS realCount FROM media WHERE projectId = 1020001 AND deletedAt IS NULL"));

  console.log(JSON.stringify({
    project: ((row as any)?.[0] || [])[0] || null,
    realCount: ((mediaRow as any)?.[0] || [])[0]?.realCount ?? null
  }, null, 2));
})();
