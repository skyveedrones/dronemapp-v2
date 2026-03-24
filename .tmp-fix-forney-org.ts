import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("NO_DB");
    return;
  }

  const before = await db.execute(sql.raw("SELECT id,name FROM organizations WHERE id=240001 OR name LIKE '%Forney%' ORDER BY id"));
  const beforeClient = await db.execute(sql.raw("SELECT id,name,ownerId FROM clients WHERE id=4560004"));
  const beforeProjects = await db.execute(sql.raw("SELECT id,name,organizationId,userId,clientId FROM projects WHERE clientId=4560004 OR userId=4560004 ORDER BY id"));

  await db.execute(sql.raw("INSERT INTO organizations (id, name, createdAt, updatedAt) SELECT 240001, 'City of Forney', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id=240001)"));
  await db.execute(sql.raw("UPDATE clients SET ownerId=240001, updatedAt=NOW() WHERE id=4560004"));
  await db.execute(sql.raw("UPDATE projects SET organizationId=240001, updatedAt=NOW() WHERE clientId=4560004 OR userId=4560004"));

  const after = await db.execute(sql.raw("SELECT id,name,createdAt,updatedAt FROM organizations WHERE id=240001 OR name LIKE '%Forney%' ORDER BY id"));
  const afterClient = await db.execute(sql.raw("SELECT id,name,ownerId,updatedAt FROM clients WHERE id=4560004"));
  const afterProjects = await db.execute(sql.raw("SELECT id,name,organizationId,userId,clientId,updatedAt FROM projects WHERE clientId=4560004 OR userId=4560004 ORDER BY id"));

  const b = (before as unknown as [unknown[], unknown])[0];
  const bc = (beforeClient as unknown as [unknown[], unknown])[0];
  const bp = (beforeProjects as unknown as [unknown[], unknown])[0];
  const a = (after as unknown as [unknown[], unknown])[0];
  const ac = (afterClient as unknown as [unknown[], unknown])[0];
  const ap = (afterProjects as unknown as [unknown[], unknown])[0];

  console.log("BEFORE_ORGS=" + JSON.stringify(b));
  console.log("BEFORE_CLIENT=" + JSON.stringify(bc));
  console.log("BEFORE_PROJECTS=" + JSON.stringify(bp));
  console.log("AFTER_ORGS=" + JSON.stringify(a));
  console.log("AFTER_CLIENT=" + JSON.stringify(ac));
  console.log("AFTER_PROJECTS=" + JSON.stringify(ap));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
