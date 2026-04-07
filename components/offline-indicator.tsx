"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(
        () => typeof navigator !== "undefined" && !navigator.onLine,
    );

    useEffect(() => {
        function handleOnline() { setIsOffline(false); }
        function handleOffline() { setIsOffline(true); }

        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(console.error);
        }

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-error-container border border-error/20 px-4 py-2 text-sm font-medium text-on-error-container shadow-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode &mdash; Data may be stale</span>
        </div>
    );
}
