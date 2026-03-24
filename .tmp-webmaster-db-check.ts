import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("NO_DB");
    return;
  }

  const orgRes = await db.execute(sql`SELECT id,name,createdAt,updatedAt FROM organizations WHERE id=240001 OR name LIKE '%Forney%' ORDER BY createdAt DESC`);
  const clientRes = await db.execute(sql`SELECT id,name,ownerId,updatedAt FROM clients WHERE id=4560004 OR name LIKE '%Forney%'`);
  const assignRes = await db.execute(sql`SELECT DISTINCT projectId FROM client_project_assignments WHERE clientId=4560004 ORDER BY projectId`);

  const orgRows = (orgRes as unknown as [unknown[], unknown])[0] as unknown[];
  const clientRows = (clientRes as unknown as [unknown[], unknown])[0] as unknown[];
  const assignRows = (assignRes as unknown as [unknown[], unknown])[0] as unknown[];

  console.log("ORGS=" + JSON.stringify(orgRows));
  console.log("CLIENTS=" + JSON.stringify(clientRows));
  console.log("ASSIGNED=" + JSON.stringify(assignRows));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
