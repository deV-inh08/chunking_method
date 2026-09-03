import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, X,
  SkipBack, SkipForward, Repeat, Eye, EyeOff,
  ArrowLeft, PenLine, Headphones, CheckCircle, Sparkles
} from 'lucide-react';
import { getChunks } from '../../store/storage';

// ─── Voice Finder Utility ──────────────────────────────────────
function findVoiceForSpeaker(speakerConfig, availableVoices = []) {
  if (!availableVoices || availableVoices.length === 0) return null;

  const targetLang = speakerConfig.lang || 'en-US';
  const targetGender = speakerConfig.gender || 'female';

  // 1. Tìm chính xác cả accent + gender
  const exactMatch = availableVoices.find(v => {
    const nameLower = v.name.toLowerCase();
    const langMatch = v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.toLowerCase().slice(0, 5));
    if (!langMatch) return false;

    if (targetGender === 'female') {
      return nameLower.includes('female') || nameLower.includes('zira') || nameLower.includes('samantha') ||
             nameLower.includes('karen') || nameLower.includes('catherine') || nameLower.includes('victoria');
    } else {
      return nameLower.includes('male') || nameLower.includes('david') || nameLower.includes('george') ||
             nameLower.includes('james') || nameLower.includes('daniel') || nameLower.includes('oliver');
    }
  });
  if (exactMatch) return exactMatch;

  // 2. Tìm theo accent (bất kỳ gender)
  const langMatch = availableVoices.find(v =>
    v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.toLowerCase().slice(0, 5))
  );
  if (langMatch) return langMatch;

  // 3. Fallback en-US hoặc tiếng Anh bất kỳ
  const enMatch = availableVoices.find(v => v.lang.toLowerCase().startsWith('en'));
  return enMatch || availableVoices[0] || null;
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

