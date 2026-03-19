/**
 * Application version information
 * 
 * AUTOMATICALLY UPDATED - Do not edit manually
 * Updated by: scripts/update-version.mjs
 * Last updated: 2026-03-18T16:32:58.944Z
 * 
 * This file is automatically updated during build with:
 * - Latest version number from package.json
 * - Current git commit hash
 * - Build timestamp
 * - Git branch information
 */

export const APP_VERSION = {
  version: '2.1.0',
  commit: '84b52740b67b6c9d9d62a5fb54ef61a9d5435884',
  branch: 'main',
  buildDate: new Date().toISOString(),
  buildTimestamp: 1773851578944,
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
  
  return `v${APP_VERSION.version} (${APP_VERSION.commit.substring(0, 7)}) - ${formattedDate}`;
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
