#!/usr/bin/env node
/**
 * Media Migration Script V2: Development to Production S3
 * 
 * Uses the Manus storage API to get presigned download URLs and re-upload to production.
 */

import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   BUILT_IN_FORGE_API_URL:', FORGE_API_URL ? '✓' : '✗');
  console.error('   BUILT_IN_FORGE_API_KEY:', FORGE_API_KEY ? '✓' : '✗');
  process.exit(1);
}

const baseUrl = FORGE_API_URL.replace(/\/+$/, '');

// Helper to get presigned download URL
async function getDownloadUrl(fileKey) {
  const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', fileKey);
  
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.url;
}

// Helper to upload file
async function uploadFile(fileKey, fileBuffer, mimeType, filename) {
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', fileKey);
  
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, filename);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Database connection
const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('🚀 Starting media migration using storage API...\n');

// Fetch all media records
const [allMedia] = await connection.execute('SELECT * FROM media');
console.log(`📊 Found ${allMedia.length} media records in database\n`);

let successCount = 0;
let errorCount = 0;
const errors = [];

for (let i = 0; i < allMedia.length; i++) {
  const item = allMedia[i];
  const progress = `[${i + 1}/${allMedia.length}]`;
  
  try {
    console.log(`${progress} Processing: ${item.filename}`);
    console.log(`   File key: ${item.fileKey}`);
    
    // Get presigned download URL from storage API
    const downloadUrl = await getDownloadUrl(item.fileKey);
    console.log(`   ✓ Got download URL`);
    
    // Download file
    const downloadResponse = await fetch(downloadUrl);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download: ${downloadResponse.status} ${downloadResponse.statusText}`);
    }
    
    const fileBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    console.log(`   ✓ Downloaded (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    // Re-upload to production (same key, will overwrite in production bucket)
    const uploadResult = await uploadFile(item.fileKey, fileBuffer, item.mimeType, item.filename);
    console.log(`   ✓ Uploaded to production: ${uploadResult.url}`);
    
    // Handle thumbnail if exists
    if (item.thumbnailKey) {
      try {
        console.log(`   Uploading thumbnail...`);
        const thumbDownloadUrl = await getDownloadUrl(item.thumbnailKey);
        const thumbResponse = await fetch(thumbDownloadUrl);
        
        if (thumbResponse.ok) {
          const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
          await uploadFile(item.thumbnailKey, thumbBuffer, 'image/jpeg', item.thumbnailKey.split('/').pop());
          console.log(`   ✓ Thumbnail uploaded`);
        }
      } catch (thumbError) {
        console.log(`   ⚠ Thumbnail failed: ${thumbError.message}`);
      }
    }
    
    successCount++;
    console.log(`   ✅ Success\n`);
    
  } catch (error) {
    errorCount++;
    const errorMsg = `${progress} ${item.filename}: ${error.message}`;
    console.error(`   ❌ Error: ${error.message}\n`);
    errors.push(errorMsg);
  }
  
  // Add small delay to avoid rate limiting
  if (i < allMedia.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

console.log('\n' + '='.repeat(60));
console.log('📈 Migration Summary');
console.log('='.repeat(60));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);
console.log(`📊 Total: ${allMedia.length}`);
console.log(`📈 Success Rate: ${((successCount / allMedia.length) * 100).toFixed(1)}%`);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
  if (errors.length > 10) {
    console.log(`   ... and ${errors.length - 10} more errors`);
  }
}

await connection.end();
console.log('\n✨ Migration complete!');
