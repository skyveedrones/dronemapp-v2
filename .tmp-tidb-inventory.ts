import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all tables
  const tablesRs = await db.execute(sql.raw("SHOW TABLES"));
  const tables = ((tablesRs as any)?.[0] || []).map((r: any) => Object.values(r)[0] as string);

  // Get row counts
  const counts: Record<string, number> = {};
  for (const t of tables) {
    try {
      const rs = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM \`${t}\``));
      counts[t] = Number(((rs as any)?.[0] || [])[0]?.cnt ?? 0);
    } catch {
      counts[t] = -1;
    }
  }

  // Get columns for key tables
  const keyTables = ["users", "projects", "media", "clients", "flights", "organizations", "clientUsers", "clientProjectAssignments", "projectCollaborators"];
  const columnInfo: Record<string, string[]> = {};
  for (const t of keyTables) {
    try {
      const rs = await db.execute(sql.raw(`SHOW COLUMNS FROM \`${t}\``));
      columnInfo[t] = ((rs as any)?.[0] || []).map((r: any) => r.Field as string);
    } catch {
      columnInfo[t] = ["TABLE_NOT_FOUND"];
    }
  }

  const result = {
    database: "dronemapp_v2",
    tableCount: tables.length,
    tables,
    counts,
    columnInfo,
  };

  const root = path.dirname(fileURLToPath(import.meta.url));
  await fs.writeFile(path.join(root, ".tmp-tidb-inventory.json"), JSON.stringify(result, null, 2), "utf8");
  process.stdout.write("DONE\n");
  process.exit(0);
})().catch(err => {
  process.stderr.write("ERROR: " + err.message + "\n");
  process.exit(1);
});
