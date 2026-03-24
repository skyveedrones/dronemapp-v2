import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`
    UPDATE users
    SET role = 'webmaster'
    WHERE openId = 'dev-owner-local'
       OR email = 'clay@skyveedrones.com'
  `);

  const rows = await db.execute(sql`
    SELECT id, openId, name, email, role
    FROM users
    WHERE openId = 'dev-owner-local'
       OR email = 'clay@skyveedrones.com'
    ORDER BY id ASC
  `);

  const resultRows = ((rows as unknown as [any[], unknown])[0] ?? []) as any[];
  console.log(JSON.stringify(resultRows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
