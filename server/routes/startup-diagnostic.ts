/**
 * TEMPORARY STARTUP DIAGNOSTIC — DELETE AFTER USE
 * ================================================
 * Runs once on server boot, logs results to console, then removes itself.
 * Results appear in the Manus Platform server logs.
 */

import { getDb } from "../db";
import { projects, clients } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function runStartupDiagnostic(): Promise<void> {
  console.log("\n[DIAG] ========== STARTUP DIAGNOSTIC BEGIN ==========");

  try {
    const db = await getDb();
    if (!db) {
      console.log("[DIAG] ERROR: Database not available");
      return;
    }

    // ── 1. Users summary ──────────────────────────────────────────────────
    const [userSummary] = await db.execute(sql`
      SELECT
        COUNT(*) AS total_users,
        COUNT(DISTINCT email) AS distinct_emails,
        SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) AS null_or_empty_email
      FROM users
    `) as any[];

    const roleSummary = await db.execute(sql`
      SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY count DESC
    `);

    console.log("[DIAG] USERS SUMMARY:", JSON.stringify(userSummary));
    console.log("[DIAG] ROLE BREAKDOWN:", JSON.stringify(roleSummary));

    // ── 2. Duplicate email check ──────────────────────────────────────────
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) AS count
      FROM users
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING count > 1
      ORDER BY count DESC
    `);

    if ((duplicates as any[]).length === 0) {
      console.log("[DIAG] DUPLICATE EMAILS: none found ✅");
    } else {
      console.log("[DIAG] DUPLICATE EMAILS FOUND:", JSON.stringify(duplicates));
      for (const row of (duplicates as any[])) {
        const records = await db.execute(sql`
          SELECT id, openId, name, email, role, loginMethod, createdAt
          FROM users WHERE email = ${row.email} ORDER BY createdAt ASC
        `);
        console.log(`[DIAG] DUPLICATE DETAIL (${row.email}):`, JSON.stringify(records));
      }
    }

    // ── 3. Migration dry-run (ownerId: 1) ─────────────────────────────────
    const OWNER_ID = 1;

    const allProjects = await db
      .select({ id: projects.id, name: projects.name, clientName: projects.clientName, clientId: projects.clientId, status: projects.status })
      .from(projects)
      .where(eq(projects.userId, OWNER_ID));

    const legacy = allProjects.filter(p => p.clientName && p.clientName.trim().length > 0 && !p.clientId);
    const linked = allProjects.filter(p => !!p.clientId);
    const noName = allProjects.filter(p => !p.clientName || p.clientName.trim().length === 0);

    const groups: Record<string, typeof legacy> = {};
    for (const p of legacy) {
      const key = p.clientName!.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    const existingClients = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.ownerId, OWNER_ID));

    const existingNames = new Set(existingClients.map(c => c.name.trim().toLowerCase()));

    const planned = Object.entries(groups).map(([key, gp]) => ({
      action: existingNames.has(key) ? "LINK_PROJECTS_ONLY" : "CREATE_CLIENT_AND_LINK",
      clientName: gp[0].clientName!.trim(),
      projectCount: gp.length,
      clientAlreadyExists: existingNames.has(key),
      projects: gp.map(p => ({ id: p.id, name: p.name, status: p.status })),
    }));

    console.log("[DIAG] MIGRATION DRY-RUN:", JSON.stringify({
      ownerId: OWNER_ID,
      totalProjects: allProjects.length,
      legacyToMigrate: legacy.length,
      alreadyLinked: linked.length,
      noClientName: noName.length,
      existingClients,
      uniqueClientNames: Object.keys(groups).length,
      plannedActions: planned,
    }, null, 2));

  } catch (err: any) {
    console.log("[DIAG] ERROR:", err?.message || String(err));
  }

  console.log("[DIAG] ========== STARTUP DIAGNOSTIC END ==========\n");
}
