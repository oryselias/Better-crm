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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-red-500/10 px-5 py-2.5 text-sm font-semibold tracking-[-0.02em] text-red-500 shadow-[inset_0_0_10px_rgba(239,68,68,0.2),0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md border border-red-500/20">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode &mdash; Data may be stale</span>
        </div>
    );
}
