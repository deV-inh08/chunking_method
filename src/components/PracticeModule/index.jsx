import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PenLine, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, RotateCcw,
  CheckCircle, XCircle, Sparkles, Loader, Volume2, VolumeX,
  Flame, BookMarked, FileText, Layers, Mic, Headphones, Trash2,
} from 'lucide-react';
import { EmptyState, Badge, Spinner, Modal } from '../ui';
import {
  getSituations, saveSituations, getApiKey, getPracticeDraft, savePracticeDraft, clearPracticeDraft,
  saveSpeakingProgress,
} from '../../store/storage';
import { gradeWritingBatch, generateWritingExercises } from '../../services/ai';
import { formatTimeUntilReview, isDueForReview } from '../../services/srs';
import { SpeakingSession } from './SpeakingSession';
import { GroupCompletionModal } from './GroupCompletionModal';
import { TranscriptListeningModal } from '../TranscriptModule/TranscriptListeningModal';
import { getChunkIPA, getSentenceIPA, formatIPA } from '../../services/phonetics';


const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional: 'Functional',
  connector: 'Connector',
};

// ─── ScoreRing ────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? 'var(--success-text)' : pct >= 50 ? '#f59e0b' : 'var(--error-text)';

  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 18, color,
      }}>
        {pct}
      </span>
    </div>
  );
}

// ─── GradingResult ────────────────────────────────────────────
function GradingResult({ result, chunkPhrase }) {
  if (!result) return null;
  const { usedChunk, correct, score, grammarErrors = [], naturalSuggestion, overallFeedback } = result;
  const allGood = usedChunk && correct && grammarErrors.length === 0;

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderColor: usedChunk
          ? (allGood ? 'var(--success-border)' : 'rgba(251,191,36,0.35)')
          : 'var(--error-border)',
        background: usedChunk
          ? (allGood ? 'var(--success-bg)' : 'rgba(251,191,36,0.06)')
          : 'var(--error-bg)',
        padding: '20px 22px',
      }}
    >
      {/* Score + header */}
      <div className="flex items-center gap-4 mb-4">
        <ScoreRing score={score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {usedChunk
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--success-text)', fontSize: 14 }}>
                <CheckCircle size={16} /> Đã dùng đúng chunk!
              </span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--error-text)', fontSize: 14 }}>
                <XCircle size={16} /> Chưa dùng chunk "{chunkPhrase}"
              </span>
            }
            {correct
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--success-text)' }}>
                <CheckCircle size={13} /> Nghĩa đúng
              </span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--error-text)' }}>
                <XCircle size={13} /> Nghĩa chưa khớp
              </span>
            }
          </div>
          {overallFeedback && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {overallFeedback}
            </p>
          )}
        </div>
      </div>

      {/* Grammar errors */}
      {grammarErrors.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Lỗi ngữ pháp
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grammarErrors.map((e, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--error-text)', fontWeight: 600 }}>✗ {e.error}</span>
                {e.correction && (
                  <span style={{ color: 'var(--success-text)', marginLeft: 8 }}>→ {e.correction}</span>
                )}
                {e.explanation && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>
                    {e.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Natural suggestion */}
      {naturalSuggestion && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            💡 Cách diễn đạt tự nhiên hơn
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
            "{naturalSuggestion}"
          </p>
        </div>
      )}
    </div>
  );
}

// ─── VocabHints ───────────────────────────────────────────────
function VocabHints({ hints = [] }) {
  if (!hints || hints.length === 0) return null;
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        marginTop: 8,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>
        💬 Gợi ý:
      </span>
      {hints.map((h, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{h.vi}</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{h.en}</span>
        </span>
      ))}
    </div>
  );
}

