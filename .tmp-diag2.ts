import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Describe projects table to see available columns
  const projColsRs = await db.execute(sql.raw("DESCRIBE projects"));
  console.log("PROJECTS COLS:", JSON.stringify((projColsRs as any)?.[0] || [], null, 2));

  // Find Holford project
  const projRs = await db.execute(sql.raw("SELECT * FROM projects WHERE name LIKE '%Holford%' OR id = 1020001 LIMIT 5"));
  console.log("PROJECTS:", JSON.stringify((projRs as any)?.[0] || [], null, 2));
})();
