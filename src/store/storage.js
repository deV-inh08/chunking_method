import {
  dbSaveTranscript,
  dbDeleteTranscript,
  dbSaveChunks,
  dbSaveSituations,
  dbSaveProgress,
  dbFetchAllData,
  isSupabaseConfigured,
} from '../services/supabase';

// ─── Storage keys ─────────────────────────────────────────────
const KEYS = {
  transcripts: 'toeic_transcripts',
  chunks:      'toeic_chunks',
  situations:  'toeic_situations',
  progress:    'toeic_progress',
  settings:    'toeic_settings',
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
  return Object.values(all).flat();
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
  const updated = {
    chunkId,
    practiceCount: prev.practiceCount + 1,
    successCount:  result ? prev.successCount + 1 : prev.successCount,
    lastPracticed: Date.now(),
    lastResult:    result,
    lastScore:     score,
    lastFeedback:  feedback,
  };
  all[chunkId] = updated;
  set(KEYS.progress, all);

  // Sync to Supabase in background
  dbSaveProgress(updated).catch(err => console.error('Cloud sync error:', err));

  return updated;
}

export function getProgress(chunkId) {
  const all = get(KEYS.progress) || {};
  return all[chunkId] || null;
}

export function getAllProgress() {
  return get(KEYS.progress) || {};
}

// ─── Settings ─────────────────────────────────────────────────
export function getSettings() {
  return get(KEYS.settings) || {
    apiKey: '',
    language: 'vi-VN',
    supabaseUrl: '',
    supabaseKey: '',
  };
}

export function saveSettings(settings) {
  set(KEYS.settings, settings);
}

export function getApiKey() {
  // Priority 1: VITE_API_KEY in .env (baked at build time)
  const envKey = import.meta.env.VITE_API_KEY;
  if (envKey && envKey !== 'your-key-here' && !envKey.includes('your-key')) {
    return envKey;
  }
  // Priority 2: key entered manually in Settings (stored in localStorage)
  return getSettings().apiKey || '';
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
    set(KEYS.situations, { ...localS, ...cloudData.situations });
  }

  if (cloudData.progress && Object.keys(cloudData.progress).length > 0) {
    const localP = get(KEYS.progress) || {};
    set(KEYS.progress, { ...localP, ...cloudData.progress });
  }

  return true;
}
