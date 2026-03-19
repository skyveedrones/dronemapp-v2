#!/usr/bin/env node

/**
 * Automatic Version Update Script
 * 
 * This script automatically updates version information during the build process.
 * It should be run:
 * 1. During CI/CD pipeline before build
 * 2. Manually when creating new checkpoints
 * 3. As part of the build process
 * 
 * The script:
 * - Reads the current git commit hash
 * - Updates shared/version.ts with new version info
 * - Updates client/public/version.json for runtime checks
 * - Ensures version consistency across the application
 * - Validates all files were created successfully
 * 
 * Usage: node scripts/update-version.mjs [version-number]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * Get current git commit hash
 */
function getGitCommit() {
  try {
    const commit = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    return commit;
  } catch (error) {
    console.warn('⚠️  Failed to get git commit, using placeholder');
    return 'development';
  }
}

/**
 * Get current git branch
 */
function getGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    return branch;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Parse version from package.json or use provided version
 */
function getVersionNumber(providedVersion) {
  if (providedVersion) {
    return providedVersion;
  }

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
    );
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('⚠️  Failed to read package.json version, using default');
    return '1.0.0';
  }
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Update shared/version.ts
 */
function updateVersionFile(version, commit, branch) {
  const versionFilePath = path.join(projectRoot, 'shared', 'version.ts');
  
  // Ensure directory exists
  ensureDirectoryExists(path.dirname(versionFilePath));

  const versionContent = `/**
 * Application version information
 * 
 * AUTOMATICALLY UPDATED - Do not edit manually
 * Updated by: scripts/update-version.mjs
 * Last updated: ${new Date().toISOString()}
 * 
 * This file is automatically updated during build with:
 * - Latest version number from package.json
 * - Current git commit hash
 * - Build timestamp
 * - Git branch information
 */

export const APP_VERSION = {
  version: '${version}',
  commit: '${commit}',
  branch: '${branch}',
  buildDate: new Date().toISOString(),
  buildTimestamp: ${Date.now()},
};

/**
 * Get human-readable version string
 * Format: v1.0.8 (b781421) - Feb 10, 2026
 */
export function getVersionString(): string {
  const date = new Date(APP_VERSION.buildDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  
  return \`v\${APP_VERSION.version} (\${APP_VERSION.commit.substring(0, 7)}) - \${formattedDate}\`;
}

/**
 * Get version for API/backend communication
 */
export function getVersionInfo() {
  return {
    version: APP_VERSION.version,
    commit: APP_VERSION.commit,
    branch: APP_VERSION.branch,
    buildDate: APP_VERSION.buildDate,
    displayVersion: getVersionString(),
  };
}
`;

  try {
    fs.writeFileSync(versionFilePath, versionContent, 'utf-8');
    
    // Verify file was written
    const written = fs.readFileSync(versionFilePath, 'utf-8');
    if (!written.includes(version)) {
      throw new Error('Version file verification failed - content mismatch');
    }
    
    console.log(`✓ Updated ${versionFilePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to update ${versionFilePath}:`, error.message);
    return false;
  }
}

/**
 * Update client/public/version.json for runtime checks
 */
function updateVersionJson(version, commit) {
  const versionJsonPath = path.join(projectRoot, 'client', 'public', 'version.json');
  
  // Ensure directory exists
  ensureDirectoryExists(path.dirname(versionJsonPath));

  const versionJson = {
    version: version,
    commit: commit.substring(0, 7),
    fullCommit: commit,
    buildDate: new Date().toISOString(),
    timestamp: Date.now(),
  };

  try {
    const jsonContent = JSON.stringify(versionJson, null, 2);
    fs.writeFileSync(versionJsonPath, jsonContent, 'utf-8');
    
    // Verify file was written and is valid JSON
    const written = fs.readFileSync(versionJsonPath, 'utf-8');
    const parsed = JSON.parse(written);
    
    if (parsed.version !== version) {
      throw new Error('Version JSON verification failed - version mismatch');
    }
    
    console.log(`✓ Updated ${versionJsonPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to update ${versionJsonPath}:`, error.message);
    return false;
  }
}

/**
 * Create a version metadata file for deployment systems
 */
function createVersionMetadata(version, commit, branch) {
  const metadataPath = path.join(projectRoot, '.version-metadata.json');
  
  const metadata = {
    version: version,
    commit: commit,
    branch: branch,
    buildDate: new Date().toISOString(),
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✓ Created ${metadataPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create ${metadataPath}:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Updating version information...\n');

  const providedVersion = process.argv[2];
  const commit = getGitCommit();
  const branch = getGitBranch();
  const version = getVersionNumber(providedVersion);

  console.log('Version Details:');
  console.log(`  Version: ${version}`);
  console.log(`  Commit: ${commit.substring(0, 7)}`);
  console.log(`  Branch: ${branch}`);
  console.log(`  Build Date: ${new Date().toISOString()}\n`);

  const versionFileUpdated = updateVersionFile(version, commit, branch);
  const versionJsonUpdated = updateVersionJson(version, commit);
  const metadataCreated = createVersionMetadata(version, commit, branch);

  if (versionFileUpdated && versionJsonUpdated && metadataCreated) {
    console.log('\n✓ Version update completed successfully');
    console.log('\nNext steps:');
    console.log('1. Rebuild the application: pnpm build');
    console.log('2. Test version display in Settings > Version');
    console.log('3. Commit changes: git add . && git commit -m "chore: update version to ' + version + '"');
    process.exit(0);
  } else {
    console.error('\n✗ Version update failed');
    process.exit(1);
  }
}

main();
