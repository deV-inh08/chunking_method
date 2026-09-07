import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, X,
  SkipBack, SkipForward, Repeat, Eye, EyeOff,
  ArrowLeft, PenLine, Headphones, CheckCircle, Sparkles
} from 'lucide-react';
import { getChunks } from '../../store/storage';

// ─── Voice Finder Utility (Prioritizes Deep Learning Neural & Natural Voices) ─────
function scoreVoice(voice, targetLang = 'en-US', targetGender = 'female') {
  if (!voice) return -1000;
  const name = (voice.name || '').toLowerCase();
  const lang = (voice.lang || '').replace('_', '-').toLowerCase();
  const targetL = targetLang.toLowerCase().slice(0, 5); // 'en-us', 'en-gb', 'en-au', 'en-ca'

  // Loại bỏ các giọng không phải tiếng Anh
  if (!lang.startsWith('en')) return -1000;

  let score = 0;

  // 1. Độ khớp ngữ điệu / vùng miền (US, UK, AU, CA)
  if (lang.startsWith(targetL)) {
    score += 120; // Khớp chuẩn xác accent của câu thoại
  } else if (targetL === 'en-ca' && lang.startsWith('en-us')) {
    score += 80; // Giọng Canada fallback sang Mỹ rất tự nhiên
  } else {
    score += 30; // Tiếng Anh khác
  }

  // 2. Độ khớp giới tính (Nam / Nữ)
  const isMale = (
    name.includes('male') || name.includes('guy') || name.includes('david') ||
    name.includes('ryan') || name.includes('thomas') || name.includes('william') ||
    name.includes('christopher') || name.includes('eric') || name.includes('steffan') ||
    name.includes('liam') || name.includes('ken') || name.includes('george') ||
    name.includes('daniel') || name.includes('james') || name.includes('oliver') ||
    name.includes('richard') || name.includes('alex') || name.includes('fred') ||
    name.includes('rishi') || name.includes('mark') || name.includes('tom') ||
    name.includes('alfie') || name.includes('brian') || name.includes('andrew')
  );
  const isFemale = (
    name.includes('female') || name.includes('jenny') || name.includes('zira') ||
    name.includes('sonia') || name.includes('natasha') || name.includes('clara') ||
    name.includes('aria') || name.includes('michelle') || name.includes('libby') ||
    name.includes('samantha') || name.includes('karen') || name.includes('victoria') ||
    name.includes('ava') || name.includes('emma') || name.includes('susan') ||
    name.includes('catherine') || name.includes('hazel') || name.includes('moira') ||
    name.includes('tessa') || name.includes('annette') || name.includes('maisie')
  );

  if (targetGender === 'male' && isMale && !name.includes('female')) {
    score += 80;
  } else if (targetGender === 'female' && isFemale && !name.includes('male')) {
    score += 80;
  } else if (!isMale && !isFemale) {
    score += 30;
  } else {
    score -= 60; // Lệch giới tính
  }

  // 3. Phân cấp chất lượng: Cực kỳ ưu tiên giọng Natural / Neural / Studio của Microsoft & Google
  const isNeuralNatural = (
    name.includes('natural') || name.includes('neural') ||
    name.includes('online (natural)') || name.includes('studio')
  );
  const isGoogleEnhanced = name.includes('google') || name.includes('enhanced') || name.includes('premium');
  const isOldDesktopRobot = (
    name.includes('desktop') || name.includes('microsoft david') ||
    name.includes('microsoft zira') || name.includes('microsoft mark')
  );

  if (isNeuralNatural) {
    score += 400; // Giọng AI cao cấp nhất (Edge / Azure / Chrome Neural)
  } else if (isGoogleEnhanced) {
    score += 250; // Giọng Google chất lượng cao
  } else if (isOldDesktopRobot) {
    score -= 200; // Phạt nặng giọng robot thế hệ cũ
  }

  // 4. Ưu tiên các persona giọng tự nhiên chuyên dụng cho bài thi TOEIC
  const preferredPersonas = [
    'jenny', 'guy', 'sonia', 'ryan', 'natasha', 'william', 'clara', 'liam',
    'aria', 'christopher', 'libby', 'thomas', 'annette', 'ken', 'michelle', 'eric'
  ];
  if (preferredPersonas.some(p => name.includes(p))) {
    score += 100;
  }

  return score;
}

function findVoiceForSpeaker(speakerConfig, availableVoices = []) {
  let voices = availableVoices;
  if ((!voices || voices.length === 0) && typeof window !== 'undefined' && window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices() || [];
  }
  if (!voices || voices.length === 0) return null;

  const targetLang = speakerConfig.lang || 'en-US';
  const targetGender = speakerConfig.gender || 'female';

  let bestVoice = null;
  let highestScore = -9999;

  for (const voice of voices) {
    const s = scoreVoice(voice, targetLang, targetGender);
    if (s > highestScore) {
      highestScore = s;
      bestVoice = voice;
    }
  }

  return bestVoice || voices[0] || null;
}

// ─── Parse Script into Turns / Lines ───────────────────────────
function parseDialogueScript(rawText) {
  if (!rawText) return [];

  const rawLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = [];
  let lastSpeaker = null;

  rawLines.forEach((line, index) => {
    // Nhận diện speaker: "W-Am:", "M-Au:", "Woman:", "Man:", "Speaker 1:", v.v.
    const match = line.match(/^([A-Za-z0-9\s-]+):\s*(.*)$/);

    if (match) {
      const tag = match[1].trim();
      const content = match[2].trim();

      const tagLower = tag.toLowerCase();
      let gender = 'female';
      let lang = 'en-US';
      let accentLabel = 'Mỹ';

      // Phân tích giới tính
      if (tagLower.startsWith('m-') || tagLower.startsWith('m:') || tagLower.includes('man') || tagLower.includes('male')) {
        gender = 'male';
      } else if (tagLower.startsWith('w-') || tagLower.startsWith('w:') || tagLower.includes('woman') || tagLower.includes('female')) {
        gender = 'female';
      } else {
        gender = index % 2 === 0 ? 'female' : 'male';
      }

      // Phân tích accent
      if (tagLower.includes('au') || tagLower.includes('australia')) {
        lang = 'en-AU';
        accentLabel = 'Úc';
      } else if (tagLower.includes('br') || tagLower.includes('uk') || tagLower.includes('british')) {
        lang = 'en-GB';
        accentLabel = 'Anh';
      } else if (tagLower.includes('ca') || tagLower.includes('canada')) {
        lang = 'en-CA';
        accentLabel = 'Canada';
      } else {
        lang = 'en-US';
        accentLabel = 'Mỹ';
      }

      lastSpeaker = { tag, gender, lang, accentLabel };

      parsed.push({
        id: index,
        speaker: tag,
        gender,
        lang,
        accentLabel,
        text: content,
        raw: line,
      });
    } else {
      // Dòng không có tiền tố speaker
      const isHeader = line.toLowerCase().includes('questions') || line.toLowerCase().includes('refer to');
      parsed.push({
        id: index,
        speaker: isHeader ? 'Giới thiệu' : (lastSpeaker ? lastSpeaker.tag : 'Người đọc'),
        gender: lastSpeaker ? lastSpeaker.gender : (index % 2 === 0 ? 'female' : 'male'),
        lang: lastSpeaker ? lastSpeaker.lang : 'en-US',
        accentLabel: lastSpeaker ? lastSpeaker.accentLabel : 'Mỹ',
        text: line,
        raw: line,
        isHeader,
      });
    }
  });

  return parsed;
}

