import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  // Find all TBechtol accounts (case-insensitive)
  const users = await db.execute(sql.raw(`
    SELECT id, email, name, organizationId, orgRole, role, openId, loginMethod, lastSignedIn, createdAt
    FROM users WHERE LOWER(email) = 'tbechtol@forneytx.gov'
    ORDER BY lastSignedIn DESC
  `)) as unknown as [Array<any>, unknown];
  console.log('ALL_ACCOUNTS:', JSON.stringify(users[0], null, 2));

  // For each account, check collaborator rows and org projects
  for (const u of (users[0] ?? [])) {
    const collabs = await db.execute(sql.raw(`
      SELECT projectId, role FROM project_collaborators WHERE userId = ${u.id}
    `)) as unknown as [Array<any>, unknown];
    console.log(`USER_${u.id}_COLLABS:`, JSON.stringify(collabs[0]));

    const orgProjects = await db.execute(sql.raw(`
      SELECT id, name FROM projects WHERE organizationId = ${u.organizationId ?? 'NULL'} AND deletedAt IS NULL
    `)) as unknown as [Array<any>, unknown];
    console.log(`USER_${u.id}_ORG_PROJECTS (orgId=${u.organizationId}):`, JSON.stringify(orgProjects[0]));
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
