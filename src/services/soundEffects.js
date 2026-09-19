// Web Audio API sound synthesizer for interactive typing & gamification
// Dedicated Zen Wood Block ("Mõ gỗ") typing sound engine

let audioCtx = null;
const STORAGE_KEY_MUTED = 'chunk_typing_sound_muted';

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
  } catch {}
}

export function toggleSound() {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return next;
}

// ─── 1. Zen Wood Block Sound ("Mõ gỗ" gõ cốc cốc thư giãn ASMR) ───────────────
export function playKeyClick(isSpace = false) {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const jitter = (Math.random() - 0.5) * 35;
    const baseFreq = isSpace ? 560 + jitter : 780 + jitter;

    // Primary resonant hollow wood tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.022);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.1, t);
    filter.Q.setValueAtTime(3.8, t);

    gain1.gain.setValueAtTime(isSpace ? 0.32 : 0.26, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.03);

    // Secondary hollow harmonic (tạo âm vang thân gỗ rỗng)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.55, t);

    gain2.gain.setValueAtTime(0.09, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t);
    osc2.stop(t + 0.015);
  } catch {}
}

// ─── 2. Chunk Activated Power-Up (Zing Chime) ─────────────────────────────────
export function playChunkActivated() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const notes = [523.25, 783.99, 1046.5]; // C5 -> G5 -> C6

    notes.forEach((freq, i) => {
      const startTime = t + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch {}
}

// ─── 3. Vocab Item Collected Ting ─────────────────────────────────────────────
export function playVocabCollected() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1318.51, t + 0.06); // E6

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.29);
  } catch {}
}

// ─── 4. Combo Streak Fanfare ──────────────────────────────────────────────────
export function playComboStreak() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, t); // E5
    osc.frequency.exponentialRampToValueAtTime(987.77, t + 0.08); // B5

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.23);
  } catch {}
}
