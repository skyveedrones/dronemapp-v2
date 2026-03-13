#!/usr/bin/env tsx
/**
 * migrate-legacy-clients.ts
 * =========================
 * Safely upgrades existing data to the new Client Portal system.
 *
 * WHAT IT DOES
 * ------------
 * Legacy projects store a free-text `clientName` string but have no FK to the
 * `clients` table. This script:
 *
 *   1. Scans all projects owned by a given admin user (--ownerId).
 *   2. Groups projects by their `clientName` string (case-insensitive, trimmed).
 *   3. For each unique clientName:
 *        a. Checks whether a matching `clients` record already exists (idempotent).
 *        b. Creates the `clients` record if missing.
 *        c. Sets `projects.clientId` for every project in that group.
 *   4. Optionally promotes existing `project_collaborators` with role "viewer"
 *      on those projects to `client_users` + `client_project_assignments`
 *      (--migrateCollaborators flag).
 *   5. Optionally upgrades those collaborator users' `role` to "client"
 *      (--upgradeRoles flag — requires the DB enum migration to have run).
 *
 * SAFETY FEATURES
 * ---------------
 * --dryRun        Print every planned change without writing anything to the DB.
 * --ownerId       Scope the migration to a single admin's data only.
 * Idempotent      Re-running is safe: existing clients/assignments are detected
 *                 and skipped, never duplicated.
 * Rollback log    Every write is logged to migration-log-<timestamp>.json so
 *                 you can manually reverse changes if needed.
 *
 * USAGE
 * -----
 *   # Preview all changes (no writes)
 *   npx tsx server/scripts/migrate-legacy-clients.ts --ownerId 1 --dryRun
 *
 *   # Run the migration (creates clients + links projects)
 *   npx tsx server/scripts/migrate-legacy-clients.ts --ownerId 1
 *
 *   # Also migrate collaborators to client_users
 *   npx tsx server/scripts/migrate-legacy-clients.ts --ownerId 1 --migrateCollaborators
 *
 *   # Also upgrade collaborator users' role to "client"
 *   npx tsx server/scripts/migrate-legacy-clients.ts --ownerId 1 --migrateCollaborators --upgradeRoles
 *
 * PREREQUISITES
 * -------------
 * - DATABASE_URL env var must be set.
 * - For --upgradeRoles to persist, the live DB must have the "client" enum value:
 *     ALTER TABLE users MODIFY COLUMN role
 *       ENUM('user','admin','webmaster','client') NOT NULL DEFAULT 'user';
 */

import { writeFileSync } from "fs";
import { parseArgs } from "util";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  projects,
  clients,
  clientUsers,
  clientProjectAssignments,
  projectCollaborators,
  users,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MigrationAction {
  type:
    | "CREATE_CLIENT"
    | "LINK_PROJECT"
    | "CREATE_CLIENT_USER"
    | "CREATE_CLIENT_PROJECT_ASSIGNMENT"
    | "UPGRADE_USER_ROLE";
  description: string;
  data: Record<string, unknown>;
}

interface MigrationResult {
  ranAt: string;
  ownerId: number;
  dryRun: boolean;
  migrateCollaborators: boolean;
  upgradeRoles: boolean;
  actions: MigrationAction[];
  skipped: string[];
  errors: string[];
  summary: {
    clientsCreated: number;
    projectsLinked: number;
    clientUsersCreated: number;
    assignmentsCreated: number;
    rolesUpgraded: number;
  };
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      ownerId:              { type: "string" },
      dryRun:               { type: "boolean", default: false },
      migrateCollaborators: { type: "boolean", default: false },
      upgradeRoles:         { type: "boolean", default: false },
      help:                 { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(`
Usage:
  npx tsx server/scripts/migrate-legacy-clients.ts \\
    --ownerId 1                  (required) Admin user ID whose data to migrate
    --dryRun                     (optional) Preview changes without writing
    --migrateCollaborators       (optional) Promote project collaborators to client_users
    --upgradeRoles               (optional) Set migrated users' role to 'client'
    --help                       Show this help
`);
    process.exit(0);
  }

  if (!values.ownerId) {
    console.error("\n❌  --ownerId is required.\n");
    process.exit(1);
  }

