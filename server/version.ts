/**
 * Version Management
 * Tracks and provides the current deployed version
 * Reads from public/version.json which is updated during deployment
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  checkpointId: string;
  version: string;
  deployedAt: string;
}

// Store the current version in memory
let currentVersion: VersionInfo = {
  checkpointId: 'unknown',
  version: 'v1.0.0',
  deployedAt: new Date().toISOString(),
};

/**
 * Initialize version from public/version.json (set during deployment)
 * Falls back to environment variables and package.json
 */
export function initializeVersion(): void {
  try {
    // First, try to read from public/version.json (set during deployment)
    const versionJsonPath = join(process.cwd(), 'public', 'version.json');
    const versionJson = JSON.parse(readFileSync(versionJsonPath, 'utf-8'));
    
    currentVersion = {
      checkpointId: versionJson.checkpointId || process.env.VITE_APP_VERSION || 'unknown',
      version: versionJson.version || `v${require('../package.json').version || '1.0.0'}`,
      deployedAt: versionJson.deployedAt || new Date().toISOString(),
    };

    console.log('[Version] Initialized from version.json:', currentVersion.version, `(${currentVersion.checkpointId})`);
  } catch (error) {
    try {
      // Fallback: read from package.json
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      currentVersion = {
        checkpointId: process.env.VITE_APP_VERSION || 'unknown',
        version: `v${packageJson.version || '1.0.0'}`,
        deployedAt: new Date().toISOString(),
      };

      console.log('[Version] Initialized from package.json (version.json not found):', currentVersion.version);
    } catch (fallbackError) {
      console.warn('[Version] Could not read version files, using defaults');
    }
  }
}

/**
 * Get the current deployed version
 */
export function getCurrentVersion(): VersionInfo {
  return currentVersion;
}

/**
 * Update the version (called when deploying new checkpoint)
 * This updates the in-memory version and writes to public/version.json
 */
export function updateVersion(checkpointId: string, semanticVersion?: string): void {
  currentVersion = {
    checkpointId,
    version: semanticVersion || currentVersion.version,
    deployedAt: new Date().toISOString(),
  };

  // Try to write to public/version.json for persistence
  try {
    const versionJsonPath = join(process.cwd(), 'public', 'version.json');
    const fs = require('fs');
    fs.writeFileSync(versionJsonPath, JSON.stringify(currentVersion, null, 2));
    console.log('[Version] Updated and saved to version.json:', currentVersion.version, `(${currentVersion.checkpointId})`);
  } catch (error) {
    console.log('[Version] Updated in memory:', currentVersion.version, `(${currentVersion.checkpointId})`);
  }
}

/**
 * Get version info as JSON
 */
export function getVersionJson(): VersionInfo {
  return {
    ...currentVersion,
    deployedAt: new Date().toISOString(), // Always return current time
  };
}
