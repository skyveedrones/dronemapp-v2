import { useState, useEffect, useCallback } from "react";

export type PWAPlatform = "desktop-chromium" | "ios" | "android" | "other";

interface PWAInstallState {
  canInstall: boolean;          // true if beforeinstallprompt is available
  isInstalled: boolean;         // true if already running as PWA
  platform: PWAPlatform;
  isTablet: boolean;            // true for iPad / Android tablet
  triggerInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  showIOSModal: boolean;
  setShowIOSModal: (v: boolean) => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Detect platform
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isTablet =
    (isIOS && !/iPhone/.test(ua)) || // iPad
    (isAndroid && !/Mobile/.test(ua)); // Android tablet

  let platform: PWAPlatform = "other";
  if (isIOS) platform = "ios";
  else if (isAndroid) platform = "android";
  else if (/Chrome|Edg/.test(ua)) platform = "desktop-chromium";

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");
    setIsInstalled(standalone);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (isIOS) {
      setShowIOSModal(true);
      return "unavailable";
    }
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    return outcome as "accepted" | "dismissed";
  }, [deferredPrompt, isIOS]);

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS);

  return {
    canInstall,
    isInstalled,
    platform,
    isTablet,
    triggerInstall,
    showIOSModal,
    setShowIOSModal,
  };
}
