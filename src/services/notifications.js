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
 * 4 Khung giờ vàng ôn tập trong ngày
 */
export const DAILY_NOTIFICATION_SLOTS = [
  {
    id: 'slot_8',
    hour: 8,
    label: '08:00 (Sáng)',
    title: (count) => `🌅 Buổi sáng: Có ${count} chunk TOEIC cần ôn tập!`,
    body: (hint) => `Khởi đầu ngày mới với 5 phút ôn tập${hint} để củng cố trí nhớ dài hạn.`,
  },
  {
    id: 'slot_12',
    hour: 12,
    label: '12:00 (Trưa)',
    title: (count) => `☀️ Nghỉ trưa: Ôn lại ${count} chunk TOEIC nào!`,
    body: (hint) => `Tận dụng vài phút nghỉ trưa để luyện dịch các chunk${hint}.`,
  },
  {
    id: 'slot_18',
    hour: 18,
    label: '18:00 (Chiều tối)',
    title: (count) => `🌆 Chiều tối: Có ${count} chunk đang chờ bạn ôn!`,
    body: (hint) => `Củng cố lại phản xạ dịch câu${hint} trước khi kết thúc ngày.`,
  },
  {
    id: 'slot_21',
    hour: 21,
    label: '21:00 (Tối)',
    title: (count) => `🌙 Buổi tối: Hoàn thành ${count} chunk trước khi ngủ!`,
    body: (hint) => `Ôn tập nhẹ nhàng trước khi ngủ giúp não bộ ghi nhớ sâu hơn${hint}.`,
  },
];

/**
 * Lấy lịch sử gửi thông báo trong ngày
 */
function getTodaySentSlots() {
  if (typeof window === 'undefined') return {};
  const todayKey = `srs_notif_date_${new Date().toISOString().slice(0, 10)}`;
  try {
    return JSON.parse(localStorage.getItem(todayKey) || '{}');
  } catch {
    return {};
  }
}

/**
 * Đánh dấu slot đã được gửi trong ngày
 */
function markSlotSentToday(slotId) {
  if (typeof window === 'undefined') return;
  const todayKey = `srs_notif_date_${new Date().toISOString().slice(0, 10)}`;
  try {
    const sent = getTodaySentSlots();
    sent[slotId] = Date.now();
    localStorage.setItem(todayKey, JSON.stringify(sent));
  } catch (err) {
    console.warn('Failed to save sent slot:', err);
  }
}

/**
 * Gửi thông báo kiểm tra (Test Notification)
 */
export async function sendTestNotification() {
  return sendNotification({
    title: '🔔 Thông báo ôn tập TOEIC',
    body: 'Tuyệt vời! Thiết bị của bạn đã được kết nối với hệ thống 4 khung giờ ôn tập mỗi ngày (8h, 12h, 18h, 21h).',
    tag: 'srs-test',
  });
}

/**
 * Kiểm tra và kích hoạt thông báo theo 4 khung giờ vàng trong ngày (08:00, 12:00, 18:00, 21:00)
 */
export async function checkAndTriggerDailyReminders(dueCount, sampleChunkPhrase = '') {
  if (dueCount <= 0) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const sentSlots = getTodaySentSlots();

  // Tìm khung giờ hợp lệ gần nhất trong ngày chưa được gửi
  const availableSlots = [...DAILY_NOTIFICATION_SLOTS]
    .filter(slot => currentHour >= slot.hour)
    .reverse(); // Ưu tiên slot gần với giờ hiện tại nhất

  const pendingSlot = availableSlots.find(slot => !sentSlots[slot.id]);

  if (!pendingSlot) {
    // Tất cả các slot trước giờ hiện tại đã được gửi hôm nay
    return false;
  }

  const chunkHint = sampleChunkPhrase ? ` (ví dụ: "${sampleChunkPhrase}")` : '';

  const sent = await sendNotification({
    title: pendingSlot.title(dueCount),
    body: pendingSlot.body(chunkHint),
    tag: `srs-${pendingSlot.id}-${now.toISOString().slice(0, 10)}`,
    url: '/#practice',
  });

  if (sent) {
    markSlotSentToday(pendingSlot.id);
  }

  return sent;
}

/**
 * Gửi thông báo nhắc nhở khi có chunk đến hạn (gọi trực tiếp theo 4 khung giờ)
 */
export async function sendDueNotification(dueCount, sampleChunkPhrase = '') {
  return checkAndTriggerDailyReminders(dueCount, sampleChunkPhrase);
}
