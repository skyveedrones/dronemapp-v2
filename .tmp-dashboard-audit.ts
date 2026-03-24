import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const me = await db.execute(sql.raw("SELECT id, openId, name, role, organizationId, orgRole FROM users WHERE openId='dev-owner-local' LIMIT 1"));
  const projects = await db.execute(sql.raw("SELECT id, userId, name, status, organizationId, deletedAt FROM projects ORDER BY id DESC LIMIT 50"));
  const mine = await db.execute(sql.raw("SELECT p.id, p.name, p.userId, p.organizationId, p.deletedAt FROM projects p JOIN users u ON u.id = p.userId WHERE u.openId='dev-owner-local' ORDER BY p.id DESC LIMIT 50"));

  const out = {
    me: ((me as any)?.[0] || [])[0] || null,
    projects: (projects as any)?.[0] || [],
    mine: (mine as any)?.[0] || []
  };
  console.log(JSON.stringify(out, null, 2));
})();
