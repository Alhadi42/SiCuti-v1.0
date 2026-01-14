// Service Worker for offline support and caching
const CACHE_NAME = "sicuti-binalavotas-v1";
const STATIC_CACHE_URLS = ["/", "/index.html", "/manifest.json"];

// Install service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching static assets");
      return cache.addAll(STATIC_CACHE_URLS);
    }),
  );
});

// Activate service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Fetch event - implement cache-first strategy for static assets
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests with network-first strategy
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase.co")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();

          // Cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        }),
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Fetch from network and cache
      return fetch(event.request).then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      });
    }),
  );
});

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Implement background sync logic here
      console.log("Service Worker: Background sync triggered"),
    );
  }
});

// Handle push notifications (if needed in future)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "SiCuti - Binalavotas notification",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    data: {
      url: "/",
    },
  };

  event.waitUntil(self.registration.showNotification("SiCuti - Binalavotas", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});
