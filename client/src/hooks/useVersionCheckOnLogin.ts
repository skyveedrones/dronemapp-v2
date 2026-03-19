import { useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
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
 * Custom hook that automatically checks for version updates when user logs in
 * 
 * Features:
 * - Checks version.json on successful login
 * - Detects if user is on stale version
 * - Shows notification if update is available
 * - Provides one-click refresh to load new version
 * - Prevents multiple checks in quick succession
 */
export function useVersionCheckOnLogin() {
  const { user, isAuthenticated } = useAuth();
  const hasCheckedRef = useRef<boolean>(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Only check if user just logged in and we haven't checked yet
    if (!isAuthenticated || !user || hasCheckedRef.current) {
      return;
    }

    // Mark as checked to prevent duplicate checks
    hasCheckedRef.current = true;

    // Small delay to ensure page is fully loaded
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        // Fetch the latest version from the deployed site's version.json
        const response = await fetch('/version.json?_=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          console.debug('Could not fetch version info on login');
          return;
        }

        const versionData: VersionInfo = await response.json();
        const deployedVersion = versionData.commit?.substring(0, 7) || versionData.fullCommit?.substring(0, 7);
        const currentVersion = APP_VERSION.commit.substring(0, 7);

        // If versions don't match, show notification
        if (deployedVersion && deployedVersion !== currentVersion) {
          console.log(`Version update available: ${currentVersion} → ${deployedVersion}`);

          // Show toast notification
          toast.info('New version available!', {
            description: 'A new version of MAPIT is ready. Refresh to update.',
            action: {
              label: 'Refresh',
              onClick: () => {
                // Clear caches before refresh
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                  });
                }
                window.location.reload();
              },
            },
            duration: 10000,
          });
        }

        // Also check backend version if available
        try {
          const backendResponse = await fetch('/api/trpc/version.getInfo', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            const backendCommit = backendData.result?.data?.commit?.substring(0, 7);

            if (backendCommit && deployedVersion && backendCommit !== deployedVersion) {
              console.warn('Frontend/backend version mismatch detected on login');
              toast.warning('Version mismatch detected', {
                description: 'Frontend and backend versions differ. Please refresh.',
                action: {
                  label: 'Refresh',
                  onClick: () => {
                    if ('caches' in window) {
                      caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                      });
                    }
                    window.location.reload();
                  },
                },
                duration: 10000,
              });
            }
          }
        } catch (error) {
          // Backend version check is optional
          console.debug('Could not verify backend version on login:', error);
        }
      } catch (error) {
        console.debug('Version check on login failed:', error);
        // Silently fail - this is not critical
      }
    }, 500); // Wait 500ms after login to check

    // Cleanup timeout on unmount
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user]);
}
