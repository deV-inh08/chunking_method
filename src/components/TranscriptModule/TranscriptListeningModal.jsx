import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, X,
  SkipBack, SkipForward, Repeat, Eye, EyeOff,
  Headphones
} from 'lucide-react';
import { getChunks } from '../../store/storage';

// ─── Voice Finder Utility ──────────────────────────────────────
function findVoiceForSpeaker(speakerConfig, availableVoices = []) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (speakerConfig.lang || 'en-US').toLowerCase();
  const targetGender = speakerConfig.gender || 'female';

  // Lọc theo ngôn ngữ (en-US, en-GB, en-AU, etc.)
  let langPool = voices.filter(v => {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    return l.startsWith(targetLang) || l.startsWith(targetLang.split('-')[0]);
  });
  if (langPool.length === 0) {
    langPool = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
  }
  if (langPool.length === 0) langPool = voices;

  const maleKeywords = ['male', 'david', 'guy', 'george', 'james', 'daniel', 'richard', 'alex', 'fred', 'rishi', 'mark', 'tom', 'oliver'];
  const femaleKeywords = ['female', 'zira', 'samantha', 'jenny', 'victoria', 'karen', 'susan', 'catherine', 'hazel', 'moira', 'tessa', 'ava', 'emma'];

  const matched = langPool.filter(v => {
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    if (targetGender === 'male') {
      return maleKeywords.some(k => name.includes(k) || uri.includes(k));
    } else {
      return femaleKeywords.some(k => name.includes(k) || uri.includes(k));
    }
  });

  if (matched.length > 0) return matched[0];
  return langPool[0] || voices[0] || null;
}

