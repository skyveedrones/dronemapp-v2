/**
 * Version Check System
 * Ensures the application always uses the latest deployed version
 * by checking for updates on app load and periodically
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_STORAGE_KEY = 'mapit_deployed_version';
const LAST_CHECK_KEY = 'mapit_last_version_check';

export interface VersionInfo {
  checkpointId: string;
  version: string;
  deployedAt: string;
}

/**
 * Fetch the latest version info from the server
 */
export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Never cache version info
    });

    if (!response.ok) {
      console.warn('[Version Check] Failed to fetch version info:', response.status);
      return null;
    }

    const data = await response.json();
    return data as VersionInfo;
  } catch (error) {
    console.error('[Version Check] Error fetching version:', error);
    return null;
  }
}

/**
 * Get the currently deployed version from localStorage
 */
export function getStoredVersion(): VersionInfo | null {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Version Check] Error reading stored version:', error);
    return null;
  }
}

/**
 * Store the deployed version in localStorage
 */
export function storeVersion(version: VersionInfo): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(version));
    localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
  } catch (error) {
    console.error('[Version Check] Error storing version:', error);
  }
}

/**
 * Check if enough time has passed since last version check
 */
export function shouldCheckVersion(): boolean {
  try {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) return true;

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    return now - lastCheckTime > VERSION_CHECK_INTERVAL;
  } catch (error) {
    return true;
  }
}

/**
 * Force a hard refresh of the entire application
 * This clears all caches and reloads the page
 */
export function forceAppRefresh(): void {
  console.log('[Version Check] Forcing app refresh due to version mismatch');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }

  // Clear service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }

  // Force reload with cache bust
  window.location.href = window.location.href + '?v=' + Date.now();
}

/**
 * Initialize version checking on app load
 * This runs automatically when the app starts
 */
export async function initializeVersionCheck(): Promise<void> {
  console.log('[Version Check] Initializing version check system');

  try {
    // Always check for updates on app load
    const latestVersion = await fetchLatestVersion();
    
    if (!latestVersion) {
      console.warn('[Version Check] Could not fetch latest version');
      return;
    }

    const storedVersion = getStoredVersion();

    // If no stored version, store the latest
    if (!storedVersion) {
      console.log('[Version Check] First run, storing version:', latestVersion.version);
      storeVersion(latestVersion);
      return;
    }

    // Compare versions - if different, force refresh
    if (storedVersion.checkpointId !== latestVersion.checkpointId) {
      console.log('[Version Check] Version mismatch detected!');
      console.log('  Stored:', storedVersion.version, '(' + storedVersion.checkpointId + ')');
      console.log('  Latest:', latestVersion.version, '(' + latestVersion.checkpointId + ')');
      
      storeVersion(latestVersion);
      forceAppRefresh();
      return;
    }

    console.log('[Version Check] App is up to date:', latestVersion.version);
  } catch (error) {
    console.error('[Version Check] Error during initialization:', error);
  }
}

/**
 * Set up periodic version checking
 * Checks for updates every 5 minutes while app is open
 */
export function startPeriodicVersionCheck(): void {
  console.log('[Version Check] Starting periodic version checks');

  setInterval(async () => {
    if (!shouldCheckVersion()) {
      return;
    }

    const latestVersion = await fetchLatestVersion();
    if (!latestVersion) return;

    const storedVersion = getStoredVersion();
    if (!storedVersion) {
      storeVersion(latestVersion);
      return;
    }

    if (storedVersion.checkpointId !== latestVersion.checkpointId) {
      console.log('[Version Check] New version detected, refreshing app');
      storeVersion(latestVersion);
      forceAppRefresh();
    }
  }, VERSION_CHECK_INTERVAL);
}

/**
 * Get the current version for display
 */
export function getCurrentVersion(): string {
  const stored = getStoredVersion();
  return stored?.version || 'unknown';
}
