import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Apple, Smartphone, Chrome, Share2, Plus, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface AppDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppDownloadDialog({ open, onOpenChange }: AppDownloadDialogProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Detect if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDesktopInstall = async () => {
    if (deferredPrompt) {
      // Trigger the native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!', {
          description: 'You can now access Mapit from your desktop.',
        });
        setDeferredPrompt(null);
        onOpenChange(false);
      }
    } else {
      // Show browser-specific instructions in toast as fallback
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
      const isEdge = /Edg/.test(navigator.userAgent);
      
      if (isChrome || isEdge) {
        toast.info('Install from browser menu', {
          description: `Click the install icon (⊕) in the address bar, or go to Menu → Install Mapit.`,
          duration: 8000,
        });
      } else {
        toast.info('Install from browser', {
          description: 'Look for an install option in your browser\'s menu (usually under More Tools or Settings).',
          duration: 8000,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Install Mapit App</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {isStandalone
              ? "App is already installed! You can access it from your home screen."
              : "Install Mapit for quick access, offline support, and a native app experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* iOS Installation */}
          {isIOS && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-0 hover:bg-transparent"
                  onClick={() => setShowIOSInstructions(!showIOSInstructions)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Apple className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg">Install on iPhone/iPad</div>
                      <div className="text-sm text-muted-foreground">
                        {showIOSInstructions ? "Hide instructions" : "Tap to see step-by-step guide"}
                      </div>
                    </div>
                  </div>
                </Button>

                {showIOSInstructions && (
                  <div className="mt-4 space-y-3 pl-2 border-l-2 border-primary/30">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Tap the Share button</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          Look for the square with an arrow pointing up (usually at the bottom or top of Safari)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Find "Add to Home Screen"</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Plus className="h-4 w-4" />
                          Scroll down in the share menu and tap this option
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Tap "Add"</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          The Mapit icon will appear on your home screen
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Android Installation */}
          {isAndroid && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-0 hover:bg-transparent"
                  onClick={() => setShowAndroidInstructions(!showAndroidInstructions)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Smartphone className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg">Install on Android</div>
                      <div className="text-sm text-muted-foreground">
                        {showAndroidInstructions ? "Hide instructions" : "Tap to see step-by-step guide"}
                      </div>
                    </div>
                  </div>
                </Button>

                {showAndroidInstructions && (
                  <div className="mt-4 space-y-3 pl-2 border-l-2 border-primary/30">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Tap the menu button</p>
                        <p className="text-sm text-muted-foreground">
                          Look for three dots (⋮) in the top-right corner of your browser
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Select "Add to Home screen" or "Install app"</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Plus className="h-4 w-4" />
                          The exact wording depends on your browser
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Tap "Install" to confirm</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          The Mapit icon will appear on your home screen
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Desktop Installation */}
          {!isIOS && !isAndroid && (
            <>
              <Card className="border-2 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Monitor className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg">Install on Desktop</div>
                      <div className="text-sm text-muted-foreground">
                        Works on Windows, macOS, and Linux
                      </div>
                    </div>
                  </div>

                  {deferredPrompt ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Click the button below to install Mapit as a desktop app. You'll get:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                        <li>• Quick access from your desktop or taskbar</li>
                        <li>• Offline support for viewing your projects</li>
                        <li>• Native app experience without browser tabs</li>
                      </ul>
                      <Button
                        onClick={handleDesktopInstall}
                        className="w-full"
                        size="lg"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Install Mapit Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        To install Mapit on your computer:
                      </p>
                      <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                        <div className="flex gap-2">
                          <Chrome className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Chrome/Edge</p>
                            <p className="text-sm text-muted-foreground">
                              Click the install icon (⊕) in the address bar, or Menu → Install Mapit
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleDesktopInstall}
                        variant="outline"
                        className="w-full"
                      >
                        Show Install Instructions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mobile guides on desktop */}
              <div className="pt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Installing on mobile devices:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setIsIOS(true);
                      setShowIOSInstructions(true);
                    }}
                  >
                    <Apple className="h-4 w-4 mr-2" />
                    iPhone/iPad
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setIsAndroid(true);
                      setShowAndroidInstructions(true);
                    }}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Android
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
