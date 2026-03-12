#!/usr/bin/env node

/**
 * Pre-Build Hook
 * 
 * Ensures version files are always fresh before building.
 * This prevents stale version.json from being deployed.
 * 
 * Runs automatically as part of the build process.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Pre-build checks...\n');

// Check if version.json exists and is recent
const versionJsonPath = path.join(projectRoot, 'client', 'public', 'version.json');
const versionTsPath = path.join(projectRoot, 'shared', 'version.ts');

let shouldUpdateVersion = false;
const now = Date.now();
const ONE_HOUR = 60 * 60 * 1000;

// Check if version.json exists
if (!fs.existsSync(versionJsonPath)) {
  console.log('⚠️  version.json not found, will regenerate');
  shouldUpdateVersion = true;
} else {
  try {
    const stats = fs.statSync(versionJsonPath);
    const age = now - stats.mtimeMs;
    
    if (age > ONE_HOUR) {
      console.log(`⚠️  version.json is ${Math.round(age / 1000 / 60)} minutes old, regenerating`);
      shouldUpdateVersion = true;
    } else {
      // Verify it's valid JSON
      const content = fs.readFileSync(versionJsonPath, 'utf-8');
      JSON.parse(content);
      console.log('✓ version.json is fresh and valid');
    }
  } catch (error) {
    console.log('⚠️  version.json is invalid, will regenerate:', error.message);
    shouldUpdateVersion = true;
  }
}

// Check if version.ts exists
if (!fs.existsSync(versionTsPath)) {
  console.log('⚠️  version.ts not found, will regenerate');
  shouldUpdateVersion = true;
} else {
  console.log('✓ version.ts exists');
}

if (shouldUpdateVersion) {
  console.log('\n🔄 Regenerating version files...\n');
  try {
    execSync('node scripts/update-version.mjs', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('✗ Failed to update version files');
    process.exit(1);
  }
}

console.log('\n✓ Pre-build checks complete\n');
