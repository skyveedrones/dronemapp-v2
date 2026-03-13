#!/usr/bin/env tsx
/**
 * Diagnostic: Find duplicate emails in the users table.
 * Read-only — no writes to the database.
 * Uses a direct mysql2 connection to avoid importing server modules
 * that require API keys (Resend, etc.) at module load time.
 */
import mysql from "mysql2/promise";

(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌  DATABASE_URL is not set.");
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
    ssl: { rejectUnauthorized: true },
  });

  try {
    // ── Summary ──────────────────────────────────────────────────────────
    const [totals] = await conn.query(`
      SELECT
        COUNT(*)                                                    AS total_users,
        COUNT(DISTINCT email)                                       AS distinct_emails,
        SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) AS null_or_empty_email,
        COUNT(DISTINCT role)                                        AS distinct_roles
      FROM users
    `);
    console.log("\n=== USERS TABLE SUMMARY ===");
    console.table(totals);

    // ── Role breakdown ────────────────────────────────────────────────────
    const [roles] = await conn.query(`
      SELECT role, COUNT(*) AS count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);
    console.log("\n=== ROLE BREAKDOWN ===");
    console.table(roles);

    // ── Duplicate emails ──────────────────────────────────────────────────
    const [dupes] = await conn.query(`
      SELECT email, COUNT(*) AS count
      FROM users
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING count > 1
      ORDER BY count DESC
    `) as [any[], any];

    if ((dupes as any[]).length === 0) {
      console.log("\n✅  No duplicate emails found.");
    } else {
      console.log(`\n⚠️  DUPLICATE EMAILS FOUND (${(dupes as any[]).length} email(s)):`);
      console.table(dupes);

      console.log("\n=== FULL RECORDS FOR DUPLICATE EMAILS ===");
      for (const row of (dupes as any[])) {
        const [records] = await conn.query(`
          SELECT id, openId, name, email, role, loginMethod, createdAt, lastSignedIn
          FROM users
          WHERE email = ?
          ORDER BY createdAt ASC
        `, [row.email]);
        console.log(`\nEmail: ${row.email}`);
        console.table(records);
      }
    }
  } finally {
    await conn.end();
  }

  process.exit(0);
})();
