import { db } from "./db/index.js";
import { projects, media } from "./db/schema.js";
import { count, eq } from "drizzle-orm";

async function checkHealth() {
  console.log("🔍 Running SkyVee MAPit Health Audit...");

  // 1. Check Project Count
  const projectStats = await db.select({ value: count() }).from(projects);
  console.log(`📊 Total Projects in DB: ${projectStats[0].value}`);

  // 2. Check Media Items for Forney CIP222
  // Replace '30001' with your actual project ID if it differs
  const mediaCount = await db.select({ value: count() })
    .from(media)
    .where(eq(media.projectId, 30001)); 
    
  console.log(`📸 Media items for Forney CIP222: ${mediaCount[0].value}`);

  if (mediaCount[0].value === 66) {
    console.log("✅ Data Integrity: Media count matches expectations.");
  } else {
    console.warn("⚠️ Warning: Media count mismatch. Expected 66.");
  }
}

checkHealth().catch(console.error);
