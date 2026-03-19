/**
 * Multi-Tenant Organization Migration Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates organizations for Skyvee Drones (master agency) and each real client,
 * then assigns users to the correct org with the correct orgRole.
 *
 * Run: node server/scripts/run-org-migration.mjs
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

// ── Helper ────────────────────────────────────────────────────────────────────
async function run(sql, params = []) {
  const [result] = await db.execute(sql, params);
  return result;
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  MAPIT Multi-Tenant Migration");
console.log("═══════════════════════════════════════════════════════════════\n");

// ── Step 1: Snapshot current state ───────────────────────────────────────────
const [users] = await db.execute(
  "SELECT id, name, email, role, organizationId, orgRole FROM users ORDER BY id ASC"
);
const [existingOrgs] = await db.execute(
  "SELECT id, name FROM organizations ORDER BY id ASC"
);
const [clients] = await db.execute(
  "SELECT id, name, contactEmail, ownerId FROM clients WHERE deletedAt IS NULL ORDER BY id ASC"
);
const [projects] = await db.execute(
  "SELECT id, name, userId, clientId FROM projects WHERE deletedAt IS NULL ORDER BY id ASC"
);

console.log(`Found ${users.length} users, ${existingOrgs.length} existing orgs, ${clients.length} clients, ${projects.length} projects\n`);

// ── Step 2: Identify Clay's accounts ─────────────────────────────────────────
// Clay has two accounts: clay@skyveedrones.com (id=1) and claybechtol@gmail.com (id=1560095)
const clayUsers = users.filter(u =>
  u.email === "clay@skyveedrones.com" || u.email === "claybechtol@gmail.com"
);
console.log("Clay's accounts:", clayUsers.map(u => `id=${u.id} (${u.email})`).join(", "));

// ── Step 3: Create or reuse master org for Skyvee Drones ─────────────────────
let masterOrgId;
const existingMaster = existingOrgs.find(o =>
  o.name.toLowerCase().includes("skyvee") || o.name.toLowerCase().includes("master")
);
if (existingMaster) {
  masterOrgId = existingMaster.id;
  console.log(`\n✓ Master org already exists: id=${masterOrgId} "${existingMaster.name}"`);
} else {
  const result = await run(
    `INSERT INTO organizations (name, type, subscriptionTier, createdAt, updatedAt)
     VALUES (?, 'provider', 'professional', NOW(), NOW())`,
    ["Skyvee Drones"]
  );
  masterOrgId = result.insertId;
  console.log(`\n✓ Created master org: id=${masterOrgId} "Skyvee Drones"`);
}

// ── Step 4: Assign Clay's accounts to master org as PROVIDER ─────────────────
for (const clay of clayUsers) {
  if (clay.organizationId === masterOrgId && clay.orgRole === "PROVIDER") {
    console.log(`  ✓ Clay (id=${clay.id}) already assigned to master org`);
    continue;
  }
  await run(
    "UPDATE users SET organizationId = ?, orgRole = 'PROVIDER' WHERE id = ?",
    [masterOrgId, clay.id]
  );
  console.log(`  ✓ Assigned Clay (id=${clay.id}, ${clay.email}) → org ${masterOrgId} as PROVIDER`);
}

// ── Step 5: Assign Tracey (admin) to master org as ORG_ADMIN ─────────────────
const traceyUsers = users.filter(u =>
  u.email && (u.email.toLowerCase().includes("tracey") || u.name?.toLowerCase().includes("tracey"))
);
for (const tracey of traceyUsers) {
  if (tracey.organizationId === masterOrgId) {
    console.log(`  ✓ Tracey (id=${tracey.id}) already in master org`);
    continue;
  }
  await run(
    "UPDATE users SET organizationId = ?, orgRole = 'ORG_ADMIN' WHERE id = ?",
    [masterOrgId, tracey.id]
  );
  console.log(`  ✓ Assigned Tracey (id=${tracey.id}, ${tracey.email}) → org ${masterOrgId} as ORG_ADMIN`);
}

// ── Step 6: Create orgs for each real client, assign their portal users ───────
console.log(`\n── Processing ${clients.length} clients ──`);

const clientOrgMap = {}; // clientId → orgId

for (const client of clients) {
  // Skip test/example clients
  if (
    client.name?.toLowerCase().includes("test") ||
    client.contactEmail?.toLowerCase().includes("example.com")
  ) {
    console.log(`  ⚠ Skipping test client: "${client.name}" (id=${client.id})`);
    continue;
  }

  // Check if org already exists for this client name
  const existingClientOrg = existingOrgs.find(
    o => o.name.toLowerCase() === client.name.toLowerCase()
  );

  let clientOrgId;
  if (existingClientOrg) {
    clientOrgId = existingClientOrg.id;
    console.log(`  ✓ Org already exists for "${client.name}": id=${clientOrgId}`);
  } else {
    const result = await run(
      `INSERT INTO organizations (name, type, subscriptionTier, createdAt, updatedAt)
       VALUES (?, 'other', 'starter', NOW(), NOW())`,
      [client.name]
    );
    clientOrgId = result.insertId;
    console.log(`  ✓ Created org for client "${client.name}": id=${clientOrgId}`);
  }
  clientOrgMap[client.id] = clientOrgId;
}

// ── Step 7: Assign portal users (role='client') to their client's org ─────────
console.log("\n── Assigning client portal users ──");

// Get client_users join table to find which user belongs to which client
const [clientUserLinks] = await db.execute(
  "SELECT cu.userId, cu.clientId, u.name, u.email, u.role FROM client_users cu JOIN users u ON cu.userId = u.id ORDER BY cu.clientId ASC"
);

for (const link of clientUserLinks) {
  const orgId = clientOrgMap[link.clientId];
  if (!orgId) {
    console.log(`  ⚠ No org mapped for clientId=${link.clientId}, skipping user ${link.userId}`);
    continue;
  }
  // Only assign if not already assigned
  const user = users.find(u => u.id === link.userId);
  if (user?.organizationId === orgId) {
    console.log(`  ✓ User ${link.userId} (${link.email}) already in org ${orgId}`);
    continue;
  }
  await run(
    "UPDATE users SET organizationId = ?, orgRole = 'ORG_ADMIN' WHERE id = ?",
    [orgId, link.userId]
  );
  console.log(`  ✓ Assigned user ${link.userId} (${link.email || link.name}) → org ${orgId} as ORG_ADMIN`);
}

// ── Step 8: Assign remaining real users (gunnar, robban, cmcquiston, etc.) to master org ──
console.log("\n── Assigning remaining staff/field users to master org ──");
const staffEmails = [
  "gunnar_lund@yahoo.com",
  "robban@overcastinnovations.com",
  "cmcquiston@forneytx.gov",
  "mrozelle@garlandtx.gov",
  "eluna@forneytx.gov",
  "tbechtol@forneytx.gov",
];
for (const u of users) {
  if (!u.email) continue;
  if (u.organizationId) continue; // already assigned
  if (staffEmails.includes(u.email.toLowerCase())) {
    await run(
      "UPDATE users SET organizationId = ?, orgRole = 'ORG_USER' WHERE id = ?",
      [masterOrgId, u.id]
    );
    console.log(`  ✓ Assigned staff ${u.id} (${u.email}) → master org as ORG_USER`);
  }
}

// ── Step 9: Null out test/seed users (leave them unassigned, they'll hit onboarding) ──
console.log("\n── Test/seed users left unassigned (will hit onboarding guard) ──");
const testUsers = users.filter(u =>
  !u.organizationId &&
  (!u.email || u.email.includes("example.com") || u.name?.toLowerCase().includes("test"))
);
for (const u of testUsers) {
  console.log(`  ⚠ Unassigned test user: id=${u.id} name="${u.name}" email="${u.email}"`);
}

// ── Step 10: Final state report ───────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Migration Complete — Final State");
console.log("═══════════════════════════════════════════════════════════════\n");

const [finalUsers] = await db.execute(
  "SELECT id, name, email, role, organizationId, orgRole FROM users ORDER BY id ASC"
);
const [finalOrgs] = await db.execute(
  "SELECT id, name, type FROM organizations ORDER BY id ASC"
);

console.log("ORGANIZATIONS:");
console.table(finalOrgs);

console.log("\nUSERS:");
console.table(finalUsers.map(u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  orgId: u.organizationId,
  orgRole: u.orgRole,
})));

await db.end();
console.log("\n✅ Migration complete.\n");
