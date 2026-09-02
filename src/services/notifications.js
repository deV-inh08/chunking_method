// ─── Web Push & Notifications Service ─────────────────────────────────

/**
 * Kiểm tra xem trình duyệt / thiết bị có hỗ trợ Notifications & Service Worker không
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isServiceWorkerSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Lấy trạng thái quyền thông báo hiện tại ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Đăng ký Service Worker
 */
export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Yêu cầu người dùng cấp quyền thông báo
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Đăng ký Service Worker để nhận thông báo nền
    await registerServiceWorker();
  }
  return permission;
}

/**
 * Gửi thông báo cục bộ qua Service Worker hoặc Notification API
 */
export async function sendNotification({
  title = 'TOEIC Chunk Trainer',
  body = 'Bạn có chunk cần ôn tập hôm nay!',
  icon = '/favicon.svg',
  badge = '/favicon.svg',
  tag = 'srs-review-reminder',
  url = '/#practice',
} = {}) {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if (isServiceWorkerSupported()) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          renotify: true,
          data: { url },
          actions: [
            { action: 'open_practice', title: 'Ôn tập ngay' },
          ],
        });
        return true;
      }
    }

    // Fallback: Web Notification trực tiếp
    const n = new Notification(title, {
      body,
      icon,
      tag,
      data: { url },
    });
    n.onclick = () => {
      window.focus();
      window.location.hash = 'practice';
      n.close();
    };
    return true;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
}

/**
 * Gửi thông báo kiểm tra (Test Notification)
 */
export async function sendTestNotification() {
  return sendNotification({
    title: '🔔 Thông báo ôn tập TOEIC',
    body: 'Tuyệt vời! Thiết bị của bạn đã được kết nối với hệ thống nhắc nhở Spaced Repetition.',
    tag: 'srs-test',
  });
}

/**
 * Gửi thông báo nhắc nhở khi có chunk đến hạn
 */
export async function sendDueNotification(dueCount, sampleChunkPhrase = '') {
  if (dueCount <= 0) return false;
  const chunkHint = sampleChunkPhrase ? ` (ví dụ: "${sampleChunkPhrase}")` : '';
  return sendNotification({
    title: `🔥 Có ${dueCount} chunk TOEIC đến hạn ôn tập!`,
    body: `Đã đến thời điểm vàng để ôn tập lại các chunk${chunkHint}. Chạm để luyện dịch ngay!`,
    tag: `srs-due-${Math.floor(Date.now() / (1000 * 60 * 30))}`, // đổi tag mỗi 30p để tránh spam
    url: '/#practice',
  });
}