// ─── Highlighting Chunks Helper ────────────────────────────────
function HighlightedText({ text, chunks = [] }) {
  if (!chunks || chunks.length === 0 || !text) return <span>{text}</span>;

  const phrases = chunks
    .map(c => ({
      phrase: (c.phrase || '').trim(),
      meaningVi: c.meaningVi,
    }))
    .filter(c => c.phrase.length > 2)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  if (phrases.length === 0) return <span>{text}</span>;

  const escapedPhrases = phrases.map(p => p.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedPhrases.join('|')})`, 'gi');

  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, idx) => {
        const matched = phrases.find(p => p.phrase.toLowerCase() === part.toLowerCase());
        if (matched) {
          return (
            <mark
              key={idx}
              title={`Chunk: "${matched.phrase}" → ${matched.meaningVi || ''}`}
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.28)',
                color: '#a5b4fc',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                borderBottom: '2px solid #818cf8',
                cursor: 'help',
              }}
            >
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

// ─── Sound Effects (Web Audio API Synthesizer - Zero Dependency) ─────
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCorrectLetter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {}
  }

  playWrongLetter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playWordComplete() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.09, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.18);
      });
    } catch (e) {}
  }

  playHint() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.16);
      });
    } catch (e) {}
  }

  playSentenceVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch (e) {}
  }
}

const soundFX = new SoundFX();

// ─── Helper: Get Next Unrevealed Word Index in Tokens ─────────
function getNextUnrevealedWordIdx(tokens, revealedSet = new Set(), startIdx = 0) {
  if (!tokens || tokens.length === 0) return -1;
  for (let i = startIdx; i < tokens.length; i++) {
    const clean = tokens[i].replace(/[^a-zA-Z0-9]/g, '');
    if (clean && !revealedSet.has(i)) {
      return i;
    }
  }
  for (let i = 0; i < startIdx; i++) {
    const clean = tokens[i].replace(/[^a-zA-Z0-9]/g, '');
    if (clean && !revealedSet.has(i)) {
      return i;
    }
  }
  return -1;
}

// ─── Dictation Text Component (Interactive Game-like Progressive Reveal) ───
function DictationText({
  rawText,
  lineIdx,
  revealedSet = new Set(),
  activeWordIdx = -1,
  currentTyped = '',
  shakingWord = null,
  celebratingWord = null,
  hintedWord = null,
  onWordClick,
}) {
  const spacedText = (rawText || '').replace(/—/g, ' — ');
  const tokens = spacedText.split(/\s+/).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 8px', alignItems: 'center' }}>
      {tokens.map((token, wIdx) => {
        const match = token.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
        const leadingPunct = match ? match[1] : '';
        const core = match ? match[2] : token;
        const trailingPunct = match ? match[3] : '';

        if (!core) {
          return (
            <span key={wIdx} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16 }}>
              {token}
            </span>
          );
        }

        const isRevealed = revealedSet.has(wIdx);
        const isActive = wIdx === activeWordIdx;
        const isCelebrating = celebratingWord?.lineIdx === lineIdx && celebratingWord?.wordIdx === wIdx;
        const isHinted = hintedWord?.lineIdx === lineIdx && hintedWord?.wordIdx === wIdx;
        const isShaking = shakingWord?.lineIdx === lineIdx && shakingWord?.wordIdx === wIdx;

        // 1. Từ đã điền đúng / được gợi ý xong
        if (isRevealed) {
          return (
            <span
              key={wIdx}
              className={isCelebrating ? 'animate-word-celebrate' : isHinted ? 'animate-hint-sparkle' : 'animate-scale-up'}
              style={{
                color: '#22c55e',
                fontWeight: 800,
                fontSize: 16,
                background: 'rgba(34, 197, 94, 0.15)',
                borderBottom: '2px solid #22c55e',
                padding: '2px 7px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: isCelebrating ? '0 0 16px rgba(34, 197, 94, 0.5)' : isHinted ? '0 0 16px rgba(251, 191, 36, 0.5)' : 'none',
              }}
            >
              {leadingPunct}
              <span>{core}</span>
              {trailingPunct}
            </span>
          );
        }

        // 2. Từ đang chọn để gõ (Active Word: Gõ từng chữ cái thời gian thực)
        if (isActive) {
          return (
            <span
              key={wIdx}
              className={isShaking ? 'animate-wrong-shake' : 'animate-active-pulse'}
              onClick={() => onWordClick?.(wIdx)}
              title="Từ đang chọn gõ (Bấm Tab để gợi ý)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isShaking ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                border: isShaking ? '1.5px solid #ef4444' : '1.5px solid #38bdf8',
                boxShadow: isShaking ? '0 0 14px rgba(239, 68, 68, 0.45)' : '0 0 14px rgba(56, 189, 248, 0.35)',
                fontFamily: 'monospace',
                fontSize: 16.5,
                fontWeight: 800,
                cursor: 'text',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              }}
            >
              {leadingPunct}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {Array.from(core).map((origChar, charIdx) => {
                  if (charIdx < currentTyped.length) {
                    // Chữ cái đã gõ đúng -> Nảy lên và sáng màu cyan
                    return (
                      <span
                        key={charIdx}
                        className="animate-letter-pop"
                        style={{
                          color: '#38bdf8',
                          fontWeight: 900,
                          display: 'inline-block',
                          textShadow: '0 0 8px rgba(56, 189, 248, 0.6)',
                        }}
                      >
                        {origChar}
                      </span>
                    );
                  } else if (charIdx === currentTyped.length) {
                    // Vị trí con trỏ đang chờ gõ
                    return (
                      <span
                        key={charIdx}
                        className="animate-cursor-pulse"
                        style={{
                          color: '#facc15',
                          fontWeight: 900,
                          display: 'inline-block',
                          minWidth: '10px',
                          textAlign: 'center',
                          borderBottom: '2px solid #facc15',
                        }}
                      >
                        •
                      </span>
                    );
                  } else {
                    // Các chữ cái chưa tới lượt
                    return (
                      <span
                        key={charIdx}
                        style={{
                          color: 'rgba(255, 255, 255, 0.35)',
                          display: 'inline-block',
                          minWidth: '8px',
                          textAlign: 'center',
                        }}
                      >
                        •
                      </span>
                    );
                  }
                })}
              </span>
              {trailingPunct}
            </span>
          );
        }

        // 3. Từ chưa tới lượt (chưa gõ & không active)
        return (
          <span
            key={wIdx}
            onClick={() => onWordClick?.(wIdx)}
            title={`Từ có ${core.length} chữ cái (Bấm để chọn gõ từ này)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 7px',
              borderRadius: '5px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1.5px dashed rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.45)',
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '0.12em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {leadingPunct}
            <span>{'•'.repeat(core.length)}</span>
            {trailingPunct}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main TranscriptListeningModal Component (Full-Screen Session) ──
