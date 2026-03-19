/**
 * Migration Audit Script
 * Reads current users, organizations, clients, and projects from the DB
 * to plan the multi-tenant migration.
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

console.log("\n=== USERS ===");
const [users] = await db.execute(
  "SELECT id, name, email, role, organizationId FROM users ORDER BY id ASC"
);
console.table(users);

console.log("\n=== ORGANIZATIONS ===");
const [orgs] = await db.execute(
  "SELECT id, name, slug, ownerId, createdAt FROM organizations ORDER BY id ASC"
);
console.table(orgs);

console.log("\n=== CLIENTS (first 20) ===");
const [clients] = await db.execute(
  "SELECT id, name, email, organizationId FROM clients ORDER BY id ASC LIMIT 20"
);
console.table(clients);

console.log("\n=== PROJECTS (first 30) ===");
const [projects] = await db.execute(
  "SELECT id, name, organizationId, userId FROM projects ORDER BY id ASC LIMIT 30"
);
console.table(projects);

await db.end();
