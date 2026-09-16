import {
  dbSaveTranscript,
  dbDeleteTranscript,
  dbSaveChunks,
  dbSaveSituations,
  dbSaveProgress,
  dbFetchAllData,
  isSupabaseConfigured,
  getSupabaseClient,
} from '../services/supabase';
import { calculateNextReview, updateSRSAfterSpeaking } from '../services/srs';

// ─── Storage keys ─────────────────────────────────────────────
const KEYS = {
  transcripts:      'toeic_transcripts',
  chunks:           'toeic_chunks',
  situations:       'toeic_situations',
  progress:         'toeic_progress',
  settings:         'toeic_settings',
  vocabCache:       'toeic_vocab_cache',   // cache danh sách từ vựng (fetch 1 lần từ Supabase)
  vocabLearned:     'toeic_vocab_learned', // { [wordId]: { learnedAt, word, topic } }
  vocabDailySession:'toeic_vocab_daily',   // { date: 'YYYY-MM-DD', wordIds: [] }
  practiceDrafts:   'toeic_practice_drafts', // { [chunkId]: { inputs, gradingResults, showSamples } }
  visualProgress:   'toeic_visual_progress', // { [sceneId]: { unlockedZoneIds, completedZones, completedHotspots } }
};

// ─── Helpers ──────────────────────────────────────────────────
function get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

// ─── Transcripts ──────────────────────────────────────────────
export function saveTranscript(transcript) {
  const all = get(KEYS.transcripts) || {};
  all[transcript.id] = transcript;
  set(KEYS.transcripts, all);

  // Sync to Supabase in background
  dbSaveTranscript(transcript).catch(err => console.error('Cloud sync error:', err));
}

// ─── Default Initial Transcripts (Matching target UI: media_1789550413700.png) ──
const DEFAULT_INITIAL_TRANSCRIPTS = [
  {
    id: 'tr_office_conversations',
    title: 'Office Conversations',
    theme: 'Office Conversations',
    themeVi: 'Hội thoại văn phòng & Báo cáo tiến độ',
    part: 'Part 3',
    level: 'Intermediate',
    duration: 12,
    progress: 72,
    isAiGenerated: true,
    createdAt: 1710000000000,
    text: `M-Am: Good morning, Rachel. Do you have a moment to review the quarterly budget report before the executive meeting?
W-Am: Sure, Mark. I looked over the marketing projections earlier today. Most departments stayed well within their targets, but our cloud infrastructure costs increased by about fifteen percent.
M-Am: That makes sense given the server upgrades we deployed last month. I'll make sure to highlight the long-term cost efficiencies in our slide deck.
W-Am: Excellent idea. Let's make sure the revised figures are sent to everyone thirty minutes before the presentation starts.`,
    questions: [
      {
        question: 'What are the speakers mainly discussing?',
        options: ['A quarterly budget report', 'An employee orientation', 'An office relocation', 'A marketing campaign'],
        answer: 0,
        explanation: 'Người nam hỏi xem lại báo cáo ngân sách quý ("review the quarterly budget report").',
      },
      {
        question: 'Why did the infrastructure costs increase?',
        options: ['Office rent increase', 'Recent server upgrades', 'External consultants', 'Equipment repairs'],
        answer: 1,
        explanation: 'Người nam nhắc đến việc nâng cấp máy chủ vào tháng trước ("server upgrades we deployed last month").',
      },
      {
        question: 'What does the woman suggest doing before the meeting?',
        options: ['Print handouts', 'Cancel the meeting', 'Send revised figures to attendees', 'Call the director'],
        answer: 2,
        explanation: 'Người nữ đề xuất gửi số liệu đã chỉnh sửa cho người tham gia 30 phút trước giờ họp ("make sure the revised figures are sent to everyone thirty minutes before the presentation starts").',
      },
    ],
  },
  {
    id: 'tr_travel_transportation',
    title: 'Travel & Transportation',
    theme: 'Travel & Transportation',
    themeVi: 'Lịch trình công tác & Đặt phòng khách sạn',
    part: 'Part 3',
    level: 'Intermediate',
    duration: 15,
    progress: 35,
    isAiGenerated: true,
    createdAt: 1709900000000,
    text: `W-Br: Good afternoon, Oliver. Have you managed to finalize the travel arrangements for next Tuesday's regional conference in Manchester?
M-Br: Almost done, Fiona. I booked our round-trip train tickets leaving Euston Station at eight in the morning. However, the conference hotel is completely booked up for Tuesday night.
W-Br: That's inconvenient. Did you check the boutique hotel across from the convention center?
M-Br: Yes, I spoke with their front desk this morning. They have two executive rooms available, so I'll go ahead and confirm the reservation right away.`,
    chunks: [
      { id: 'c_trv_1', text: 'finalize the travel arrangements', meaning: 'hoàn tất sắp xếp chuyến đi', type: 'collocation', transcriptId: 'tr_travel_transportation' },
      { id: 'c_trv_2', text: 'round-trip train tickets', meaning: 'vé tàu khứ hồi', type: 'collocation', transcriptId: 'tr_travel_transportation' },
      { id: 'c_trv_3', text: 'completely booked up', meaning: 'đã hết sạch chỗ', type: 'collocation', transcriptId: 'tr_travel_transportation' },
      { id: 'c_trv_4', text: 'confirm the reservation', meaning: 'xác nhận đặt phòng', type: 'collocation', transcriptId: 'tr_travel_transportation' },
    ],
    questions: [
      {
        question: 'Where are the speakers traveling next week?',
        options: ['To Manchester', 'To Edinburgh', 'To Birmingham', 'To Bristol'],
        answer: 0,
        explanation: 'Người nữ nhắc tới hội nghị khu vực ở Manchester ("regional conference in Manchester").',
      },
      {
        question: 'What problem does the man mention?',
        options: ['Train tickets sold out', 'The conference hotel is fully booked', 'Flight was delayed', 'Meeting canceled'],
        answer: 1,
        explanation: 'Người nam cho biết khách sạn hội nghị đã hết phòng ("the conference hotel is completely booked up").',
      },
      {
        question: 'What will the man do next?',
        options: ['Cancel the trip', 'Book train tickets', 'Confirm hotel reservation', 'Contact organizers'],
        answer: 2,
        explanation: 'Người nam sẽ xác nhận đặt phòng ở khách sạn đối diện ("confirm the reservation right away").',
      },
    ],
  },
];

