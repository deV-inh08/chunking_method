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

export function getTranscripts() {
  const all = get(KEYS.transcripts) || {};
  return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
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
  return all[transcriptId] || [];
}

export function getAllChunks() {
  const all = get(KEYS.chunks) || {};
  const flat = Object.values(all).flat();
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

/** Tự động bổ sung thông tin SRS nếu progress cũ hoặc đồng bộ từ cloud bị thiếu nextReviewAt */
function ensureSrsProgress(prog, track = 'track_a') {
  if (!prog || !prog.practiceCount) return prog;
  if (prog.nextReviewAt) return prog;

  const lastTime = prog.lastPracticed || Date.now();
  const srsUpdates = calculateNextReview({
    prevProgress: {
      srsLevel: Math.max(0, (prog.practiceCount || 1) - 1),
      easeFactor: prog.easeFactor || (track === 'track_b' ? 2.0 : 1.65),
    },
    score: prog.lastScore != null ? prog.lastScore : (prog.lastResult ? 80 : 40),
    success: Boolean(prog.lastResult),
    track: prog.srsTrack || track,
  });

  return {
    ...prog,
    ...srsUpdates,
    nextReviewAt: lastTime + (srsUpdates.intervalMinutes * 60 * 1000),
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

  // 1. Env keys (VITE_API_KEY phẩy phân cách hoặc VITE_API_KEY_2)
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

  // 2. Settings keys (người dùng nhập trong modal Settings)
  const settings = getSettings();
  if (settings.apiKey && !keys.includes(settings.apiKey)) {
    keys.push(settings.apiKey);
  }
  if (settings.apiKey2 && !keys.includes(settings.apiKey2)) {
    keys.push(settings.apiKey2);
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
