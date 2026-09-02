// Service Worker for TOEIC Chunk Trainer (PWA & Web Push Notifications)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý khi user chạm / click vào Notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đã có tab đang mở -> focus vào tab đó
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', page: 'practice' });
          return;
        }
      }
      // Nếu chưa có tab nào -> mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Xử lý sự kiện Push Notification từ máy chủ (nếu kết nối VAPID / Supabase Edge Functions)
self.addEventListener('push', (event) => {
  let data = {
    title: '🔥 TOEIC Chunk Reminder',
    body: 'Bạn có chunk cần ôn tập hôm nay!',
    url: '/#practice',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url },
      actions: [
        { action: 'open_practice', title: 'Ôn tập ngay' },
      ],
    })
  );
});
