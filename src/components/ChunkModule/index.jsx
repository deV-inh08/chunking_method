import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, PenLine, CheckSquare, Square, BookOpen, EyeOff, Eye } from 'lucide-react';
import { EmptyState, Badge, SkeletonCard } from '../ui';
import { generateWritingExercises } from '../../services/ai';
import { getApiKey } from '../../store/storage';

const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional:  'Functional',
  connector:   'Connector',
};

const FILTER_OPTIONS = [
  { id: 'all',         label: 'Tất cả' },
  { id: 'collocation', label: 'Collocation' },
  { id: 'functional',  label: 'Functional' },
  { id: 'connector',   label: 'Connector' },
];

// ─── ChunkCard ────────────────────────────────────────────────
function ChunkCard({ chunk, selected, onToggle, progress, generatingSit, onGenerate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      id={`chunk-card-${chunk.id}`}
      className="card animate-fade-in"
      style={{
        borderColor: selected ? 'rgba(99,102,241,0.4)' : undefined,
        background:  selected ? 'rgba(99,102,241,0.06)' : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          id={`chunk-select-${chunk.id}`}
          onClick={() => onToggle(chunk.id)}
          className="btn btn-ghost btn-icon"
          style={{ marginTop: 2, flexShrink: 0 }}
          title={selected ? 'Bỏ chọn' : 'Chọn để luyện tập'}
        >
          {selected
            ? <CheckSquare size={18} style={{ color: 'var(--accent-400)' }} />
            : <Square     size={18} style={{ color: 'var(--text-muted)' }}  />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Phrase + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {chunk.phrase}
            </span>
            <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
            {chunk.formality && chunk.formality !== 'neutral' && (
              <Badge type="neutral">{chunk.formality}</Badge>
            )}
            {progress && (
              <Badge type="success">✓ {progress.practiceCount}×</Badge>
            )}
          </div>

          {/* Meaning (VI only, rich) */}
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {chunk.meaningVi}
          </p>

          {/* Usage note */}
          {chunk.usageNote && (
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-muted)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--accent-300)', marginRight: 4 }}>Cách dùng:</span>
              {chunk.usageNote}
            </div>
          )}

          {/* Expandable: original sentence + another example */}
          <button
            className="flex items-center gap-1 text-muted text-xs"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Thu gọn' : 'Xem ví dụ trong bài & ví dụ khác'}
          </button>

          {expanded && (
            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* In the text */}
              {chunk.originalSentence && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    📌 Trong bài
                  </span>
                  <blockquote style={{
                    borderLeft: '3px solid var(--accent-500)',
                    paddingLeft: 10,
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontStyle: 'italic',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {chunk.originalSentence}
                  </blockquote>
                </div>
              )}
              {/* Another example */}
              {chunk.anotherExample && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    💡 Ví dụ khác
                  </span>
                  <blockquote style={{
                    borderLeft: '3px solid var(--chunk-connector-text)',
                    paddingLeft: 10,
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {chunk.anotherExample}
                  </blockquote>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate writing exercises button */}
        <button
          id={`gen-exercises-${chunk.id}`}
          className="btn btn-secondary btn-sm"
          style={{ flexShrink: 0 }}
          onClick={() => onGenerate(chunk)}
          disabled={generatingSit}
          title="Sinh bài luyện viết"
        >
          {generatingSit ? '⏳' : <><PenLine size={13} /> Luyện viết</>}
        </button>
      </div>
    </div>
  );
}

// ─── ChunkModule (main export) ────────────────────────────────
export function ChunkModule({
  chunks, selectedTranscriptId, transcripts,
  selectedChunks, onToggleChunk, onSituationsGenerated,
  allProgress, onToast, onStartPractice,
}) {
  const [filter, setFilter]           = useState('all');
  const [genId,  setGenId]            = useState(null);
  const [showPracticed, setShowPracticed] = useState(false);

  const transcript   = transcripts.find(t => t.id === selectedTranscriptId);

  // Split chunks into unpracticed / practiced
  const unpracticed = chunks.filter(c => !allProgress[c.id]);
  const practiced   = chunks.filter(c =>  allProgress[c.id]);
  const visibleChunks = showPracticed ? chunks : unpracticed;

  const filtered     = filter === 'all' ? visibleChunks : visibleChunks.filter(c => c.type === filter);
  const selectedCount = selectedChunks.size;

  // Group filtered chunks by groupName
  const groups = [];
  const seen   = new Map();
  filtered.forEach(chunk => {
    const key  = chunk.groupId  || 'ungrouped';
    const name = chunk.groupName || '';
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ key, name, chunks: [] });
    }
    groups[seen.get(key)].chunks.push(chunk);
  });

  const handleGenerate = async (chunk) => {
    const apiKey = getApiKey();
    if (!apiKey) { onToast('error', 'Chưa có API key. Vào Settings để nhập.'); return; }

    setGenId(chunk.id);
    try {
      const result = await generateWritingExercises(chunk, apiKey);
      const exercises = (result.exercises || []).map((ex, i) => ({
        ...ex,
        id: ex.id || `ex_${chunk.id}_${i}`,
        chunkId: chunk.id,
      }));
      onSituationsGenerated(chunk.id, exercises);
      onToast('success', `Đã sinh ${exercises.length} bài luyện viết cho "${chunk.phrase}"`);
    } catch (err) {
      onToast('error', `Lỗi sinh bài luyện: ${err.message}`);
    } finally {
      setGenId(null);
    }
  };

  if (chunks.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={24} />}
        title="Chưa có chunk nào"
        description="Vào Transcripts, paste transcript TOEIC và bấm Analyze để trích xuất chunk."
      />
    );
  }

  return (
    <div>
      {/* Theme banner */}
      {transcript && (transcript.themeVi || transcript.theme) && (
        <div
          className="card mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(67,56,202,0.08))',
            borderColor: 'rgba(99,102,241,0.25)',
          }}
        >
          <div className="flex items-start gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={16} color="white" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                {transcript.themeVi || transcript.theme}
                {transcript.theme && transcript.themeVi && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                    ({transcript.theme})
                  </span>
                )}
              </div>
              {transcript.themeDescription && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {transcript.themeDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              <Badge type={transcript.part === 'Part 3' ? 'part3' : 'part4'}>
                {transcript.part}
              </Badge>
              <span className="badge badge-neutral">{chunks.length} chunks</span>
            </div>
          </div>
        </div>
      )}

      {/* Simple transcript info (no theme) */}
      {transcript && !transcript.themeVi && !transcript.theme && (
        <div className="card mb-5" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge type={transcript.part === 'Part 3' ? 'part3' : 'part4'}>{transcript.part}</Badge>
              <span className="text-secondary text-sm">{transcript.text.slice(0, 60)}…</span>
            </div>
            <span className="badge badge-neutral">{chunks.length} chunks</span>
          </div>
        </div>
      )}

      {/* Filter + action bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="filter-group">
          {FILTER_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              id={`filter-${id}`}
              className={`chip ${filter === id ? 'active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <span style={{ opacity: 0.6 }}>
                ({id === 'all' ? visibleChunks.length : visibleChunks.filter(c => c.type === id).length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle practiced chunks */}
          {practiced.length > 0 && (
            <button
              id="toggle-practiced-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPracticed(s => !s)}
              title={showPracticed ? 'Ẩn chunk đã luyện' : `Xem ${practiced.length} chunk đã luyện`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: showPracticed ? 'var(--accent-300)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
              }}
            >
              {showPracticed
                ? <><EyeOff size={12} /> Ẩn đã luyện ({practiced.length})</>
                : <><Eye     size={12} /> Đã luyện ({practiced.length})</>
              }
            </button>
          )}

          {selectedCount > 0 && (
            <button
              id="start-practice-btn"
              className="btn btn-primary"
              onClick={onStartPractice}
            >
              <PenLine size={15} />
              Luyện viết {selectedCount} chunk{selectedCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Grouped chunk list */}
      {groups.length > 0 ? (
        <div className="flex flex-col gap-6 stagger-children">
          {groups.map((group, gi) => (
            <div key={group.key}>
              {/* Group header */}
              {group.name && (
                <div className="flex items-center gap-2 mb-3">
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--accent-400)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                  >
                    Nhóm {gi + 1}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {group.name}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                </div>
              )}

              <div className="flex flex-col gap-3">
                {group.chunks.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    selected={selectedChunks.has(chunk.id)}
                    onToggle={onToggleChunk}
                    progress={allProgress[chunk.id] || null}
                    generatingSit={genId === chunk.id}
                    onGenerate={handleGenerate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Layers size={24} />}
          title={
            unpracticed.length === 0 && !showPracticed
              ? '🎉 Đã luyện hết tất cả chunk!'
              : `Không có chunk loại "${filter}"`
          }
          description={
            unpracticed.length === 0 && !showPracticed
              ? `Tuyệt vời! ${practiced.length} chunk đã được luyện tập. Bấm "Đã luyện" để ôn lại.`
              : 'Thử chọn bộ lọc khác.'
          }
        />
      )}
    </div>
  );
}