// ─── SampleWithTTS ────────────────────────────────────────────
function SampleWithTTS({ text, id, breakdown }) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'en-US';
    utter.rate  = 0.9;
    utter.pitch = 1;
    utter.onend   = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        marginBottom: 12,
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Header + TTS button */}
      <div style={{ padding: '10px 14px' }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            ✅ Câu dịch tham khảo
          </p>
          <button
            id={id ? `tts-${id}` : undefined}
            onClick={handleSpeak}
            title={speaking ? 'Dừng đọc' : 'Nghe phát âm'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: speaking ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${speaking ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.2)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              color: 'var(--success-text)',
              transition: 'all 0.2s',
            }}
          >
            {speaking
              ? <><VolumeX size={12} /> Dừng</>
              : <><Volume2 size={12} /> Nghe</>
            }
          </button>
        </div>

        {/* Sample text */}
        <p
          onClick={handleSpeak}
          style={{
            fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6,
            margin: 0, fontStyle: 'italic', cursor: 'pointer',
          }}
          title="Click để nghe phát âm"
        >
          "{text}"
        </p>

        {/* IPA Pronunciation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '1px 5px', borderRadius: 3 }}>IPA</span>
          <span style={{ fontSize: 12, color: '#7dd3fc', letterSpacing: '0.2px' }}>
            {formatIPA(getSentenceIPA(text))}
          </span>
        </div>
      </div>

      {/* Sentence breakdown — always visible */}
      {breakdown && breakdown.length > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(99,102,241,0.15)',
            background: 'rgba(99,102,241,0.04)',
            padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
            🔍 Phân tích cấu trúc câu
          </p>
          {breakdown.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                borderLeft: '2px solid rgba(99,102,241,0.4)',
                paddingLeft: 10,
              }}
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-300)', fontStyle: 'italic' }}>
                  "{item.phrase}"
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  = {item.vi}
                </span>
              </div>
              {item.note && (
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  💡 {item.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Level badge config ───────────────────────────────────────

const LEVEL_CONFIG = {
  1: { label: 'Cơ bản', color: '34,197,94', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
  2: { label: 'Trung cấp', color: '251,191,36', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  3: { label: 'Nâng cao', color: '239,68,68', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
};


// ─── ExerciseCard (single sentence row with input & sample) ────
function ExerciseCard({
  exercise, index, total, chunk,
  userInput = '', setUserInput, showSample, setShowSample,
  gradingResult, isGrading,
}) {
  const text = (userInput || '').trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const level = exercise.level || (index + 1);
  const lvCfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowSample(s => !s);
    }
  };

  return (
    <div
      className="card animate-fade-in"
      style={{ padding: '18px 20px' }}
    >
      {/* Level badge + sentence header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Level badge row */}
          <div className="flex items-center gap-2 mb-2">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: lvCfg.bg,
              border: `1px solid ${lvCfg.border}`,
              borderRadius: 'var(--radius-full)',
              padding: '2px 10px',
              fontSize: 11, fontWeight: 700,
              color: `rgb(${lvCfg.color})`,
            }}>
              {'★'.repeat(level)} {exercise.levelLabel || lvCfg.label}
            </span>
            {exercise.tenseUsed && (
              <span style={{
                fontSize: 11, color: 'var(--accent-300)',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px', fontWeight: 600,
              }}>
                {exercise.tenseUsed}
              </span>
            )}
          </div>

          {/* Vietnamese sentence */}
          <p style={{
            fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.6, margin: 0,
          }}>
            {exercise.vietnameseSentence || exercise.context || exercise.prompt || (
              <span style={{ color: 'var(--error-text)', fontSize: 13, fontWeight: 500 }}>
                ⚠️ Chưa có nội dung câu tiếng Việt cho bài tập này.
              </span>
            )}
          </p>

          {/* Tense explanation */}
          {exercise.tenseExplanation && (
            <div style={{
              marginTop: 8,
              display: 'flex', alignItems: 'flex-start', gap: 6,
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>📘</span>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-300)' }}>{exercise.tenseUsed}: </span>
                {exercise.tenseExplanation}
              </p>
            </div>
          )}

          {/* Vocab hints */}
          {Array.isArray(exercise.vocabHints) && exercise.vocabHints.length > 0 && (
            <VocabHints hints={exercise.vocabHints} />
          )}
        </div>
      </div>

      {/* Textarea */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <textarea
          id={`ex-input-${chunk.id}-${index}`}
          className="textarea-field"
          rows={2}
          placeholder={`Viết bản dịch tiếng Anh cho câu ${index + 1}…`}
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGrading}
          style={{ resize: 'none', minHeight: 72, paddingBottom: 28, fontSize: 14 }}
        />
        <span style={{
          position: 'absolute', bottom: 8, right: 12,
          fontSize: 11, color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>
          {wordCount} từ
        </span>
      </div>

      {/* Sample answer — shown on toggle */}
      {showSample && exercise.sampleTranslation && (
        <SampleWithTTS
          text={exercise.sampleTranslation}
          id={`sample-${chunk.id}-${index}`}
          breakdown={exercise.sentenceBreakdown}
        />
      )}

      {/* AI grading result for this sentence */}
      {gradingResult && (
        <GradingResult result={gradingResult} chunkPhrase={chunk.phrase} />
      )}

      {/* Toggle sample button */}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <button
          id={`sample-btn-${chunk.id}-${index}`}
          className="btn btn-sm"
          onClick={() => setShowSample(s => !s)}
          style={{
            background: showSample ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
            color: 'var(--accent-300)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          👁 {showSample ? 'Ẩn câu mẫu' : 'Xem câu mẫu'}
        </button>
      </div>
    </div>
  );
}

function getCleanDraft(chunkId, progress) {
  const raw = getPracticeDraft(chunkId);
  if (!raw) return {};

  const isDue = isDueForReview(progress);

  // Nếu chunk đang đến hạn ôn tập (isDueForReview):
  // Các câu trả lời và kết quả chấm của đợt học trước là dữ liệu cũ -> Tự động dọn sạch để ôn tập mới
  const isOldCompleted =
    isDue && (
      Boolean(raw.hasCompletedSpeaking) ||
      Object.keys(raw.gradingResults || {}).length > 0 ||
      (raw.updatedAt && progress?.lastPracticed && raw.updatedAt <= progress.lastPracticed) ||
      (raw.updatedAt && progress?.nextReviewAt && raw.updatedAt < progress.nextReviewAt)
    );

  if (isOldCompleted) {
    clearPracticeDraft(chunkId);
    return {};
  }

  return raw;
}

function WritingSession({
  chunk, exercises, progress, onComplete, onToast,
  onNavigatePrev, onNavigateNext, hasPrev, hasNext, currentIndex, totalChunks,
  onRegenerate,
}) {
  const isDue = isDueForReview(progress);

  const [userInputs, setUserInputs] = useState(() => {
    return getCleanDraft(chunk.id, progress)?.inputs || {};
  });
  const [showSamples, setShowSamples] = useState(() => {
    return getCleanDraft(chunk.id, progress)?.showSamples || {};
  });
  const [gradingResults, setGradingResults] = useState(() => {
    return getCleanDraft(chunk.id, progress)?.gradingResults || {};
  });
  const [isGrading, setIsGrading] = useState(false);
  const [showSpeakingModal, setShowSpeakingModal] = useState(false);
  const [hasCompletedSpeaking, setHasCompletedSpeaking] = useState(() => {
    return Boolean(getCleanDraft(chunk.id, progress)?.hasCompletedSpeaking);
  });
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const autoAdvanceTimerRef = useRef(null);

  const triggerAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setIsAutoAdvancing(true);

    if (hasNext) {
      if (onToast) {
        onToast('success', '🎉 Xuất sắc! Đã hoàn thành cả Viết & Nói. Đang chuyển sang chunk tiếp theo...');
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        setIsAutoAdvancing(false);
        // Dọn sạch draft của chunk đã hoàn thành trước khi chuyển sang chunk mới
        clearPracticeDraft(chunk.id);
        if (onNavigateNext) {
          onNavigateNext();
        }
      }, 1800);
    } else {
      setIsAutoAdvancing(false);
      clearPracticeDraft(chunk.id);
      if (onToast) {
        onToast('success', '🎉 Chúc mừng bạn đã hoàn thành xuất sắc tất cả các chunk!');
      }
    }
  }, [chunk.id, hasNext, onNavigateNext, onToast]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Điều kiện mở Luyện nói: đã chấm ít nhất 2 câu đạt >= 50đ, hoặc chunk đã có tiến độ trước đó
  const canStartSpeaking = useMemo(() => {
    const results = Object.values(gradingResults || {});
    if (results.length >= 2) {
      const passedCount = results.filter(r => (r.score || 0) >= 50).length;
      if (passedCount >= 2) return true;
    }
    if (progress && progress.practiceCount > 0 && (progress.lastScore == null || progress.lastScore >= 50)) {
      return true;
    }
    return false;
  }, [gradingResults, progress]);

  const handleSpeakingComplete = (arg1, arg2) => {
    const chunkId = (typeof arg1 === 'string') ? arg1 : chunk.id;
    const speakingResult = (arg2 && typeof arg2 === 'object') ? arg2 : (arg1 && typeof arg1 === 'object') ? arg1 : { score: 80 };
    const safeScore = typeof speakingResult.score === 'number' ? speakingResult.score : 80;
    const safePayload = {
      score: safeScore,
      usedTargetChunk: speakingResult.usedTargetChunk ?? true,
      comprehensible: speakingResult.comprehensible ?? (safeScore >= 65),
      ...speakingResult,
    };
    const updatedProg = saveSpeakingProgress(chunkId, safePayload);
    const isGroupComplete = onComplete ? onComplete(chunkId, safeScore >= 70, safeScore, updatedProg?.lastFeedback, true) : false;
    if (onToast) onToast('success', `Đã lưu kết quả luyện nói: ${safeScore} điểm!`);

    setHasCompletedSpeaking(true);
    // Khi đã hoàn thành cả Viết và Nói của chunk này, dọn sạch bản nháp để chuẩn bị cho đợt ôn tập sau
    clearPracticeDraft(chunkId);

    // Nếu phần Writing đã hoàn thành và chưa hoàn thành cả group -> Tự động chuyển sang chunk tiếp theo
    const writingDone = Object.keys(gradingResults || {}).length >= Math.min(2, exercises.length);
    if (writingDone && !isGroupComplete) {
      triggerAutoAdvance();
    }
  };

  // Sync draft states when chunk changes or review status updates
  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);

    const draft = getCleanDraft(chunk.id, progress) || {};
    setUserInputs(draft.inputs || {});
    setShowSamples(draft.showSamples || {});
    setGradingResults(draft.gradingResults || {});
    setHasCompletedSpeaking(Boolean(draft.hasCompletedSpeaking));
  }, [chunk.id, progress]);

  const handleUserInputChange = (index, val) => {
    setUserInputs(prev => {
      const next = { ...prev, [index]: val };
      savePracticeDraft(chunk.id, { inputs: next });
      return next;
    });
  };

  const handleShowSampleChange = (index, updater) => {
    setShowSamples(prev => {
      const nextVal = typeof updater === 'function' ? updater(prev[index]) : updater;
      const next = { ...prev, [index]: nextVal };
      savePracticeDraft(chunk.id, { showSamples: next });
      return next;
    });
  };

  if (!exercises || exercises.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p className="text-muted">Chunk này chưa có bài luyện. Hãy vào Chunks để sinh bài tập trước.</p>
      </div>
    );
  }

  const filledItems = exercises
    .map((ex, idx) => ({
      index: idx,
      vietnameseSentence: ex.vietnameseSentence,
      userTranslation: (userInputs[idx] || '').trim(),
    }))
    .filter(item => item.userTranslation.length > 0);

  const filledCount = filledItems.length;
  const canGrade = filledCount >= 2;

  const handleBatchGrade = async () => {
    if (!canGrade) {
      onToast('error', 'Vui lòng hoàn thành ít nhất 2 câu trước khi chấm bài!');
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vào Settings để nhập.');
      return;
    }

    setIsGrading(true);
    try {
      // Gọi 1 request duy nhất chấm tất cả câu đã viết
      const res = await gradeWritingBatch(chunk, filledItems, apiKey);
      const resultsArr = res.results || [];

      const newResultsMap = { ...gradingResults };
      let totalScore = 0;
      let successSentences = 0;

      resultsArr.forEach((r) => {
        newResultsMap[r.index] = r;
        totalScore += (r.score || 0);
        if (r.usedChunk && r.correct) {
          successSentences += 1;
        }
      });

      setGradingResults(newResultsMap);
      savePracticeDraft(chunk.id, { gradingResults: newResultsMap });

      const avgScore = Math.round(totalScore / resultsArr.length);
      const isSuccess = successSentences >= 2 || (successSentences >= 1 && resultsArr.length === 1);

      const isGroupComplete = onComplete(chunk.id, isSuccess, avgScore, res);
      onToast('success', `✓ Đã chấm xong ${resultsArr.length} câu! Điểm TB: ${avgScore}đ`);

      // Nếu cả 2 phần (Writing vừa chấm xong & Speaking đã hoàn thành) và chưa hoàn thành cả group -> Tự động chuyển sang chunk tiếp theo
      const writingDone = Object.keys(newResultsMap).length >= Math.min(2, exercises.length);
      if (writingDone && hasCompletedSpeaking && !isGroupComplete) {
        triggerAutoAdvance();
      }
    } catch (err) {
      console.error('Batch grading error:', err);
      onToast('error', `Lỗi chấm bài: ${err.message}`);
    } finally {
      setIsGrading(false);
    }
  };

  const handleReset = () => {
    clearPracticeDraft(chunk.id);
    setUserInputs({});
    setGradingResults({});
    setShowSamples({});
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    onToast('info', 'Đã làm mới ô nhập để bạn luyện viết lại!');
  };

  const handleManualPrev = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    if (onNavigatePrev) onNavigatePrev();
  };

  const handleManualNext = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    if (onNavigateNext) onNavigateNext();
  };

  const hasGraded = Object.keys(gradingResults).length > 0;
  const chunkIpa = getChunkIPA(chunk);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {chunk.phrase}
          </span>
          {chunkIpa && (
            <span style={{
              fontSize: 13,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}>
              {formatIPA(chunkIpa)}
            </span>
          )}
          <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
          {progress && (
            <Badge type="success">
              {progress.practiceCount} lần luyện{progress.lastScore != null ? ` · ${progress.lastScore}đ` : ''}
            </Badge>
          )}
          {progress && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-full)',
              background: progress.status === 'mastered' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              color: progress.status === 'mastered' ? '#4ade80' : 'var(--accent-300)',
              border: `1px solid ${progress.status === 'mastered' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
            }}>
              {progress.status === 'mastered' ? '🧠 ' : '⚡ '}Level {progress.srsLevel || 1}{progress.status === 'mastered' ? ' (Thành thạo)' : ''}
            </span>
          )}
          {progress && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: isDueForReview(progress) ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
              color: isDueForReview(progress) ? 'var(--error-text)' : '#f59e0b',
              border: `1px solid ${isDueForReview(progress) ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}>
              <Flame size={11} color={isDueForReview(progress) ? '#ef4444' : '#f59e0b'} />
              {isDueForReview(progress)
                ? '🔥 Đến hạn ôn tập'
                : formatTimeUntilReview(progress.nextReviewAt)?.text || 'Đang học'
              }
            </span>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleReset}
            title="Làm mới ô nhập và kết quả chấm để bắt đầu một lượt ôn tập mới"
            style={{
              fontSize: 11,
              color: isDue ? '#f87171' : 'var(--text-muted)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              border: isDue ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
              background: isDue ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
              borderRadius: 'var(--radius-full)', padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} /> Làm mới bài làm
          </button>

        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {chunk.meaningVi}
          {chunk.meaningEn && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {chunk.meaningEn}</span>}
        </p>

        {isDue && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Flame size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>
              <strong>Lượt ôn tập Spaced Repetition (Level {progress?.srsLevel || 1} · Lần {progress?.practiceCount ? progress.practiceCount + 1 : 1}):</strong> Dữ liệu đã được làm mới để bạn nhớ lại và tự dịch từ đầu!
            </span>
          </div>
        )}
      </div>

      {/* All exercises stacked */}
      {exercises.map((exercise, i) => (
        <ExerciseCard
          key={exercise.id || i}
          exercise={exercise}
          index={i}
          total={exercises.length}
          chunk={chunk}
          userInput={userInputs[i] || ''}
          setUserInput={(val) => handleUserInputChange(i, val)}
          showSample={!!showSamples[i]}
          setShowSample={(updater) => handleShowSampleChange(i, updater)}
          gradingResult={gradingResults[i] || null}
          isGrading={isGrading}
        />
      ))}

      {/* Non-floating, clean static Bottom Batch Grade Bar at end of exercises */}
      <div
        className="card animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75), rgba(49, 46, 129, 0.75))',
          borderColor: canGrade ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          flexWrap: 'wrap',
          borderRadius: 'var(--radius-md)',
          marginTop: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="var(--accent-300)" /> Chấm bài luyện viết bằng AI
          </div>
          <div style={{ fontSize: 12.5, color: canGrade ? '#4ade80' : 'var(--text-muted)' }}>
            {hasGraded
              ? '✓ Đã chấm xong bài! Bạn có thể xem nhận xét bên dưới hoặc bấm "Viết lại".'
              : filledCount >= 2
              ? `✓ Đã điền ${filledCount}/${exercises.length} câu — Sẵn sàng bấm chấm bài!`
              : `Đã viết ${filledCount}/${exercises.length} câu (Hoàn thành ít nhất 2 câu để chấm bài)`
            }
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {hasGraded && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
              title="Làm mới ô nhập để viết lại câu này"
            >
              <RotateCcw size={14} /> Viết lại
            </button>
          )}

          <button
            id={`batch-grade-btn-${chunk.id}`}
            className="btn btn-primary"
            onClick={handleBatchGrade}
            disabled={!canGrade || isGrading}
            style={{
              padding: '10px 24px',
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: canGrade ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
            }}
          >
            {isGrading
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang chấm AI…</>
              : <><Sparkles size={16} /> Chấm bài AI ({filledCount} câu)</>
            }
          </button>
        </div>
      </div>

      {/* ── SPEAKING PRACTICE CTA CARD ── */}
      <div
        className="card animate-fade-in"
        style={{
          background: canStartSpeaking
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.22))'
            : 'rgba(255, 255, 255, 0.02)',
          borderColor: canStartSpeaking ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          flexWrap: 'wrap',
          borderRadius: 'var(--radius-md)',
          marginTop: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Mic size={18} color={hasCompletedSpeaking || canStartSpeaking ? '#34d399' : 'var(--text-muted)'} />
            <span>Luyện nói phản xạ với AI (Live Voice Session)</span>
            {hasCompletedSpeaking && (
              <span style={{
                fontSize: 11, background: 'rgba(52,211,153,0.15)', color: '#34d399',
                border: '1px solid rgba(52,211,153,0.3)', padding: '1px 8px', borderRadius: 'var(--radius-full)',
                fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCircle size={11} /> Đã hoàn thành nói
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: canStartSpeaking ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {hasCompletedSpeaking
              ? 'Bạn đã hoàn thành bài nói của chunk này. Có thể bấm vào để luyện lại bất kỳ lúc nào.'
              : canStartSpeaking
              ? 'Trò chuyện thời gian thực qua giọng nói với Gemini Live API để đưa chunk vào phản xạ tự nhiên.'
              : 'Hoàn thành chấm bài viết Cơ bản & Trung cấp (≥ 50đ) để mở khóa phòng luyện nói AI.'
            }
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => {
            if (!canStartSpeaking && !hasCompletedSpeaking) {
              onToast('info', 'Bạn có thể luyện nói trực tiếp hoặc hoàn thành bài viết trước để đạt hiệu quả cao nhất!');
            }
            setShowSpeakingModal(true);
          }}
          style={{
            background: hasCompletedSpeaking || canStartSpeaking
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(16, 185, 129, 0.2)',
            color: '#fff',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '10px 22px',
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: hasCompletedSpeaking || canStartSpeaking ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
            cursor: 'pointer',
          }}
          title={hasCompletedSpeaking ? 'Luyện nói lại' : 'Bắt đầu luyện nói trực tiếp với AI'}
        >
          {hasCompletedSpeaking ? (
            <><RotateCcw size={15} /> Luyện nói lại</>
          ) : (
            <><Mic size={16} /> 🎙️ Luyện nói với AI</>
          )}
        </button>
      </div>

      {/* Speaking Session Modal */}
      {showSpeakingModal && (
        <SpeakingSession
          chunk={chunk}
          exercises={exercises}
          progress={progress}
          onComplete={handleSpeakingComplete}
          onClose={() => setShowSpeakingModal(false)}
          onToast={onToast}
        />
      )}

      {/* Auto-advancing Banner */}
      {isAutoAdvancing && (
        <div className="card animate-fade-in" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.25))',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} /> 🎉 Đã hoàn thành cả Viết & Nói! Đang chuyển sang chunk tiếp theo...
          </span>
          <Spinner size={16} />
        </div>
      )}

      {/* Navigation between chunks */}
      {(onNavigatePrev || onNavigateNext) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleManualPrev}
            disabled={!hasPrev}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: hasPrev ? 1 : 0.4 }}
          >
            <ChevronLeft size={16} /> Chunk trước
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Bài {currentIndex + 1} / {totalChunks}
          </span>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleManualNext}
            disabled={!hasNext}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: hasNext ? 1 : 0.4 }}
          >
            Chunk tiếp theo <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helper: Group chunks by vocabulary word or transcript ─────────
