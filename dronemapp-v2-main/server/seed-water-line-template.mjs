/**
 * Seed Water Line Mapping Template
 * Creates a single pre-built template for water line mapping projects
 * Based on user's existing City of Forney water line projects
 */

import mysql from "mysql2/promise";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function seedWaterLineTemplate() {
  console.log("🌱 Seeding Water Line Mapping template...");

  // Template configuration matching user's City of Forney projects
  const templateConfig = {
    clientName: "City of Forney",
    dronePilot: "Edward Clay Bechtol",
    faaLicenseNumber: "5205636",
    // Additional fields that would be set in project settings after creation:
    // - Export formats: KML, GeoJSON, CSV
    // - Warranty: 12 months with reminders at 3, 6, 9 months
    // - GPS required: Yes
    // - Watermark enabled: Yes
  };

  // Check if template already exists
  const [existingTemplate] = await connection.execute(
    "SELECT id FROM project_templates WHERE name = ? LIMIT 1",
    ["Water Line Mapping"]
  );

  if (existingTemplate.length > 0) {
    console.log("✅ Water Line Mapping template already exists (ID: " + existingTemplate[0].id + ")");
    console.log("   Skipping seed to avoid duplicates.");
    await connection.end();
    return;
  }

  // Get the first user (owner) to assign the template to
  const [users] = await connection.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1");
  
  if (!users || users.length === 0) {
    console.error("❌ No users found in database. Cannot create template.");
    await connection.end();
    process.exit(1);
  }

  const userId = users[0].id;

  // Insert the template
  const [result] = await connection.execute(
    `INSERT INTO project_templates 
    (userId, name, description, category, isSystem, config, useCount, createdAt, updatedAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      "Water Line Mapping",
      "Pre-configured template for municipal water line mapping projects with City of Forney. Includes pilot credentials, FAA license, and standard export formats.",
      "Municipal Infrastructure",
      "yes", // System template (pre-built)
      JSON.stringify(templateConfig),
      0, // Initial use count
    ]
  );

  console.log("✅ Water Line Mapping template created successfully!");
  console.log("   Template ID:", result.insertId);
  console.log("   Configuration:", templateConfig);
  console.log("");
  console.log("📝 Note: This template auto-fills:");
  console.log("   - Client: City of Forney");
  console.log("   - Pilot: Edward Clay Bechtol");
  console.log("   - FAA License: 5205636");
  console.log("");
  console.log("   Additional settings (configured in project settings after creation):");
  console.log("   - Export formats: KML, GeoJSON, CSV");
  console.log("   - Warranty: 12 months with 3/6/9 month reminders");
  console.log("   - GPS required: Yes");
  console.log("   - Watermark enabled: Yes");

  await connection.end();
}

// Run the seed
seedWaterLineTemplate().catch((error) => {
  console.error("❌ Error seeding template:", error);
  process.exit(1);
});
