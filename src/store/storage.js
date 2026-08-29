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
  // cascade delete
  deleteChunks(id);
}

// ─── Chunks ───────────────────────────────────────────────────
export function saveChunks(transcriptId, chunks) {
  const all = get(KEYS.chunks) || {};
  all[transcriptId] = chunks;
  set(KEYS.chunks, all);
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
export function updateProgress(chunkId, result) {
  const all = get(KEYS.progress) || {};
  const prev = all[chunkId] || { practiceCount: 0, successCount: 0 };
  all[chunkId] = {
    chunkId,
    practiceCount: prev.practiceCount + 1,
    successCount:  result ? prev.successCount + 1 : prev.successCount,
    lastPracticed: Date.now(),
    lastResult:    result,
  };
  set(KEYS.progress, all);
  return all[chunkId];
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
  return get(KEYS.settings) || { apiKey: '', language: 'vi-VN' };
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
