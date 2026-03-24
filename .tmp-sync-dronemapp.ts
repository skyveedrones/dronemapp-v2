import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql.raw("ALTER TABLE users ADD COLUMN IF NOT EXISTS organizationId INT NULL, ADD COLUMN IF NOT EXISTS orgRole VARCHAR(50) NULL"));
  await db.execute(sql.raw("ALTER TABLE projects ADD COLUMN IF NOT EXISTS organizationId INT NULL, ADD COLUMN IF NOT EXISTS isPinned BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN IF NOT EXISTS deletedAt DATETIME NULL, ADD COLUMN IF NOT EXISTS deletedBy INT NULL"));
  await db.execute(sql.raw("ALTER TABLE media ADD COLUMN IF NOT EXISTS deletedAt DATETIME NULL"));
  await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS project_overlays (id INT AUTO_INCREMENT PRIMARY KEY, projectId INT NOT NULL, fileUrl VARCHAR(512) NOT NULL, opacity DECIMAL(4,2) DEFAULT 0.50, coordinates JSON NULL, isActive INT DEFAULT 1, label VARCHAR(100) DEFAULT 'Initial Plan', version_number INT DEFAULT 1, rotation DECIMAL(7,4) DEFAULT 0, original_coordinates JSON NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"));

  const verify = await db.execute(sql.raw("SELECT DATABASE() AS db"));
  console.log("SCHEMA_SYNC_OK", JSON.stringify((verify as any)?.[0] || []));
})();
