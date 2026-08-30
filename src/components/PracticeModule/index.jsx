import { useState, useEffect, useRef } from 'react';
import { PenLine, ChevronRight, ChevronLeft, RotateCcw, Eye, EyeOff,
         CheckCircle, XCircle, AlertCircle, Sparkles, Loader } from 'lucide-react';
import { EmptyState, Badge, Spinner } from '../ui';
import { getSituations } from '../../store/storage';
import { gradeWriting } from '../../services/ai';
import { getApiKey } from '../../store/storage';

const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional:  'Functional',
  connector:   'Connector',
};

// ─── ScoreRing ────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
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
              ? <span style={{ display:'flex', alignItems:'center', gap:5, fontWeight:700, color:'var(--success-text)', fontSize:14 }}>
                  <CheckCircle size={16} /> Đã dùng đúng chunk!
                </span>
              : <span style={{ display:'flex', alignItems:'center', gap:5, fontWeight:700, color:'var(--error-text)', fontSize:14 }}>
                  <XCircle size={16} /> Chưa dùng chunk "{chunkPhrase}"
                </span>
            }
            {correct
              ? <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:'var(--success-text)' }}>
                  <CheckCircle size={13} /> Nghĩa đúng
                </span>
              : <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:'var(--error-text)' }}>
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

// ─── WritingSession ───────────────────────────────────────────
function WritingSession({ chunk, exercises, progress, onComplete, onToast }) {
  const [exIndex,       setExIndex]      = useState(0);
  const [userInput,     setUserInput]    = useState('');
  const [grading,       setGrading]      = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [showSample,    setShowSample]   = useState(false);
  const textareaRef = useRef(null);

  const exercise = exercises[exIndex];

  // Reset state when switching exercises or chunks
  useEffect(() => {
    setUserInput('');
    setGradingResult(null);
    setShowSample(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [exIndex, chunk.id]);

  const handleGrade = async () => {
    if (!userInput.trim()) {
      onToast('error', 'Vui lòng nhập bản dịch trước.');
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vào Settings để nhập.');
      return;
    }
    setGrading(true);
    try {
      const result = await gradeWriting(chunk, exercise.vietnameseSentence, userInput.trim(), apiKey);
      setGradingResult(result);
      onComplete(chunk.id, result.usedChunk && result.correct, result.score, result);
    } catch (err) {
      onToast('error', `Lỗi chấm bài: ${err.message}`);
    } finally {
      setGrading(false);
    }
  };

  const handleReset = () => {
    setUserInput('');
    setGradingResult(null);
    setShowSample(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleNext = () => {
    setExIndex(i => Math.min(i + 1, exercises.length - 1));
  };
  const handlePrev = () => {
    setExIndex(i => Math.max(i - 1, 0));
  };

  if (!exercise) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p className="text-muted">Chunk này chưa có bài luyện. Hãy vào Chunks để sinh bài tập trước.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chunk target card */}
      <div className="card-glass" style={{ padding: 20 }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-muted text-xs font-medium uppercase tracking-wider">Target Chunk</span>
          <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type]}</Badge>
          {progress && <Badge type="success">{progress.practiceCount} lần luyện{progress.lastScore != null ? ` · ${progress.lastScore}đ` : ''}</Badge>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {chunk.phrase}
        </div>
        <div className="flex gap-4 mt-1 flex-wrap">
          <span className="text-secondary text-sm">🇻🇳 {chunk.meaningVi}</span>
          {chunk.meaningEn && <span className="text-muted text-sm">🇬🇧 {chunk.meaningEn}</span>}
        </div>
      </div>

      {/* Exercise card */}
      <div className="card">
        {/* Nav bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="badge badge-neutral">Câu {exIndex + 1} / {exercises.length}</span>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={handlePrev} disabled={exIndex === 0}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleNext} disabled={exIndex === exercises.length - 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Vietnamese sentence prompt */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🇻🇳 Dịch câu sau sang tiếng Anh
          </p>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(67,56,202,0.05))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderLeft: '3px solid var(--accent-500)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            fontSize: 17, fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
            letterSpacing: '-0.01em',
          }}>
            {exercise.vietnameseSentence}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            💡 Dùng chunk <strong style={{ color: 'var(--accent-300)' }}>"{chunk.phrase}"</strong> trong câu dịch
          </p>
        </div>

        {/* Translation input */}
        <div style={{ marginBottom: 14 }}>
          <label className="label">Bản dịch của bạn (Tiếng Anh)</label>
          <textarea
            ref={textareaRef}
            id={`writing-input-${chunk.id}-${exIndex}`}
            className="textarea-field"
            rows={3}
            placeholder={`Nhập bản dịch tiếng Anh, có dùng "${chunk.phrase}"…`}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            disabled={grading}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGrade();
            }}
            style={{ resize: 'vertical', minHeight: 90 }}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Ctrl + Enter để chấm bài nhanh
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            id={`grade-btn-${chunk.id}`}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: 140 }}
            onClick={handleGrade}
            disabled={grading || !userInput.trim()}
          >
            {grading
              ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Đang chấm…</>
              : <><Sparkles size={15} /> Chấm bài AI</>
            }
          </button>

          <button
            id={`sample-btn-${chunk.id}`}
            className="btn btn-secondary"
            onClick={() => setShowSample(s => !s)}
            title="Xem câu dịch mẫu"
          >
            {showSample ? <><EyeOff size={14} /> Ẩn mẫu</> : <><Eye size={14} /> Xem câu mẫu</>}
          </button>

          {gradingResult && (
            <button className="btn btn-ghost btn-icon" onClick={handleReset} title="Làm lại">
              <RotateCcw size={15} />
            </button>
          )}
        </div>

        {/* Sample answer */}
        {showSample && exercise.sampleTranslation && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 14,
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ✅ Câu dịch mẫu tham khảo
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "{exercise.sampleTranslation}"
            </p>
          </div>
        )}
      </div>

      {/* Grading result */}
      <GradingResult result={gradingResult} chunkPhrase={chunk.phrase} />
    </div>
  );
}

// ─── PracticeModule (main export) ─────────────────────────────
export function PracticeModule({
  selectedChunks, chunks, allProgress,
  onProgressUpdate, onToast,
  autoGenerating = false,
  autoGenProgress = { done: 0, total: 0 },
}) {
  const chunkList = chunks.filter(c => selectedChunks.has(c.id));

  const [activeChunkId, setActiveChunkId] = useState(null);
  useEffect(() => {
    if (chunkList.length > 0 && !activeChunkId) {
      setActiveChunkId(chunkList[0].id);
    }
  }, [chunkList.length]);

  const handleComplete = (chunkId, success, score, feedback) => {
    onProgressUpdate(chunkId, success, score, feedback);
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
          const hasExercises = getSituations(chunk.id).length > 0;
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
                }}>
                  {chunk.phrase}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {!hasExercises && autoGenerating && <Spinner size={12} />}
                  {prog && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: prog.lastScore >= 80 ? 'var(--success-text)' : prog.lastScore >= 50 ? '#f59e0b' : 'var(--text-muted)',
                    }}>
                      {prog.lastScore != null ? `${prog.lastScore}đ` : '✓'}
                    </span>
                  )}
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