function groupPracticeChunks(chunkList = [], transcripts = []) {
  const transcriptMap = new Map();
  (transcripts || []).forEach(t => transcriptMap.set(t.id, t));

  const groupMap = new Map();

  chunkList.forEach(chunk => {
    let groupKey, groupTitle, groupSubtitle, groupType;

    if (chunk.sourceType === 'vocab' || chunk.sourceWord || (chunk.groupId && chunk.groupId.startsWith('vocab_'))) {
      const word = chunk.sourceWord || chunk.groupName || (chunk.groupId ? chunk.groupId.replace(/^vocab_/, '') : 'Từ vựng');
      groupKey = `vocab_${word.toLowerCase().trim()}`;
      groupTitle = word;
      groupSubtitle = chunk.topic ? `Chủ đề: ${chunk.topic}` : '5000 Từ vựng';
      groupType = 'vocab';
    } else if (chunk.transcriptId) {
      const t = transcriptMap.get(chunk.transcriptId);
      groupKey = `transcript_${chunk.transcriptId}`;
      groupTitle = t ? (t.themeVi || t.theme || `Đoạn hội thoại #${chunk.transcriptId.slice(-4)}`) : `Transcript #${chunk.transcriptId.slice(-4)}`;
      groupSubtitle = t?.part ? `TOEIC Part ${t.part}` : 'Transcript hội thoại';
      groupType = 'transcript';
    } else {
      groupKey = 'other';
      groupTitle = 'Cụm từ khác';
      groupSubtitle = 'Cụm từ tổng hợp';
      groupType = 'other';
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: groupKey,
        title: groupTitle,
        subtitle: groupSubtitle,
        type: groupType,
        chunks: [],
      });
    }

    groupMap.get(groupKey).chunks.push(chunk);
  });

  return Array.from(groupMap.values());
}

