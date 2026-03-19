import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Monitor, Apple, Chrome } from "lucide-react";

const DESKTOP_APP_DIALOG_KEY = "mapit_desktop_app_dialog_shown";

export function DesktopAppDownloadDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if we should show the dialog
    const hasShown = localStorage.getItem(DESKTOP_APP_DIALOG_KEY);
    
    // Only show if not shown before
    if (!hasShown) {
      // Delay showing the dialog by 2 seconds after page load
      const timer = setTimeout(() => {
        setOpen(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = (open: boolean) => {
    // When closing the dialog (open = false), check if we should save preference
    if (!open && dontShowAgain) {
      localStorage.setItem(DESKTOP_APP_DIALOG_KEY, "true");
    }
    setOpen(open);
  };

  const handleDownload = (platform: string) => {
    // Track the download
    console.log(`[Desktop App] User clicked download for ${platform}`);
    
    // In a real app, these would be actual download links
    // For now, we'll just show a message
    alert(`Desktop app download for ${platform} coming soon! For now, you can install this web app to your device using your browser's "Install" or "Add to Home Screen" option.`);
    
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Download MAPIT Desktop App</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get the best experience with our native desktop application. Faster performance, offline access, and seamless integration with your system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4"
            onClick={() => handleDownload("Windows")}
          >
            <Monitor className="h-5 w-5 mr-3 text-primary" />
            <div className="text-left flex-1">
              <div className="font-semibold">Windows</div>
              <div className="text-sm text-muted-foreground">For Windows 10 and later</div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4"
            onClick={() => handleDownload("macOS")}
          >
            <Apple className="h-5 w-5 mr-3 text-primary" />
            <div className="text-left flex-1">
              <div className="font-semibold">macOS</div>
              <div className="text-sm text-muted-foreground">For macOS 11 and later</div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4"
            onClick={() => handleDownload("Linux")}
          >
            <Chrome className="h-5 w-5 mr-3 text-primary" />
            <div className="text-left flex-1">
              <div className="font-semibold">Linux</div>
              <div className="text-sm text-muted-foreground">For Ubuntu, Fedora, and more</div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show"
              className="text-sm font-bold cursor-pointer"
            >
              Don't show this again
            </label>
          </div>
          <Button variant="ghost" onClick={() => handleClose(false)} className="w-full">
            Continue with Web App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
