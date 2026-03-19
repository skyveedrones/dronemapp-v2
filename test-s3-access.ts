/**
 * Test script to verify S3 storage access is working
 */

import { storagePut, storageGet } from "./server/storage";

async function testS3Access() {
  console.log("Testing S3 storage access...\n");

  try {
    // Test 1: Upload a test file
    console.log("1. Uploading test file to S3...");
    const testContent = "Test file uploaded at " + new Date().toISOString();
    const testKey = `test-access-${Date.now()}.txt`;
    
    const uploadResult = await storagePut(testKey, testContent, "text/plain");
    console.log("✓ Upload successful!");
    console.log("  File key:", uploadResult.key);
    console.log("  File URL:", uploadResult.url);

    // Test 2: Try to access the URL
    console.log("\n2. Testing if URL is publicly accessible...");
    const response = await fetch(uploadResult.url);
    
    if (response.ok) {
      const content = await response.text();
      console.log("✓ URL is accessible!");
      console.log("  Status:", response.status);
      console.log("  Content:", content);
      console.log("\n✅ S3 storage access is WORKING!");
      console.log("\nConclusion: You can switch back to S3 storage from Cloudinary.");
    } else {
      console.log("✗ URL returned error:", response.status, response.statusText);
      console.log("\n❌ S3 storage access is STILL BLOCKED!");
      console.log("\nConclusion: Keep using Cloudinary for now.");
    }

    // Test 3: Try getting a signed URL
    console.log("\n3. Testing signed URL generation...");
    const signedResult = await storageGet(testKey);
    console.log("  Signed URL:", signedResult.url);
    
    const signedResponse = await fetch(signedResult.url);
    if (signedResponse.ok) {
      console.log("✓ Signed URL is also accessible!");
    } else {
      console.log("✗ Signed URL returned error:", signedResponse.status);
    }

  } catch (error) {
    console.error("\n❌ Error during S3 test:");
    console.error(error);
    console.log("\nConclusion: Keep using Cloudinary for now.");
  }
}

testS3Access();