export function TranscriptListeningModal({
  transcript,
  chunks = [],
  onClose,
}) {
  // Lấy các chunk nếu chưa có sẵn từ prop
  const effectiveChunks = useMemo(() => {
    if (chunks && chunks.length > 0) return chunks;
    if (transcript && transcript.id) {
      return getChunks(transcript.id) || [];
    }
    return [];
  }, [transcript, chunks]);

  // Phân tích văn bản thành các dòng thoại
  const lines = useMemo(() => {
    return parseDialogueScript(transcript?.text || '');
  }, [transcript?.text]);

  // State audio player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoopingLine, setIsLoopingLine] = useState(false);
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [revealedLines, setRevealedLines] = useState({});

  // ─── Dictation Mode States ───
  const [isDictationMode, setIsDictationMode] = useState(false);
  const [revealedWords, setRevealedWords] = useState({});            // { [lineIndex]: Set<number> }
  const [activeWordIndices, setActiveWordIndices] = useState({});    // { [lineIndex]: number }
  const [dictationCurrentTyped, setDictationCurrentTyped] = useState({}); // { [lineIndex]: string }
  const [shakingWord, setShakingWord] = useState(null);              // { lineIdx, wordIdx, key }
  const [celebratingWord, setCelebratingWord] = useState(null);      // { lineIdx, wordIdx, key }
  const [hintedWord, setHintedWord] = useState(null);                // { lineIdx, wordIdx, key }
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Voices list from SpeechSynthesis
  const [systemVoices, setSystemVoices] = useState([]);
  const lineRefs = useRef({});
  const dictationInputRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentLineIndexRef = useRef(0);
  const isLoopingLineRef = useRef(false);
  const playbackRateRef = useRef(1.0);
  const speakLineRef = useRef(null);
  const speechStartTimeRef = useRef(0);
  const isDictationModeRef = useRef(false);
  const handleHintWordRef = useRef(null);
  const activeWordIndicesRef = useRef(activeWordIndices);
  const revealedWordsRef = useRef(revealedWords);
  const dictationCurrentTypedRef = useRef(dictationCurrentTyped);
  const [rewindAnimation, setRewindAnimation] = useState(null); // { side: 'left' | 'right', key: number }
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentLineIndexRef.current = currentLineIndex;
    isLoopingLineRef.current = isLoopingLine;
    playbackRateRef.current = playbackRate;
    isDictationModeRef.current = isDictationMode;
    activeWordIndicesRef.current = activeWordIndices;
    revealedWordsRef.current = revealedWords;
    dictationCurrentTypedRef.current = dictationCurrentTyped;
  }, [isPlaying, currentLineIndex, isLoopingLine, playbackRate, isDictationMode, activeWordIndices, revealedWords, dictationCurrentTyped]);

  // Tự động khởi tạo activeWordIdx khi chuyển câu trong Dictation Mode
  useEffect(() => {
    if (!isDictationMode) return;
    const line = lines[currentLineIndex];
    if (!line) return;
    const spacedText = (line.text || '').replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);
    const lineRevealed = revealedWords[currentLineIndex] || new Set();

    setActiveWordIndices(prev => {
      const current = prev[currentLineIndex];
      if (current != null && !lineRevealed.has(current)) {
        return prev;
      }
      const nextIdx = getNextUnrevealedWordIdx(tokens, lineRevealed, 0);
      if (prev[currentLineIndex] === nextIdx) return prev;
      return { ...prev, [currentLineIndex]: nextIdx };
    });

    const timer = setTimeout(() => {
      dictationInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [currentLineIndex, isDictationMode, lines]);

  // Load browser voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices() || [];
        if (v.length > 0) setSystemVoices(v);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto scroll to active line
  useEffect(() => {
    const el = lineRefs.current[currentLineIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

  // Speak a specific line
  const speakLine = useCallback((lineIndex) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const item = lines[lineIndex];
    if (!item || !item.text) {
      if (lineIndex + 1 < lines.length) {
        setCurrentLineIndex(lineIndex + 1);
        speakLineRef.current?.(lineIndex + 1);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    speechStartTimeRef.current = Date.now();
    const utterance = new SpeechSynthesisUtterance(item.text);
    // Tìm voice phù hợp nhất cho speaker (ưu tiên Neural/Natural)
    const bestVoice = findVoiceForSpeaker(item, systemVoices);
    const isNeuralVoice = bestVoice && (
      bestVoice.name.toLowerCase().includes('natural') ||
      bestVoice.name.toLowerCase().includes('neural') ||
      bestVoice.name.toLowerCase().includes('google') ||
      bestVoice.name.toLowerCase().includes('online')
    );

    utterance.rate = playbackRateRef.current * 0.96; // Nhịp đọc tự nhiên chuẩn TOEIC Listening
    utterance.pitch = isNeuralVoice ? 1.0 : (item.gender === 'female' ? 1.05 : 0.98);

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = item.lang || 'en-US';
    }

    utterance.onend = () => {
      // Tự động mở che câu nếu đang ở Blind mode (không mở trong Dictation mode)
      if (!isDictationMode) {
        setRevealedLines(prev => ({ ...prev, [lineIndex]: true }));
      }

      if (!isPlayingRef.current) return;

      if (isLoopingLineRef.current) {
        // Lặp lại câu này sau 400ms nghỉ
        setTimeout(() => {
          if (isPlayingRef.current) speakLineRef.current?.(lineIndex);
        }, 400);
      } else if (lineIndex + 1 < lines.length && !isDictationMode) {
        // Trong chế độ nghe thường: chuyển sang câu tiếp theo
        setCurrentLineIndex(lineIndex + 1);
        setTimeout(() => {
          if (isPlayingRef.current) speakLineRef.current?.(lineIndex + 1);
        }, 500);
      } else {
        // Hết bài thoại hoặc đang ở Dictation mode (dừng để người học gõ)
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [lines, systemVoices, isDictationMode]);

  useEffect(() => {
    speakLineRef.current = speakLine;
  }, [speakLine]);

  // Play / Pause toggle
  const handleTogglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakLineRef.current?.(currentLineIndexRef.current);
    }
  }, []);

  // ─── Tua Lùi 3 Giây (Double click bên trái / Phím mũi tên trái / J) ───
  const triggerRewind3s = useCallback(() => {
    const elapsed = Date.now() - (speechStartTimeRef.current || 0);
    setRewindAnimation({ side: 'left', key: Date.now() });

    // Nếu câu đang phát được hơn 1.2s -> Phát lại câu này từ đầu (tương đương tua lại 2-3s)
    if (elapsed > 1200 && isPlayingRef.current) {
      speakLineRef.current?.(currentLineIndexRef.current);
    } else {
      // Nếu mới bắt đầu câu hoặc đang dừng -> Lùi về câu trước đó
      const prevIdx = Math.max(0, currentLineIndexRef.current - 1);
      setCurrentLineIndex(prevIdx);
      speakLineRef.current?.(prevIdx);
      setIsPlaying(true);
    }
  }, []);

  // ─── Tua Tới 3 Giây (Double click bên phải / Phím mũi tên phải / L) ───
  const triggerForward3s = useCallback(() => {
    setRewindAnimation({ side: 'right', key: Date.now() });
    const nextIdx = Math.min(lines.length - 1, currentLineIndexRef.current + 1);
    setCurrentLineIndex(nextIdx);
    speakLineRef.current?.(nextIdx);
    setIsPlaying(true);
  }, [lines.length]);

  // Xử lý cử chỉ chạm đúp (Double tap / Double click) trên màn hình
  const handleContainerPointerDown = useCallback((e) => {
    // Không can thiệp nếu người dùng click vào nút bấm, ô input, textarea, text selection
    if (e.target.closest('button, input, textarea, a, mark, select')) {
      return;
    }

    const now = Date.now();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const width = window.innerWidth;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.hypot(clickX - lastTapRef.current.x, clickY - lastTapRef.current.y);

    // Phát hiện 2 lần chạm liên tiếp trong vòng 350ms tại cùng 1 vị trí
    if (timeDiff < 350 && distDiff < 80) {
      // Chạm đúp nửa bên trái màn hình (<= 45% chiều rộng) -> Tua lùi 3s
      if (clickX <= width * 0.45) {
        e.preventDefault();
        triggerRewind3s();
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }
      // Chạm đúp nửa bên phải màn hình (>= 55% chiều rộng) -> Tua tới 3s
      if (clickX >= width * 0.55) {
        e.preventDefault();
        triggerForward3s();
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }
    }

    lastTapRef.current = { time: now, x: clickX, y: clickY };
  }, [triggerRewind3s, triggerForward3s]);

  // Keyboard shortcut:
  // - Tab: Gợi ý 1 từ (kể cả khi đang trong ô input dictation, không mất focus, chỉ mở đúng 1 từ)
  // - Space: Dừng hoặc phát audio (Play/Pause)
  // - ArrowLeft / ArrowRight (← / →): Di chuyển sang từ trước / từ sau trong câu (ở Dictation mode)
  // - Ctrl: Tua lại 3s (ngay lập tức)
  // - Escape: Đóng modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Nếu đang trong ô input hoặc textarea, mọi phím đã được xử lý chuẩn xác tại handleDictationKeyDown
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // 1. Phím Ctrl: Tua lùi 3s
      if (e.key === 'Control') {
        if (!e.repeat) {
          triggerRewind3s();
        }
        return;
      }

      // 2. Phím Tab: Gợi ý 1 từ khi đang ở chế độ Dictation (chỉ gọi 1 lần duy nhất)
      if (e.key === 'Tab') {
        if (isDictationModeRef.current) {
          e.preventDefault();
          handleHintWordRef.current?.(currentLineIndexRef.current);
          return;
        }
      }

      // 3. Phím Space: Dừng hoặc phát audio
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // 4. Phím Escape: Đóng modal
      if (e.key === 'Escape') {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        onClose();
        return;
      }

      // 5. Phím mũi tên ← và →
      if (isDictationModeRef.current) {
        // Trong Dictation: Di chuyển sang từ trước / từ sau trong câu
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNavigateWordRef.current?.(currentLineIndexRef.current, 'prev');
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNavigateWordRef.current?.(currentLineIndexRef.current, 'next');
          return;
        }
      } else {
        // Trong chế độ Nghe thường: Tua lùi / tới 3s
        if (e.key === 'ArrowLeft' || e.code === 'KeyJ') {
          e.preventDefault();
          triggerRewind3s();
          return;
        }
        if (e.key === 'ArrowRight' || e.code === 'KeyL') {
          e.preventDefault();
          triggerForward3s();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlay, onClose, triggerRewind3s, triggerForward3s]);

  // Click on a specific line to select and play it
  const handleSelectLine = useCallback((index) => {
    setCurrentLineIndex(index);
    setIsPlaying(true);
    speakLine(index);
    setTimeout(() => {
      dictationInputRef.current?.focus();
    }, 60);
  }, [speakLine]);

  const handlePrevLine = () => {
    const nextIdx = Math.max(0, currentLineIndex - 1);
    setCurrentLineIndex(nextIdx);
    if (isPlaying) speakLine(nextIdx);
  };

  const handleNextLine = () => {
    const nextIdx = Math.min(lines.length - 1, currentLineIndex + 1);
    setCurrentLineIndex(nextIdx);
    if (isPlaying) speakLine(nextIdx);
  };

  // Toggle reveal for a line in blind mode
  const toggleRevealLine = (idx) => {
    setRevealedLines(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── Progressive Typing & Dictation Handlers ──────────────────
  // Gõ từng chữ cái của từ đang chọn (letter-by-letter matching)
  const handleCharInput = useCallback((lineIdx, char) => {
    const line = lines[lineIdx];
    if (!line) return;

    const spacedText = (line.text || '').replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);

    const lineRevealed = revealedWordsRef.current[lineIdx] || new Set();
    let activeIdx = activeWordIndicesRef.current[lineIdx];
    if (activeIdx == null || lineRevealed.has(activeIdx)) {
      activeIdx = getNextUnrevealedWordIdx(tokens, lineRevealed, 0);
      setActiveWordIndices(prev => ({ ...prev, [lineIdx]: activeIdx }));
    }

    if (activeIdx < 0 || activeIdx >= tokens.length) return; // Đã xong toàn bộ câu

    const token = tokens[activeIdx];
    const match = token.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
    const core = match ? match[2] : token;
    if (!core) return;

    const currentTyped = dictationCurrentTypedRef.current[lineIdx] || '';
    let nextPos = currentTyped.length;

    let expectedChar = core[nextPos];
    let autoSkippedPunct = '';

    // Hỗ trợ từ có dấu nháy / gạch ngang như don't, it's, first-class
    if (expectedChar === "'" || expectedChar === '-' || expectedChar === '’') {
      if (char === expectedChar) {
        // Gõ đúng dấu nháy
        const nextTyped = currentTyped + expectedChar;
        setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: nextTyped }));
        soundFX.playCorrectLetter();
        return;
      } else {
        // Gõ chữ cái tiếp theo -> tự động gộp dấu nháy vào
        autoSkippedPunct = expectedChar;
        nextPos++;
        expectedChar = core[nextPos];
      }
    }

    if (!expectedChar) return;

    // So khớp ký tự không phân biệt hoa thường
    if (char.toLowerCase() === expectedChar.toLowerCase()) {
      // ĐÚNG CHỮ CÁI!
      const updatedTyped = currentTyped + autoSkippedPunct + core[nextPos];
      soundFX.playCorrectLetter();

      if (updatedTyped.length >= core.length) {
        // TỪ NÀY ĐÃ HOÀN THÀNH!
        soundFX.playWordComplete();
        setCelebratingWord({ lineIdx, wordIdx: activeIdx, key: Date.now() });

        const newRevealed = new Set(lineRevealed);
        newRevealed.add(activeIdx);
        setRevealedWords(prev => ({ ...prev, [lineIdx]: newRevealed }));
        setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));

        const nextWordIdx = getNextUnrevealedWordIdx(tokens, newRevealed, activeIdx + 1);
        setActiveWordIndices(prev => ({ ...prev, [lineIdx]: nextWordIdx }));

        const totalWords = tokens.filter(t => t.replace(/[^a-zA-Z0-9]/g, '')).length;
        if (newRevealed.size >= totalWords) {
          soundFX.playSentenceVictory();
        }
      } else {
        setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: updatedTyped }));
      }
    } else {
      // SAI CHỮ CÁI!
      soundFX.playWrongLetter();
      setShakingWord({ lineIdx, wordIdx: activeIdx, key: Date.now() });
    }
  }, [lines]);

  const handleBackspace = useCallback((lineIdx) => {
    const current = dictationCurrentTypedRef.current[lineIdx] || '';
    if (current.length > 0) {
      setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: current.slice(0, -1) }));
    }
  }, []);

  // Di chuyển active word bằng phím ← và →
  const handleNavigateWord = useCallback((lineIdx, direction) => {
    const line = lines[lineIdx];
    if (!line) return;

    const spacedText = (line.text || '').replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);
    const currentIdx = activeWordIndicesRef.current[lineIdx] ?? 0;

    let targetIdx = currentIdx;
    if (direction === 'prev') {
      // Tìm từ có chữ cái trước currentIdx
      for (let i = currentIdx - 1; i >= 0; i--) {
        if (tokens[i]?.replace(/[^a-zA-Z0-9]/g, '')) {
          targetIdx = i;
          break;
        }
      }
    } else {
      // Tìm từ có chữ cái sau currentIdx
      for (let i = currentIdx + 1; i < tokens.length; i++) {
        if (tokens[i]?.replace(/[^a-zA-Z0-9]/g, '')) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx !== currentIdx) {
      setActiveWordIndices(prev => ({ ...prev, [lineIdx]: targetIdx }));
      setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));
    }
  }, [lines]);

  const handleNavigateWordRef = useRef(null);
  useEffect(() => {
    handleNavigateWordRef.current = handleNavigateWord;
  }, [handleNavigateWord]);

  // Gợi ý 1 từ đang chọn trong câu (Phím Tab)
  const handleHintWord = useCallback((lineIdx) => {
    const line = lines[lineIdx];
    if (!line) return;

    const spacedText = (line.text || '').replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);
    const lineRevealed = revealedWordsRef.current[lineIdx] || new Set();

    let targetIdx = activeWordIndicesRef.current[lineIdx];
    if (targetIdx == null || lineRevealed.has(targetIdx)) {
      targetIdx = getNextUnrevealedWordIdx(tokens, lineRevealed, 0);
    }

    if (targetIdx < 0 || targetIdx >= tokens.length) return; // Đã mở hết tất cả từ

    soundFX.playHint();
    setHintedWord({ lineIdx, wordIdx: targetIdx, key: Date.now() });

    const newRevealed = new Set(lineRevealed);
    newRevealed.add(targetIdx);

    setRevealedWords(prev => ({ ...prev, [lineIdx]: newRevealed }));
    setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));

    // Tự động chuyển tiêu điểm sang từ tiếp theo
    const nextWordIdx = getNextUnrevealedWordIdx(tokens, newRevealed, targetIdx + 1);
    setActiveWordIndices(prev => ({ ...prev, [lineIdx]: nextWordIdx }));

    // Kiểm tra hoàn thành câu
    const totalWords = tokens.filter(t => t.replace(/[^a-zA-Z0-9]/g, '')).length;
    if (newRevealed.size >= totalWords) {
      soundFX.playSentenceVictory();
    }
  }, [lines]);

  useEffect(() => {
    handleHintWordRef.current = handleHintWord;
  }, [handleHintWord]);

  // Nhấn phím trong ô gõ dictation
  const handleDictationKeyDown = useCallback((lineIdx, e) => {
    // 1. Phím Tab: Gợi ý đúng 1 từ (chặn default & stopPropagation để không bị gọi lần 2)
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      handleHintWord(lineIdx);
      return;
    }

    // 2. Phím Space: Dừng hoặc phát audio (theo yêu cầu của user)
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleTogglePlay();
      return;
    }

    // 3. Phím ArrowLeft (←): Di chuyển sang từ trước đó trong câu
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      handleNavigateWord(lineIdx, 'prev');
      return;
    }

    // 4. Phím ArrowRight (→): Di chuyển sang từ tiếp theo trong câu
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      handleNavigateWord(lineIdx, 'next');
      return;
    }

    // 5. Phím Ctrl: Tua lùi 3s
    if (e.key === 'Control') {
      e.preventDefault();
      e.stopPropagation();
      triggerRewind3s();
      return;
    }

    // 6. Phím Escape: Đóng modal
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      onClose();
      return;
    }

    // 7. Phím Backspace: Xóa lùi ký tự vừa gõ
    if (e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      handleBackspace(lineIdx);
      return;
    }

    // 8. Nhập chữ cái thông thường
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      handleCharInput(lineIdx, e.key);
      return;
    }
  }, [handleHintWord, handleTogglePlay, handleNavigateWord, triggerRewind3s, onClose, handleBackspace, handleCharInput]);

  const handleDictationInputChange = useCallback((lineIdx, e) => {
    const val = e.target.value;
    const current = dictationCurrentTypedRef.current[lineIdx] || '';
    if (val.length > current.length) {
      const added = val.slice(current.length);
      for (const ch of added) {
        handleCharInput(lineIdx, ch);
      }
    } else if (val.length < current.length) {
      handleBackspace(lineIdx);
    }
  }, [handleCharInput, handleBackspace]);

  // Chọn từ bất kỳ trong câu để gõ
  const handleSelectWord = useCallback((lineIdx, wIdx) => {
    setActiveWordIndices(prev => ({ ...prev, [lineIdx]: wIdx }));
    setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));
    setTimeout(() => {
      dictationInputRef.current?.focus();
    }, 40);
  }, []);

  // Xem toàn bộ đáp án của câu
  const handleRevealAllWords = (lineIdx) => {
    const rawText = lines[lineIdx]?.text || '';
    const spacedText = rawText.replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);

    setRevealedWords(prev => {
      const fullSet = new Set();
      tokens.forEach((t, i) => {
        if (t.replace(/[^a-zA-Z0-9]/g, '')) {
          fullSet.add(i);
        }
      });
      return { ...prev, [lineIdx]: fullSet };
    });
    setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));
  };

  // Xóa làm lại câu này trong dictation
  const handleResetSentenceDictation = (lineIdx) => {
    setDictationCurrentTyped(prev => ({ ...prev, [lineIdx]: '' }));
    setRevealedWords(prev => {
      const updated = { ...prev };
      delete updated[lineIdx];
      return updated;
    });
    const line = lines[lineIdx];
    const spacedText = (line?.text || '').replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);
    const firstIdx = getNextUnrevealedWordIdx(tokens, new Set(), 0);
    setActiveWordIndices(prev => ({ ...prev, [lineIdx]: firstIdx }));
    setTimeout(() => {
      dictationInputRef.current?.focus();
    }, 50);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleContainerPointerDown}
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'linear-gradient(180deg, #090d16 0%, #0f172a 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* ── 1. Sticky Fullscreen Header & Controls ────────────────── */}
      <header
        style={{
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Top Row: Back button, Title & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="btn btn-ghost"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              fontSize: 13,
              flexShrink: 0,
            }}
            title="Quay lại"
          >
            <ArrowLeft size={18} />
            <span style={{ fontWeight: 600 }}>Quay lại</span>
          </button>

          <div style={{ minWidth: 0, flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                {transcript?.part || 'TOEIC Listening'}
              </span>
              {effectiveChunks.length > 0 && (
                <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
                  ✨ {effectiveChunks.length} chunks
                </span>
              )}
            </div>
            <h2 style={{
              margin: '3px 0 0', fontSize: 15, fontWeight: 800, color: '#f8fafc',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {transcript?.title || transcript?.themeVi || transcript?.theme || 'Luyện Nghe Script TOEIC'}
            </h2>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                onClose();
              }}
              className="btn btn-ghost btn-icon"
              style={{ color: 'var(--text-secondary)' }}
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 14px',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          {/* Main Controls: Prev, Play/Pause, Next, Replay, Loop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handlePrevLine}
              disabled={currentLineIndex <= 0}
              className="btn btn-ghost btn-icon"
              title="Câu trước"
              style={{ opacity: currentLineIndex <= 0 ? 0.35 : 1, color: '#f8fafc', padding: 6 }}
            >
              <SkipBack size={17} />
            </button>

            <button
              onClick={handleTogglePlay}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-full)',
                padding: '7px 16px',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                  : isDictationMode
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: isPlaying ? '0 0 16px rgba(236,72,153,0.5)' : '0 0 16px rgba(99,102,241,0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? (
                <><Pause size={15} /> <span>Đang đọc ({currentLineIndex + 1}/{lines.length})</span></>
              ) : (
                <><Play size={15} /> <span>Phát câu ({currentLineIndex + 1}/{lines.length})</span></>
              )}
            </button>

            <button
              onClick={handleNextLine}
              disabled={currentLineIndex >= lines.length - 1}
              className="btn btn-ghost btn-icon"
              title="Câu tiếp theo"
              style={{ opacity: currentLineIndex >= lines.length - 1 ? 0.35 : 1, color: '#f8fafc', padding: 6 }}
            >
              <SkipForward size={17} />
            </button>

            <button
              onClick={triggerRewind3s}
              className="btn btn-ghost"
              title="Tua lùi 3s (hoặc click 2 lần màn hình bên trái / Phím mũi tên trái)"
              style={{
                color: '#f8fafc',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <RotateCcw size={14} />
              <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace' }}>3s</span>
            </button>

            <button
              onClick={() => setIsLoopingLine(l => !l)}
              className="btn btn-ghost btn-icon"
              title={isLoopingLine ? 'Tắt lặp lại câu' : 'Bật lặp lại câu này (Shadowing)'}
              style={{
                color: isLoopingLine ? '#818cf8' : 'var(--text-muted)',
                background: isLoopingLine ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                padding: 6,
              }}
            >
              <Repeat size={16} />
            </button>
          </div>

          {/* Center/Right Tools: Mode Selector + Speed + Blind Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Mode Selector: Nghe Thường vs Dictation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15,23,42,0.85)',
              borderRadius: 'var(--radius-md)',
              padding: 2,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <button
                type="button"
                onClick={() => setIsDictationMode(false)}
                style={{
                  border: 'none',
                  background: !isDictationMode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: !isDictationMode ? '#fff' : 'var(--text-muted)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                <Headphones size={12} />
                <span>Nghe</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDictationMode(true);
                  // Dừng phát tự động để user tập trung gõ
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setIsPlaying(false);
                }}
                style={{
                  border: 'none',
                  background: isDictationMode ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: isDictationMode ? '#fff' : 'var(--text-muted)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                <PenLine size={12} />
                <span>✍️ Dictation</span>
              </button>
            </div>

            {/* Speed selection */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.85)', borderRadius: 'var(--radius-sm)', padding: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
              {[0.75, 0.9, 1.0, 1.2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  style={{
                    border: 'none',
                    background: playbackRate === rate ? 'var(--accent-500)' : 'transparent',
                    color: playbackRate === rate ? '#fff' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Tốc độ đọc ${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Blind Mode Toggle (chỉ hiện khi ở chế độ Nghe thường) */}
            {!isDictationMode && (
              <button
                onClick={() => setIsBlindMode(b => !b)}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderColor: isBlindMode ? '#a855f7' : 'rgba(255,255,255,0.15)',
                  color: isBlindMode ? '#c084fc' : '#f8fafc',
                  background: isBlindMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)',
                }}
                title="Che lời thoại để luyện nghe phản xạ (Blind Listening)"
              >
                {isBlindMode ? <><EyeOff size={13} /> Nghe chay</> : <><Eye size={13} /> Hiện chữ</>}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Dialogue Stream Body (Full-Width Responsive) ────────── */}
      <main
        style={{
          flex: 1,
          padding: '24px 16px 80px',
          maxWidth: 840,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {isDictationMode && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            fontSize: 13,
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <PenLine size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Chế độ Dictation:</strong> Các từ được che bằng dấu chấm (từ 6 chữ = 6 chấm). Nghe và gõ từ bạn nghe được, nếu điền đúng từ sẽ lập tức hiện lên màu xanh!
            </span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="card text-center" style={{ padding: 40, textAlign: 'center' }}>
            <p className="text-secondary">Không có nội dung lời thoại để hiển thị.</p>
          </div>
        ) : (
          lines.map((item, idx) => {
            const isActive = currentLineIndex === idx;
            const isFemale = item.gender === 'female';
            const isRevealed = !isBlindMode || revealedLines[idx];

            // Dictation calculation for this sentence
            const spacedText = (item.text || '').replace(/—/g, ' — ');
            const tokens = spacedText.split(/\s+/).filter(Boolean);
            const totalWordsInSentence = tokens.filter(t => t.replace(/[^a-zA-Z0-9]/g, '')).length;
            const lineRevealedSet = revealedWords[idx] || new Set();
            const revealedWordsCount = Array.from(lineRevealedSet).filter(i => {
              const t = tokens[i];
              return t && t.replace(/[^a-zA-Z0-9]/g, '');
            }).length;
            const isSentenceComplete = totalWordsInSentence > 0 && revealedWordsCount >= totalWordsInSentence;

            return (
              <div
                key={idx}
                ref={el => lineRefs.current[idx] = el}
                onClick={() => handleSelectLine(idx)}
                className="animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-lg)',
                  background: isActive
                    ? isDictationMode
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.1))'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(49, 46, 129, 0.25))'
                    : 'rgba(30, 41, 59, 0.45)',
                  border: isActive
                    ? isDictationMode ? '1.5px solid #10b981' : '1.5px solid #818cf8'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive
                    ? isDictationMode ? '0 0 24px rgba(16, 185, 129, 0.2)' : '0 0 24px rgba(99, 102, 241, 0.2)'
                    : 'none',
                }}
              >
                {/* Speaker Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      background: isFemale ? 'rgba(236, 72, 153, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                      color: isFemale ? '#f472b6' : '#38bdf8',
                      border: `1px solid ${isFemale ? 'rgba(236, 72, 153, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {isFemale ? '👩' : '👨'} {item.speaker}
                      {item.accentLabel && (
                        <span style={{ opacity: 0.8, fontSize: 10.5 }}>({item.accentLabel})</span>
                      )}
                    </span>

                    {isActive && isPlaying && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, color: isDictationMode ? '#34d399' : 'var(--accent-300)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Volume2 size={14} className="animate-pulse" /> Đang phát...
                      </span>
                    )}

                    {isDictationMode && totalWordsInSentence > 0 && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 700,
                        color: isSentenceComplete ? '#22c55e' : 'var(--text-muted)',
                        padding: '1px 8px', borderRadius: 'var(--radius-full)',
                        background: isSentenceComplete ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.06)',
                      }}>
                        {isSentenceComplete ? '✓ Hoàn thành' : `${revealedWordsCount}/${totalWordsInSentence} từ`}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLine(idx);
                    }}
                    className="btn btn-ghost btn-xs"
                    style={{
                      color: isActive ? (isDictationMode ? '#34d399' : 'var(--accent-300)') : 'var(--text-muted)',
                      padding: '3px 8px',
                      fontSize: 11.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Nghe câu này"
                  >
                    <Volume2 size={13} /> Nghe câu này
                  </button>
                </div>

                {/* Sentence text / Dictation area */}
                <div style={{
                  fontSize: 15.5,
                  lineHeight: 1.65,
                  color: isActive ? '#fff' : 'rgba(241, 245, 249, 0.85)',
                  fontWeight: isActive ? 600 : 400,
                  paddingLeft: 2,
                }}>
                  {isDictationMode ? (
                    // Dictation View: Dots for unrevealed, Green for correct words, interactive progressive typing
                    <DictationText
                      rawText={item.text}
                      lineIdx={idx}
                      revealedSet={revealedWords[idx] || new Set()}
                      activeWordIdx={isActive ? (activeWordIndices[idx] ?? 0) : -1}
                      currentTyped={isActive ? (dictationCurrentTyped[idx] || '') : ''}
                      shakingWord={shakingWord}
                      celebratingWord={celebratingWord}
                      hintedWord={hintedWord}
                      onWordClick={(wIdx) => handleSelectWord(idx, wIdx)}
                    />
                  ) : isRevealed ? (
                    // Normal Listening View: Highlight chunks
                    <HighlightedText text={item.text} chunks={effectiveChunks} />
                  ) : (
                    // Blind mode overlay
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRevealLine(idx);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px dashed rgba(255,255,255,0.18)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        color: 'var(--text-muted)',
                        fontSize: 13.5,
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        userSelect: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <EyeOff size={14} /> 🙈 Đang che nội dung (Bấm để xem đáp án)
                    </div>
                  )}
                </div>

                {/* ── Dictation Interactive Input Panel (Only on active sentence) ── */}
                {isDictationMode && isActive && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 12,
                      padding: '14px 16px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PenLine size={14} />
                        <span>Điền từ bạn nghe được ({revealedWordsCount}/{totalWordsInSentence} từ đúng)</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Bật/Tắt âm thanh game */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setSoundEnabled(s => !s)}
                          style={{
                            color: soundEnabled ? '#38bdf8' : 'var(--text-muted)',
                            padding: '3px 8px',
                            fontSize: 11.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={soundEnabled ? "Tắt âm thanh game" : "Bật âm thanh game"}
                        >
                          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                          <span>{soundEnabled ? 'Âm thanh' : 'Tắt tiếng'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleSelectLine(idx)}
                          style={{ color: '#38bdf8', padding: '3px 8px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Nghe lại câu này"
                        >
                          <Volume2 size={13} /> Nghe lại
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleHintWord(idx)}
                          style={{ color: '#fbbf24', padding: '3px 8px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Gợi ý 1 từ tiếp theo (Bấm phím Tab)"
                        >
                          <Sparkles size={13} /> Gợi ý 1 từ <kbd style={{ marginLeft: 2, padding: '1px 5px', fontSize: 10, background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 3, fontFamily: 'monospace' }}>Tab</kbd>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleRevealAllWords(idx)}
                          style={{ color: 'var(--text-muted)', padding: '3px 8px', fontSize: 11.5 }}
                          title="Xem toàn bộ câu"
                        >
                          Đáp án
                        </button>
                      </div>
                    </div>

                    {/* Dictation Input Field */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        ref={dictationInputRef}
                        type="text"
                        className="input-field"
                        value={dictationCurrentTyped[idx] || ''}
                        onKeyDown={(e) => handleDictationKeyDown(idx, e)}
                        onChange={(e) => handleDictationInputChange(idx, e)}
                        placeholder={isSentenceComplete ? "Đã hoàn thành 100% câu!" : "Gõ từng chữ cái của từ (Tab: Gợi ý 1 từ, Space: Dừng/Phát, ← / →: Đổi từ)..."}
                        disabled={isSentenceComplete}
                        autoFocus
                        style={{
                          flex: 1,
                          height: 42,
                          fontSize: 15,
                          fontFamily: 'monospace',
                          letterSpacing: '0.08em',
                          borderColor: isSentenceComplete ? '#10b981' : '#38bdf8',
                          background: 'rgba(0, 0, 0, 0.35)',
                          color: '#38bdf8',
                          fontWeight: 700,
                        }}
                      />
                      {revealedWordsCount > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleResetSentenceDictation(idx)}
                          style={{ padding: '6px 10px', color: 'var(--text-muted)' }}
                          title="Xóa làm lại câu này"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>

                    {/* Success Message when all words are found */}
                    {isSentenceComplete && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)',
                        color: '#34d399', fontSize: 13, fontWeight: 700, gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={16} />
                          <span>Xuất sắc! Bạn đã điền đúng 100% câu này! 🎉</span>
                        </div>
                        {idx < lines.length - 1 && (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleSelectLine(idx + 1)}
                            style={{ fontSize: 12, padding: '4px 10px' }}
                          >
                            Câu tiếp theo →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* ── 3. Sticky Fullscreen Footer ───────────────────────────── */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12.5,
          color: 'var(--text-muted)',
          zIndex: 15,
        }}
      >
        {isDictationMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#10b981' }}>Space</kbd> Dừng/Phát
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#38bdf8' }}>← / →</kbd> Chuyển từ
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#fbbf24' }}>Tab</kbd> Gợi ý 1 từ
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#a5b4fc' }}>Ctrl</kbd> Tua lùi 3s
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <span>💡</span>
            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Chạm 2 lần bên trái màn hình (hoặc phím ← / J) để tua lùi 3s. Chạm 2 lần bên phải (hoặc phím → / L) để tua tới!
            </span>
          </div>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            onClose();
          }}
          style={{ fontWeight: 700, flexShrink: 0 }}
        >
          Đóng
        </button>
      </footer>

      {/* ── 4. YouTube-style Double Tap Animation Overlay ─────────── */}
      {rewindAnimation && (
        <div
          key={rewindAnimation.key}
          onAnimationEnd={() => setRewindAnimation(null)}
          style={{
            position: 'fixed',
            top: '50%',
            [rewindAnimation.side === 'left' ? 'left' : 'right']: '12%',
            transform: 'translateY(-50%)',
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'doubleTapBubble 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 35px rgba(56, 189, 248, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              gap: 2,
            }}
          >
            {rewindAnimation.side === 'left' ? (
              <>
                <RotateCcw size={32} strokeWidth={2.6} />
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace' }}>3s</span>
              </>
            ) : (
              <>
                <RotateCw size={32} strokeWidth={2.6} />
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace' }}>3s</span>
              </>
            )}
          </div>
          <span style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 800,
            color: '#f8fafc',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            {rewindAnimation.side === 'left' ? '⟲ Lùi 3s' : 'Tiến 3s ⟳'}
          </span>
        </div>
      )}

      {/* Global Keyframes for Animations */}
      <style>{`
        @keyframes doubleTapBubble {
          0% {
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          25% {
            opacity: 1;
            transform: translateY(-50%) scale(1.1);
          }
          60% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-50%) scale(1.2);
          }
        }

        @keyframes letterPopIn {
          0% {
            transform: scale(0.25) translateY(4px);
            opacity: 0;
          }
          65% {
            transform: scale(1.35) translateY(-2px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes wordCelebration {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
          }
          35% {
            transform: scale(1.2);
            box-shadow: 0 0 24px rgba(34, 197, 94, 0.7);
          }
          70% {
            transform: scale(0.96);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.25);
          }
        }

        @keyframes wrongShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
        }

        @keyframes activeWordPulse {
          0%, 100% {
            border-color: rgba(56, 189, 248, 0.6);
            box-shadow: 0 0 8px rgba(56, 189, 248, 0.25);
          }
          50% {
            border-color: rgba(56, 189, 248, 1);
            box-shadow: 0 0 16px rgba(56, 189, 248, 0.55);
          }
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }

        @keyframes hintSparkle {
          0% {
            transform: scale(0.9);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.22);
            filter: brightness(1.7) drop-shadow(0 0 14px #fbbf24);
          }
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
        }

        .animate-letter-pop {
          animation: letterPopIn 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-word-celebrate {
          animation: wordCelebration 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-wrong-shake {
          animation: wrongShake 0.36s ease-in-out forwards;
        }

        .animate-active-pulse {
          animation: activeWordPulse 2s infinite ease-in-out;
        }

        .animate-cursor-pulse {
          animation: cursorBlink 0.9s infinite ease-in-out;
        }

        .animate-hint-sparkle {
          animation: hintSparkle 0.55s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Also export alias for speaking/listening terminology consistency
export const TranscriptListeningSession = TranscriptListeningModal;
