// ─── Spaced Repetition System (SRS) Core ──────────────────────────────
// Dựa trên bảng lộ trình 2 Track (Track A: Người mới bắt đầu, Track B: Có nền tảng)
// Kết hợp công thức hệ số nhân độ khó ease_factor tương tự SM-2

// Khoảng cách theo phút (Minutes) cho từng level
export const TRACK_A_INTERVALS = [
  15,     // Level 0 -> 1: 15 phút (Cùng buổi học)
  60,     // Level 1 -> 2: 1 giờ (Cùng ngày)
  240,    // Level 2 -> 3: 4 giờ (Cùng ngày / Buổi tối)
  1440,   // Level 3 -> 4: 1 ngày (Sáng hôm sau)
  2880,   // Level 4 -> 5: 2 ngày
  5760,   // Level 5 -> 6: 4 ngày
  10080,  // Level 6 -> 7: 7 ngày (1 tuần)
  17280,  // Level 7 -> 8: 12 ngày
  28800,  // Level 8 -> 9: 20 ngày
  43200,  // Level 9 -> 10: 30 ngày (1 tháng)
];

export const TRACK_B_INTERVALS = [
  240,    // Level 0 -> 1: 4 giờ (Trong ngày)
  1440,   // Level 1 -> 2: 1 ngày (Sáng hôm sau)
  4320,   // Level 2 -> 3: 3 ngày
  10080,  // Level 3 -> 4: 7 ngày (1 tuần)
  20160,  // Level 4 -> 5: 14 ngày (2 tuần)
  43200,  // Level 5 -> 6: 30 ngày (1 tháng)
  86400,  // Level 6 -> 7: 60 ngày (2 tháng)
  129600, // Level 7 -> 8: 90 ngày (3 tháng)
];

export const TRACK_CONFIGS = {
  track_a: {
    id: 'track_a',
    name: 'Track A — Người mới bắt đầu',
    shortName: 'Người mới (Track A)',
    description: 'Lộ trình ngắt quãng ngắn (15p, 1h, 4h, 1d...), củng cố phản xạ liên tục.',
    defaultEaseFactor: 1.65,
    maxIntervalDays: 90,
    masteredLevel: 10,
    intervals: TRACK_A_INTERVALS,
  },
  track_b: {
    id: 'track_b',
    name: 'Track B — Người có nền tảng',
    shortName: 'Nền tảng (Track B)',
    description: 'Lộ trình ngắt quãng giãn rộng (4h, 1d, 3d, 7d...), tối ưu thời gian ôn tập.',
    defaultEaseFactor: 2.0,
    maxIntervalDays: 180,
    masteredLevel: 8,
    intervals: TRACK_B_INTERVALS,
  },
};

/**
 * Tính toán mốc ôn tập tiếp theo dựa trên kết quả bài làm
 * @param {Object} params
 * @param {Object} params.prevProgress - Tiến độ hiện tại của chunk
 * @param {number} params.score - Điểm số bài làm (0-100)
 * @param {boolean} params.success - Dùng đúng chunk và nghĩa đúng
 * @param {string} [params.track='track_a'] - 'track_a' | 'track_b'
 * @returns {Object} Các trường SRS được cập nhật
 */
