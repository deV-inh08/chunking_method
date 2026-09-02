import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PenLine, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, RotateCcw,
  CheckCircle, XCircle, Sparkles, Loader, RefreshCw, Volume2, VolumeX,
  Flame, BookMarked, FileText, Layers, Mic,
} from 'lucide-react';
import { EmptyState, Badge, Spinner, Modal } from '../ui';
import {
  getSituations, getApiKey, getPracticeDraft, savePracticeDraft, clearPracticeDraft,
  saveSpeakingProgress,
} from '../../store/storage';
import { gradeWritingBatch } from '../../services/ai';
import { formatTimeUntilReview, isDueForReview } from '../../services/srs';
import { SpeakingSession } from './SpeakingSession';


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
            {exercise.vietnameseSentence}
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
          <VocabHints hints={exercise.vocabHints} />
          {exercise.vocabHints === undefined && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
              <RefreshCw size={10} /> Tái tạo để xem gợi ý từ vựng
            </p>
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

function WritingSession({
  chunk, exercises, progress, onComplete, onToast,
  onNavigatePrev, onNavigateNext, hasPrev, hasNext, currentIndex, totalChunks,
}) {
  const isDue = isDueForReview(progress);

  const [userInputs, setUserInputs] = useState(() => {
    if (isDue) return {};
    return getPracticeDraft(chunk.id)?.inputs || {};
  });
  const [showSamples, setShowSamples] = useState(() => {
    if (isDue) return {};
    return getPracticeDraft(chunk.id)?.showSamples || {};
  });
  const [gradingResults, setGradingResults] = useState(() => {
    if (isDue) return {};
    return getPracticeDraft(chunk.id)?.gradingResults || {};
  });
  const [isGrading, setIsGrading] = useState(false);
  const [showSpeakingModal, setShowSpeakingModal] = useState(false);
  const [hasCompletedSpeaking, setHasCompletedSpeaking] = useState(false);
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
        if (onNavigateNext) {
          onNavigateNext();
        }
      }, 1800);
    } else {
      setIsAutoAdvancing(false);
      if (onToast) {
        onToast('success', '🎉 Chúc mừng bạn đã hoàn thành xuất sắc tất cả các chunk!');
      }
    }
  }, [hasNext, onNavigateNext, onToast]);

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
    onComplete(chunkId, safeScore >= 70, safeScore, updatedProg?.lastFeedback);
    if (onToast) onToast('success', `Đã lưu kết quả luyện nói: ${safeScore} điểm!`);

    setHasCompletedSpeaking(true);

    // Nếu phần Writing đã hoàn thành (ít nhất 2 câu đã được chấm điểm) -> Tự động chuyển sang chunk tiếp theo
    const writingDone = Object.keys(gradingResults || {}).length >= Math.min(2, exercises.length);
    if (writingDone) {
      triggerAutoAdvance();
    }
  };

  // Sync draft states when chunk changes
  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    setHasCompletedSpeaking(false);

    if (isDue) {
      // Khi chunk đến hạn ôn tập, clear bản nháp cũ để người học làm mới từ đầu
      clearPracticeDraft(chunk.id);
      setUserInputs({});
      setShowSamples({});
      setGradingResults({});
    } else {
      const draft = getPracticeDraft(chunk.id) || {};
      setUserInputs(draft.inputs || {});
      setShowSamples(draft.showSamples || {});
      setGradingResults(draft.gradingResults || {});
    }
  }, [chunk.id, isDue]);

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

      onComplete(chunk.id, isSuccess, avgScore, res);
      onToast('success', `✓ Đã chấm xong ${resultsArr.length} câu! Điểm TB: ${avgScore}đ`);

      // Nếu cả 2 phần (Writing vừa chấm xong & Speaking đã hoàn thành) -> Tự động chuyển sang chunk tiếp theo
      const writingDone = Object.keys(newResultsMap).length >= Math.min(2, exercises.length);
      if (writingDone && hasCompletedSpeaking) {
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

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
            {chunk.phrase}
          </span>
          <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
          {progress && (
            <Badge type="success">
              {progress.practiceCount} lần luyện{progress.lastScore != null ? ` · ${progress.lastScore}đ` : ''}
            </Badge>
          )}
          {progress && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: isDueForReview(progress) ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
              color: isDueForReview(progress) ? 'var(--error-text)' : 'var(--accent-300)',
              border: `1px solid ${isDueForReview(progress) ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
            }}>
              <Flame size={11} color={isDueForReview(progress) ? '#ef4444' : '#f59e0b'} />
              {isDueForReview(progress)
                ? '🔥 Đến hạn ôn tập'
                : progress.status === 'mastered'
                ? '🧠 Thành thạo'
                : `Level ${progress.srsLevel || 1} · ${formatTimeUntilReview(progress.nextReviewAt)?.text || 'Đang học'}`
              }
            </span>
          )}


        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {chunk.meaningVi}
          {chunk.meaningEn && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {chunk.meaningEn}</span>}
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
          📝 Hãy hoàn thành <strong>ít nhất 2 câu</strong> bên dưới rồi bấm <strong>"Chấm bài AI"</strong> (ôn tập theo câu mẫu đã học).
        </p>
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
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, gIdx) => {
        const isCollapsed = Boolean(collapsedGroups[group.id]);
        const completedCount = group.chunks.filter(c => allProgress[c.id]?.practiceCount > 0).length;
        const hasActive = group.chunks.some(c => c.id === activeChunkId);
        const hasDue = group.chunks.some(c => isDueForReview(allProgress[c.id]));

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

              <div style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }}>
                {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </div>
            </button>

            {/* Chunks inside this group */}
            {!isCollapsed && (
              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-surface)' }}>
                {group.chunks.map((chunk, cIdx) => {
                  const prog = allProgress[chunk.id];
                  const isActive = activeChunkId === chunk.id;
                  const isDone = prog && prog.practiceCount > 0;
                  const isDue = isDueForReview(prog);

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
  onProgressUpdate, onToast,
  autoGenerating = false,
  autoGenProgress = { done: 0, total: 0 },
  onStartDueReview,
}) {
  const chunkList = chunks.filter(c => selectedChunks.has(c.id));

  const [activeChunkId, setActiveChunkId] = useState(null);
  const [showMobileOutline, setShowMobileOutline] = useState(false);

  useEffect(() => {
    if (chunkList.length > 0 && (!activeChunkId || !chunkList.some(c => c.id === activeChunkId))) {
      setActiveChunkId(chunkList[0].id);
    }
  }, [chunkList, activeChunkId]);

  const groups = useMemo(() => {
    return groupPracticeChunks(chunkList, transcripts);
  }, [chunkList, transcripts]);

  const activeChunkIndex = chunkList.findIndex(c => c.id === activeChunkId);
  const activeChunk = activeChunkIndex >= 0 ? chunkList[activeChunkIndex] : null;
  const activeExercises = activeChunk ? getSituations(activeChunk.id) : [];

  const activeGroup = useMemo(() => {
    if (!activeChunk) return null;
    return groups.find(g => g.chunks.some(c => c.id === activeChunk.id));
  }, [groups, activeChunk]);

  const activeChunkInGroupIndex = useMemo(() => {
    if (!activeGroup || !activeChunk) return 0;
    return activeGroup.chunks.findIndex(c => c.id === activeChunk.id);
  }, [activeGroup, activeChunk]);

  const handleComplete = (chunkId, success, score, feedback) => {
    onProgressUpdate(chunkId, success, score, feedback);
  };

  const handleSelectChunk = (chunkId) => {
    setActiveChunkId(chunkId);
    setShowMobileOutline(false);
  };

  const handlePrevChunk = () => {
    if (activeChunkIndex > 0) {
      setActiveChunkId(chunkList[activeChunkIndex - 1].id);
    }
  };

  const handleNextChunk = () => {
    if (activeChunkIndex < chunkList.length - 1) {
      setActiveChunkId(chunkList[activeChunkIndex + 1].id);
    }
  };

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

        <div
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '6px 10px', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}
        >
          <Layers size={14} color="var(--accent-400)" />
          <span>Mục lục ({chunkList.length})</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="practice-layout">
        {/* Desktop Sidebar Course Outline Accordion */}
        <div className="desktop-only flex flex-col gap-2" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: 4 }}>
          <div className="flex items-center justify-between mb-1">
            <p className="label" style={{ margin: 0 }}>Mục lục ({groups.length} nhóm · {chunkList.length} bài)</p>
          </div>
          <PracticeOutline
            groups={groups}
            activeChunkId={activeChunkId}
            onSelectChunk={handleSelectChunk}
            allProgress={allProgress}
            autoGenerating={autoGenerating}
          />
        </div>

        {/* Practice writing area */}
        <div style={{ minWidth: 0 }}>
          {activeChunk && activeExercises.length > 0 ? (
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
              hasNext={activeChunkIndex < chunkList.length - 1}
              currentIndex={activeChunkIndex}
              totalChunks={chunkList.length}
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
          ) : (
            <EmptyState
              icon={<PenLine size={24} />}
              title="Chưa có bài luyện"
              description="Chunk này chưa được sinh bài tập. Vào Chunks → bấm 'Luyện viết'."
            />
          )}
        </div>
      </div>

      {/* Mobile Course Outline Modal */}
      {showMobileOutline && (
        <Modal
          title={`Mục lục bài luyện (${chunkList.length} chunks)`}
          onClose={() => setShowMobileOutline(false)}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
            <PracticeOutline
              groups={groups}
              activeChunkId={activeChunkId}
              onSelectChunk={handleSelectChunk}
              allProgress={allProgress}
              autoGenerating={autoGenerating}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
