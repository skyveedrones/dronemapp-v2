import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rs = await db.execute(sql.raw("SELECT id, openId, name, email, role, subscriptionTier, subscriptionStatus, billingPeriod FROM users WHERE email='clay@skyveedrones.com' OR name LIKE 'Clay%' OR openId='dev-owner-local' ORDER BY id ASC"));
  console.log(JSON.stringify((rs as any)?.[0] || [], null, 2));
})();
