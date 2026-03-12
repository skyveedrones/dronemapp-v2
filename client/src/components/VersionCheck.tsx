import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { APP_VERSION, getVersionString } from "@shared/version";
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface VersionInfo {
  version: string;
  commit: string;
  fullCommit?: string;
  buildDate: string;
  timestamp: number;
}

export default function VersionCheck() {
  const [autoCheck, setAutoCheck] = useState(() => {
    const saved = localStorage.getItem("autoCheckUpdates");
    return saved !== "false"; // Default to true
  });
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  const currentVersion = APP_VERSION.commit.substring(0, 7);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Fetch the latest version from the deployed site's version.json
      // This file should be generated during build and contain the latest commit hash
      const response = await fetch('/version.json?_=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch version info');
      }
      
      const versionData: VersionInfo = await response.json();
      const deployedVersion = versionData.commit?.substring(0, 7) || versionData.fullCommit?.substring(0, 7) || currentVersion;
      
      setLatestVersion(deployedVersion);
      setLastChecked(new Date());
      
      // Compare versions - if deployed version is different from current, update is available
      const hasUpdate = deployedVersion !== currentVersion;
      setUpdateAvailable(hasUpdate);
      
      // Check backend version if available
      try {
        const backendResponse = await fetch('/api/version', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          const backendVer = backendData.commit?.substring(0, 7) || currentVersion;
          setBackendVersion(backendVer);
          
          // Check if frontend and backend versions match
          if (deployedVersion !== backendVer) {
            setVersionMismatch(true);
            toast.warning("Version mismatch detected", {
              description: `Frontend: ${deployedVersion}, Backend: ${backendVer}. Please refresh.`,
              duration: 10000,
            });
          } else {
            setVersionMismatch(false);
          }
        }
      } catch (error) {
        // Backend version check is optional
        console.debug("Could not verify backend version:", error);
      }
      
      if (hasUpdate) {
        toast.info("New version available!", {
          description: `Version ${deployedVersion} is ready. Refresh to update.`,
          duration: 10000,
        });
      } else if (!versionMismatch) {
        toast.success("You're up to date!", {
          description: "You're using the latest version.",
        });
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      // Fallback: assume we're up to date if we can't check
      setLatestVersion(currentVersion);
      setLastChecked(new Date());
      setUpdateAvailable(false);
      setVersionMismatch(false);
      
      toast.error("Failed to check for updates", {
        description: "Unable to connect to update server.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoCheckChange = (checked: boolean) => {
    setAutoCheck(checked);
    localStorage.setItem("autoCheckUpdates", checked.toString());
    toast.success(checked ? "Automatic update checks enabled" : "Automatic update checks disabled");
  };

  const handleRefresh = () => {
    // Clear all caches before refresh to ensure latest version loads
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Force a hard reload
    window.location.reload();
  };

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkForUpdates();
    }
  }, []); // Only run on mount

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Info className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle>Version & Updates</CardTitle>
            <CardDescription>
              Check for updates and manage automatic update notifications
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Version */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <div className="text-sm font-medium">Current Version</div>
            <div className="text-xs text-muted-foreground mt-1">
              {getVersionString()}
            </div>
          </div>
          {updateAvailable || versionMismatch ? (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Update Available</span>
            </div>
          ) : lastChecked ? (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Up to Date</span>
            </div>
          ) : null}
        </div>

        {/* Version Mismatch Banner */}
        {versionMismatch && backendVersion && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-red-500">Version Mismatch Detected</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Frontend: {latestVersion} | Backend: {backendVersion}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  The frontend and backend versions don't match. This may cause issues. Please refresh the page.
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-3 bg-red-500 hover:bg-red-600 text-white"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Update Available Banner */}
        {updateAvailable && !versionMismatch && latestVersion && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-amber-500">New Version Available</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Version {latestVersion} is available. Refresh the page to update.
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-check Setting */}
        <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
          <Checkbox
            id="autoCheck"
            checked={autoCheck}
            onCheckedChange={handleAutoCheckChange}
          />
          <div className="flex-1">
            <Label htmlFor="autoCheck" className="cursor-pointer font-medium">
              Automatically check for updates
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Check for new versions when you open Settings
            </p>
          </div>
        </div>

        {/* Manual Check Button */}
        <div className="flex items-center justify-between">
          <div>
            {lastChecked && (
              <p className="text-sm text-muted-foreground">
                Last checked: {lastChecked.toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={checkForUpdates}
            disabled={isChecking}
            variant="outline"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