// ─── Dictation Text Component (Masked Dots & Green Revealed) ────
function DictationText({ rawText, revealedSet = new Set() }) {
  // Normalize em-dash to spaced dash so words don't glue together
  const spacedText = (rawText || '').replace(/—/g, ' — ');
  const tokens = spacedText.split(/\s+/).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 7px', alignItems: 'center' }}>
      {tokens.map((token, wIdx) => {
        const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isPunctuationOnly = !clean;

        if (isPunctuationOnly) {
          return (
            <span key={wIdx} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
              {token}
            </span>
          );
        }

        const isRevealed = revealedSet.has(wIdx);

        if (isRevealed) {
          // Điền đúng: Hiện từ lên + màu xanh
          return (
            <span
              key={wIdx}
              className="animate-scale-up"
              style={{
                color: '#22c55e',
                fontWeight: 800,
                fontSize: 16,
                background: 'rgba(34, 197, 94, 0.15)',
                borderBottom: '2px solid #22c55e',
                padding: '1px 6px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {token}
            </span>
          );
        }

        // Sai hoặc chưa điền: hiện số lượng dấu chấm tương ứng số chữ cái
        // Ví dụ: 1 từ có 6 chữ thì có 6 dấu chấm (••••••)
        const leadingPunct = token.match(/^[^a-zA-Z0-9]+/)?.[0] || '';
        const trailingPunct = token.match(/[^a-zA-Z0-9]+$/)?.[0] || '';
        const dots = '•'.repeat(clean.length);

        return (
          <span
            key={wIdx}
            title={`Từ có ${clean.length} chữ cái`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              letterSpacing: '0.12em',
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: 16,
              fontWeight: 800,
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 6px',
              borderRadius: '4px',
              borderBottom: '1.5px dashed rgba(255, 255, 255, 0.3)',
              fontFamily: 'monospace',
            }}
          >
            {leadingPunct}
            <span>{dots}</span>
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
  const [dictationInputs, setDictationInputs] = useState({}); // { [lineIndex]: string }
  const [revealedWords, setRevealedWords] = useState({});     // { [lineIndex]: Set<number> }

  // Voices list from SpeechSynthesis
  const [systemVoices, setSystemVoices] = useState([]);
  const lineRefs = useRef({});
  const isPlayingRef = useRef(false);
  const currentLineIndexRef = useRef(0);
  const isLoopingLineRef = useRef(false);
  const playbackRateRef = useRef(1.0);
  const speakLineRef = useRef(null);
  const speechStartTimeRef = useRef(0);
  const [rewindAnimation, setRewindAnimation] = useState(null); // { side: 'left' | 'right', key: number }
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentLineIndexRef.current = currentLineIndex;
    isLoopingLineRef.current = isLoopingLine;
    playbackRateRef.current = playbackRate;
  }, [isPlaying, currentLineIndex, isLoopingLine, playbackRate]);

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
    utterance.rate = playbackRateRef.current;
    utterance.pitch = item.gender === 'female' ? 1.1 : 0.95;

    // Tìm voice phù hợp nhất cho speaker
    const bestVoice = findVoiceForSpeaker(item, systemVoices);
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

  // Keyboard shortcut: Escape to close, Space to play/pause, ArrowLeft/J to rewind 3s, ArrowRight/L to forward 3s
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Không bắt phím tắt khi đang gõ trong ô input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        triggerRewind3s();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyL') {
        e.preventDefault();
        triggerForward3s();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, onClose, triggerRewind3s, triggerForward3s]);

  // Click on a specific line to select and play it
  const handleSelectLine = (index) => {
    setCurrentLineIndex(index);
    setIsPlaying(true);
    speakLine(index);
  };

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

  // ─── Dictation Matching Handlers ──────────────────────────────
  const handleDictationInputChange = (lineIdx, inputVal) => {
    setDictationInputs(prev => ({ ...prev, [lineIdx]: inputVal }));

    const rawText = lines[lineIdx]?.text || '';
    const spacedText = rawText.replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);

    // Tách các từ người dùng đã gõ (bỏ dấu câu, chuyển chữ thường)
    const inputWords = inputVal
      .toLowerCase()
      .split(/[\s,.;!?]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    if (inputWords.length === 0) return;

    setRevealedWords(prev => {
      const currentSet = new Set(prev[lineIdx] || []);

      tokens.forEach((token, wIdx) => {
        const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!clean) return;

        // Nếu từ này xuất hiện trong những gì user đã gõ: Điền đúng -> hiện lên + màu xanh
        if (inputWords.includes(clean)) {
          currentSet.add(wIdx);
        }
      });

      return { ...prev, [lineIdx]: currentSet };
    });
  };

  // Gợi ý 1 từ tiếp theo trong câu
  const handleHintWord = (lineIdx) => {
    const rawText = lines[lineIdx]?.text || '';
    const spacedText = rawText.replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);

    setRevealedWords(prev => {
      const currentSet = new Set(prev[lineIdx] || []);

      // Tìm từ đầu tiên chưa được mở
      for (let i = 0; i < tokens.length; i++) {
        const clean = tokens[i].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean && !currentSet.has(i)) {
          currentSet.add(i);
          break;
        }
      }

      return { ...prev, [lineIdx]: currentSet };
    });
  };

  // Xem toàn bộ đáp án của câu
  const handleRevealAllWords = (lineIdx) => {
    const rawText = lines[lineIdx]?.text || '';
    const spacedText = rawText.replace(/—/g, ' — ');
    const tokens = spacedText.split(/\s+/).filter(Boolean);

    setRevealedWords(prev => {
      const fullSet = new Set();
      tokens.forEach((_, i) => fullSet.add(i));
      return { ...prev, [lineIdx]: fullSet };
    });
  };

  // Xóa làm lại câu này trong dictation
  const handleResetSentenceDictation = (lineIdx) => {
    setDictationInputs(prev => ({ ...prev, [lineIdx]: '' }));
    setRevealedWords(prev => {
      const updated = { ...prev };
      delete updated[lineIdx];
      return updated;
    });
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
                    // Dictation View: Dots for unrevealed, Green for correct words
                    <DictationText
                      rawText={item.text}
                      revealedSet={revealedWords[idx] || new Set()}
                      chunks={effectiveChunks}
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
                      marginTop: 10,
                      padding: '14px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
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
                          title="Gợi ý 1 từ tiếp theo"
                        >
                          <Sparkles size={13} /> Gợi ý 1 từ
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
                        type="text"
                        className="input-field"
                        value={dictationInputs[idx] || ''}
                        onChange={(e) => handleDictationInputChange(idx, e.target.value)}
                        placeholder="Gõ từ bạn nghe được (đúng sẽ tự hiện xanh)..."
                        autoFocus
                        style={{
                          flex: 1,
                          height: 42,
                          fontSize: 14.5,
                          borderColor: isSentenceComplete ? '#10b981' : 'rgba(255, 255, 255, 0.18)',
                          background: 'rgba(0, 0, 0, 0.35)',
                        }}
                      />
                      {dictationInputs[idx] && (
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
                          <span>Xuất sắc! Bạn đã điền đúng 100% câu này!</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span>💡</span>
          <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {isDictationMode
              ? 'Chế độ Dictation: Gõ các từ bạn nghe được, đúng sẽ hiện xanh. Chạm 2 lần bên trái để nghe lại 3s!'
              : 'Chạm 2 lần bên trái màn hình (hoặc phím ← / J) để tua lùi 3s. Chạm 2 lần bên phải (hoặc phím → / L) để tua tới!'}
          </span>
        </div>

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

      {/* Global Keyframes for the double tap animation */}
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
      `}</style>
    </div>
  );
}

// Also export alias for speaking/listening terminology consistency
export const TranscriptListeningSession = TranscriptListeningModal;
