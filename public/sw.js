// Service worker to handle routing for SPA
const CACHE_NAME = 'careersasa-cache-v2';
const INDEX_HTML = '/index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For navigation requests, always serve index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(INDEX_HTML).catch(() => {
        return caches.match(INDEX_HTML).then(response => {
          return response || new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }

  // For other requests, use network first strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        return response || new Response('', {
          status: 404,
          statusText: 'Not Found'
        });
      });
    })
  );
});