const DEFAULT_INITIAL_CHUNKS = {
  tr_office_conversations: [
    { id: 'c_off_1', text: 'review the quarterly budget report', meaning: 'xem lại báo cáo ngân sách quý', type: 'collocation', transcriptId: 'tr_office_conversations' },
    { id: 'c_off_2', text: 'well within their targets', meaning: 'hoàn toàn nằm trong mục tiêu', type: 'collocation', transcriptId: 'tr_office_conversations' },
    { id: 'c_off_3', text: 'cloud infrastructure costs', meaning: 'chi phí hạ tầng đám mây', type: 'collocation', transcriptId: 'tr_office_conversations' },
    { id: 'c_off_4', text: 'long-term cost efficiencies', meaning: 'hiệu quả chi phí dài hạn', type: 'collocation', transcriptId: 'tr_office_conversations' },
    { id: 'c_off_5', text: 'revised figures', meaning: 'số liệu đã điều chỉnh', type: 'collocation', transcriptId: 'tr_office_conversations' },
  ],
  tr_travel_transportation: [
    { id: 'c_trv_1', text: 'finalize the travel arrangements', meaning: 'hoàn tất sắp xếp chuyến đi', type: 'collocation', transcriptId: 'tr_travel_transportation' },
    { id: 'c_trv_2', text: 'round-trip train tickets', meaning: 'vé tàu khứ hồi', type: 'collocation', transcriptId: 'tr_travel_transportation' },
    { id: 'c_trv_3', text: 'completely booked up', meaning: 'đã hết sạch chỗ', type: 'collocation', transcriptId: 'tr_travel_transportation' },
    { id: 'c_trv_4', text: 'confirm the reservation', meaning: 'xác nhận đặt phòng', type: 'collocation', transcriptId: 'tr_travel_transportation' },
  ],
};

export function getTranscripts() {
  let all = get(KEYS.transcripts);
  if ((!all || Object.keys(all).length === 0) && typeof window !== 'undefined' && !localStorage.getItem('toeic_transcripts_seeded')) {
    all = {};
    DEFAULT_INITIAL_TRANSCRIPTS.forEach(t => {
      all[t.id] = t;
    });
    set(KEYS.transcripts, all);
    try {
      localStorage.setItem('toeic_transcripts_seeded', '1');
    } catch {}
  }
  return Object.values(all || {}).sort((a, b) => b.createdAt - a.createdAt);
}

