import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const before = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM media WHERE projectId=1020001 AND url LIKE 'https://example.com/%'"));
  const beforeCnt = Number((((before as any)?.[0] || [])[0] || {}).cnt || 0);

  await db.execute(sql.raw(`
    UPDATE media
    SET url = thumbnailUrl
    WHERE projectId = 1020001
      AND mediaType = 'photo'
      AND url LIKE 'https://example.com/%'
      AND thumbnailUrl IS NOT NULL
      AND thumbnailUrl <> ''
  `));

  const after = await db.execute(sql.raw("SELECT COUNT(*) AS cnt FROM media WHERE projectId=1020001 AND url LIKE 'https://example.com/%'"));
  const afterCnt = Number((((after as any)?.[0] || [])[0] || {}).cnt || 0);

  const sample = await db.execute(sql.raw("SELECT id, filename, LEFT(url,160) AS url, LEFT(thumbnailUrl,160) AS thumbnailUrl FROM media WHERE projectId=1020001 ORDER BY id DESC LIMIT 5"));

  console.log(JSON.stringify({ beforeExampleUrlCount: beforeCnt, afterExampleUrlCount: afterCnt, sample: (sample as any)?.[0] || [] }, null, 2));
})();
