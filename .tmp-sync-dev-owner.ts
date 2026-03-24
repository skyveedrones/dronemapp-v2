import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql.raw(`
    UPDATE users
    SET
      name = 'Clay B',
      email = COALESCE(email, 'clay@skyveedrones.com'),
      subscriptionTier = 'enterprise',
      subscriptionStatus = 'active',
      billingPeriod = 'annual',
      cancelAtPeriodEnd = 'no'
    WHERE openId = 'dev-owner-local'
  `));

  const rs = await db.execute(sql.raw("SELECT id, openId, name, email, role, subscriptionTier, subscriptionStatus, billingPeriod FROM users WHERE openId='dev-owner-local' LIMIT 1"));
  console.log(JSON.stringify(((rs as any)?.[0] || [])[0] || null, null, 2));
})();
