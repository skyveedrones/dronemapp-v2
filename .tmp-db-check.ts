import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const dbName = await db.execute(sql.raw("SELECT DATABASE() AS db"));
  const cols = await db.execute(sql.raw("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('organizationId','orgRole')"));
  console.log(JSON.stringify({
    db: ((dbName as any)?.[0] || [])[0]?.db ?? null,
    userColumns: (cols as any)?.[0] || []
  }, null, 2));
})();