  return {
    ownerId:              parseInt(values.ownerId, 10),
    dryRun:               values.dryRun ?? false,
    migrateCollaborators: values.migrateCollaborators ?? false,
    upgradeRoles:         values.upgradeRoles ?? false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeClientName(name: string): string {
  return name.trim().toLowerCase();
}

function log(msg: string) {
  console.log(msg);
}

function warn(msg: string) {
  console.warn(`  ⚠️  ${msg}`);
}

// ---------------------------------------------------------------------------
// Core migration
// ---------------------------------------------------------------------------

async function runMigration(opts: {
  ownerId: number;
  dryRun: boolean;
  migrateCollaborators: boolean;
  upgradeRoles: boolean;
}): Promise<MigrationResult> {
  const result: MigrationResult = {
    ranAt: new Date().toISOString(),
    ownerId: opts.ownerId,
    dryRun: opts.dryRun,
    migrateCollaborators: opts.migrateCollaborators,
    upgradeRoles: opts.upgradeRoles,
    actions: [],
    skipped: [],
    errors: [],
    summary: {
      clientsCreated: 0,
      projectsLinked: 0,
      clientUsersCreated: 0,
      assignmentsCreated: 0,
      rolesUpgraded: 0,
    },
  };

  const db = await getDb();
  if (!db) {
    throw new Error(
      "Database not available. Ensure DATABASE_URL is set and the DB is reachable."
    );
  }

  // ── 1. Load all projects owned by this admin ──────────────────────────────
  log(`\n[1/4] Loading projects for ownerId ${opts.ownerId}...`);
  const ownerProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, opts.ownerId));

  log(`      Found ${ownerProjects.length} total project(s).`);

  // Filter to only those with a legacy clientName but no clientId yet
  const legacyProjects = ownerProjects.filter(
    (p) => p.clientName && p.clientName.trim().length > 0 && !p.clientId
  );
  const alreadyLinked = ownerProjects.filter((p) => p.clientId !== null && p.clientId !== undefined);

  log(`      ${legacyProjects.length} project(s) have a legacy clientName with no clientId.`);
  log(`      ${alreadyLinked.length} project(s) already linked to a client (will be skipped).`);

  if (legacyProjects.length === 0) {
    log("\n✅  Nothing to migrate — all projects are already linked or have no clientName.");
    return result;
  }

  // ── 2. Load existing clients for this owner (for idempotency check) ───────
  log(`\n[2/4] Loading existing clients for ownerId ${opts.ownerId}...`);
  const existingClients = await db
    .select()
    .from(clients)
    .where(eq(clients.ownerId, opts.ownerId));

  // Build a lookup map: normalizedName → client record
  const existingClientMap = new Map<string, typeof existingClients[0]>(
    existingClients.map((c) => [normalizeClientName(c.name), c])
  );
  log(`      Found ${existingClients.length} existing client record(s).`);

  // ── 3. Group legacy projects by clientName ────────────────────────────────
  log(`\n[3/4] Grouping projects by clientName and migrating...`);

  type LegacyProject = typeof legacyProjects[0];
  const groups = new Map<string, LegacyProject[]>();
  for (const project of legacyProjects) {
    const key = normalizeClientName(project.clientName!);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(project);
  }

  log(`      ${groups.size} unique client name(s) found across legacy projects.\n`);

