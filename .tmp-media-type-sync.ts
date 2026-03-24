import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const colRs = await db.execute(sql.raw("SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME IN ('mediaType','type','deletedAt') ORDER BY COLUMN_NAME"));
  const beforeValsRs = await db.execute(sql.raw("SELECT mediaType, COUNT(*) AS cnt FROM media WHERE projectId = 1020001 GROUP BY mediaType ORDER BY mediaType"));

  let usedColumn = "mediaType";
  let usedValue = "image";
  let fallbackReason = null;

  try {
    await db.execute(sql.raw("UPDATE media SET mediaType = 'image', deletedAt = NULL WHERE projectId = 1020001"));
  } catch (e) {
    fallbackReason = String((e as any)?.cause?.sqlMessage || (e as any)?.message || e);
    usedValue = "photo";
    await db.execute(sql.raw("UPDATE media SET mediaType = 'photo', deletedAt = NULL WHERE projectId = 1020001"));
  }

  const afterValsRs = await db.execute(sql.raw("SELECT mediaType, COUNT(*) AS cnt FROM media WHERE projectId = 1020001 GROUP BY mediaType ORDER BY mediaType"));
  const verifyRs = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM media WHERE projectId = 1020001 AND mediaType = '${usedValue}' AND deletedAt IS NULL`));

  console.log(JSON.stringify({
    columnCheck: (colRs as any)?.[0] || [],
    beforeValues: (beforeValsRs as any)?.[0] || [],
    usedColumn,
    attemptedFirst: "image",
    usedValue,
    fallbackReason,
    afterValues: (afterValsRs as any)?.[0] || [],
    verifyCountForUsedValueAndNullDeletedAt: ((verifyRs as any)?.[0] || [])[0]?.cnt ?? 0
  }, null, 2));
})();
