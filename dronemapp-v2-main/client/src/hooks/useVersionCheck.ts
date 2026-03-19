import { useEffect, useRef } from 'react';
import { APP_VERSION } from '@shared/version';
import { toast } from 'sonner';

interface VersionInfo {
  version: string;
  commit: string;
  fullCommit?: string;
  buildDate: string;
  timestamp: number;
}

/**
 * Custom hook that continuously checks for version updates
 * 
 * Features:
 * - Checks version.json every 30 seconds
 * - Uses cache busting to always get fresh version info
 * - Performs hard refresh when new version is detected
 * - Shows notification before auto-reload
 * - Prevents multiple simultaneous checks
 */
export function useVersionCheck() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isCheckingRef = useRef<boolean>(false);
  const hasNotifiedRef = useRef<boolean>(false);

  useEffect(() => {
    const performHardRefresh = async () => {
      try {
        // Clear all service worker caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear localStorage and sessionStorage
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.debug('Could not clear storage:', e);
        }
        
        // Perform hard refresh by navigating to same URL with cache-busting param
        // This forces the browser to re-download all assets
        const currentUrl = window.location.href.split('?')[0];
        window.location.href = currentUrl + '?_=' + Date.now();
      } catch (error) {
        console.error('Hard refresh failed:', error);
        // Fallback to regular reload
        window.location.reload();
      }
    };

    const checkVersion = async () => {
      // Prevent multiple simultaneous checks
      if (isCheckingRef.current) {
        return;
      }

      isCheckingRef.current = true;

      try {
        // Fetch the latest version with aggressive cache busting
        const response = await fetch('/version.json?_=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (!response.ok) {
          console.debug('Could not fetch version info');
          return;
        }

        const versionData: VersionInfo = await response.json();
        const deployedVersion = versionData.commit?.substring(0, 7) || versionData.fullCommit?.substring(0, 7);
        const currentVersion = APP_VERSION.commit.substring(0, 7);

        console.log(`Version check: current=${currentVersion}, deployed=${deployedVersion}`);

        // If versions don't match and we haven't notified yet
        if (deployedVersion && deployedVersion !== currentVersion && !hasNotifiedRef.current) {
          console.log(`Version update detected: ${currentVersion} → ${deployedVersion}`);
          hasNotifiedRef.current = true;

          // Show toast notification with auto-reload
          toast.info('New version available!', {
            description: 'Mapit is updating. Reloading in 5 seconds...',
            action: {
              label: 'Reload Now',
              onClick: () => performHardRefresh(),
            },
            duration: 5000,
          });

          // Auto-reload after 5 seconds
          setTimeout(() => {
            performHardRefresh();
          }, 5000);
        }
      } catch (error) {
        console.debug('Version check failed:', error);
        // Silently fail - this is not critical
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Check immediately on mount
    checkVersion();

    // Then check every 30 seconds
    intervalRef.current = setInterval(checkVersion, 30000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
