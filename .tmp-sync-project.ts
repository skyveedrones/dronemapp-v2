import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const projectRs = await db.execute(sql.raw("SELECT id, userId, organizationId, deletedAt, name FROM projects WHERE id = 1020001 LIMIT 1"));
  const project = ((projectRs as any)?.[0] || [])[0] || null;
  console.log("PROJECT:", JSON.stringify(project));

  const userRs = await db.execute(sql.raw("SELECT id, openId, name, organizationId FROM users WHERE id = 1 LIMIT 1"));
  const user = ((userRs as any)?.[0] || [])[0] || null;
  console.log("USER:", JSON.stringify(user));

  if (!project) { console.log("ERROR: project 1020001 not found"); process.exit(1); }
  if (!user) { console.log("ERROR: user id=1 not found"); process.exit(1); }

  const projectOrgId = project.organizationId ?? null;
  const userOrgId = user.organizationId ?? null;

  if (projectOrgId !== userOrgId) {
    console.log(`SYNCING organizationId: project has ${projectOrgId}, user has ${userOrgId}`);
    await db.execute(sql.raw(`UPDATE projects SET organizationId = ${userOrgId === null ? "NULL" : Number(userOrgId)}, deletedAt = NULL WHERE id = 1020001`));
  } else {
    console.log(`organizationId already matches (${projectOrgId}), just resetting deletedAt`);
    await db.execute(sql.raw("UPDATE projects SET deletedAt = NULL WHERE id = 1020001"));
  }

  const verifyRs = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM projects WHERE userId = 1 AND deletedAt IS NULL"));
  const cnt = ((verifyRs as any)?.[0] || [])[0]?.cnt ?? "unknown";
  console.log(`VERIFY count (userId=1, deletedAt IS NULL): ${cnt}`);

  const finalRs = await db.execute(sql.raw("SELECT id, userId, organizationId, deletedAt, name FROM projects WHERE id = 1020001 LIMIT 1"));
  console.log("FINAL PROJECT:", JSON.stringify(((finalRs as any)?.[0] || [])[0] || null));
})();
