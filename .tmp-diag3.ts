import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const projColsRs = await db.execute(sql.raw("DESCRIBE projects"));
  console.log("PROJ_COLS:", JSON.stringify((projColsRs as any)?.[0] || [], null, 2));

  const projRs = await db.execute(sql.raw("SELECT * FROM projects WHERE name LIKE '%Holford%' LIMIT 5"));
  const projects = (projRs as any)?.[0] || [];
  console.log("HOLFORD_PROJECTS:", JSON.stringify(projects, null, 2));

  // Also check near id 1020001
  const idRs = await db.execute(sql.raw("SELECT id, userId, name, status FROM projects WHERE id = 1020001 LIMIT 1"));
  console.log("PROJECT_1020001:", JSON.stringify((idRs as any)?.[0] || [], null, 2));

  const mediaColsRs = await db.execute(sql.raw("DESCRIBE media"));
  console.log("MEDIA_COLS:", JSON.stringify((mediaColsRs as any)?.[0] || [], null, 2));

  const mediaCntRs = await db.execute(sql.raw("SELECT projectId, mediaType, COUNT(*) as cnt FROM media WHERE projectId = 1020001 GROUP BY projectId, mediaType"));
  console.log("MEDIA_1020001:", JSON.stringify((mediaCntRs as any)?.[0] || [], null, 2));
})();
