// Messaging service worker for in-app notification alerts.
// Receives postMessage from the app and displays an OS notification.
// On click, focuses an existing client and tells the app where to navigate.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'show-notification') return;
  const { title, body, tag, payload } = data;
  event.waitUntil(
    self.registration.showNotification(title || 'Notis', {
      body: body || '',
      tag: tag || undefined,
      data: payload || {},
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      renotify: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let target = all.find(c => 'focus' in c);
    if (target) {
      try { await target.focus(); } catch (_) {}
      target.postMessage({ type: 'notification-click', payload });
      return;
    }
    const url = payload.url || '/';
    const opened = await self.clients.openWindow(url);
    if (opened) opened.postMessage({ type: 'notification-click', payload });
  })());
});
