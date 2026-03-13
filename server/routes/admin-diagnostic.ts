/**
 * TEMPORARY DIAGNOSTIC ROUTE — DELETE AFTER USE
 * ==============================================
 * GET /api/admin/diagnostic-check?token=skyvee-diag-778899
 *
 * Returns:
 *   1. Duplicate email check across the users table
 *   2. Migration dry-run: projects with legacy clientName but no clientId
 *
 * This file must be deleted and the route unregistered after the data is reviewed.
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { projects, clients, users } from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const TEMP_TOKEN = "skyvee-diag-778899";

const adminDiagnosticRouter = Router();

adminDiagnosticRouter.get("/admin/diagnostic-check", async (req: Request, res: Response) => {
  // ── Token guard ────────────────────────────────────────────────────────────
  if (req.query.token !== TEMP_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database not available" });
  }

  try {
    // ── 1. Duplicate email check ─────────────────────────────────────────────
    const duplicateEmails = await db.execute(sql`
      SELECT email, COUNT(*) AS count
      FROM users
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING count > 1
      ORDER BY count DESC
    `);

    // Full records for any duplicate emails
    const duplicateDetails: Record<string, unknown[]> = {};
    for (const row of (duplicateEmails as any[])) {
      const records = await db.execute(sql`
        SELECT id, openId, name, email, role, loginMethod, createdAt, lastSignedIn
        FROM users
        WHERE email = ${row.email}
        ORDER BY createdAt ASC
      `);
      duplicateDetails[row.email] = records as unknown[];
    }

    // ── 2. Users table summary ───────────────────────────────────────────────
    const [userSummary] = await db.execute(sql`
      SELECT
        COUNT(*)                                                      AS total_users,
        COUNT(DISTINCT email)                                         AS distinct_emails,
        SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) AS null_or_empty_email
      FROM users
    `) as any[];

    const roleSummary = await db.execute(sql`
      SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY count DESC
    `);

    // ── 3. Migration dry-run (ownerId: 1) ────────────────────────────────────
    const OWNER_ID = 1;

    // All projects owned by this admin
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        clientName: projects.clientName,
        clientId: projects.clientId,
        status: projects.status,
      })
      .from(projects)
      .where(eq(projects.userId, OWNER_ID));

    // Legacy: has clientName but no clientId
    const legacyProjects = allProjects.filter(
      (p) => p.clientName && p.clientName.trim().length > 0 && !p.clientId
    );

    // Already linked
    const alreadyLinked = allProjects.filter((p) => !!p.clientId);

    // No clientName at all
    const noClientName = allProjects.filter(
      (p) => !p.clientName || p.clientName.trim().length === 0
    );

    // Group legacy projects by normalized clientName
    const groups: Record<string, typeof legacyProjects> = {};
    for (const p of legacyProjects) {
      const key = p.clientName!.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    // Existing clients for ownerId 1
    const existingClients = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.ownerId, OWNER_ID));

    const existingClientNames = new Set(existingClients.map((c) => c.name.trim().toLowerCase()));

    // Build planned actions
    const plannedActions: Array<{
      action: string;
      clientName: string;
      projectCount: number;
      clientAlreadyExists: boolean;
      projects: Array<{ id: number; name: string; status: string }>;
    }> = [];

    for (const [key, groupProjects] of Object.entries(groups)) {
      plannedActions.push({
        action: existingClientNames.has(key) ? "LINK_PROJECTS_ONLY" : "CREATE_CLIENT_AND_LINK",
        clientName: groupProjects[0].clientName!.trim(),
        projectCount: groupProjects.length,
        clientAlreadyExists: existingClientNames.has(key),
        projects: groupProjects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
        })),
      });
    }

    // ── Response ─────────────────────────────────────────────────────────────
    return res.json({
      _warning: "TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER USE",
      generatedAt: new Date().toISOString(),

      duplicateEmailCheck: {
        duplicatesFound: (duplicateEmails as any[]).length,
        duplicates: duplicateEmails,
        duplicateDetails,
      },

      usersSummary: {
        ...(userSummary as any),
        roleBreakdown: roleSummary,
      },

      migrationDryRun: {
        ownerId: OWNER_ID,
        totalProjects: allProjects.length,
        legacyProjectsToMigrate: legacyProjects.length,
        alreadyLinkedToClient: alreadyLinked.length,
        projectsWithNoClientName: noClientName.length,
        existingClients: existingClients,
        uniqueClientNamesFound: Object.keys(groups).length,
        plannedActions,
      },
    });
  } catch (err: any) {
    console.error("[DiagnosticRoute] Error:", err?.message || err);
    return res.status(500).json({ error: "Diagnostic query failed", detail: err?.message });
  }
});

export default adminDiagnosticRouter;
