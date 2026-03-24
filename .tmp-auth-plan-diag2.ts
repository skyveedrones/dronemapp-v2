import { getDb, getUserByOpenId } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const raw = await db.execute(
    sql.raw("SELECT id, openId, name, role, subscriptionTier, subscriptionStatus, billingPeriod FROM users WHERE openId='dev-owner-local' LIMIT 1")
  );

  const helper = await getUserByOpenId("dev-owner-local");

  console.log(
    JSON.stringify(
      {
        raw: ((raw as any)?.[0] || [])[0] || null,
        helper: helper || null,
      },
      null,
      2
    )
  );
})();
