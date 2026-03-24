import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const rows = await db.execute(sql.raw("SELECT id, filename, LEFT(url,180) AS url, LEFT(thumbnailUrl,180) AS thumbnailUrl, fileKey, thumbnailKey FROM media WHERE projectId=1020001 ORDER BY id DESC LIMIT 20"));
  console.log(JSON.stringify(((rows as any)?.[0] || []), null, 2));
})();
