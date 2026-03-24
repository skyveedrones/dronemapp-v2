import fs from "node:fs/promises";
import path from "node:path";

(async () => {
  const p = path.join(process.cwd(), ".tmp-write-test.json");
  await fs.writeFile(p, JSON.stringify({ ok: true, at: new Date().toISOString() }, null, 2), "utf8");
  console.log("WROTE", p);
})();
