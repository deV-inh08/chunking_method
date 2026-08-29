import { useState, useEffect } from 'react';
import { Mic, MicOff, RotateCcw, ChevronRight, ChevronLeft, Check, X, Lightbulb, Volume2 } from 'lucide-react';
import { EmptyState, Badge } from '../ui';
import { useSpeech } from '../../hooks/useSpeech';
import { getSituations } from '../../store/storage';

const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional:  'Functional',
  connector:   'Connector',
};

// ─── RecordButton ─────────────────────────────────────────────
function RecordButton({ state, onStart, onStop, supported }) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <button
        id="record-btn"
        onClick={isRecording ? onStop : onStart}
        disabled={isProcessing || !supported}
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          border: 'none',
          cursor: isProcessing || !supported ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          background: isRecording
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
          boxShadow: isRecording
            ? '0 0 0 0 rgba(239,68,68,0.4)'
            : '0 4px 20px rgba(99,102,241,0.4)',
          animation: isRecording ? 'recordingPulse 1.5s ease-in-out infinite' : 'none',
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        {isProcessing
          ? <span style={{ fontSize: 28 }}>⏳</span>
          : isRecording
          ? <MicOff size={32} color="white" />
          : <Mic size={32} color="white" />
        }
      </button>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: isRecording ? 'var(--error-text)' : 'var(--text-muted)',
      }}>
        {isProcessing ? 'Đang xử lý…'
         : isRecording ? 'Đang ghi âm — bấm để dừng'
         : supported ? 'Bấm để ghi âm'
         : 'Trình duyệt không hỗ trợ ghi âm'}
      </span>
    </div>
  );
}

