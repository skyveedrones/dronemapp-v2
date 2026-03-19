import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";

/**
 * Displays an indicator when the user is offline
 * Shows a toast-style notification at the top of the screen
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    // Show a brief "Back online" message when connection is restored
    if (isOnline && !showOnlineToast) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Don't show anything when online (unless showing the "back online" toast)
  if (isOnline && !showOnlineToast) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-yellow-500 text-yellow-950"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            You're offline - viewing cached data
          </span>
        </>
      )}
    </div>
  );
}
