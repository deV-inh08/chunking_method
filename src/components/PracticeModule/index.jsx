import { useState, useEffect, useRef } from 'react';
import {
  PenLine, ChevronRight, ChevronLeft, RotateCcw,
  CheckCircle, XCircle, Sparkles, Loader, RefreshCw, Volume2, VolumeX
} from 'lucide-react';
import { EmptyState, Badge, Spinner } from '../ui';
import { getSituations, saveSituations } from '../../store/storage';
import { gradeWriting, gradeWritingBatch, generateWritingExercises } from '../../services/ai';
import { getApiKey } from '../../store/storage';


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

// ─── WritingSession (batch grading 1 request for chunk) ────────
function WritingSession({ chunk, exercises, progress, onComplete, onToast }) {
  const [userInputs, setUserInputs] = useState({});
  const [showSamples, setShowSamples] = useState({});
  const [gradingResults, setGradingResults] = useState({});
  const [isGrading, setIsGrading] = useState(false);

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

      const avgScore = Math.round(totalScore / resultsArr.length);
      const isSuccess = successSentences >= 2 || (successSentences >= 1 && resultsArr.length === 1);

      onComplete(chunk.id, isSuccess, avgScore, res);
      onToast('success', `✓ Đã chấm xong ${resultsArr.length} câu! Điểm TB: ${avgScore}đ`);
    } catch (err) {
      console.error('Batch grading error:', err);
      onToast('error', `Lỗi chấm bài: ${err.message}`);
    } finally {
      setIsGrading(false);
    }
  };

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
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {chunk.meaningVi}
          {chunk.meaningEn && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {chunk.meaningEn}</span>}
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
          📝 Hãy hoàn thành <strong>ít nhất 2 câu</strong> bên dưới rồi bấm <strong>"Chấm bài AI"</strong> (chấm 1 lần duy nhất cho cả bài).
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
          setUserInput={(val) => setUserInputs(prev => ({ ...prev, [i]: val }))}
          showSample={!!showSamples[i]}
          setShowSample={(fn) => setShowSamples(prev => ({ ...prev, [i]: typeof fn === 'function' ? fn(prev[i]) : fn }))}
          gradingResult={gradingResults[i] || null}
          isGrading={isGrading}
        />
      ))}

      {/* Sticky Floating Batch Grade Bar */}
      <div
        className="card animate-fade-in"
        style={{
          position: 'sticky',
          bottom: 16,
          zIndex: 20,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(49, 46, 129, 0.95))',
          backdropFilter: 'blur(12px)',
          borderColor: canGrade ? 'rgba(99,102,241,0.6)' : 'var(--border-subtle)',
          boxShadow: canGrade ? '0 8px 32px rgba(99,102,241,0.3)' : '0 4px 20px rgba(0,0,0,0.3)',
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
            {filledCount >= 2
              ? `✓ Đã hoàn thành ${filledCount}/${exercises.length} câu — Sẵn sàng chấm AI!`
              : `Đã viết ${filledCount}/${exercises.length} câu (Bắt buộc điền ít nhất 2 câu để bấm chấm)`
            }
          </div>
        </div>

        <button
          id={`batch-grade-btn-${chunk.id}`}
          className="btn btn-primary"
          onClick={handleBatchGrade}
          disabled={!canGrade || isGrading}
          style={{
            padding: '10px 24px',
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: canGrade ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
          }}
        >
          {isGrading
            ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang chấm AI…</>
            : <><Sparkles size={16} /> Chấm bài AI ({filledCount} câu)</>
          }
        </button>
      </div>
    </div>
  );
}



