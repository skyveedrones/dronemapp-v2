import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dbInfo = await db.execute(sql.raw("SELECT DATABASE() AS databaseName, USER() AS dbUser"));
  const columns = await db.execute(sql.raw("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION"));
  const rows = await db.execute(sql.raw("SELECT * FROM users ORDER BY id ASC LIMIT 200"));
  const count = await db.execute(sql.raw("SELECT COUNT(*) AS totalUsers FROM users"));

  console.log(JSON.stringify({
    dbInfo: ((dbInfo as any)?.[0] || [])[0] || null,
    totalUsers: Number((((count as any)?.[0] || [])[0]?.totalUsers ?? 0),),
    columns: (columns as any)?.[0] || [],
    users: (rows as any)?.[0] || []
  }, null, 2));
})();