export function getTranscript(id) {
  const all = get(KEYS.transcripts) || {};
  return all[id] || null;
}

export function deleteTranscript(id) {
  const all = get(KEYS.transcripts) || {};
  delete all[id];
  set(KEYS.transcripts, all);
  // cascade delete local
  deleteChunks(id);

  // Sync delete to Supabase
  dbDeleteTranscript(id).catch(err => console.error('Cloud delete error:', err));
}

// ─── Chunks ───────────────────────────────────────────────────
export function saveChunks(transcriptId, chunks) {
  const all = get(KEYS.chunks) || {};
  all[transcriptId] = chunks;
  set(KEYS.chunks, all);

  // Sync to Supabase in background
  dbSaveChunks(chunks).catch(err => console.error('Cloud sync error:', err));
}

export function getChunks(transcriptId) {
  const all = get(KEYS.chunks) || {};
  if (all[transcriptId] && all[transcriptId].length > 0) return all[transcriptId];
  if (DEFAULT_INITIAL_CHUNKS[transcriptId]) return DEFAULT_INITIAL_CHUNKS[transcriptId];
  return [];
}

export function getAllChunks() {
  const all = get(KEYS.chunks) || {};
  const flat = [...Object.values(all).flat(), ...Object.values(DEFAULT_INITIAL_CHUNKS).flat()];
  // Deduplicate by ID (tránh trùng chunk cũ từ script + chunk mới từ session)
  const seen = new Set();
  return flat.filter(c => {
    if (!c.id || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export function deleteChunks(transcriptId) {
  const all = get(KEYS.chunks) || {};
  const chunks = all[transcriptId] || [];
  delete all[transcriptId];
  set(KEYS.chunks, all);
  // cascade delete situations
  chunks.forEach(c => deleteSituations(c.id));
}

// ─── Situations ───────────────────────────────────────────────
export function saveSituations(chunkId, situations) {
  const all = get(KEYS.situations) || {};
  all[chunkId] = situations;
  set(KEYS.situations, all);

  // Sync to Supabase in background
  dbSaveSituations(situations).catch(err => console.error('Cloud sync error:', err));
}

export function getSituations(chunkId) {
  const all = get(KEYS.situations) || {};
  return all[chunkId] || [];
}

export function deleteSituations(chunkId) {
  const all = get(KEYS.situations) || {};
  delete all[chunkId];
  set(KEYS.situations, all);
}

// ─── Progress ─────────────────────────────────────────────────
export function updateProgress(chunkId, result, score = null, feedback = null) {
  const all = get(KEYS.progress) || {};
  const prev = all[chunkId] || { practiceCount: 0, successCount: 0 };
  const settings = getSettings();
  const track = settings.srsTrack || 'track_a';

  // Tính toán các chỉ số Spaced Repetition (SRS)
  const srsUpdates = calculateNextReview({
    prevProgress: prev,
    score: score != null ? score : (result ? 80 : 40),
    success: Boolean(result),
    track,
  });

  const updated = {
    chunkId,
    practiceCount: prev.practiceCount + 1,
    successCount:  result ? prev.successCount + 1 : prev.successCount,
    lastPracticed: Date.now(),
    lastResult:    result,
    lastScore:     score,
    lastFeedback:  feedback,
    ...srsUpdates,
  };
  all[chunkId] = updated;
  set(KEYS.progress, all);

  // Sync to Supabase in background
  dbSaveProgress(updated).catch(err => console.error('Cloud sync error:', err));

  // Tự động đánh dấu từ vựng là "đã học" nếu chunk thuộc về một từ vựng
  if (result || updated.successCount > 0) {
    autoMarkVocabLearnedFromChunk(chunkId);
  }

  return updated;
}

/**
 * Lưu kết quả của một buổi luyện nói (Speaking Session) và cập nhật SRS
 */
export function saveSpeakingProgress(chunkId, speakingResult) {
  const all = get(KEYS.progress) || {};
  const prev = all[chunkId] || { practiceCount: 0, successCount: 0 };
  const settings = getSettings();
  const track = settings.srsTrack || 'track_a';

  const isSuccess = Boolean(speakingResult.score >= 70 && speakingResult.usedTargetChunk && speakingResult.comprehensible);

  // Tính SRS updates cho Speaking
  const srsUpdates = updateSRSAfterSpeaking(prev, speakingResult, track);

  // Cập nhật speakingHistory (lưu tối đa 5 lần gần nhất)
  const prevHistory = prev.lastFeedback?.speakingHistory || [];
  const newHistory = [speakingResult, ...prevHistory].slice(0, 5);

  const updatedLastFeedback = {
    ...(prev.lastFeedback || {}),
    review_mode: 'speaking_first',
    speaking: speakingResult,
    speakingHistory: newHistory,
  };

  const updated = {
    ...prev,
    chunkId,
    practiceCount: prev.practiceCount + 1,
    successCount: isSuccess ? prev.successCount + 1 : prev.successCount,
    lastPracticed: Date.now(),
    lastResult: isSuccess,
    lastScore: speakingResult.score,
    lastFeedback: updatedLastFeedback,
    ...srsUpdates,
  };

  all[chunkId] = updated;
  set(KEYS.progress, all);

  // Sync to Supabase in background
  dbSaveProgress(updated).catch(err => console.error('Cloud sync error:', err));

  if (isSuccess || updated.successCount > 0) {
    autoMarkVocabLearnedFromChunk(chunkId);
  }

  return updated;
}

/**
 * Lưu các cụm từ (chunks) đã hoàn thành trong phòng luyện nói giao tiếp AI
 * - Đảm bảo chunk tồn tại trong danh sách Chunks
 * - Cập nhật tiến trình học (Progress) & Lịch ôn tập Spaced Repetition (SRS)
 */
export function saveMasteredChunksFromConversation(chunks, scenarioTitle = 'Giao tiếp AI') {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];

  const allExistingChunks = getAllChunks();
  const allChunksMap = get(KEYS.chunks) || {};
  const convTranscriptId = 'conversation_mastered';
  const convChunksList = allChunksMap[convTranscriptId] || [];

  const savedChunkRecords = [];

  chunks.forEach((c, idx) => {
    const phrase = (typeof c === 'string' ? c : (c.phrase || '')).trim();
    if (!phrase) return;
    const cleanLower = phrase.toLowerCase();

    // Tìm xem chunk đã có sẵn trong kho hay chưa
    let existing = allExistingChunks.find(ec => ec.phrase && ec.phrase.trim().toLowerCase() === cleanLower);

    let targetChunkObj;
    if (existing) {
      targetChunkObj = existing;
    } else {
      const slug = cleanLower.replace(/[^a-z0-9]+/g, '_').slice(0, 40);
      const newId = `c_conv_${slug}_${Date.now()}_${idx}`;
      targetChunkObj = {
        id: newId,
        transcriptId: convTranscriptId,
        phrase,
        meaningVi: (typeof c === 'object' && c.meaningVi) ? c.meaningVi : 'Cụm từ giao tiếp tự nhiên',
        ipa: (typeof c === 'object' && c.ipa) ? c.ipa : '',
        topic: scenarioTitle,
        createdAt: Date.now(),
      };
      convChunksList.push(targetChunkObj);
    }

    savedChunkRecords.push(targetChunkObj);

    // Cập nhật tiến trình & Lịch ôn tập Spaced Repetition (SRS)
    updateProgress(targetChunkObj.id, true, 95, {
      source: 'conversation_speaking',
      scenarioTitle,
      masteredAt: Date.now(),
      note: 'Đã vận dụng thành thạo trong phòng luyện giao tiếp AI',
    });
  });

  if (convChunksList.length > 0) {
    allChunksMap[convTranscriptId] = convChunksList;
    set(KEYS.chunks, allChunksMap);
    dbSaveChunks(convChunksList).catch(err => console.error('Cloud sync error:', err));
  }

  return savedChunkRecords;
}

/** Tự động trích xuất wordId và đánh dấu đã học cho vocab chunk */
function autoMarkVocabLearnedFromChunk(chunkId) {
  const allChunks = getAllChunks();
  const chunk = allChunks.find(c => c.id === chunkId);
  if (!chunk) return;

  const slug = (s) => (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  let wordId = chunk.sourceWordId;
  let word = chunk.sourceWord || chunk.groupName;
  let topic = chunk.topic;

  if (!wordId && chunk.groupId && chunk.groupId.startsWith('vocab_')) {
    wordId = chunk.groupId.replace(/^vocab_/, '');
  }

  if (!wordId && word && topic) {
    wordId = `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
  }

  if (wordId) {
    markVocabLearned(wordId, word || 'Vocab', topic || '');
  }
}

export function getProgress(chunkId) {
  const all = get(KEYS.progress) || {};
  const item = all[chunkId];
  if (!item) return null;
  const settings = getSettings();
  return ensureSrsProgress(item, settings.srsTrack);
}

export function getAllProgress() {
  const all = get(KEYS.progress) || {};
  const settings = getSettings();
  const result = {};
  let changed = false;

  Object.entries(all).forEach(([id, prog]) => {
    const fixed = ensureSrsProgress(prog, settings.srsTrack);
    result[id] = fixed;
    if (fixed !== prog) changed = true;
  });

  if (changed) {
    set(KEYS.progress, result);
  }

  return result;
}

/** Tự động bổ sung thông tin SRS nếu progress cũ hoặc đồng bộ từ cloud bị thiếu nextReviewAt / sai srsLevel */
function ensureSrsProgress(prog, track = 'track_a') {
  if (!prog || !prog.practiceCount) return prog;

  const currentTrack = prog.srsTrack || track || 'track_a';
  const maxTrackLv = currentTrack === 'track_b' ? 8 : 10;
  const isLevelCorrupted = prog.practiceCount >= 4 && (prog.srsLevel == null || prog.srsLevel <= 2);
  const currentLv = (prog.srsLevel != null && !isLevelCorrupted)
    ? prog.srsLevel
    : Math.max(0, Math.min(maxTrackLv, (prog.practiceCount || 1) - 1));

  // Kiểm tra nếu mốc ôn tập bị quá ngắn so với level thực tế (do bug reset 15 phút trước đó)
  // Level >= 3 tối thiểu phải giãn cách 1 ngày (1440 phút), nếu interval < 60 phút thì chắc chắn bị bug cũ
  const actualIntervalMs = (prog.nextReviewAt && prog.lastPracticed) ? (prog.nextReviewAt - prog.lastPracticed) : 0;
  const isIntervalCorrupted = currentLv >= 3 && actualIntervalMs > 0 && actualIntervalMs < 60 * 60 * 1000;

  const needsFix = !prog.nextReviewAt || prog.srsLevel == null || isLevelCorrupted || isIntervalCorrupted;

  if (!needsFix) return prog;

  const lastTime = prog.lastPracticed || Date.now();

  const srsUpdates = calculateNextReview({
    prevProgress: {
      ...prog,
      srsLevel: currentLv,
      easeFactor: prog.easeFactor || (currentTrack === 'track_b' ? 2.0 : 1.65),
    },
    score: prog.lastScore != null ? prog.lastScore : (prog.lastResult ? 80 : 40),
    success: Boolean(prog.lastResult ?? true),
    track: currentTrack,
  });

  const shouldRecalculateNextReview = !prog.nextReviewAt || isLevelCorrupted || isIntervalCorrupted;

  return {
    ...prog,
    ...srsUpdates,
    nextReviewAt: shouldRecalculateNextReview
      ? lastTime + (srsUpdates.intervalMinutes * 60 * 1000)
      : prog.nextReviewAt,
  };
}

// ─── Settings ─────────────────────────────────────────────────
export function getSettings() {
  const s = get(KEYS.settings) || {};
  return {
    apiKey: s.apiKey || '',
    apiKey2: s.apiKey2 || '',
    language: s.language || 'vi-VN',
    speakingVoice: s.speakingVoice || 'en-US-female', // 'en-US-female' | 'en-US-male' | 'en-GB-female' | 'en-GB-male' | 'en-AU-female'
    supabaseUrl: s.supabaseUrl || '',
    supabaseKey: s.supabaseKey || '',
    srsTrack: s.srsTrack || 'track_a', // 'track_a' | 'track_b'
    notificationsEnabled: Boolean(s.notificationsEnabled),
    dailyReminderTime: s.dailyReminderTime || '20:00',
  };
}

export function saveSettings(settings) {
  set(KEYS.settings, settings);
}

/** Lấy tất cả các Gemini API key khả dụng (Key chính + Key dự phòng) */
export function getApiKeys() {
  const keys = [];

  // 1. Settings keys (người dùng nhập trong modal Settings - ưu tiên cao nhất)
  const settings = getSettings();
  if (settings.apiKey && settings.apiKey.trim()) {
    const trimmed = settings.apiKey.trim();
    if (!keys.includes(trimmed)) keys.push(trimmed);
  }
  if (settings.apiKey2 && settings.apiKey2.trim()) {
    const trimmed = settings.apiKey2.trim();
    if (!keys.includes(trimmed)) keys.push(trimmed);
  }

  // 2. Env keys (VITE_API_KEY phẩy phân cách hoặc VITE_API_KEY_2)
  const envKey = import.meta.env.VITE_API_KEY || '';
  const envKey2 = import.meta.env.VITE_API_KEY_2 || '';

  if (envKey && !envKey.includes('your-key')) {
    envKey.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed && !keys.includes(trimmed)) keys.push(trimmed);
    });
  }

  if (envKey2 && !envKey2.includes('your-key')) {
    envKey2.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed && !keys.includes(trimmed)) keys.push(trimmed);
    });
  }

  return keys;
}

export function getApiKey() {
  const keys = getApiKeys();
  return keys[0] || '';
}

// ─── Full Cloud Sync (Cloud → Local Cache) ────────────────────
export async function syncFromSupabase() {
  if (!isSupabaseConfigured()) return false;

  const cloudData = await dbFetchAllData();
  if (!cloudData) return false;

  // Merge/Update local storage with cloud data
  if (cloudData.transcripts && Object.keys(cloudData.transcripts).length > 0) {
    const localT = get(KEYS.transcripts) || {};
    set(KEYS.transcripts, { ...localT, ...cloudData.transcripts });
  }

  if (cloudData.chunks && Object.keys(cloudData.chunks).length > 0) {
    const localC = get(KEYS.chunks) || {};
    set(KEYS.chunks, { ...localC, ...cloudData.chunks });
  }

  if (cloudData.situations && Object.keys(cloudData.situations).length > 0) {
    const localS = get(KEYS.situations) || {};
    const mergedS = { ...localS };
    Object.entries(cloudData.situations).forEach(([chunkId, cloudList]) => {
      const localList = localS[chunkId] || [];
      const localHasVi = localList.some(ex => (ex.vietnameseSentence || ex.context || ex.prompt)?.trim());
      const cloudHasVi = (cloudList || []).some(ex => (ex.vietnameseSentence || ex.context || ex.prompt)?.trim());
      if (!localHasVi || cloudHasVi) {
        mergedS[chunkId] = cloudList;
      }
    });
    set(KEYS.situations, mergedS);
  }

  if (cloudData.progress && Object.keys(cloudData.progress).length > 0) {
    const localP = get(KEYS.progress) || {};
    const settings = getSettings();
    const mergedP = { ...localP };

    Object.entries(cloudData.progress).forEach(([chunkId, cloudProg]) => {
      const localProg = localP[chunkId];
      if (!localProg) {
        mergedP[chunkId] = ensureSrsProgress(cloudProg, settings.srsTrack);
      } else {
        const isCloudNewer = (cloudProg.lastPracticed || 0) > (localProg.lastPracticed || 0);
        const base = isCloudNewer ? cloudProg : localProg;
        const fallback = isCloudNewer ? localProg : cloudProg;

        const mergedItem = {
          ...fallback,
          ...base,
          srsLevel: base.srsLevel ?? fallback.srsLevel,
          srsTrack: base.srsTrack ?? fallback.srsTrack ?? settings.srsTrack,
          easeFactor: base.easeFactor ?? fallback.easeFactor,
          intervalMinutes: base.intervalMinutes ?? fallback.intervalMinutes,
          nextReviewAt: base.nextReviewAt ?? fallback.nextReviewAt,
          status: base.status ?? fallback.status,
          lastScore: base.lastScore ?? fallback.lastScore,
          lastFeedback: base.lastFeedback ?? fallback.lastFeedback,
        };

        mergedP[chunkId] = ensureSrsProgress(mergedItem, settings.srsTrack);
      }
    });

    set(KEYS.progress, mergedP);
  }

  return true;
}

// ─── Vocab Words ────────────────────────────────────────────────

/**
 * Lưu cache danh sách từ vựng vào localStorage để tránh fetch lại Supabase liên tục.
 * Dữ liệu có dạng: { words: [...], fetchedAt: timestamp }
 */
export function cacheVocabWords(words) {
  set(KEYS.vocabCache, { words, fetchedAt: Date.now() });
}

/**
 * Đọc danh sách từ vựng từ cache localStorage.
 * topic: optional string — nếu truyền vào sẽ filter theo topic.
 * maxAgeMs: thời gian cache hợp lệ (default 1 giờ). Sau đó cần refetch.
 */
export function getCachedVocabWords(topic = null, maxAgeMs = 60 * 60 * 1000) {
  const cache = get(KEYS.vocabCache);
  if (!cache || !cache.words) return null;
  if (Date.now() - cache.fetchedAt > maxAgeMs) return null; // hết hạn
  if (topic) return cache.words.filter(w => w.topic === topic);
  return cache.words;
}

/**
 * Fetch danh sách từ vựng từ bảng vocab_words trong Supabase.
 * Kết quả được cache vào localStorage sau khi fetch xong.
 * Nếu Supabase chưa cấu hình, trả về null.
 */
export async function fetchVocabWordsFromSupabase(topic = null) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
      .from('vocab_words')
      .select('id, word, meaning_vi, topic, part_of_speech, status')
      .in('status', ['generated', 'reviewed'])  // chỉ lấy từ đã được xử lý
      .order('word', { ascending: true });

    if (topic) query = query.eq('topic', topic);

    const { data, error } = await query;
    if (error) {
      console.error('Fetch vocab_words error:', error);
      return null;
    }

    // Normalize snake_case → camelCase cho app
    const words = (data || []).map(w => ({
      id:           w.id,
      word:         w.word,
      meaningVi:    w.meaning_vi,
      topic:        w.topic,
      partOfSpeech: w.part_of_speech,
      status:       w.status,
    }));

    // Cache toàn bộ (không cache từng topic riêng)
    if (!topic) cacheVocabWords(words);
    return words;
  } catch (err) {
    console.error('fetchVocabWordsFromSupabase error:', err);
    return null;
  }
}

// ─── Vocab Chunks ────────────────────────────────────────────────

/**
 * Lưu chunks sinh từ từ vựng vào chunk store chung.
 * Dùng wordId làm key (thay cho transcriptId), giữ nguyên API của getChunks / getAllChunks.
 * Mỗi chunk được đánh dấu: sourceType: 'vocab', sourceWordId, sourceWord, topic.
 */
export function saveVocabChunks(wordId, word, topic, chunks) {
  // Gán thêm metadata nguồn gốc cho từng chunk
  const annotated = chunks.map(c => ({
    ...c,
    sourceType:   'vocab',
    sourceWordId: wordId,
    sourceWord:   word,     // từ gốc dạng text — dùng hiển thị badge
    topic,
    // Group vocab chunks theo từ gốc
    groupId:   `vocab_${wordId}`,
    groupName: word,
  }));
  saveChunks(wordId, annotated);
}

/**
 * Lấy chunks của 1 từ vựng cụ thể.
 */
export function getVocabChunks(wordId) {
  return getChunks(wordId);
}

/**
 * Kiểm tra 1 từ đã có chunk chưa.
 */
export function wordHasChunks(wordId) {
  return getChunks(wordId).length > 0;
}

// ─── Vocab Learned Tracking ───────────────────────────────────────

/** Lấy toàn bộ từ đã học: { [wordId]: { learnedAt, word, topic } } */
export function getLearnedVocab() {
  const explicitLearned = get(KEYS.vocabLearned) || {};
  const allChunks = getAllChunks();
  const allProg = getAllProgress();

  const slug = (s) => (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Tự quét tất cả progress để nhận diện các từ vựng đã luyện thành công
  allChunks.forEach(chunk => {
    const prog = allProg[chunk.id];
    if (prog && (prog.successCount > 0 || prog.lastResult)) {
      let wordId = chunk.sourceWordId;
      let word = chunk.sourceWord || chunk.groupName;
      let topic = chunk.topic;

      if (!wordId && chunk.groupId && chunk.groupId.startsWith('vocab_')) {
        wordId = chunk.groupId.replace(/^vocab_/, '');
      }

      if (!wordId && word && topic) {
        wordId = `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
      }

      if (wordId && !explicitLearned[wordId]) {
        explicitLearned[wordId] = {
          learnedAt: prog.lastPracticed || Date.now(),
          word: word || 'Vocab',
          topic: topic || '',
        };
      }
    }
  });

  return explicitLearned;
}

/** Đánh dấu 1 từ đã học xong */
export function markVocabLearned(wordId, word, topic) {
  const all = get(KEYS.vocabLearned) || {};
  if (!all[wordId]) {
    all[wordId] = { learnedAt: Date.now(), word, topic };
    set(KEYS.vocabLearned, all);
  }
  return all[wordId];
}

/** Kiểm tra 1 từ đã học chưa */
export function isVocabLearned(wordId) {
  const all = getLearnedVocab();
  return !!all[wordId];
}

// ─── Vocab Daily Session ─────────────────────────────────────────

/** Lấy ngày hiện tại theo format YYYY-MM-DD (theo giờ local) */
function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Lấy phiên học hôm nay: { date, wordIds: [] }
 * Nếu phiên cũ hơn hôm nay → trả về null (ngày mới, session mới)
 */
export function getTodaySession() {
  const session = get(KEYS.vocabDailySession);
  if (!session || session.date !== todayDateStr()) return null;
  return session;
}

/** Lưu phiên học hôm nay (danh sách wordId đã chọn để học) */
export function saveTodaySession(wordIds) {
  set(KEYS.vocabDailySession, { date: todayDateStr(), wordIds });
}

/** Tổng số từ đã chọn học hôm nay (kể cả từ nhiều topic) */
export function getTodayWordCount() {
  const session = getTodaySession();
  return session ? session.wordIds.length : 0;
}

// ─── Practice Drafts (State Persistence) ──────────────────────────

/**
 * Lấy bản nháp câu trả lời & kết quả chấm của 1 chunk
 */
export function getPracticeDraft(chunkId) {
  if (!chunkId) return null;
  const all = get(KEYS.practiceDrafts) || {};
  return all[chunkId] || null;
}

/**
 * Lưu bản nháp (inputs, showSamples, gradingResults) của 1 chunk
 */
export function savePracticeDraft(chunkId, patch = {}) {
  if (!chunkId) return;
  const all = get(KEYS.practiceDrafts) || {};
  all[chunkId] = {
    ...all[chunkId],
    ...patch,
    updatedAt: Date.now(),
  };
  set(KEYS.practiceDrafts, all);
}

/**
 * Xóa bản nháp khi người dùng bấm "Viết lại"
 */
export function clearPracticeDraft(chunkId) {
  if (!chunkId) return;
  const all = get(KEYS.practiceDrafts) || {};
  delete all[chunkId];
  set(KEYS.practiceDrafts, all);
}

// ─── Visual Vocab Progress ──────────────────────────────────────────

/**
 * Lấy tiến độ học Visual Scene (các zone đã mở khoá, level đã hoàn thành)
 */
export function getVisualProgress(sceneId) {
  const all = get(KEYS.visualProgress) || {};
  if (sceneId) {
    return all[sceneId] || {
      unlockedZoneIds: ['zone_desk_area'],
      completedZones: {},
      completedHotspots: {},
    };
  }
  return all;
}

/**
 * Lưu tiến độ học Visual Scene
 */
export function saveVisualProgress(sceneId, data) {
  if (!sceneId) return;
  const all = get(KEYS.visualProgress) || {};
  all[sceneId] = {
    ...(all[sceneId] || {
      unlockedZoneIds: ['zone_desk_area'],
      completedZones: {},
      completedHotspots: {},
    }),
    ...data,
    updatedAt: Date.now(),
  };
  set(KEYS.visualProgress, all);
}

/**
 * Ghi nhận một từ hoàn thành ở Level 2 (Active Recall)
 * - Tự động cập nhật markVocabLearned
 * - Tự động tạo/cập nhật SRS progress SM-2
 */
export function recordVisualRecallSuccess(wordId, word, topic, collocation = null) {
  if (!wordId) return;
  // 1. Đánh dấu từ đã học trong kho Vocab
  markVocabLearned(wordId, word, topic);

  // 2. Kích hoạt bản ghi SRS SM-2
  const chunkId = `visual_${wordId}`;
  updateProgress(chunkId, true, 95, {
    source: 'visual_vocabulary',
    collocation: collocation || word,
    masteredAt: Date.now(),
    note: `Đã phản xạ thị giác thành thạo tại Visual Mode (${word})`,
  });
}