// ─── Script Parser ─────────────────────────────────────────────
export function parseDialogueScript(rawText) {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const parsed = [];
  let lastSpeaker = null;

  lines.forEach((line, index) => {
    // Nhận diện cú pháp TOEIC: "W-Am:", "M-Au:", "Woman:", "Man:", "Speaker 1:", "M:", "W:"
    const match = line.match(/^([A-Za-z0-9\s\-_]{1,20})\s*:\s*(.+)$/s);
    if (match) {
      const speakerTag = match[1].trim();
      const content = match[2].trim();
      const tagLower = speakerTag.toLowerCase();

      let gender = 'neutral';
      if (tagLower.startsWith('w') || tagLower.includes('woman') || tagLower.includes('female')) {
        gender = 'female';
      } else if (tagLower.startsWith('m') || tagLower.includes('man') || tagLower.includes('male')) {
        gender = 'male';
      } else {
        gender = index % 2 === 0 ? 'female' : 'male';
      }

      let lang = 'en-US';
      let accentLabel = 'Mỹ';
      if (tagLower.includes('-au') || tagLower.includes('au')) {
        lang = 'en-AU';
        accentLabel = 'Úc';
      } else if (tagLower.includes('-br') || tagLower.includes('br') || tagLower.includes('uk')) {
        lang = 'en-GB';
        accentLabel = 'Anh';
      } else if (tagLower.includes('-ca') || tagLower.includes('ca')) {
        lang = 'en-CA';
        accentLabel = 'Canada';
      }

      lastSpeaker = { tag: speakerTag, gender, lang, accentLabel };
      parsed.push({
        id: index,
        speaker: speakerTag,
        gender,
        lang,
        accentLabel,
        text: content,
        raw: line,
      });
    } else {
      const isHeader = /^(questions?\s+\d+|part\s+\d+|refer\s+to)/i.test(line);
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

  // Lấy danh sách phrase cần highlight, sort theo độ dài giảm dần
  const phrases = chunks
    .map(c => ({
      phrase: (c.phrase || '').trim(),
      meaningVi: c.meaningVi,
    }))
    .filter(c => c.phrase.length > 2)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  if (phrases.length === 0) return <span>{text}</span>;

  // Xây dựng regex an toàn
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
                color: '#818cf8',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 700,
                borderBottom: '2px solid var(--accent-400)',
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

// ─── Main TranscriptListeningModal ─────────────────────────────
export function TranscriptListeningModal({
  transcript,
  chunks = [],
  onClose,
}) {
  const scriptText = transcript?.text || '';
  const lines = useMemo(() => parseDialogueScript(scriptText), [scriptText]);

  // Lấy danh sách chunk thuộc transcript này nếu chưa truyền vào
  const effectiveChunks = useMemo(() => {
    if (chunks && chunks.length > 0) return chunks;
    if (transcript?.id) {
      return getChunks(transcript.id);
    }
    return [];
  }, [chunks, transcript]);

  // Audio & Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoopingLine, setIsLoopingLine] = useState(false);
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [revealedLines, setRevealedLines] = useState({});

  // Voices list from SpeechSynthesis
  const [systemVoices, setSystemVoices] = useState([]);
  const lineRefs = useRef({});
  const isPlayingRef = useRef(false);
  const currentLineIndexRef = useRef(0);
  const isLoopingLineRef = useRef(false);
  const playbackRateRef = useRef(1.0);
  const speakLineRef = useRef(null);

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
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      // Tự động mở che câu nếu đang ở Blind mode
      setRevealedLines(prev => ({ ...prev, [lineIndex]: true }));

      if (!isPlayingRef.current) return;

      if (isLoopingLineRef.current) {
        // Lặp lại câu này sau 400ms nghỉ
        setTimeout(() => {
          if (isPlayingRef.current) speakLineRef.current?.(lineIndex);
        }, 400);
      } else if (lineIndex + 1 < lines.length) {
        // Chuyển sang câu tiếp theo sau 500ms nghỉ tự nhiên
        setCurrentLineIndex(lineIndex + 1);
        setTimeout(() => {
          if (isPlayingRef.current) speakLineRef.current?.(lineIndex + 1);
        }, 500);
      } else {
        // Đã hết bài thoại
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [lines, systemVoices]);

  useEffect(() => {
    speakLineRef.current = speakLine;
  }, [speakLine]);

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakLine(currentLineIndex);
    }
  };

  // Click on a specific line to play it directly
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

  const handleReplayCurrentLine = () => {
    setIsPlaying(true);
    speakLine(currentLineIndex);
  };

  // Toggle reveal for a line in blind mode
  const toggleRevealLine = (idx) => {
    setRevealedLines(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      style={{ zIndex: 1050 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 680,
          width: '94%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(49, 46, 129, 0.85))',
          borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 0 12px rgba(99,102,241,0.5)',
            }}>
              <Headphones size={20} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.12)', color: '#c7d2fe', textTransform: 'uppercase'
                }}>
                  {transcript?.part || 'TOEIC Listening'}
                </span>
                {effectiveChunks.length > 0 && (
                  <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
                    ✨ {effectiveChunks.length} chunks đã học
                  </span>
                )}
              </div>
              <h3 style={{
                margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {transcript?.themeVi || transcript?.theme || 'Luyện nghe đoạn hội thoại Script'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
            title="Đóng trình nghe"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Control Bar ── */}
        <div style={{
          padding: '12px 18px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          {/* Main Controls: Prev, Play/Pause, Next, Replay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrevLine}
              disabled={currentLineIndex === 0}
              className="btn btn-ghost btn-icon"
              title="Câu trước"
              style={{ opacity: currentLineIndex === 0 ? 0.4 : 1 }}
            >
              <SkipBack size={17} />
            </button>

            <button
              onClick={handleTogglePlay}
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                fontWeight: 700,
                boxShadow: isPlaying ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
              }}
            >
              {isPlaying ? (
                <><Pause size={17} fill="#fff" /> Đang đọc ({currentLineIndex + 1}/{lines.length})</>
              ) : (
                <><Play size={17} fill="#fff" /> Nghe toàn bộ</>
              )}
            </button>

            <button
              onClick={handleNextLine}
              disabled={currentLineIndex >= lines.length - 1}
              className="btn btn-ghost btn-icon"
              title="Câu tiếp theo"
              style={{ opacity: currentLineIndex >= lines.length - 1 ? 0.4 : 1 }}
            >
              <SkipForward size={17} />
            </button>

            <button
              onClick={handleReplayCurrentLine}
              className="btn btn-ghost btn-icon"
              title="Nghe lại câu hiện tại"
            >
              <RotateCcw size={16} />
            </button>

            {/* Loop Sentence Toggle */}
            <button
              onClick={() => setIsLoopingLine(l => !l)}
              className="btn btn-ghost btn-icon"
              title={isLoopingLine ? 'Tắt lặp lại câu' : 'Bật lặp lại câu này (Shadowing)'}
              style={{
                color: isLoopingLine ? '#818cf8' : 'var(--text-muted)',
                background: isLoopingLine ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              }}
            >
              <Repeat size={16} />
            </button>
          </div>

          {/* Right Tools: Speed & Blind Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Speed selection */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 2, border: '1px solid var(--border-subtle)' }}>
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
                    padding: '3px 7px',
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

            {/* Blind Mode Toggle */}
            <button
              onClick={() => setIsBlindMode(b => !b)}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderColor: isBlindMode ? '#a855f7' : undefined,
                color: isBlindMode ? '#c084fc' : undefined,
              }}
              title="Che lời thoại để luyện nghe phản xạ (Blind Listening)"
            >
              {isBlindMode ? <><EyeOff size={13} /> Nghe chay</> : <><Eye size={13} /> Hiện chữ</>}
            </button>
          </div>
        </div>

        {/* ── Dialogues Scroll Area ── */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--bg-base)',
        }}>
          {lines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Không có nội dung transcript để phát âm thanh.
            </div>
          ) : (
            lines.map((item, idx) => {
              const isActive = currentLineIndex === idx;
              const isRevealed = Boolean(revealedLines[idx]) || !isBlindMode;
              const isFemale = item.gender === 'female';

              return (
                <div
                  key={idx}
                  ref={el => lineRefs.current[idx] = el}
                  onClick={() => handleSelectLine(idx)}
                  className="animate-fade-in"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(79, 70, 229, 0.1))'
                      : 'var(--bg-surface)',
                    border: isActive
                      ? '1.5px solid var(--accent-400)'
                      : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 16px rgba(99, 102, 241, 0.15)' : 'none',
                  }}
                >
                  {/* Speaker Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                        background: isFemale ? 'rgba(236, 72, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: isFemale ? '#f472b6' : '#38bdf8',
                        border: `1px solid ${isFemale ? 'rgba(236, 72, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        {isFemale ? '👩' : '👨'} {item.speaker}
                        {item.accentLabel && (
                          <span style={{ opacity: 0.75, fontSize: 10 }}>({item.accentLabel})</span>
                        )}
                      </span>

                      {isActive && isPlaying && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--accent-300)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Volume2 size={13} className="animate-pulse" /> Đang phát...
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectLine(idx);
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ color: isActive ? 'var(--accent-300)' : 'var(--text-muted)', padding: '2px 8px' }}
                      title="Nghe riêng câu này"
                    >
                      <Volume2 size={13} /> Nghe câu này
                    </button>
                  </div>

                  {/* Sentence Content */}
                  <div style={{
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: isActive ? '#fff' : 'var(--text-primary)',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {isRevealed ? (
                      <HighlightedText text={item.text} chunks={effectiveChunks} />
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRevealLine(idx);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 12px',
                          color: 'var(--text-muted)',
                          fontSize: 13,
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          userSelect: 'none',
                        }}
                      >
                        <EyeOff size={13} /> 🙈 Đang che nội dung (Bấm để xem đáp án)
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          <div>
            💡 Bấm vào câu bất kỳ để phát riêng câu đó. Các cụm màu tím là chunk trọng tâm.
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
