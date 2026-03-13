/**
 * TEMPORARY STARTUP DIAGNOSTIC — DELETE AFTER USE
 * ================================================
 * Runs once on server boot, emails results to clay@skyveedrones.com,
 * and logs to console. Delete this file and its import in index.ts
 * after the email is received and reviewed.
 */

import { Resend } from 'resend';
import { getDb } from "../db";
import { projects, clients } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

const OWNER_EMAIL = 'clay@skyveedrones.com';

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

    // ── 2. Duplicate email check ──────────────────────────────────────────
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) AS count
      FROM users
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING count > 1
      ORDER BY count DESC
    `);

    const duplicateDetails: Record<string, unknown[]> = {};
    for (const row of (duplicates as any[])) {
      const records = await db.execute(sql`
        SELECT id, openId, name, email, role, loginMethod, createdAt
        FROM users WHERE email = ${row.email} ORDER BY createdAt ASC
      `);
      duplicateDetails[row.email] = records as unknown[];
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

    // ── 4. Assemble full report ───────────────────────────────────────────
    const report = {
      generatedAt: new Date().toISOString(),
      usersSummary: {
        ...(userSummary as any),
        roleBreakdown: roleSummary,
      },
      duplicateEmailCheck: {
        duplicatesFound: (duplicates as any[]).length,
        duplicates,
        duplicateDetails,
      },
      migrationDryRun: {
        ownerId: OWNER_ID,
        totalProjects: allProjects.length,
        legacyToMigrate: legacy.length,
        alreadyLinked: linked.length,
        noClientName: noName.length,
        existingClients,
        uniqueClientNames: Object.keys(groups).length,
        plannedActions: planned,
      },
    };

    const reportJson = JSON.stringify(report, null, 2);
    console.log("[DIAG] REPORT:", reportJson);

    // ── 5. Email the report ───────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [OWNER_EMAIL],
      subject: 'Database Diagnostic Results — dronemapp-v2',
      html: `
        <h2>Database Diagnostic Results</h2>
        <p>Generated at: ${report.generatedAt}</p>
        <h3>Users Summary</h3>
        <pre>${JSON.stringify(report.usersSummary, null, 2)}</pre>
        <h3>Duplicate Email Check</h3>
        <pre>${JSON.stringify(report.duplicateEmailCheck, null, 2)}</pre>
        <h3>Migration Dry-Run (ownerId: 1)</h3>
        <pre>${JSON.stringify(report.migrationDryRun, null, 2)}</pre>
        <hr>
        <p><em>This is a one-time diagnostic email. The route will be deleted after review.</em></p>
      `,
    });

    if (error) {
      console.log("[DIAG] EMAIL ERROR:", error.message);
    } else {
      console.log(`[DIAG] Email sent successfully to ${OWNER_EMAIL}`);
    }

  } catch (err: any) {
    console.log("[DIAG] ERROR:", err?.message || String(err));
  }

  console.log("[DIAG] ========== STARTUP DIAGNOSTIC END ==========\n");
}