// ─── ResultFeedback ───────────────────────────────────────────
function ResultFeedback({ matched, finalText, chunkPhrase }) {
  if (matched === null) return null;

  // Highlight chunk in spoken text
  const highlightedText = () => {
    if (!finalText) return finalText;
    const lower = finalText.toLowerCase();
    const phraseNorm = chunkPhrase.toLowerCase();
    const idx = lower.indexOf(phraseNorm);
    if (idx === -1) return finalText;
    return (
      <>
        {finalText.slice(0, idx)}
        <mark style={{ background: 'rgba(99,102,241,0.3)', borderRadius: 4, padding: '1px 3px', color: 'var(--accent-300)' }}>
          {finalText.slice(idx, idx + chunkPhrase.length)}
        </mark>
        {finalText.slice(idx + chunkPhrase.length)}
      </>
    );
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderColor: matched ? 'var(--success-border)' : 'var(--error-border)',
        background: matched ? 'var(--success-bg)' : 'var(--error-bg)',
        padding: 20,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: matched ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {matched
            ? <Check size={20} style={{ color: 'var(--success-text)' }} />
            : <X size={20} style={{ color: 'var(--error-text)' }} />
          }
        </div>
        <div>
          <p style={{
            fontWeight: 700, fontSize: 15,
            color: matched ? 'var(--success-text)' : 'var(--error-text)',
          }}>
            {matched ? '✅ Đã dùng đúng chunk! Tuyệt vời!' : '❌ Chưa thấy chunk, thử lại nhé!'}
          </p>
        </div>
      </div>

      {finalText && (
        <div style={{
          background: 'rgba(0,0,0,0.2)', borderRadius: 8,
          padding: '10px 14px', fontSize: 14, color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            🎤 Câu bạn nói:
          </span>
          {highlightedText()}
        </div>
      )}
    </div>
  );
}

// ─── PracticeSession ──────────────────────────────────────────
function PracticeSession({ chunk, situations, progress, onComplete, onToast }) {
  const [sitIndex, setSitIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const situation = situations[sitIndex];
  const { state, interimText, finalText, matched, error, supported, start, stop, reset } = useSpeech(chunk.phrase);

  useEffect(() => {
    reset();
    setShowHint(false);
    setShowExample(false);
  }, [sitIndex]);

  useEffect(() => {
    if (error) onToast('error', error);
  }, [error]);

  useEffect(() => {
    if (state === 'done' && matched !== null) {
      onComplete(chunk.id, matched);
    }
  }, [state, matched]);

  const handleNext = () => {
    reset();
    setSitIndex(i => Math.min(i + 1, situations.length - 1));
  };

  const handlePrev = () => {
    reset();
    setSitIndex(i => Math.max(i - 1, 0));
  };

  if (!situation) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p className="text-muted">Chunk này chưa có tình huống. Hãy vào Chunks để sinh tình huống trước.</p>
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
          {progress && <Badge type="success">{progress.practiceCount} lần luyện</Badge>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {chunk.phrase}
        </div>
        <div className="flex gap-4 mt-1">
          <span className="text-secondary text-sm">🇻🇳 {chunk.meaningVi}</span>
          <span className="text-muted text-sm">🇬🇧 {chunk.meaningEn}</span>
        </div>
      </div>

      {/* Situation card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="badge badge-neutral">Situation {sitIndex + 1}/{situations.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={handlePrev} disabled={sitIndex === 0}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleNext} disabled={sitIndex === situations.length - 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
          padding: '16px 18px', lineHeight: 1.7,
          fontSize: 15, color: 'var(--text-primary)',
          borderLeft: '3px solid var(--accent-500)',
        }}>
          {situation.prompt}
        </div>

        {/* Hint */}
        <div className="flex gap-2 mt-3">
          <button
            className={`btn btn-sm ${showHint ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setShowHint(h => !h)}
          >
            <Lightbulb size={13} /> Hint
          </button>
          <button
            className={`btn btn-sm ${showExample ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setShowExample(e => !e)}
          >
            <Volume2 size={13} /> Example
          </button>
        </div>

        {showHint && situation.hint && (
          <div className="mt-2" style={{
            background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)',
            padding: '10px 14px', fontSize: 13, color: 'var(--warning-text)',
          }}>
            💡 {situation.hint}
          </div>
        )}

        {showExample && situation.exampleResponse && (
          <div className="mt-2" style={{
            background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)',
            padding: '10px 14px', fontSize: 13, color: 'var(--accent-300)',
          }}>
            📢 {situation.exampleResponse}
          </div>
        )}
      </div>

      {/* Interim text while recording */}
      {interimText && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <span className="text-muted text-xs">🎤 Đang nghe: </span>
          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{interimText}</span>
        </div>
      )}

      {/* Record button */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <RecordButton state={state} onStart={start} onStop={stop} supported={supported} />
      </div>

      {/* Result feedback */}
      <ResultFeedback matched={matched} finalText={finalText} chunkPhrase={chunk.phrase} />

      {/* Reset */}
      {state === 'done' && (
        <button className="btn btn-ghost w-full" onClick={reset}>
          <RotateCcw size={15} /> Thử lại
        </button>
      )}
    </div>
  );
}

// ─── PracticeModule (main export) ─────────────────────────────
export function PracticeModule({ selectedChunks, chunks, allProgress, onProgressUpdate, onToast }) {
  const [activeChunkId, setActiveChunkId] = useState(null);

  const chunkList = chunks.filter(c => selectedChunks.has(c.id));

  const handleComplete = (chunkId, matched) => {
    onProgressUpdate(chunkId, matched);
  };

  if (chunkList.length === 0) {
    return (
      <EmptyState
        icon={<Mic size={24} />}
        title="Chưa có chunk nào được chọn"
        description="Vào Chunks, chọn các chunk muốn luyện rồi bấm 'Practice'."
      />
    );
  }

  const activeChunk = activeChunkId
    ? chunks.find(c => c.id === activeChunkId)
    : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'min(260px, 38%) 1fr',
      gap: 24,
      alignItems: 'start',
    }}>
      {/* Chunk list sidebar */}
      <div className="flex flex-col gap-2">
        <p className="label mb-1">Selected Chunks ({chunkList.length})</p>
        {chunkList.map((chunk) => {
          const prog = allProgress[chunk.id];
          return (
            <button
              key={chunk.id}
              id={`practice-nav-${chunk.id}`}
              className="card"
              style={{
                textAlign: 'left', cursor: 'pointer', padding: '12px 14px',
                borderColor: activeChunkId === chunk.id ? 'rgba(99,102,241,0.5)' : undefined,
                background: activeChunkId === chunk.id ? 'rgba(99,102,241,0.08)' : undefined,
              }}
              onClick={() => setActiveChunkId(chunk.id)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 600, fontSize: 13 }}>{chunk.phrase}</span>
                {prog && <Badge type="success">✓</Badge>}
              </div>
              <div className="mt-1">
                <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type]}</Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* Practice area */}
      <div>
        {activeChunk ? (
          <PracticeSession
            key={activeChunk.id}
            chunk={activeChunk}
            situations={getSituations(activeChunk.id)}
            progress={allProgress[activeChunk.id] || null}
            onComplete={handleComplete}
            onToast={onToast}
          />
        ) : (
          <EmptyState
            icon={<Mic size={24} />}
            title="Chọn một chunk để bắt đầu"
            description="Bấm vào chunk bên trái để luyện nói."
          />
        )}
      </div>
    </div>
  );
}
