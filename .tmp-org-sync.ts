import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.execute(sql.raw("UPDATE users SET organizationId = 1 WHERE id = 1"));
  await db.execute(sql.raw("UPDATE projects SET organizationId = 1 WHERE id = 1020001"));

  const userRs = await db.execute(sql.raw("SELECT id, openId, name, organizationId FROM users WHERE id = 1 LIMIT 1"));
  const user = ((userRs as any)?.[0] || [])[0] || null;
  console.log("USER:", JSON.stringify(user));

  const projRs = await db.execute(sql.raw("SELECT id, userId, name, organizationId, deletedAt FROM projects WHERE id = 1020001 LIMIT 1"));
  const project = ((projRs as any)?.[0] || [])[0] || null;
  console.log("PROJECT:", JSON.stringify(project));

  const mediaRs = await db.execute(sql.raw("SELECT id, projectId, userId, filename FROM media WHERE projectId = 1020001 ORDER BY id ASC LIMIT 5"));
  const mediaRows = (mediaRs as any)?.[0] || [];
  const mediaCountRs = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM media WHERE projectId = 1020001"));
  const mediaCount = ((mediaCountRs as any)?.[0] || [])[0]?.cnt ?? 0;
  console.log("MEDIA count:", mediaCount);
  console.log("MEDIA sample:", JSON.stringify(mediaRows));
})();
