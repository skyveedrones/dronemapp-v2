/**
 * Final Org Migration — Exact Mapping
 * ─────────────────────────────────────────────────────────────────────────────
 * Org 1 (SkyVee Drones):
 *   clay@skyveedrones.com, claybechtol@gmail.com → PROVIDER
 *
 * Org 4 (Forney TX Municipal):
 *   tbechtol@forneytx.gov → ORG_ADMIN
 *   eluna@forneytx.gov, cmcquiston@forneytx.gov, traceybechtol@gmail.com → ORG_USER
 *
 * Org 3 (City of Garland Texas):
 *   mrozelle@garlandtx.gov → ORG_ADMIN
 *
 * Projects: stamp organizationId = owner's organizationId
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const db = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run(sql, params = []) {
  const [result] = await db.execute(sql, params);
  return result;
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  MAPIT Final Org Migration");
console.log("═══════════════════════════════════════════════════════════════\n");

// ── Step 1: Verify orgs exist ─────────────────────────────────────────────────
const [orgs] = await db.execute("SELECT id, name FROM organizations ORDER BY id");
console.log("Current orgs:");
console.table(orgs);

// ── Step 2: Apply exact user assignments ──────────────────────────────────────
const assignments = [
  // Org 1 — SkyVee Drones
  { email: "clay@skyveedrones.com",   orgId: 1, orgRole: "PROVIDER" },
  { email: "claybechtol@gmail.com",   orgId: 1, orgRole: "PROVIDER" },
  // Org 4 — Forney TX Municipal
  { email: "TBechtol@forneytx.gov",   orgId: 4, orgRole: "ORG_ADMIN" },
  { email: "eluna@forneytx.gov",      orgId: 4, orgRole: "ORG_USER" },
  { email: "cmcquiston@forneytx.gov", orgId: 4, orgRole: "ORG_USER" },
  { email: "traceybechtol@gmail.com", orgId: 4, orgRole: "ORG_USER" },
  // Org 3 — City of Garland Texas
  { email: "mrozelle@garlandtx.gov",  orgId: 3, orgRole: "ORG_ADMIN" },
];

console.log("\n── Applying user assignments ──");
for (const a of assignments) {
  const result = await run(
    "UPDATE users SET organizationId = ?, orgRole = ? WHERE LOWER(email) = LOWER(?)",
    [a.orgId, a.orgRole, a.email]
  );
  const affected = result.affectedRows ?? 0;
  console.log(`  ${affected > 0 ? "✓" : "⚠ NOT FOUND"} ${a.email} → org ${a.orgId} as ${a.orgRole}`);
}

// ── Step 3: Stamp projects with their owner's organizationId ──────────────────
console.log("\n── Stamping projects with owner's organizationId ──");
const stampResult = await run(`
  UPDATE projects p
  JOIN users u ON p.userId = u.id
  SET p.organizationId = u.organizationId
  WHERE u.organizationId IS NOT NULL AND p.deletedAt IS NULL
`);
console.log(`  ✓ Stamped ${stampResult.affectedRows} projects`);

// ── Step 4: Final state report ────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Final State");
console.log("═══════════════════════════════════════════════════════════════\n");

const [finalUsers] = await db.execute(
  `SELECT id, name, email, organizationId, orgRole
   FROM users
   WHERE email IN ('clay@skyveedrones.com','claybechtol@gmail.com',
     'TBechtol@forneytx.gov','eluna@forneytx.gov','cmcquiston@forneytx.gov',
     'traceybechtol@gmail.com','mrozelle@garlandtx.gov')
   ORDER BY organizationId, orgRole`
);
console.log("USERS:");
console.table(finalUsers);

const [finalProjects] = await db.execute(
  "SELECT id, name, userId, organizationId FROM projects WHERE deletedAt IS NULL ORDER BY organizationId, id"
);
console.log("\nPROJECTS:");
console.table(finalProjects);

// ── Step 5: Verify Clay's 9 projects ─────────────────────────────────────────
const clayProjects = finalProjects.filter(p => p.organizationId === 1);
console.log(`\n✅ Clay's org (1) has ${clayProjects.length} projects:`);
clayProjects.forEach(p => console.log(`   [${p.id}] ${p.name} (userId=${p.userId})`));

await db.end();
console.log("\n✅ Migration complete.\n");
