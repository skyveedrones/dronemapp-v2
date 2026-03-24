import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  const traceyRows = await db.execute(sql.raw(`
    SELECT id, openId, email, name, role, organizationId, orgRole, loginMethod, lastSignedIn
    FROM users
    WHERE LOWER(email) = 'tbechtol@forneytx.gov'
       OR LOWER(email) = 'tbechtol@forneytx.gov '
       OR LOWER(email) LIKE '%tbechtol%'
       OR LOWER(name) = 'tracey bechtol'
    ORDER BY lastSignedIn DESC, id DESC
  `)) as unknown as [Array<any>, unknown];

  const recentRows = await db.execute(sql.raw(`
    SELECT id, openId, email, name, role, organizationId, orgRole, loginMethod, lastSignedIn
    FROM users
    WHERE lastSignedIn >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
    ORDER BY lastSignedIn DESC
    LIMIT 50
  `)) as unknown as [Array<any>, unknown];

  console.log('TRACEY_MATCHES=', JSON.stringify(traceyRows[0]));
  console.log('RECENT_6H_SIGNINS=', JSON.stringify(recentRows[0]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
