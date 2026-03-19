#!/usr/bin/env node
/**
 * Download All Media Script
 * 
 * Downloads all media files from the development storage and organizes them by project.
 * Files are saved to ./media-backup/ directory with project folders.
 */

import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
const BACKUP_DIR = './media-backup';

// Helper to get presigned download URL
async function getDownloadUrl(fileKey) {
  const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', fileKey);
  
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${FORGE_API_KEY}` }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status}`);
  }
  
  return (await response.json()).url;
}

// Database connection
const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('📥 Starting media download from development storage...\n');

// Create backup directory
await fs.mkdir(BACKUP_DIR, { recursive: true });

// Fetch all media with project info
const [allMedia] = await connection.execute(`
  SELECT m.*, p.name as projectName, p.id as projectId
  FROM media m
  JOIN projects p ON m.projectId = p.id
  ORDER BY p.id, m.filename
`);

console.log(`📊 Found ${allMedia.length} media files across projects\n`);

// Group by project
const projectGroups = {};
for (const item of allMedia) {
  if (!projectGroups[item.projectId]) {
    projectGroups[item.projectId] = {
      name: item.projectName,
      files: []
    };
  }
  projectGroups[item.projectId].files.push(item);
}

let successCount = 0;
let errorCount = 0;
const errors = [];

for (const [projectId, project] of Object.entries(projectGroups)) {
  console.log(`\n📁 Project: ${project.name} (${project.files.length} files)`);
  console.log('─'.repeat(60));
  
  // Create project directory
  const projectDir = path.join(BACKUP_DIR, `project-${projectId}-${project.name.replace(/[^a-z0-9]/gi, '_')}`);
  await fs.mkdir(projectDir, { recursive: true });
  
  for (let i = 0; i < project.files.length; i++) {
    const item = project.files[i];
    const progress = `[${i + 1}/${project.files.length}]`;
    
    try {
      console.log(`${progress} ${item.filename}`);
      
      // Get download URL
      const downloadUrl = await getDownloadUrl(item.fileKey);
      
      // Download file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const fileBuffer = Buffer.from(await response.arrayBuffer());
      
      // Save to disk
      const filePath = path.join(projectDir, item.filename);
      await fs.writeFile(filePath, fileBuffer);
      
      console.log(`   ✓ Saved (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      successCount++;
      
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Error: ${error.message}`);
      errors.push(`${project.name}/${item.filename}: ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    if (i < project.files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('📈 Download Summary');
console.log('='.repeat(60));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);
console.log(`📊 Total: ${allMedia.length}`);
console.log(`📂 Saved to: ${path.resolve(BACKUP_DIR)}`);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
  if (errors.length > 10) {
    console.log(`   ... and ${errors.length - 10} more errors`);
  }
}

await connection.end();
console.log('\n✨ Download complete!');
console.log('\n📝 Next steps:');
console.log('   1. Check the media-backup/ folder for all downloaded files');
console.log('   2. Log into your published site: https://dronemapv2-fis5wf2n.manus.space');
console.log('   3. Go to each project and upload the corresponding files');
console.log('   4. Media will now display correctly on the published site!');
