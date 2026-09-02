import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, Send,
  CheckCircle, RotateCcw, ArrowLeft,
  Award, Play, AlertCircle,
} from 'lucide-react';
import { getPracticeDraft } from '../../store/storage';

// ─── ScoreRing Component ───────────────────────────────────────
function ScoreRing({ score }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#fbbf24' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontWeight: 800, fontSize: 24, color, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>ĐIỂM</span>
      </div>
    </div>
  );
}

// ─── AudioWaveVisualizer Component ─────────────────────────────
function AudioWaveVisualizer({ volume = 0, isAiSpeaking = false }) {
  const bars = [16, 28, 44, 60, 38, 22, 52, 68, 32, 18];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 50 }}>
      {bars.map((baseHeight, i) => {
        const factor = isAiSpeaking
          ? (0.5 + 0.5 * Math.sin(i * 1.2 + Date.now() / 200))
          : Math.min(1.6, Math.max(0.18, volume / 35));
        const barHeight = Math.max(6, Math.min(48, Math.round(baseHeight * factor)));
        const barColor = isAiSpeaking
          ? 'linear-gradient(180deg, #38bdf8, #818cf8)'
          : volume > 10
          ? 'linear-gradient(180deg, #4ade80, #22c55e)'
          : 'rgba(255, 255, 255, 0.15)';

        return (
          <div
            key={i}
            style={{
              width: 4.5,
              height: `${barHeight}px`,
              borderRadius: 3,
              background: barColor,
              transition: 'height 0.1s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Word-by-Word Matching Algorithm ────────────────────────────
function analyzeSpokenSentence(targetText, spokenText, chunkPhrase = '') {
  if (!targetText) return { words: [], accuracy: 0, isPassed: false, spokenText: '' };

  const cleanTarget = targetText.trim();
  const cleanSpoken = (spokenText || '').trim();

  const targetWords = cleanTarget.split(/\s+/);
  const spokenWordsNorm = cleanSpoken
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase())
    .filter(Boolean);

  const chunkWordsNorm = (chunkPhrase || '')
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, ''))
    .filter(Boolean);

  const pool = [...spokenWordsNorm];
  let correctCount = 0;

  const words = targetWords.map((originalWord) => {
    const norm = originalWord.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
    const isChunkPart = chunkWordsNorm.includes(norm);

    const matchIdx = pool.indexOf(norm);
    if (matchIdx !== -1) {
      correctCount++;
      pool.splice(matchIdx, 1);
      return {
        word: originalWord,
        status: isChunkPart ? 'chunk' : 'correct',
      };
    } else {
      return {
        word: originalWord,
        status: 'incorrect',
        note: 'Chưa phát âm hoặc nói chưa rõ',
      };
    }
  });

  const accuracy = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;
  // Đạt nếu đúng >= 65% số từ và không bỏ trống
  const isPassed = accuracy >= 65 && cleanSpoken.length > 0;

  return {
    targetText,
    spokenText: cleanSpoken,
    words,
    accuracy,
    isPassed,
  };
}

// ─── Full-Screen Speaking Practice Component ───────────────────
export function SpeakingSession({
  chunk,
  exercises = [],
  onComplete,
  onClose,
  onToast,
}) {
  // Steps: 0 = Sentence 1 (Basic), 1 = Sentence 2 (Intermediate), 2 = Summary
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Result history of each sentence
  const [stepResults, setStepResults] = useState([null, null]);
  const [currentAttempt, setCurrentAttempt] = useState(null); // { spokenText, words, accuracy, isPassed }
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const recognitionRef = useRef(null);

  // Lấy câu học ổn định
  const sentenceList = useMemo(() => {
    const draftData = getPracticeDraft(chunk.id) || {};
    const inputs = draftData.inputs || {};
    const basicEx = exercises.find(e => e.level === 1) || exercises[0] || {};
    const interEx = exercises.find(e => e.level === 2) || exercises[1] || {};

    return [
      {
        id: 's1',
        title: 'Câu 1: Cơ bản (Khởi động)',
        level: 'Cơ bản',
        vietnameseSentence: basicEx.vietnameseSentence || `Tôi muốn ${chunk.meaningVi}.`,
        sampleTranslation: inputs[0] || basicEx.sampleTranslation || `I want to ${chunk.phrase}.`,
      },
      {
        id: 's2',
        title: 'Câu 2: Tình huống thực tế',
        level: 'Trung cấp',
        vietnameseSentence: interEx.vietnameseSentence || `Công ty chúng tôi đã quyết định ${chunk.meaningVi} vào năm ngoái.`,
        sampleTranslation: inputs[1] || interEx.sampleTranslation || `Our company decided to ${chunk.phrase} last year.`,
      },
    ];
  }, [chunk, exercises]);

  const currentSentence = sentenceList[currentStepIndex] || sentenceList[0];

  // Phát âm thanh mẫu của AI qua Web Speech Synthesis
  const playAiVoice = useCallback((text, onEndCallback) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Đánh giá câu nói của user
  const handleEvaluateSpokenText = useCallback((spokenText) => {
    if (!spokenText || !spokenText.trim()) return;
    setIsEvaluating(true);

    const targetText = currentSentence.sampleTranslation;
    const result = analyzeSpokenSentence(targetText, spokenText, chunk.phrase);
    setCurrentAttempt(result);
    setIsEvaluating(false);

    if (result.isPassed) {
      // Lưu kết quả của step
      setStepResults(prev => {
        const next = [...prev];
        next[currentStepIndex] = result;
        return next;
      });

      // AI khen ngợi
      playAiVoice('Excellent pronunciation! Moving to the next sentence.', () => {
        // Tự động chuyển step sau 1.2s
        setTimeout(() => {
          if (currentStepIndex === 0) {
            setCurrentStepIndex(1);
            setCurrentAttempt(null);
          } else {
            setCurrentStepIndex(2); // Summary
          }
        }, 600);
      });
    } else {
      // AI nhắc nhở đọc lại
      playAiVoice("Almost there! Let's try reading this sentence one more time.");
    }
  }, [currentSentence, chunk.phrase, currentStepIndex, playAiVoice]);

  // Khởi tạo Microphone & Speech Recognition
  const startListening = useCallback(async () => {
    if (isAiSpeaking) return;

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }

      // Audio Context cho Visualizer
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVol = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setVolume(Math.min(100, Math.round(avg * 2.5)));
          requestAnimationFrame(checkVol);
        };
        checkVol();
      }

      // Speech Recognition
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass && !recognitionRef.current) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            const spoken = lastResult[0].transcript.trim();
            if (spoken) {
              handleEvaluateSpokenText(spoken);
            }
          }
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition warning:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListening(true);
    } catch (err) {
      console.warn('Microphone access warning:', err);
      if (onToast) onToast('warning', 'Không thể mở micro tự động. Bạn có thể bấm gửi câu để kiểm tra.');
    }
  }, [isAiSpeaking, handleEvaluateSpokenText, onToast]);

  // Dừng thu âm
  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
  }, []);

  // Tự động mở mic và chào câu 1 khi vào màn hình
  useEffect(() => {
    const greeting = `Hello! Let's practice speaking. Please read sentence number ${currentStepIndex + 1} out loud.`;
    playAiVoice(greeting, () => {
      startListening();
    });

    return () => {
      stopListening();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStepIndex, playAiVoice, startListening, stopListening]);

  // Tính điểm tổng kết
  const totalScore = useMemo(() => {
    const s1 = stepResults[0]?.accuracy ?? (currentAttempt?.accuracy || 80);
    const s2 = stepResults[1]?.accuracy ?? 85;
    return Math.round((s1 + s2) / 2);
  }, [stepResults, currentAttempt]);

  return (
    <div
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
      {/* ── 1. Top Fullscreen App Header ────────────────────────── */}
      <header
        style={{
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="btn btn-ghost"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}
            title="Quay lại"
          >
            <ArrowLeft size={18} />
            <span style={{ fontWeight: 600 }}>Quay lại</span>
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                Luyện nói AI (Speaking Mode)
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                }}
              >
                Chunking AI
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              Chunk mục tiêu: <strong style={{ color: '#fbbf24' }}>{chunk.phrase}</strong> ({chunk.meaningVi})
            </div>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: currentStepIndex === 0 ? 'rgba(99, 102, 241, 0.25)' : stepResults[0]?.isPassed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 0 ? '#818cf8' : stepResults[0]?.isPassed ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${currentStepIndex === 0 ? '#6366f1' : 'transparent'}`,
            }}
          >
            1. Cơ bản
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>➔</span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: currentStepIndex === 1 ? 'rgba(99, 102, 241, 0.25)' : stepResults[1]?.isPassed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 1 ? '#818cf8' : stepResults[1]?.isPassed ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${currentStepIndex === 1 ? '#6366f1' : 'transparent'}`,
            }}
          >
            2. Tình huống
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>➔</span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: currentStepIndex === 2 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 2 ? '#fbbf24' : 'var(--text-muted)',
            }}
          >
            3. Kết quả
          </span>
        </div>
      </header>

      {/* ── 2. Main Fullscreen Content Container ───────────────── */}
      <main style={{ flex: 1, maxWidth: '860px', width: '100%', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── PRACTICE MODE (Step 0 & Step 1) ─────────────────── */}
        {currentStepIndex < 2 && (
          <>
            {/* Card 1: Câu Cần Luyện Nói (Full Thông Tin) */}
            <div
              className="card animate-fade-in"
              style={{
                padding: '22px 24px',
                background: 'rgba(30, 41, 59, 0.7)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.15)',
                    padding: '3px 10px',
                    borderRadius: 6,
                  }}
                >
                  {currentSentence.title}
                </span>

                <button
                  type="button"
                  onClick={() => playAiVoice(currentSentence.sampleTranslation)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#38bdf8' }}
                  title="Nghe AI đọc mẫu câu này"
                >
                  <Play size={13} /> Nghe AI đọc mẫu
                </button>
              </div>

              {/* Nghĩa Tiếng Việt */}
              <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                "{currentSentence.vietnameseSentence}"
              </div>

              {/* Câu Tiếng Anh Chuẩn (Đầy Đủ, Không Bị Cắt Chữ) */}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.5,
                  padding: '16px 18px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                "{currentSentence.sampleTranslation}"
              </div>
            </div>

            {/* Card 2: Interactive Microphone Center */}
            <div
              className="card"
              style={{
                padding: '26px 20px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 'var(--radius-lg)',
                border: isAiSpeaking ? '1px solid #38bdf8' : isListening ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <AudioWaveVisualizer volume={volume} isAiSpeaking={isAiSpeaking} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                {/* Nút Mute / Unmute */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (!isMuted) stopListening();
                    else startListening();
                  }}
                  className="btn btn-secondary"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMuted ? 'var(--error-text)' : 'var(--text-secondary)',
                  }}
                  title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Nút Microphone Chính To Rõ */}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    border: 'none',
                    background: isAiSpeaking
                      ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                      : isListening
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #475569, #334155)',
                    boxShadow: isAiSpeaking
                      ? '0 0 30px rgba(56, 189, 248, 0.6)'
                      : isListening
                      ? '0 0 35px rgba(34, 197, 94, 0.6)'
                      : '0 4px 16px rgba(0,0,0,0.3)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                  }}
                >
                  {isAiSpeaking ? (
                    <Volume2 size={34} className="animate-pulse" />
                  ) : (
                    <Mic size={34} style={{ transform: volume > 10 ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s ease' }} />
                  )}
                </button>

                {/* Nút Nghe lại câu mẫu */}
                <button
                  type="button"
                  onClick={() => playAiVoice(currentSentence.sampleTranslation)}
                  className="btn btn-secondary"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                  title="AI đọc lại mẫu"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              {/* Status Hint */}
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {isAiSpeaking ? (
                  <span style={{ color: '#38bdf8' }}>🔊 AI đang phát âm mẫu...</span>
                ) : isListening ? (
                  <span style={{ color: '#4ade80' }}>🎙️ Micro đang mở — Hãy đọc to câu tiếng Anh trên vào mic!</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Micro đang tạm tắt. Bấm nút Mic để nói.</span>
                )}
              </div>
            </div>

            {/* Card 3: Phân Tích & Tô Màu Câu User Vừa Nói (Đúng = Xanh Lá, Sai = Đỏ) */}
            {currentAttempt && (
              <div
                className="card animate-fade-in"
                style={{
                  padding: '20px',
                  background: currentAttempt.isPassed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: currentAttempt.isPassed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {currentAttempt.isPassed ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontWeight: 800, fontSize: 15 }}>
                        <CheckCircle size={18} /> Đạt độ chính xác {currentAttempt.accuracy}%!
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 800, fontSize: 15 }}>
                        <AlertCircle size={18} /> Chưa đạt ({currentAttempt.accuracy}%). Hãy đọc lại câu này nhé!
                      </span>
                    )}
                  </div>

                  {/* Chú thích màu sắc */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /> Đúng (Xanh lá)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Sai/Thiếu (Đỏ)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} /> Chunk
                    </span>
                  </div>
                </div>

                {/* Hiển thị câu đối chiếu với từng từ được tô màu */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0,0,0,0.3)',
                    lineHeight: 1.8,
                    fontSize: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                    KẾT QUẢ ĐỐI CHIẾU TỪNG TỪ:
                  </div>
                  {currentAttempt.words.map((item, idx) => {
                    const isCorrect = item.status === 'correct';
                    const isChunk = item.status === 'chunk';

                    return (
                      <span
                        key={idx}
                        title={item.note}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          margin: '0 3px 4px 0',
                          borderRadius: 6,
                          fontWeight: 700,
                          color: isChunk ? '#fbbf24' : isCorrect ? '#22c55e' : '#ef4444',
                          background: isChunk
                            ? 'rgba(251, 191, 36, 0.15)'
                            : isCorrect
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.18)',
                          border: isChunk
                            ? '1px solid rgba(251, 191, 36, 0.4)'
                            : isCorrect
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px dashed rgba(239, 68, 68, 0.5)',
                        }}
                      >
                        {item.word}
                      </span>
                    );
                  })}
                </div>

                {/* Câu user đã nói thực tế */}
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Micro thu được: <strong style={{ color: '#fff' }}>"{currentAttempt.spokenText}"</strong>
                </div>

                {/* Nút hành động */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  {!currentAttempt.isPassed ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setCurrentAttempt(null);
                        startListening();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}
                    >
                      <RotateCcw size={14} /> Nói lại câu này
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (currentStepIndex === 0) {
                          setCurrentStepIndex(1);
                          setCurrentAttempt(null);
                        } else {
                          setCurrentStepIndex(2);
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '10px 20px' }}
                    >
                      <span>Tiếp tục câu tiếp theo ➔</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick action fallback */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleEvaluateSpokenText(currentSentence.sampleTranslation)}
                style={{ color: 'var(--text-muted)', fontSize: 11.5 }}
                title="Gửi câu đọc mẫu để chấm ngay"
              >
                <Send size={11} /> Gửi câu đọc mẫu
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setCurrentStepIndex(2)}
                style={{ color: 'var(--text-muted)', fontSize: 11.5 }}
              >
                Bỏ qua & Xem tổng kết
              </button>
            </div>
          </>
        )}

        {/* ── 3. SUMMARY RESULT VIEW (Step 2) ────────────────── */}
        {currentStepIndex === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Score Card */}
            <div
              className="card"
              style={{
                padding: '24px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              }}
            >
              <ScoreRing score={totalScore} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Award size={20} color="#fbbf24" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
                    Hoàn thành buổi luyện nói!
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Bạn đã luyện tập thành công cụm từ <strong style={{ color: '#fbbf24' }}>"{chunk.phrase}"</strong> ({chunk.meaningVi}) qua cả 2 tình huống thực tế.
                </p>
              </div>
            </div>

            {/* Chi tiết từng câu với màu sắc Xanh / Đỏ */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Chi tiết đối chiếu phát âm 2 câu:
              </div>

              {sentenceList.map((sentence, sIdx) => {
                const result = stepResults[sIdx] || analyzeSpokenSentence(sentence.sampleTranslation, sentence.sampleTranslation, chunk.phrase);

                return (
                  <div
                    key={sIdx}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
                        {sentence.title}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                        Độ chính xác: {result.accuracy}%
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{sentence.vietnameseSentence}"
                    </div>

                    {/* Word tags */}
                    <div style={{ lineHeight: 1.8, fontSize: 15, marginTop: 4 }}>
                      {result.words.map((item, wIdx) => {
                        const isCorrect = item.status === 'correct';
                        const isChunk = item.status === 'chunk';

                        return (
                          <span
                            key={wIdx}
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              margin: '0 3px 3px 0',
                              borderRadius: 5,
                              fontWeight: 700,
                              color: isChunk ? '#fbbf24' : isCorrect ? '#22c55e' : '#ef4444',
                              background: isChunk
                                ? 'rgba(251, 191, 36, 0.15)'
                                : isCorrect
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.18)',
                              border: isChunk
                                ? '1px solid rgba(251, 191, 36, 0.4)'
                                : isCorrect
                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                : '1px dashed rgba(239, 68, 68, 0.5)',
                            }}
                          >
                            {item.word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStepResults([null, null]);
                  setCurrentAttempt(null);
                  setCurrentStepIndex(0);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '12px 16px',
                }}
              >
                <RotateCcw size={16} /> Luyện nói lại
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  stopListening();
                  if (onComplete) onComplete({ score: totalScore });
                  onClose();
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                }}
              >
                <CheckCircle size={16} /> Hoàn thành
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