// ─── PracticeOutline Accordion Component ───────────────────────────
function PracticeOutline({
  groups, activeChunkId, onSelectChunk, allProgress, autoGenerating,
  transcripts = [], onListenScript,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, gIdx) => {
        const isCollapsed = Boolean(collapsedGroups[group.id]);
        const completedCount = group.chunks.filter(c => allProgress[c.id]?.practiceCount > 0 && !isDueForReview(allProgress[c.id])).length;
        const hasActive = group.chunks.some(c => c.id === activeChunkId);
        const hasDue = group.chunks.some(c => isDueForReview(allProgress[c.id]));
        const isTranscript = group.type === 'transcript' || group.id?.startsWith('transcript_');
        const relatedTranscript = isTranscript
          ? (transcripts || []).find(t => t.id === group.chunks[0]?.transcriptId)
          : null;

        return (
          <div
            key={group.id}
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              borderColor: hasActive ? 'var(--accent-400)' : 'var(--border-subtle)',
              background: hasActive ? 'rgba(99,102,241,0.04)' : 'var(--bg-surface)',
            }}
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: hasActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                {group.type === 'vocab' ? (
                  <BookMarked size={15} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
                ) : (
                  <FileText size={15} style={{ color: '#38bdf8', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {gIdx + 1}. {group.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{completedCount}/{group.chunks.length} chunks</span>
                    {hasDue && (
                      <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        · <Flame size={10} color="#ef4444" /> Đến hạn ôn
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 6 }}>
                {isTranscript && relatedTranscript && onListenScript && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onListenScript(relatedTranscript);
                    }}
                    style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                    title="Nghe lại transcript của nhóm này để luyện Listening"
                  >
                    <Headphones size={11} />
                    <span>Nghe</span>
                  </span>
                )}
                <div style={{ color: 'var(--text-muted)' }}>
                  {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </div>
              </div>
            </button>

            {/* Chunks inside this group */}
            {!isCollapsed && (
              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-surface)' }}>
                {group.chunks.map((chunk, cIdx) => {
                  const prog = allProgress[chunk.id];
                  const isActive = activeChunkId === chunk.id;
                  const isDue = isDueForReview(prog);
                  const isDone = prog && prog.practiceCount > 0 && !isDue;

                  return (
                    <button
                      key={chunk.id}
                      id={`practice-nav-${chunk.id}`}
                      onClick={() => onSelectChunk(chunk.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(67,56,202,0.2))'
                          : 'transparent',
                        border: isActive ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
                        color: isActive ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                        {isDone ? (
                          <CheckCircle size={14} style={{ color: 'var(--success-text)', flexShrink: 0 }} />
                        ) : (
                          <span style={{
                            width: 13,
                            height: 13,
                            borderRadius: 'var(--radius-full)',
                            border: '1.5px solid var(--border-strong)',
                            flexShrink: 0,
                            display: 'inline-block',
                          }} />
                        )}
                        <span style={{
                          fontSize: 12.5,
                          fontWeight: isActive ? 700 : 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: isActive ? 'var(--accent-300)' : 'var(--text-primary)',
                        }}>
                          {gIdx + 1}.{cIdx + 1} {chunk.phrase}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {prog?.practiceCount > 0 && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: prog.status === 'mastered' ? '#4ade80' : 'var(--accent-300)',
                            background: prog.status === 'mastered' ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                            padding: '1px 5px',
                            borderRadius: 4,
                          }}>
                            Lv.{prog.srsLevel || 1}
                          </span>
                        )}
                        {isDue ? (
                          <span style={{
                            fontSize: 10,
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.12)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}>
                            <Flame size={10} color="#ef4444" /> Ôn
                          </span>
                        ) : prog?.lastScore != null ? (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: prog.lastScore >= 80 ? 'var(--success-text)' : '#f59e0b',
                          }}>
                            {prog.lastScore}đ
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PracticeModule (main export) ─────────────────────────────────
export function PracticeModule({
  selectedChunks, chunks, allProgress, transcripts = [],
  onProgressUpdate, onRefreshProgress, onRemoveChunksFromPractice, onToast,
  autoGenerating = false,
  autoGenProgress = { done: 0, total: 0 },
  onStartDueReview,
}) {
  const chunkList = chunks.filter(c => selectedChunks.has(c.id));

  // Kiểm tra chunk đã hoàn thành / ôn xong (đã luyện ít nhất 1 lần và không đến hạn ôn)
  const isChunkCompleted = useCallback((cId) => {
    const prog = allProgress[cId];
    return Boolean(prog && prog.practiceCount > 0 && !isDueForReview(prog));
  }, [allProgress]);

  const completedChunks = useMemo(() => {
    return chunkList.filter(c => isChunkCompleted(c.id));
  }, [chunkList, isChunkCompleted]);

  const pendingChunks = useMemo(() => {
    return chunkList.filter(c => !isChunkCompleted(c.id));
  }, [chunkList, isChunkCompleted]);

  // Bộ lọc: 'pending' (Cần ôn & Chưa xong) | 'all' (Tất cả)
  const [filterMode, setFilterMode] = useState(() => {
    try {
      const saved = localStorage.getItem('toeic_practice_filter_mode');
      if (saved === 'all' || saved === 'pending') return saved;
    } catch { /* ignore */ }
    return 'pending';
  });

  const handleSetFilterMode = (mode) => {
    setFilterMode(mode);
    try {
      localStorage.setItem('toeic_practice_filter_mode', mode);
    } catch { /* ignore */ }
  };

  // Danh sách hiển thị tương ứng theo chế độ lọc
  const displayedChunkList = useMemo(() => {
    if (filterMode === 'pending') {
      return pendingChunks;
    }
    return chunkList;
  }, [filterMode, pendingChunks, chunkList]);

  const [activeChunkId, setActiveChunkId] = useState(() => {
    try {
      return localStorage.getItem('toeic_active_chunk_id') || null;
    } catch {
      return null;
    }
  });
  const [showMobileOutline, setShowMobileOutline] = useState(false);

  useEffect(() => {
    if (displayedChunkList.length > 0) {
      if (!activeChunkId || !displayedChunkList.some(c => c.id === activeChunkId)) {
        try {
          const saved = localStorage.getItem('toeic_active_chunk_id');
          if (saved && displayedChunkList.some(c => c.id === saved)) {
            setActiveChunkId(saved);
          } else {
            setActiveChunkId(displayedChunkList[0].id);
          }
        } catch {
          setActiveChunkId(displayedChunkList[0].id);
        }
      }
    }
  }, [displayedChunkList, activeChunkId]);

  useEffect(() => {
    if (activeChunkId) {
      try {
        localStorage.setItem('toeic_active_chunk_id', activeChunkId);
      } catch { /* ignore */ }
    }
  }, [activeChunkId]);

  const [situationsVersion, setSituationsVersion] = useState(0);
  const [isGeneratingCurrent, setIsGeneratingCurrent] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [genAllProgress, setGenAllProgress] = useState({ done: 0, total: 0 });
  const [genError, setGenError] = useState('');
  const [completedGroupInfo, setCompletedGroupInfo] = useState(null);
  const [listeningTranscript, setListeningTranscript] = useState(null);
  const autoAttemptedRef = useRef(new Set());

  const groups = useMemo(() => {
    return groupPracticeChunks(displayedChunkList, transcripts);
  }, [displayedChunkList, transcripts]);

  const activeChunkIndex = displayedChunkList.findIndex(c => c.id === activeChunkId);
  const activeChunk = activeChunkIndex >= 0 ? displayedChunkList[activeChunkIndex] : null;
  const activeExercises = useMemo(() => {
    void situationsVersion;
    return activeChunk ? getSituations(activeChunk.id) : [];
  }, [activeChunk, situationsVersion]);

  // Bài tập hợp lệ phải có ít nhất 1 câu và câu phải có nội dung tiếng Việt
  const hasValidExercises = useMemo(() => {
    if (!activeExercises || activeExercises.length === 0) return false;
    return activeExercises.every(ex => {
      const prompt = (ex.vietnameseSentence || ex.context || ex.prompt || '').trim();
      return prompt.length > 0;
    });
  }, [activeExercises]);

  const chunksWithoutExercises = useMemo(() => {
    void situationsVersion;
    return chunkList.filter(c => {
      const situations = getSituations(c.id);
      if (!situations || situations.length === 0) return true;
      return !situations.every(ex => (ex.vietnameseSentence || ex.context || ex.prompt || '').trim().length > 0);
    });
  }, [chunkList, situationsVersion]);

  const handleGenerateSingleChunk = useCallback(async (targetChunk) => {
    if (!targetChunk) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      if (onToast) onToast('error', 'Chưa có API key. Vui lòng kiểm tra cài đặt.');
      return;
    }
    setIsGeneratingCurrent(true);
    setGenError('');
    try {
      const result = await generateWritingExercises(targetChunk, apiKey);
      const exercises = (result.exercises || []).map((ex, i) => ({
        ...ex,
        id: ex.id || `ex_${targetChunk.id}_${i}`,
        chunkId: targetChunk.id,
      }));
      if (exercises.length === 0) throw new Error('AI không trả về bài tập hợp lệ');
      saveSituations(targetChunk.id, exercises);
      setSituationsVersion(v => v + 1);
      if (onToast) onToast('success', `Đã tạo ${exercises.length} bài tập cho "${targetChunk.phrase}"! 🎉`);
    } catch (err) {
      console.error('Single chunk gen error:', err);
      setGenError(err.message || 'Lỗi khi tạo bài tập');
      if (onToast) onToast('error', `Lỗi tạo bài tập: ${err.message}`);
    } finally {
      setIsGeneratingCurrent(false);
    }
  }, [onToast]);

  // Tự động kích hoạt tạo bài tập cho activeChunk nếu chưa có bài tập hoặc bài tập bị rỗng nội dung tiếng Việt
  useEffect(() => {
    if (
      activeChunk &&
      !hasValidExercises &&
      !autoGenerating &&
      !isGeneratingCurrent &&
      !isGeneratingAll &&
      !autoAttemptedRef.current.has(activeChunk.id)
    ) {
      autoAttemptedRef.current.add(activeChunk.id);
      handleGenerateSingleChunk(activeChunk);
    }
  }, [activeChunk, hasValidExercises, autoGenerating, isGeneratingCurrent, isGeneratingAll, handleGenerateSingleChunk]);

  const handleGenerateAllMissing = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      if (onToast) onToast('error', 'Chưa có API key. Vui lòng kiểm tra cài đặt.');
      return;
    }
    const missing = chunkList.filter(c => getSituations(c.id).length === 0);
    if (missing.length === 0) return;

    setIsGeneratingAll(true);
    setGenAllProgress({ done: 0, total: missing.length });

    let failed = 0;
    for (let i = 0; i < missing.length; i++) {
      const chunk = missing[i];
      let success = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await generateWritingExercises(chunk, apiKey);
          const exercises = (result.exercises || []).map((ex, exIdx) => ({
            ...ex,
            id: ex.id || `ex_${chunk.id}_${exIdx}`,
            chunkId: chunk.id,
          }));
          if (exercises.length > 0) {
            saveSituations(chunk.id, exercises);
            setSituationsVersion(v => v + 1);
            success = true;
            break;
          }
        } catch (err) {
          console.warn(`[Gen-All] Chunk "${chunk.phrase}" retry ${attempt + 1}:`, err.message);
          if (attempt < 1) await new Promise(r => setTimeout(r, 2500));
        }
      }
      if (!success) {
        failed++;
        await new Promise(r => setTimeout(r, 2000));
      }
      setGenAllProgress(prev => ({ ...prev, done: i + 1 }));
    }

    setIsGeneratingAll(false);
    if (failed > 0) {
      if (onToast) onToast('warning', `Đã tạo ${missing.length - failed}/${missing.length} chunk. Chunk còn lại bạn có thể bấm tạo trực tiếp.`);
    } else {
      if (onToast) onToast('success', 'Đã hoàn tất chuẩn bị bài luyện cho tất cả các chunk! 🎉');
    }
  };

  const activeGroup = useMemo(() => {
    if (!activeChunk) return null;
    return groups.find(g => g.chunks.some(c => c.id === activeChunk.id));
  }, [groups, activeChunk]);

  const activeGroupTranscript = useMemo(() => {
    if (!activeGroup || activeGroup.type !== 'transcript') return null;
    const tId = activeGroup.chunks[0]?.transcriptId;
    return (transcripts || []).find(t => t.id === tId) || null;
  }, [activeGroup, transcripts]);

  const activeChunkInGroupIndex = useMemo(() => {
    if (!activeGroup || !activeChunk) return 0;
    return activeGroup.chunks.findIndex(c => c.id === activeChunk.id);
  }, [activeGroup, activeChunk]);

  const handleComplete = (chunkId, success, score, feedback, alreadySaved = false) => {
    if (!alreadySaved) {
      onProgressUpdate(chunkId, success, score, feedback);
    } else if (onRefreshProgress) {
      onRefreshProgress();
    }

    if (success) {
      const currentGroup = groups.find(g => g.chunks.some(c => c.id === chunkId));
      if (currentGroup && currentGroup.chunks.length > 0) {
        // Kiểm tra xem tất cả các chunk trong group này đã hoàn thành chưa
        const allDone = currentGroup.chunks.every(c => {
          if (c.id === chunkId) return true;
          const prog = allProgress[c.id];
          return prog && prog.practiceCount > 0 && !isDueForReview(prog);
        });

        if (allDone) {
          const currentGroupIdx = groups.findIndex(g => g.id === currentGroup.id);
          const nextGroup = (currentGroupIdx >= 0 && currentGroupIdx < groups.length - 1)
            ? groups[currentGroupIdx + 1]
            : null;

          let relatedTranscript = null;
          if (currentGroup.type === 'transcript') {
            const tId = currentGroup.chunks[0]?.transcriptId;
            if (tId) {
              relatedTranscript = (transcripts || []).find(t => t.id === tId) || null;
            }
          }

          setCompletedGroupInfo({
            group: currentGroup,
            hasNextGroup: Boolean(nextGroup && nextGroup.chunks.length > 0),
            nextGroupChunkId: nextGroup?.chunks[0]?.id || null,
            transcript: relatedTranscript,
          });
          return true; // Báo hiệu hoàn thành cả group
        }
      }
    }
    return false;
  };

  const handleSelectChunk = (chunkId) => {
    setActiveChunkId(chunkId);
    setShowMobileOutline(false);
  };

  const handlePrevChunk = () => {
    if (activeChunkIndex > 0) {
      setActiveChunkId(displayedChunkList[activeChunkIndex - 1].id);
    }
  };

  const handleNextChunk = () => {
    if (activeChunkIndex < displayedChunkList.length - 1) {
      setActiveChunkId(displayedChunkList[activeChunkIndex + 1].id);
    }
  };

  // Màn hình khi tất cả bài đã chọn đều đã hoàn thành và đang lọc 'pending'
  if (displayedChunkList.length === 0 && chunkList.length > 0 && !autoGenerating) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 540, margin: '30px auto' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-full)',
          background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <CheckCircle size={32} color="var(--success-text)" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          🎉 Đã ôn xong tất cả {chunkList.length} bài luyện!
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Tuyệt vời! Tất cả các bài bạn chọn đều đã được hoàn thành và chưa đến hạn ôn tập tiếp theo. Các bài đã hoàn thành được tự động ẩn đi để giao diện gọn gàng.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => handleSetFilterMode('all')}>
            👁️ Xem lại tất cả {chunkList.length} bài
          </button>
          {onRemoveChunksFromPractice && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                const completedIds = completedChunks.map(c => c.id);
                onRemoveChunksFromPractice(completedIds);
              }}
            >
              🧹 Dọn dẹp danh sách (Bỏ {completedChunks.length} bài đã xong)
            </button>
          )}
        </div>
      </div>
    );
  }

  if (chunkList.length === 0 && !autoGenerating) {
    const dueCount = chunks.filter(c => isDueForReview(allProgress[c.id])).length;
    if (dueCount > 0 && onStartDueReview) {
      return (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '32px 18px', maxWidth: 520, margin: '24px auto' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-full)',
            background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Flame size={26} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
            Có {dueCount} chunk đến hạn ôn tập hôm nay!
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
            Hệ thống sẽ <strong>sử dụng lại các câu mẫu bạn đã học</strong> (không cần tạo câu mới) để giúp củng cố phản xạ và đưa chunk vào trí nhớ dài hạn.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={onStartDueReview}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              width: '100%',
              maxWidth: 380,
              whiteSpace: 'normal',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            <Flame size={16} style={{ flexShrink: 0 }} />
            <span>Bắt đầu ôn tập {dueCount} chunk (Dùng lại câu cũ)</span>
          </button>
        </div>
      );
    }

    return (
      <EmptyState
        icon={<PenLine size={24} />}
        title="Chưa có chunk nào được chọn"
        description="Vào Chunks hoặc Từ vựng, chọn các chunk muốn luyện rồi bấm 'Luyện viết'."
      />
    );
  }

  return (
    <div>
      {/* Mobile Chapter Selector Header */}
      <div
        className="mobile-only card mb-3"
        onClick={() => setShowMobileOutline(true)}
        role="button"
        tabIndex={0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(168,85,247,0.12))',
          borderColor: 'rgba(99,102,241,0.3)',
          gap: 10,
          width: '100%',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, border-color 0.15s ease',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--accent-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {activeGroup?.type === 'vocab' ? '📖 Từ vựng' : '🎧 Transcript'}: {activeGroup?.title} ({activeChunkInGroupIndex + 1}/{activeGroup?.chunks.length})
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeChunk ? activeChunk.phrase : 'Chọn bài'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {activeGroupTranscript && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setListeningTranscript(activeGroupTranscript);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', fontSize: 11.5, fontWeight: 700,
                color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.12)',
              }}
              title="Luyện nghe đoạn transcript này"
            >
              <Headphones size={13} />
              <span>Nghe script</span>
            </button>
          )}

          <div
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '6px 10px', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}
          >
            <Layers size={14} color="var(--accent-400)" />
            <span>Mục lục ({displayedChunkList.length})</span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="practice-layout">
        {/* Desktop Sidebar Course Outline Accordion */}
        <div className="desktop-only flex flex-col gap-2" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: 4 }}>
          {/* Header & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <p className="label" style={{ margin: 0, fontWeight: 700 }}>
                Mục lục ({groups.length} nhóm · {displayedChunkList.length} bài)
              </p>
              {completedChunks.length > 0 && onRemoveChunksFromPractice && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    const completedIds = completedChunks.map(c => c.id);
                    onRemoveChunksFromPractice(completedIds);
                  }}
                  title="Dọn dẹp các bài đã ôn xong khỏi tab Practice"
                  style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px' }}
                >
                  <Trash2 size={11} /> Bỏ bài đã xong ({completedChunks.length})
                </button>
              )}
            </div>

            {/* Filter Toggle Buttons: Cần ôn / Chưa xong vs Tất cả */}
            {completedChunks.length > 0 && (
              <div style={{
                display: 'flex',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                padding: 2,
                border: '1px solid var(--border-subtle)',
                gap: 2,
              }}>
                <button
                  type="button"
                  onClick={() => handleSetFilterMode('pending')}
                  style={{
                    flex: 1,
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    fontSize: 11,
                    fontWeight: filterMode === 'pending' ? 700 : 500,
                    background: filterMode === 'pending' ? 'var(--accent-500)' : 'transparent',
                    color: filterMode === 'pending' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '5px 4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Flame size={11} color={filterMode === 'pending' ? '#fff' : '#ef4444'} />
                  <span>Cần ôn / Chưa xong ({pendingChunks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFilterMode('all')}
                  style={{
                    flex: 1,
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    fontSize: 11,
                    fontWeight: filterMode === 'all' ? 700 : 500,
                    background: filterMode === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: filterMode === 'all' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '5px 4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Tất cả ({chunkList.length})</span>
                </button>
              </div>
            )}
          </div>

          <PracticeOutline
            groups={groups}
            activeChunkId={activeChunkId}
            onSelectChunk={handleSelectChunk}
            allProgress={allProgress}
            autoGenerating={autoGenerating}
            transcripts={transcripts}
            onListenScript={(tr) => setListeningTranscript(tr)}
          />
        </div>

        {/* Practice writing area */}
        <div style={{ minWidth: 0 }}>
          {activeChunk && hasValidExercises ? (
            <WritingSession
              key={activeChunk.id}
              chunk={activeChunk}
              exercises={activeExercises}
              progress={allProgress[activeChunk.id] || null}
              onComplete={handleComplete}
              onToast={onToast}
              onNavigatePrev={handlePrevChunk}
              onNavigateNext={handleNextChunk}
              hasPrev={activeChunkIndex > 0}
              hasNext={activeChunkIndex < displayedChunkList.length - 1}
              currentIndex={activeChunkIndex}
              totalChunks={displayedChunkList.length}
              onRegenerate={() => handleGenerateSingleChunk(activeChunk)}
            />
          ) : autoGenerating ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Spinner size={36} />
              <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>
                Đang chuẩn bị bài luyện viết…
              </p>
              <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                {autoGenProgress.done} / {autoGenProgress.total} chunk xong
              </p>
            </div>
          ) : isGeneratingCurrent ? (
            <div className="card animate-fade-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Spinner size={36} />
              <p style={{ marginTop: 16, color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>
                Đang tạo 3 câu bài tập cho &ldquo;{activeChunk?.phrase}&rdquo;…
              </p>
              <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                AI đang soạn các tình huống thực tế theo độ khó Cơ bản → Nâng cao. Vui lòng đợi vài giây.
              </p>
            </div>
          ) : isGeneratingAll ? (
            <div className="card animate-fade-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Spinner size={36} />
              <p style={{ marginTop: 16, color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>
                Đang tự động chuẩn bị bài tập cho các chunk còn thiếu…
              </p>
              <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                {genAllProgress.done} / {genAllProgress.total} chunk xong
              </p>
            </div>
          ) : (
            <div className="card animate-fade-in" style={{ padding: '36px 20px', textAlign: 'center', maxWidth: 500, margin: '20px auto' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-full)',
                background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Sparkles size={26} color="var(--accent-300)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                Chunk này chưa có bài luyện
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                AI sẽ soạn 3 câu thực tế (Cơ bản → Nâng cao) để bạn luyện dịch và khắc sâu cụm <strong>&ldquo;{activeChunk?.phrase}&rdquo;</strong>.
              </p>

              {genError && (
                <div style={{
                  marginBottom: 16, fontSize: 12.5, color: 'var(--error-text)',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                }}>
                  ⚠️ {genError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerateSingleChunk(activeChunk)}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', gap: 8, fontWeight: 700 }}
                >
                  <Sparkles size={16} /> Tạo bài luyện cho chunk này ngay
                </button>

                {chunksWithoutExercises.length > 1 && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleGenerateAllMissing}
                    style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 13, gap: 8 }}
                  >
                    <Layers size={15} /> Tự động tạo tất cả {chunksWithoutExercises.length} chunk còn thiếu
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Course Outline Modal */}
      {showMobileOutline && (
        <Modal
          title={`Mục lục (${displayedChunkList.length}/${chunkList.length} bài)`}
          onClose={() => setShowMobileOutline(false)}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
            {completedChunks.length > 0 && (
              <div style={{
                display: 'flex',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                padding: 2,
                border: '1px solid var(--border-subtle)',
                gap: 2,
                marginBottom: 10,
              }}>
                <button
                  type="button"
                  onClick={() => handleSetFilterMode('pending')}
                  style={{
                    flex: 1,
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    fontSize: 11.5,
                    fontWeight: filterMode === 'pending' ? 700 : 500,
                    background: filterMode === 'pending' ? 'var(--accent-500)' : 'transparent',
                    color: filterMode === 'pending' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    padding: '6px 4px',
                  }}
                >
                  🔥 Cần ôn ({pendingChunks.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFilterMode('all')}
                  style={{
                    flex: 1,
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    fontSize: 11.5,
                    fontWeight: filterMode === 'all' ? 700 : 500,
                    background: filterMode === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: filterMode === 'all' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    padding: '6px 4px',
                  }}
                >
                  Tất cả ({chunkList.length})
                </button>
              </div>
            )}
            <PracticeOutline
              groups={groups}
              activeChunkId={activeChunkId}
              onSelectChunk={handleSelectChunk}
              allProgress={allProgress}
              autoGenerating={autoGenerating}
              transcripts={transcripts}
              onListenScript={(tr) => {
                setShowMobileOutline(false);
                setListeningTranscript(tr);
              }}
            />
          </div>
        </Modal>
      )}

      {/* Group Completion Modal */}
      {completedGroupInfo && (
        <GroupCompletionModal
          group={completedGroupInfo.group}
          allProgress={allProgress}
          hasNextGroup={completedGroupInfo.hasNextGroup}
          onNextGroup={() => {
            if (completedGroupInfo.nextGroupChunkId) {
              setActiveChunkId(completedGroupInfo.nextGroupChunkId);
            }
            setCompletedGroupInfo(null);
          }}
          onListenScript={() => {
            if (completedGroupInfo.transcript) {
              setListeningTranscript(completedGroupInfo.transcript);
            }
          }}
          onClose={() => setCompletedGroupInfo(null)}
        />
      )}

      {/* Transcript Listening Modal */}
      {listeningTranscript && (
        <TranscriptListeningModal
          transcript={listeningTranscript}
          onClose={() => setListeningTranscript(null)}
        />
      )}
    </div>
  );
}
