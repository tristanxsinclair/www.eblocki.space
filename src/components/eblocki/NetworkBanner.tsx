import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { WifiOff } from "lucide-react";

/**
 * Offline banner that appears when network connectivity is lost.
 * Uses Capacitor Network plugin on native, falls back to navigator.onLine on web.
 */
export function NetworkBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Network plugin
      Network.getStatus().then((status) => setOnline(status.connected));
      const handle = Network.addListener("networkStatusChange", (status) => {
        setOnline(status.connected);
      });
      return () => {
        handle.then((h) => h.remove());
      };
    } else {
      // Web fallback
      const update = () => setOnline(navigator.onLine);
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      update();
      return () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 safe-top bg-destructive/95 backdrop-blur text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider motion-entrance">
      <WifiOff className="h-3.5 w-3.5" />
      <span>No connection</span>
    </div>
  );
}
