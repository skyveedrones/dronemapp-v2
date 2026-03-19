#!/usr/bin/env node
/**
 * Media Migration Script: Development to Production S3
 * 
 * This script copies all media files from the development S3 bucket to the production S3 bucket.
 * It reads all media records from the database and re-uploads each file to production storage.
 */

import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
config();

const DEV_FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const DEV_FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DEV_FORGE_API_URL || !DEV_FORGE_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   BUILT_IN_FORGE_API_URL:', DEV_FORGE_API_URL ? '✓' : '✗');
  console.error('   BUILT_IN_FORGE_API_KEY:', DEV_FORGE_API_KEY ? '✓' : '✗');
  process.exit(1);
}

// Database connection
const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('🚀 Starting media migration from development to production S3...\n');

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
    console.log(`   Current URL: ${item.url}`);
    
    // Download file from current URL
    const downloadResponse = await fetch(item.url);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download: ${downloadResponse.status} ${downloadResponse.statusText}`);
    }
    
    const fileBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    console.log(`   ✓ Downloaded (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    // Upload to production S3 using the storage API
    const uploadUrl = new URL('v1/storage/upload', DEV_FORGE_API_URL.replace(/\/+$/, '') + '/');
    uploadUrl.searchParams.set('path', item.file_key);
    
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: item.mime_type });
    formData.append('file', blob, item.filename);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEV_FORGE_API_KEY}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log(`   ✓ Uploaded to production: ${uploadResult.url}`);
    
    // Upload thumbnail if exists
    if (item.thumbnail_url && item.thumbnail_key) {
      console.log(`   Uploading thumbnail...`);
      const thumbResponse = await fetch(item.thumbnail_url);
      if (thumbResponse.ok) {
        const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
        
        const thumbUploadUrl = new URL('v1/storage/upload', DEV_FORGE_API_URL.replace(/\/+$/, '') + '/');
        thumbUploadUrl.searchParams.set('path', item.thumbnail_key);
        
        const thumbFormData = new FormData();
        const thumbBlob = new Blob([thumbBuffer], { type: 'image/jpeg' });
        thumbFormData.append('file', thumbBlob, item.thumbnail_key.split('/').pop());
        
        const thumbUploadResponse = await fetch(thumbUploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEV_FORGE_API_KEY}`
          },
          body: thumbFormData
        });
        
        if (thumbUploadResponse.ok) {
          console.log(`   ✓ Thumbnail uploaded`);
        }
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
}

console.log('\n' + '='.repeat(60));
console.log('📈 Migration Summary');
console.log('='.repeat(60));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);
console.log(`📊 Total: ${allMedia.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(err => console.log(`   ${err}`));
}

await connection.end();
console.log('\n✨ Migration complete!');
