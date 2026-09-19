// ─── TOEIC Academy Day Streak Service ─────────────────────────
// Calculates and persists real-time study streaks with local timezone awareness

const STREAK_STORAGE_KEY = 'toeic_study_streak';

/**
 * Format local date as YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate difference in days between two YYYY-MM-DD dates (dateB - dateA)
 */
export function getDayDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 999;
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Smart initialization: Seed streak from existing practice progress if first time
 */
function getInitialStreakData() {
  const today = getLocalDateString();

  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    // Check if user has practice history in localStorage
    const rawProg = localStorage.getItem('toeic_progress');
    if (rawProg) {
      const prog = JSON.parse(rawProg);
      const practicedDates = new Set();

      Object.values(prog).forEach(item => {
        if (item.lastPracticed) {
          practicedDates.add(getLocalDateString(new Date(item.lastPracticed)));
        }
      });

      const datesList = Array.from(practicedDates).sort();
      if (datesList.length > 0) {
        const lastDate = datesList[datesList.length - 1];
        const diff = getDayDifference(lastDate, today);

        if (diff === 0 || diff === 1) {
          // Calculate consecutive days backwards from lastDate
          let streak = 1;
          for (let i = datesList.length - 2; i >= 0; i--) {
            if (getDayDifference(datesList[i], datesList[i + 1]) === 1) {
              streak++;
            } else {
              break;
            }
          }

          const seed = {
            currentStreak: streak,
            longestStreak: Math.max(streak, datesList.length),
            lastActiveDate: lastDate,
            activeDates: datesList,
          };
          localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(seed));
          return seed;
        }
      }
    }
  } catch {}

  // Default clean state
  const defaultState = {
    currentStreak: 1, // Start with Day 1
    longestStreak: 1,
    lastActiveDate: today,
    activeDates: [today],
  };
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(defaultState));
  } catch {}
  return defaultState;
}

/**
 * Get current streak status with automatic expiration check
 */
export function getStreakData() {
  const today = getLocalDateString();
  let data = getInitialStreakData();

  if (!data || !data.lastActiveDate) {
    data = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activeDates: [],
    };
  }

  const diff = data.lastActiveDate ? getDayDifference(data.lastActiveDate, today) : 999;
  const isLearnedToday = diff === 0;

  // If more than 1 day has elapsed since last study date, streak is broken
  if (diff > 1 && data.currentStreak > 0) {
    data = {
      ...data,
      currentStreak: 0, // Reset current streak
    };
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  return {
    ...data,
    isLearnedToday,
  };
}

/**
 * Record a study activity and update streak
 */
export function recordStudyActivity() {
  const today = getLocalDateString();
  const current = getStreakData();

  const diff = current.lastActiveDate ? getDayDifference(current.lastActiveDate, today) : 999;

  let nextStreak = current.currentStreak;
  let isNewDayMilestone = false;

  if (diff === 0) {
    // Already learned today, no streak increment needed
    isNewDayMilestone = false;
  } else if (diff === 1) {
    // Consecutive day learning!
    nextStreak = current.currentStreak + 1;
    isNewDayMilestone = true;
  } else {
    // Started a new streak (after a gap or first time)
    nextStreak = 1;
    isNewDayMilestone = true;
  }

  const activeDatesSet = new Set(current.activeDates || []);
  activeDatesSet.add(today);
  const activeDates = Array.from(activeDatesSet).sort();

  const updated = {
    currentStreak: nextStreak,
    longestStreak: Math.max(current.longestStreak || 0, nextStreak),
    lastActiveDate: today,
    activeDates,
  };

  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  const result = {
    ...updated,
    isLearnedToday: true,
    isNewDayMilestone,
  };

  // Broadcast event so UI updates instantly across all views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toeic_streak_updated', { detail: result }));
  }

  return result;
}

/**
 * Get 7-day week overview (Monday to Sunday) for current week
 */
export function getWeekStreakOverview() {
  const todayStr = getLocalDateString();
  const streak = getStreakData();
  const activeSet = new Set(streak.activeDates || []);

  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  // Normalize so Monday is day 0, Sunday is day 6
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const week = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const isPast = getDayDifference(dateStr, todayStr) > 0;
    const isLearned = activeSet.has(dateStr);

    week.push({
      dayLabel: dayLabels[i],
      date: dateStr,
      dayOfMonth: d.getDate(),
      isToday,
      isPast,
      isLearned,
    });
  }

  return {
    week,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    isLearnedToday: streak.isLearnedToday,
  };
}