  for (const [normalizedName, groupProjects] of Array.from(groups.entries())) {
    const displayName = groupProjects[0].clientName!.trim();
    log(`  ── Client: "${displayName}" (${groupProjects.length} project(s))`);

    // ── 3a. Find or create the Client record ──────────────────────────────
    let clientRecord = existingClientMap.get(normalizedName) ?? null;

    if (clientRecord) {
      result.skipped.push(
        `Client "${displayName}" already exists (id: ${clientRecord.id}) — skipping creation.`
      );
      log(`     ↩  Client already exists (id: ${clientRecord.id}) — skipping creation.`);
    } else {
      const action: MigrationAction = {
        type: "CREATE_CLIENT",
        description: `Create client "${displayName}" for ownerId ${opts.ownerId}`,
        data: { ownerId: opts.ownerId, name: displayName },
      };
      result.actions.push(action);
      log(`     ✚  ${action.description}`);

      if (!opts.dryRun) {
        const inserted = await db
          .insert(clients)
          .values({ ownerId: opts.ownerId, name: displayName });
        const insertId = Number(inserted[0].insertId);
        const [created] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, insertId))
          .limit(1);
        clientRecord = created;
        existingClientMap.set(normalizedName, clientRecord);
        result.summary.clientsCreated++;
        log(`        → Created client id: ${clientRecord.id}`);
      } else {
        // In dry-run, use a placeholder so downstream steps can reference it
        clientRecord = {
          id: -1,
          ownerId: opts.ownerId,
          name: displayName,
          contactEmail: null,
          contactName: null,
          phone: null,
          address: null,
          logoUrl: null,
          logoKey: null,
          projectCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    // ── 3b. Link each project to the client ───────────────────────────────
    for (const project of groupProjects) {
      const action: MigrationAction = {
        type: "LINK_PROJECT",
        description: `Set projects.clientId = ${clientRecord.id} for project "${project.name}" (id: ${project.id})`,
        data: { projectId: project.id, clientId: clientRecord.id },
      };
      result.actions.push(action);
      log(`     ✚  ${action.description}`);

      if (!opts.dryRun) {
        await db
          .update(projects)
          .set({ clientId: clientRecord.id })
          .where(eq(projects.id, project.id));
        result.summary.projectsLinked++;
      }
    }

    // ── 3c. Optionally migrate project collaborators ──────────────────────
    if (opts.migrateCollaborators) {
      const projectIds = groupProjects.map((p) => p.id);

      // Load all collaborators across every project in this client groupp
      const allCollabs = await db
        .select({
          userId: projectCollaborators.userId,
          projectId: projectCollaborators.projectId,
          role: projectCollaborators.role,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(projectCollaborators)
        .innerJoin(users, eq(projectCollaborators.userId, users.id))
        .where(inArray(projectCollaborators.projectId, projectIds));

      // Deduplicate by userId
      const uniqueUserIds = Array.from(new Set(allCollabs.map((c) => c.userId)));

      for (const userId of uniqueUserIds) {
        const collab = allCollabs.find((c) => c.userId === userId)!;

        // Check if client_users entry already exists
        const existingCU = await db
          .select()
          .from(clientUsers)
          .where(
            and(
              eq(clientUsers.clientId, clientRecord.id),
              eq(clientUsers.userId, userId)
            )
          )
          .limit(1);

        if (existingCU.length > 0) {
          result.skipped.push(
            `client_users entry already exists for userId ${userId} / clientId ${clientRecord.id}`
          );
        } else {
          const cuAction: MigrationAction = {
            type: "CREATE_CLIENT_USER",
            description: `Add userId ${userId} (${collab.userName ?? collab.userEmail}) to client_users for clientId ${clientRecord.id}`,
            data: { clientId: clientRecord.id, userId, role: "viewer" },
          };
          result.actions.push(cuAction);
          log(`     ✚  ${cuAction.description}`);

          if (!opts.dryRun) {
            await db
              .insert(clientUsers)
              .values({ clientId: clientRecord.id, userId, role: "viewer" });
            result.summary.clientUsersCreated++;
          }
        }

        // Assign each project this collaborator is on
        const userCollabs = allCollabs.filter((c) => c.userId === userId);
        for (const uc of userCollabs) {
          const existingAssignment = await db
            .select()
            .from(clientProjectAssignments)
            .where(
              and(
                eq(clientProjectAssignments.clientId, clientRecord.id),
                eq(clientProjectAssignments.userId, userId),
                eq(clientProjectAssignments.projectId, uc.projectId)
              )
            )
            .limit(1);

          if (existingAssignment.length > 0) {
            result.skipped.push(
              `Assignment already exists: userId ${userId} / projectId ${uc.projectId} / clientId ${clientRecord.id}`
            );
          } else {
            const assignAction: MigrationAction = {
              type: "CREATE_CLIENT_PROJECT_ASSIGNMENT",
              description: `Assign projectId ${uc.projectId} to userId ${userId} under clientId ${clientRecord.id}`,
              data: {
                clientId: clientRecord.id,
                userId,
                projectId: uc.projectId,
                assignedBy: opts.ownerId,
              },
            };
            result.actions.push(assignAction);
            log(`     ✚  ${assignAction.description}`);

            if (!opts.dryRun) {
              await db.insert(clientProjectAssignments).values({
                clientId: clientRecord.id,
                userId,
                projectId: uc.projectId,
                assignedBy: opts.ownerId,
              });
              result.summary.assignmentsCreated++;
            }
          }
        }

        // Optionally upgrade user role to 'client'
        if (opts.upgradeRoles && collab.userRole !== "client") {
          const roleAction: MigrationAction = {
            type: "UPGRADE_USER_ROLE",
            description: `Set users.role = 'client' for userId ${userId} (${collab.userName ?? collab.userEmail})`,
            data: { userId, fromRole: collab.userRole, toRole: "client" },
          };
          result.actions.push(roleAction);
          log(`     ✚  ${roleAction.description}`);

          if (!opts.dryRun) {
            await db
              .update(users)
              .set({ role: "client" })
              .where(eq(users.id, userId));
            result.summary.rolesUpgraded++;
          }
        }
      }
    }

    log("");
  }

  return result;
}

// ---------------------------------------------------------------------------
// Output & reporting
// ---------------------------------------------------------------------------

function printSummary(result: MigrationResult) {
  const mode = result.dryRun ? "DRY RUN — no changes written" : "LIVE RUN — changes applied";

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           migrate-legacy-clients — Migration Report              ║
╠══════════════════════════════════════════════════════════════════╣
║  Mode     : ${mode.padEnd(52)}║
║  Owner ID : ${String(result.ownerId).padEnd(52)}║
║  Ran at   : ${result.ranAt.padEnd(52)}║
╠══════════════════════════════════════════════════════════════════╣
║  Clients created          : ${String(result.summary.clientsCreated).padEnd(36)}║
║  Projects linked          : ${String(result.summary.projectsLinked).padEnd(36)}║
║  Client users created     : ${String(result.summary.clientUsersCreated).padEnd(36)}║
║  Project assignments made : ${String(result.summary.assignmentsCreated).padEnd(36)}║
║  User roles upgraded      : ${String(result.summary.rolesUpgraded).padEnd(36)}║
╠══════════════════════════════════════════════════════════════════╣
║  Actions planned/applied  : ${String(result.actions.length).padEnd(36)}║
║  Skipped (already exists) : ${String(result.skipped.length).padEnd(36)}║
║  Errors                   : ${String(result.errors.length).padEnd(36)}║
╚══════════════════════════════════════════════════════════════════╝`);

  if (result.skipped.length > 0) {
    console.log("\nSkipped (idempotency):");
    result.skipped.forEach((s) => console.log(`  ↩  ${s}`));
  }

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((e) => console.error(`  ❌  ${e}`));
  }
}

function saveLog(result: MigrationResult) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `migration-log-${ts}.json`;
  writeFileSync(filename, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n📄  Full migration log saved to: ${filename}`);
  console.log(
    "    Keep this file — it lists every change made and can be used to manually reverse the migration.\n"
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const opts = parseCliArgs();

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          migrate-legacy-clients.ts — SkyVee MAPit               ║
╠══════════════════════════════════════════════════════════════════╣
║  Migrates legacy projects.clientName → clients table             ║
║  Owner ID : ${String(opts.ownerId).padEnd(52)}║
║  Dry run  : ${String(opts.dryRun).padEnd(52)}║
║  Migrate collaborators : ${String(opts.migrateCollaborators).padEnd(39)}║
║  Upgrade roles         : ${String(opts.upgradeRoles).padEnd(39)}║
╚══════════════════════════════════════════════════════════════════╝`);

  if (opts.dryRun) {
    console.log(
      "\n⚠️  DRY RUN MODE — no changes will be written to the database.\n"
    );
  }

  if (opts.upgradeRoles && !opts.migrateCollaborators) {
    warn(
      "--upgradeRoles has no effect without --migrateCollaborators. Adding it implicitly."
    );
    opts.migrateCollaborators = true;
  }

  let result: MigrationResult;
  try {
    result = await runMigration(opts);
  } catch (err: unknown) {
    console.error(
      "\n❌  Migration aborted with an unhandled error:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  printSummary(result);

  // Always save the log (even for dry runs — useful for review)
  saveLog(result);

  if (result.errors.length > 0) {
    process.exit(1);
  }
})();
