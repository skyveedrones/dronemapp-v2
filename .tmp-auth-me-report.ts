/**
 * Diagnostic: Detailed auth.me data flow
 */
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

(async () => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    console.log("=== AUTH.ME ENDPOINT DIAGNOSTIC ===\n");

    // Get the dev user
    const userRs = await db.execute(sql.raw(`
      SELECT 
        id, openId, name, email, role, 
        subscriptionTier, subscriptionStatus, billingPeriod,
        currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
        stripeCustomerId, stripeSubscriptionId
      FROM users 
      WHERE openId = 'dev-owner-local' 
      LIMIT 1
    `));

    const user = ((userRs as any)?.[0] || [])[0] || null;

    const report = {
      status: user ? "FOUND" : "NOT_FOUND",
      user: user,
      tier_check: user ? {
        raw_value: user.subscriptionTier,
        normalized: (user.subscriptionTier || "free").toLowerCase(),
        is_valid: ["free", "starter", "professional", "business", "enterprise"].includes(
          (user.subscriptionTier || "free").toLowerCase()
        ),
      } : null,
      account_page_will_see: user ? {
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        billingPeriod: user.billingPeriod,
      } : null,
    };

    const root = path.dirname(fileURLToPath(import.meta.url));
    await fs.writeFile(
      path.join(root, ".tmp-auth-me-report.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
})();
