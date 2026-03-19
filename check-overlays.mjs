import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, projectId, fileUrl, isActive, label, CAST(coordinates AS CHAR) as coords FROM project_overlays');
console.log('=== OVERLAY RECORDS ===');
for (const row of rows) {
  console.log(`ID: ${row.id} | Project: ${row.projectId} | Active: ${row.isActive} | Label: ${row.label}`);
  console.log(`  fileUrl: ${row.fileUrl}`);
  console.log(`  coordinates: ${row.coords}`);
}
await conn.end();
