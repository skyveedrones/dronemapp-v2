#!/usr/bin/env node

/**
 * Ensure Version Script
 * 
 * This script ensures version files are always synchronized with the current build.
 * It automatically detects if version needs updating by comparing:
 * - Current git commit hash
 * - Existing version.json commit hash
 * 
 * If they don't match, it regenerates version files with the current commit.
 * This prevents stale version.json from being deployed.
 * 
 * Usage: node scripts/ensure-version.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return null;
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function getVersionFromPackageJson() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
    );
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

function getExistingVersionJson() {
  const versionJsonPath = path.join(projectRoot, 'client', 'public', 'version.json');
  try {
    if (fs.existsSync(versionJsonPath)) {
      return JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
    }
  } catch (error) {
    console.warn('Could not read existing version.json');
  }
  return null;
}

function needsVersionUpdate() {
  const currentCommit = getGitCommit();
  const existingVersion = getExistingVersionJson();
  
  if (!currentCommit || !existingVersion) {
    return true;
  }
  
  // Compare commits - if they differ, we need to update
  const existingCommit = existingVersion.fullCommit || existingVersion.commit;
  return currentCommit !== existingCommit;
}

function main() {
  const currentCommit = getGitCommit();
  
  if (!currentCommit) {
    console.warn('⚠️  Could not determine git commit, skipping version update');
    process.exit(0);
  }

  if (needsVersionUpdate()) {
    console.log('🔄 Version update needed, regenerating...\n');
    
    const version = getVersionFromPackageJson();
    const branch = getGitBranch();
    
    try {
      execSync(`node scripts/update-version.mjs ${version}`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('✗ Failed to update version');
      process.exit(1);
    }
  } else {
    console.log('✓ Version is current');
  }
}

main();
