import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const conn = await mysql.createConnection({
    uri: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const [currentRows] = await conn.query(
    "SELECT DATABASE() AS db, USER() AS dbUser, @@hostname AS host, @@port AS port",
  );

  let matchingDbs: any[] = [];
  let matchingDbsError: string | null = null;
  try {
    const [rows] = await conn.query("SHOW DATABASES LIKE 'dronemapp%'");
    matchingDbs = rows as any[];
  } catch (e: any) {
    matchingDbsError = String(e?.code || e?.message || e);
  }

  const targets = ["dronemapp_v2", "dronemappv2"];
  const summary: Array<{ name: string; tableCount: number | null; error: string | null }> = [];

  for (const name of targets) {
    try {
      const [rows] = await conn.query(
        "SELECT COUNT(*) AS tableCount FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
        [name],
      );
      const tableCount = Number((rows as any[])[0]?.tableCount ?? 0);
      summary.push({ name, tableCount, error: null });
    } catch (e: any) {
      summary.push({ name, tableCount: null, error: String(e?.code || e?.message || e) });
    }
  }

  await conn.end();

  console.log(
    JSON.stringify(
      {
        current: (currentRows as any[])[0] ?? null,
        matchingDbs,
        matchingDbsError,
        summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
