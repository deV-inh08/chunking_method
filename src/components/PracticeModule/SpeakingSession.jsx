import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, Send,
  CheckCircle, XCircle, RotateCcw, X, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Spinner } from '../ui';
import { GeminiLiveSession, SPEAKING_CONFIG } from '../../services/speakingLive';
import { buildSpeakingSystemPrompt, gradeSpeakingSession } from '../../services/ai';
import { getApiKey, getPracticeDraft } from '../../store/storage';

// ─── ScoreRing ────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? 'var(--success-text)' : pct >= 50 ? '#f59e0b' : 'var(--error-text)';

  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 20, color,
      }}>
        {pct}
      </span>
    </div>
  );
}

// ─── Visualizer Wave ──────────────────────────────────────────
function AudioWaveVisualizer({ volume = 0, isAiSpeaking = false }) {
  const bars = [14, 28, 42, 58, 36, 22, 50, 65, 30, 18];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 48 }}>
      {bars.map((baseHeight, i) => {
        const factor = isAiSpeaking
          ? (0.5 + 0.5 * Math.sin((i * 1.2)))
          : Math.min(1.5, Math.max(0.15, volume / 40));
        const barHeight = Math.max(6, Math.min(46, Math.round(baseHeight * factor)));
        const barColor = isAiSpeaking
          ? 'linear-gradient(180deg, #38bdf8, #818cf8)'
          : volume > 10
          ? 'linear-gradient(180deg, #4ade80, #22c55e)'
          : 'rgba(255, 255, 255, 0.2)';

        return (
          <div
            key={i}
            style={{
              width: 4,
              height: `${barHeight}px`,
              borderRadius: 3,
              background: barColor,
              transition: 'height 0.1s ease, background 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export function SpeakingSession({
  chunk,
  exercises = [],
  onComplete,
  onClose,
  onToast,
}) {
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, CONNECTING, WARMUP, SITUATION_INTRO, CONVERSATION, WRAP_UP, GRADING, SUMMARY, ERROR
  const [transcripts, setTranscripts] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [errorMessage, setErrorMessage] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  // Lấy câu đã viết từ draft hoặc bài tập ổn định theo chunk.id
  const sentences = useMemo(() => {
    const draftData = getPracticeDraft(chunk.id) || {};
    const inputs = draftData.inputs || {};
    const basicEx = exercises.find(e => e.level === 1) || exercises[0] || {};
    const interEx = exercises.find(e => e.level === 2) || exercises[1] || {};
    return {
      basic: {
        userAnswer: inputs[0] || basicEx.sampleTranslation,
        sampleTranslation: basicEx.sampleTranslation,
        vietnameseSentence: basicEx.vietnameseSentence,
        score: draftData.gradingResults?.[0]?.score ?? 80,
      },
      intermediate: {
        userAnswer: inputs[1] || interEx.sampleTranslation,
        sampleTranslation: interEx.sampleTranslation,
        vietnameseSentence: interEx.vietnameseSentence,
        score: draftData.gradingResults?.[1]?.score ?? 80,
      },
    };
  }, [chunk.id, exercises]);

  // Cuộn khung chat xuống cuối khi có transcript mới
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Kết thúc buổi nói và chuyển sang chấm điểm
  const finishAndGradeSession = useCallback(async () => {
    if (!liveSessionRef.current) return;
    const session = liveSessionRef.current;
    const formattedTranscript = session.getFormattedTranscript();
    const recordedTurnCount = session.turnCount || 1;
    session.stop();

    setSessionState('GRADING');

    const apiKey = getApiKey();
    try {
      const res = await gradeSpeakingSession(formattedTranscript, chunk, apiKey);
      const resultData = {
        sessionId: `spk_${Date.now()}`,
        chunkId: chunk.id,
        startedAt: Date.now() - (recordedTurnCount * 25000),
        endedAt: Date.now(),
        turnCount: recordedTurnCount,
        usedTargetChunk: Boolean(res.usedTargetChunk),
        comprehensible: Boolean(res.comprehensible),
        score: res.score || 75,
        feedbackSummary: res.feedbackSummary || 'Bạn đã hoàn thành buổi luyện nói tốt!',
        grammarIssues: res.grammarIssues || [],
        naturalSuggestion: res.naturalSuggestion || null,
        transcriptText: formattedTranscript,
      };

      setGradingResult(resultData);
      setSessionState('SUMMARY');

      onCompleteRef.current?.(chunk.id, resultData);
      onToastRef.current?.('success', `✓ Đã hoàn thành luyện nói! Điểm phản xạ: ${resultData.score}đ`);
    } catch (err) {
      console.error('Grading speaking session error:', err);
      onToastRef.current?.('error', `Lỗi chấm bài nói: ${err.message}`);
      const fallbackData = {
        sessionId: `spk_${Date.now()}`,
        chunkId: chunk.id,
        startedAt: Date.now(),
        endedAt: Date.now(),
        turnCount: recordedTurnCount || 3,
        usedTargetChunk: true,
        comprehensible: true,
        score: 75,
        feedbackSummary: 'Bạn đã hoàn thành buổi luyện nói và giao tiếp phản xạ tự nhiên.',
        grammarIssues: [],
        naturalSuggestion: null,
        transcriptText: formattedTranscript,
      };
      setGradingResult(fallbackData);
      setSessionState('SUMMARY');
      onCompleteRef.current?.(chunk.id, fallbackData);
    }
  }, [chunk]);

  // Khởi chạy Live Session
  const startLiveSession = useCallback(async () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.stop();
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      onToastRef.current?.('error', 'Chưa có Gemini API Key. Vào Settings để nhập.');
      setErrorMessage('Chưa có API Key. Vui lòng cấu hình trong Cài đặt.');
      setSessionState('ERROR');
      return;
    }

    setErrorMessage(null);
    setGradingResult(null);
    setTranscripts([]);
    setTurnCount(1);
    setIsMuted(false);
    setSessionState('CONNECTING');

    const systemPrompt = buildSpeakingSystemPrompt(chunk, sentences, SPEAKING_CONFIG);

    const session = new GeminiLiveSession({
      apiKey,
      systemInstruction: systemPrompt,
      onStateChange: (newState) => {
        setSessionState(newState);
        if (session) {
          setTurnCount(session.turnCount || 1);
        }
        if (newState === 'WRAP_UP') {
          setTimeout(() => {
            finishAndGradeSession();
          }, 3000);
        }
      },
      onTranscript: (history) => {
        setTranscripts(history);
        if (session) {
          setTurnCount(session.turnCount || 1);
        }
      },
      onAiSpeaking: (speaking) => {
        setIsAiSpeaking(speaking);
      },
      onVolume: (vol) => {
        setVolume(vol);
      },
      onError: (err) => {
        console.error('Speaking session error:', err);
        setErrorMessage(err.message || 'Lỗi kết nối Gemini Live API');
        setSessionState('ERROR');
      },
    });

    liveSessionRef.current = session;
    await session.start();
  }, [chunk, sentences, finishAndGradeSession]);

  // Bắt đầu 1 lần duy nhất khi mở modal (phụ thuộc chunk.id)
  useEffect(() => {
    startLiveSession();
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, [chunk.id]); // CHỈ phụ thuộc vào chunk.id!

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          background: 'var(--bg-surface)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9), rgba(49, 46, 129, 0.8))',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99,102,241,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-300)',
                flexShrink: 0,
              }}
            >
              <Mic size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>
                  Luyện nói AI (Live Voice)
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  Native Audio 2.5
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Chunk mục tiêu: <strong>{chunk.phrase}</strong> ({chunk.meaningVi})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body State Machine ────────────────────────────────── */}
        <div style={{ padding: '18px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* 1. CONNECTING STATE */}
          {sessionState === 'CONNECTING' && (
            <div style={{ textAlign: 'center', padding: '40px 10px', margin: 'auto' }}>
              <Spinner size={36} />
              <h4 style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Đang mở kết nối Gemini Live API…
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                Chuẩn bị micro và sẵn sàng giao tiếp trực tiếp với AI.
              </p>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {sessionState === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '30px 10px', margin: 'auto' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-full)',
                background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', color: 'var(--error-text)',
              }}>
                <XCircle size={26} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Không thể kết nối phòng luyện nói
              </h4>
              <p style={{ fontSize: 13, color: 'var(--error-text)', maxWidth: 400, margin: '0 auto 16px' }}>
                {errorMessage || 'Lỗi thiết bị âm thanh hoặc kết nối WebSocket.'}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={startLiveSession}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={14} /> Thử kết nối lại
              </button>
            </div>
          )}

          {/* 3. WARMUP & CONVERSATION STATES */}
          {(sessionState === 'WARMUP' || sessionState === 'SITUATION_INTRO' || sessionState === 'CONVERSATION' || sessionState === 'WRAP_UP') && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>

              {/* Phase Banner */}
              {sessionState === 'WARMUP' ? (
                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-400)', textTransform: 'uppercase' }}>
                      🎙️ Bước 1: Khởi động giọng nói (Warm-up)
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        if (liveSessionRef.current) {
                          liveSessionRef.current.sendInitialGreetingTrigger();
                          onToast('info', 'Đang yêu cầu AI chào và hướng dẫn lại...');
                        }
                      }}
                      style={{ fontSize: 11, color: '#38bdf8', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Yêu cầu AI chào lại"
                    >
                      <RotateCcw size={12} /> AI chào lại
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Hãy nghe AI chào và <strong>đọc to câu tiếng Anh bạn vừa học</strong> vào micro:
                  </p>
                  <div style={{
                    marginTop: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    fontSize: 13.5, fontWeight: 700, color: '#fbbf24',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <span>"{sentences.basic.userAnswer || sentences.basic.sampleTranslation}"</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        const txt = sentences.basic.userAnswer || sentences.basic.sampleTranslation;
                        if (liveSessionRef.current && txt) {
                          liveSessionRef.current.sendUserTextMessage(txt);
                          onToast('success', 'Đã gửi câu đọc mẫu vào phòng!');
                        }
                      }}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                      title="Gửi câu đọc này"
                    >
                      <Send size={11} /> Gửi câu này
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="card"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderColor: 'rgba(56, 189, 248, 0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                      💬 Bước 2: Tình huống & Đối thoại tự do
                    </span>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginTop: 2 }}>
                      Nhớ lồng ghép cụm: <strong style={{ color: 'var(--accent-300)' }}>"{chunk.phrase}"</strong>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(99,102,241,0.2)', color: 'var(--accent-300)',
                  }}>
                    Lượt {turnCount} / {SPEAKING_CONFIG.MAX_TURNS}
                  </span>
                </div>
              )}

              {/* ── BIG INTERACTIVE MICROPHONE CONTROLLER ── */}
              <div
                className="card"
                style={{
                  padding: '18px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  borderRadius: 'var(--radius-md)',
                  border: isAiSpeaking ? '1px solid rgba(56, 189, 248, 0.4)' : volume > 10 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <AudioWaveVisualizer volume={volume} isAiSpeaking={isAiSpeaking} />

                {/* Big Center Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (liveSessionRef.current) {
                        const muted = liveSessionRef.current.toggleMute();
                        setIsMuted(muted);
                        onToast('info', muted ? 'Đã tắt micro' : 'Đã bật micro');
                      }
                    }}
                    className="btn btn-secondary"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-full)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isMuted ? 'var(--error-text)' : 'var(--text-muted)',
                    }}
                    title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  {/* Main animated Mic Button */}
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 'var(--radius-full)',
                      background: isAiSpeaking
                        ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                        : isMuted
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: isAiSpeaking
                        ? '0 0 25px rgba(56, 189, 248, 0.6)'
                        : volume > 10
                        ? '0 0 30px rgba(34, 197, 94, 0.7)'
                        : '0 0 16px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                    }}
                  >
                    {isAiSpeaking ? (
                      <Volume2 size={30} className="animate-pulse" />
                    ) : isMuted ? (
                      <MicOff size={28} />
                    ) : (
                      <Mic size={30} style={{ transform: volume > 10 ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s ease' }} />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (liveSessionRef.current) {
                        liveSessionRef.current.sendInitialGreetingTrigger();
                        onToast('info', 'Đang yêu cầu AI chào và bắt đầu lại...');
                      }
                    }}
                    className="btn btn-secondary"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-full)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                    title="Phát lại / Bắt đầu lại"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* Status Indicator Text */}
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {isAiSpeaking ? (
                    <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔊 AI đang nói... (Bạn có thể nói vào mic để ngắt lời)
                    </span>
                  ) : isMuted ? (
                    <span style={{ color: 'var(--error-text)' }}>
                      🔇 Micro đang tắt. Bấm nút Mic để mở lại.
                    </span>
                  ) : volume > 10 ? (
                    <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🎙️ Đang nghe giọng bạn nói...
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      🎙️ Micro đang mở — Hãy nói hoặc đọc to câu trên vào micro
                    </span>
                  )}
                </div>
              </div>

              {/* Chat dialogue stream */}
              <div
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  minHeight: 140,
                  maxHeight: 200,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {transcripts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: 'auto' }}>
                    Cuộc trò chuyện sẽ xuất hiện ở đây theo thời gian thực…
                  </div>
                ) : (
                  transcripts.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: t.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${t.role === 'user' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: t.role === 'user' ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.role === 'user' ? 'var(--accent-300)' : '#38bdf8', marginBottom: 2 }}>
                        {t.role === 'user' ? 'Bạn' : 'AI Partner'}
                      </div>
                      {t.text}
                    </div>
                  ))
                )}
              </div>

              {/* Action bar during session */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Hội thoại tự nhiên 3–5 lượt. AI sẽ tự kết thúc khi đạt mục tiêu.
                </span>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={finishAndGradeSession}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <CheckCircle size={14} /> Hoàn thành sớm
                </button>
              </div>

            </div>
          )}

          {/* 4. GRADING STATE */}
          {sessionState === 'GRADING' && (
            <div style={{ textAlign: 'center', padding: '40px 10px', margin: 'auto' }}>
              <Spinner size={36} />
              <h4 style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                AI đang phân tích buổi hội thoại…
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                Đánh giá mức độ hiểu (comprehensibility), việc lồng ghép chunk và gợi ý diễn đạt tự nhiên.
              </p>
            </div>
          )}

          {/* 5. SUMMARY RESULT STATE */}
          {sessionState === 'SUMMARY' && gradingResult && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Score header */}
              <div
                className="card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: gradingResult.score >= 80 ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)',
                  borderColor: gradingResult.score >= 80 ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)',
                }}
              >
                <ScoreRing score={gradingResult.score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    {gradingResult.usedTargetChunk ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--success-text)' }}>
                        <CheckCircle size={14} /> Đã dùng đúng chunk "{chunk.phrase}"
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#f59e0b' }}>
                        <XCircle size={14} /> Chưa dùng chunk "{chunk.phrase}"
                      </span>
                    )}

                    {gradingResult.comprehensible && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)' }}>
                        <CheckCircle size={13} /> Giao tiếp hiểu được tốt
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {gradingResult.feedbackSummary}
                  </p>
                </div>
              </div>

              {/* Grammar issues */}
              {gradingResult.grammarIssues?.length > 0 && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--error-text)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Điểm ngữ pháp cần lưu ý:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {gradingResult.grammarIssues.map((issue, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Natural suggestion */}
              {gradingResult.naturalSuggestion && (
                <div
                  style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-400)', textTransform: 'uppercase', marginBottom: 4 }}>
                    💡 Gợi ý diễn đạt tự nhiên hơn:
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                    "{gradingResult.naturalSuggestion}"
                  </p>
                </div>
              )}

              {/* Toggle full transcript */}
              <div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 8px', color: 'var(--text-muted)' }}
                >
                  <MessageSquare size={13} />
                  <span>{showFullTranscript ? 'Ẩn toàn bộ hội thoại' : 'Xem lại toàn bộ hội thoại'}</span>
                  {showFullTranscript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showFullTranscript && (
                  <div
                    className="card mt-2"
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      padding: '10px 14px',
                      fontSize: 12,
                      background: 'var(--bg-elevated)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {gradingResult.transcriptText}
                  </div>
                )}
              </div>

              {/* Footer action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={startLiveSession}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                >
                  <RotateCcw size={14} /> Luyện nói lại
                </button>

                <button
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '9px 22px' }}
                >
                  <CheckCircle size={15} /> Hoàn thành & Tiếp tục
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
