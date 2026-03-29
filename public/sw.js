const CACHE_NAME = "better-crm-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Only cache GET requests (don't cache POST mutations like RPCs)
    if (event.request.method !== "GET") return;

    // Next.js Dev tools / hot reloading bypass
    if (event.request.url.includes("/_next/webpack-hmr")) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    // BUG-011: Never cache authenticated API or dashboard responses —
                    // stale patient data could be served to a different logged-in user (HIPAA risk).
                    const url = new URL(event.request.url);
                    const shouldCache = networkResponse.ok &&
                        networkResponse.type === "basic" &&
                        !url.pathname.startsWith("/api/") &&
                        !url.pathname.startsWith("/dashboard");
                    if (shouldCache) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails (offline), and we don't have a cached version,
                    // simply allow the failure to pass through gracefully.
                    return new Response("Offline", { status: 503 });
                });

            // Return cached response immediately if available (Stale-While-Revalidate pattern),
            // otherwise wait for the network fetch.
            return cachedResponse || fetchPromise;
        })
    );
});
