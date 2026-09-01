self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/insyde-logo.png',
      badge: '/insyde-logo.png',
      tag: data.tag || 'insyde-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});

// --- Offline app-shell fallback ---
// This service worker intentionally caches ONLY the '/' shell route. It must
// never cache or intercept API responses or any other non-navigation request
// — this is a live attendance/check-in app, and stale cached data would show
// employees incorrect check-in/session state.

const SHELL_CACHE = 'insyde-shell-v1';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name !== SHELL_CACHE)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle top-level page navigations with a network-first strategy.
  // Everything else (API calls, Supabase requests, images, fonts, XHR/fetch
  // data calls) is left completely untouched by this service worker.
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(SHELL_CACHE).then(cache => cache.match('/'))
    )
  );
});