// ─── PracticeModule (main export) ─────────────────────────────────
export function PracticeModule({
  selectedChunks, chunks, allProgress,
  onProgressUpdate, onToast,
  autoGenerating = false,
  autoGenProgress = { done: 0, total: 0 },
}) {
  const chunkList = chunks.filter(c => selectedChunks.has(c.id));

  const [activeChunkId, setActiveChunkId] = useState(null);
  const [regenId, setRegenId] = useState(null); // chunk being regenerated
  const [, forceUpdate] = useState(0); // trigger re-render after save

  useEffect(() => {
    if (chunkList.length > 0 && !activeChunkId) {
      setActiveChunkId(chunkList[0].id);
    }
  }, [chunkList.length]);

  const handleComplete = (chunkId, success, score, feedback) => {
    onProgressUpdate(chunkId, success, score, feedback);
  };

  // Regenerate exercises for a specific chunk (picks up vocabHints)
  const handleRegen = async (e, chunk) => {
    e.stopPropagation(); // don't activate the chunk
    const apiKey = getApiKey();
    if (!apiKey) { onToast('error', 'Chưa có API key. Vào Settings để nhập.'); return; }
    setRegenId(chunk.id);
    try {
      const result = await generateWritingExercises(chunk, apiKey);
      const exercises = (result.exercises || []).map((ex, i) => ({
        ...ex,
        id: ex.id || `ex_${chunk.id}_${i}`,
        chunkId: chunk.id,
      }));
      saveSituations(chunk.id, exercises);
      // Switch to this chunk and force re-render so WritingSession picks up new data
      setActiveChunkId(chunk.id);
      forceUpdate(n => n + 1);
      onToast('success', `Đã tái tạo bài luyện cho "${chunk.phrase}"`);
    } catch (err) {
      onToast('error', `Lỗi tái tạo: ${err.message}`);
    } finally {
      setRegenId(null);
    }
  };

  if (chunkList.length === 0 && !autoGenerating) {
    return (
      <EmptyState
        icon={<PenLine size={24} />}
        title="Chưa có chunk nào được chọn"
        description="Vào Chunks, chọn các chunk muốn luyện rồi bấm 'Luyện viết'."
      />
    );
  }

  const activeChunk = activeChunkId ? chunks.find(c => c.id === activeChunkId) : null;
  const activeExercises = activeChunk ? getSituations(activeChunk.id) : [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'min(260px, 38%) 1fr',
      gap: 24,
      alignItems: 'start',
    }}>
      {/* Chunk list sidebar */}
      <div className="flex flex-col gap-2">
        <p className="label mb-1">Chunks ({chunkList.length})</p>
        {chunkList.map((chunk) => {
          const prog = allProgress[chunk.id];
          const isActive = activeChunkId === chunk.id;
          const exercises = getSituations(chunk.id);
          const hasExercises = exercises.length > 0;
          // Detect old format (no vocabHints field)
          const isOldFormat = hasExercises && exercises[0].vocabHints === undefined;
          const isRegening = regenId === chunk.id;
          return (
            <button
              key={chunk.id}
              id={`practice-nav-${chunk.id}`}
              className="card"
              style={{
                textAlign: 'left', cursor: 'pointer', padding: '12px 14px',
                borderColor: isActive ? 'var(--accent-400)' : 'var(--border-subtle)',
                background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                opacity: (!hasExercises && autoGenerating) ? 0.5 : 1,
                transition: 'opacity 0.3s',
              }}
              onClick={() => setActiveChunkId(chunk.id)}
            >
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <span style={{
                  fontWeight: 600, fontSize: 14,
                  color: isActive ? 'var(--accent-300)' : 'var(--text-primary)',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {chunk.phrase}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {!hasExercises && autoGenerating && <Spinner size={12} />}
                  {prog && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: prog.lastScore >= 80 ? 'var(--success-text)' : prog.lastScore >= 50 ? '#f59e0b' : 'var(--text-muted)',
                    }}>
                      {prog.lastScore != null ? `${prog.lastScore}đ` : '✓'}
                    </span>
                  )}
                  {/* Regenerate button — always shown, highlighted when old format */}
                  <button
                    id={`regen-${chunk.id}`}
                    onClick={(e) => handleRegen(e, chunk)}
                    disabled={isRegening}
                    title={isOldFormat ? 'Tái tạo để có gợi ý từ vựng' : 'Tái tạo bài luyện'}
                    style={{
                      padding: '3px 5px',
                      borderRadius: 'var(--radius-sm)',
                      border: isOldFormat ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
                      background: isOldFormat ? 'rgba(251,191,36,0.1)' : 'transparent',
                      color: isOldFormat ? '#fbbf24' : 'var(--text-muted)',
                      cursor: isRegening ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center',
                      opacity: isRegening ? 0.5 : 1,
                    }}
                  >
                    <RefreshCw size={11} style={{ animation: isRegening ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
                {prog && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prog.practiceCount}× luyện</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Practice area */}
      <div>
        {activeChunk && activeExercises.length > 0 ? (
          <WritingSession
            key={activeChunk.id}
            chunk={activeChunk}
            exercises={activeExercises}
            progress={allProgress[activeChunk.id] || null}
            onComplete={handleComplete}
            onToast={onToast}
          />
        ) : autoGenerating ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Spinner size={36} />
            <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Đang sinh bài luyện viết…
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
  );
}