export function calculateNextReview({
  prevProgress = null,
  score = 80,
  success = true,
  track = 'track_a',
}) {
  const trackCfg = TRACK_CONFIGS[track] || TRACK_CONFIGS.track_a;
  const currentLevel = prevProgress?.srsLevel ?? 0;
  let easeFactor = prevProgress?.easeFactor ?? trackCfg.defaultEaseFactor;
  let intervalMinutes = 0;
  let newLevel = currentLevel;

  const now = Date.now();

  // Đánh giá: Đạt (score >= 70 và success) vs Chưa đạt
  const isPassed = success && score >= 70;

  if (isPassed) {
    // Tăng cấp độ
    newLevel = currentLevel + 1;

    // Tinh chỉnh ease_factor nhẹ nhàng
    if (score >= 90) {
      easeFactor = Math.min(3.0, easeFactor + 0.05);
    } else if (score < 80) {
      easeFactor = Math.max(1.3, easeFactor - 0.05);
    }

    // Tính khoảng cách ngắt quãng
    const intervalMap = trackCfg.intervals;
    if (currentLevel < intervalMap.length) {
      intervalMinutes = intervalMap[currentLevel];
    } else {
      // Level 10+ (Track A) hoặc 8+ (Track B): nhân với ease_factor
      const prevInterval = prevProgress?.intervalMinutes || intervalMap[intervalMap.length - 1];
      intervalMinutes = Math.round(prevInterval * easeFactor);
    }

    // Giới hạn max interval
    const maxMinutes = trackCfg.maxIntervalDays * 24 * 60;
    if (intervalMinutes > maxMinutes) {
      intervalMinutes = maxMinutes;
    }
  } else {
    // Chưa đạt: Rớt level để củng cố lại sớm
    newLevel = Math.max(0, currentLevel - (currentLevel > 3 ? 2 : 1));
    easeFactor = Math.max(1.3, easeFactor - 0.15);

    // Xếp lịch ôn lại ngay trong 15-30 phút (Track A) hoặc 2-4 giờ (Track B)
    intervalMinutes = track === 'track_a' ? 15 : 120;
  }

  const nextReviewAt = now + intervalMinutes * 60 * 1000;
  const isMastered = newLevel >= trackCfg.masteredLevel && isPassed;

  return {
    srsLevel: newLevel,
    srsTrack: track,
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalMinutes,
    lastReviewedAt: now,
    nextReviewAt,
    status: isMastered ? 'mastered' : 'learning',
  };
}

/**
 * Kiểm tra xem chunk này có đang đến hạn hoặc quá hạn ôn tập không
 */
export function isDueForReview(progressItem) {
  if (!progressItem) return false;
  // Nếu chưa bao giờ có lịch ôn -> chưa tính
  if (!progressItem.nextReviewAt) return false;
  return progressItem.nextReviewAt <= Date.now();
}

/**
 * Lấy danh sách các chunks đang đến hạn ôn tập
 */
export function getDueChunks(chunks = [], allProgress = {}) {
  return chunks.filter(c => {
    const prog = allProgress[c.id];
    return isDueForReview(prog);
  });
}

/**
 * Thống kê tổng quan trạng thái SRS
 */
export function getSrsStats(allProgress = {}, chunks = []) {
  let dueCount = 0;
  let learningCount = 0;
  let masteredCount = 0;
  let newCount = 0;
  let dueSoon24hCount = 0;

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  chunks.forEach(c => {
    const prog = allProgress[c.id];
    if (!prog || !prog.practiceCount) {
      newCount++;
    } else if (prog.nextReviewAt && prog.nextReviewAt <= now) {
      dueCount++;
    } else if (prog.status === 'mastered' || (prog.srsLevel && prog.srsLevel >= 8)) {
      masteredCount++;
    } else {
      learningCount++;
      if (prog.nextReviewAt && prog.nextReviewAt <= next24h) {
        dueSoon24hCount++;
      }
    }
  });

  return {
    totalChunks: chunks.length,
    dueCount,
    learningCount,
    masteredCount,
    newCount,
    dueSoon24hCount,
  };
}

/**
 * Định dạng thời gian ngắt quãng (Minutes -> Text thân thiện)
 */
export function formatIntervalText(minutes) {
  if (!minutes || minutes <= 0) return 'ngay bây giờ';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}p` : `${hours} giờ`;
  }
  const days = Math.round(minutes / 1440);
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  return `${months} tháng`;
}

/**
 * Định dạng thời gian còn lại đến lần ôn tập tiếp theo
 */
export function formatTimeUntilReview(nextReviewAt) {
  if (!nextReviewAt) return null;
  const diffMs = nextReviewAt - Date.now();
  if (diffMs <= 0) {
    return { text: 'Đến hạn ôn', isDue: true, badgeType: 'error' };
  }

  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) {
    return { text: `Ôn sau ${diffMins} phút`, isDue: false, badgeType: 'warning' };
  }
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) {
    return { text: `Ôn sau ${diffHours} giờ`, isDue: false, badgeType: 'neutral' };
  }
  const diffDays = Math.round(diffHours / 24);
  return { text: `Ôn sau ${diffDays} ngày`, isDue: false, badgeType: 'neutral' };
}
