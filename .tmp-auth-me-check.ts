/**
 * Diagnostic: Check what auth.me endpoint returns
 * Simulates the Account page data flow
 */
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
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

  console.log("1. User from DB (what getUserByOpenId returns):");
  console.log(JSON.stringify(user, null, 2));

  if (!user) {
    console.log("\n❌ ERROR: User not found in DB!");
  } else {
    console.log("\n2. What the Account page receives:");
    console.log(`   - subscriptionTier: "${user.subscriptionTier}"`);
    console.log(`   - subscriptionStatus: "${user.subscriptionStatus}"`);
    console.log(`   - billingPeriod: "${user.billingPeriod}"`);
    
    // Check tier normalization like Account.tsx does
    const tier = (user.subscriptionTier || "free").toLowerCase();
    const validTiers = ["free", "starter", "professional", "business", "enterprise"];
    const normalizedTier = validTiers.includes(tier) ? tier : "free";
    
    console.log(`\n3. Tier normalization (Account.tsx logic):`);
    console.log(`   - Raw: "${user.subscriptionTier}"`);
    console.log(`   - Normalized: "${normalizedTier}"`);
    
    // Check if plan limits lookup would work
    console.log(`\n4. PLAN_LIMITS lookup would show:`);
    console.log(`   - Tier: "${normalizedTier}"`);
    console.log(`   - Key exists: ${["free", "starter", "professional", "business", "enterprise"].includes(normalizedTier)}`);
  }
})();
