import { useState } from 'react';
import { BarChart2, TrendingUp, Award, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { EmptyState, Badge } from '../ui';

const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional:  'Functional',
  connector:   'Connector',
};

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'vừa xong';
  if (mins < 60)  return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{
        width: 44, height: 44, margin: '0 auto 10px',
        background: `rgba(${accent}, 0.15)`, borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} style={{ color: `rgb(${accent})` }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── ChunkProgressCard ────────────────────────────────────────
function ChunkProgressCard({ chunk, progress }) {
  const successRate = progress.practiceCount > 0
    ? Math.round((progress.successCount / progress.practiceCount) * 100)
    : 0;

  const levelColor = progress.practiceCount >= 5
    ? 'var(--success-text)'
    : progress.practiceCount >= 2
    ? 'var(--warning-text)'
    : 'var(--text-muted)';

  return (
    <div id={`progress-card-${chunk.id}`} className="card animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {chunk.phrase}
            </span>
            <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type]}</Badge>
          </div>
          <p className="text-secondary text-sm mb-3">{chunk.meaningVi}</p>

          {/* Progress bar */}
          <div className="progress-bar mb-1">
            <div
              className="progress-bar-fill"
              style={{ width: `${successRate}%`, background: `linear-gradient(90deg, ${levelColor}, ${levelColor}88)` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs">{successRate}% thành công</span>
            <span className="text-muted text-xs flex items-center gap-1">
              <Clock size={10} /> {formatRelativeTime(progress.lastPracticed)}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: levelColor }}>
            {progress.practiceCount}
          </div>
          <div className="text-muted text-xs">lần luyện</div>
        </div>
      </div>
    </div>
  );
}

// ─── TranscriptGroup ──────────────────────────────────────────
function TranscriptGroup({ groupKey, groupLabel, groupDate, items, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  const totalPractice = items.reduce((s, { progress }) => s + progress.practiceCount, 0);
  const avgSuccess    = items.length > 0
    ? Math.round(items.reduce((s, { progress }) => {
        const rate = progress.practiceCount > 0
          ? (progress.successCount / progress.practiceCount) * 100 : 0;
        return s + rate;
      }, 0) / items.length)
    : 0;

  return (
    <div style={{
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* Group header */}
      <button
        id={`progress-group-${groupKey}`}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'var(--bg-surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(67,56,202,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MessageSquare size={14} style={{ color: 'var(--accent-400)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
            {groupLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
            <span>{items.length} chunks</span>
            <span>·</span>
            <span>{totalPractice} lần luyện</span>
            <span>·</span>
            <span>{avgSuccess}% thành công</span>
            {groupDate && (
              <>
                <span>·</span>
                <span>Tạo {groupDate}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Chunk cards */}
      {open && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-base)' }}>
          {items.map(({ chunk, progress }) => (
            <ChunkProgressCard key={chunk.id} chunk={chunk} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProgressModule (main export) ─────────────────────────────
export function ProgressModule({ allProgress, chunks, transcripts = [] }) {
  const progressEntries = Object.values(allProgress);
  const totalPractice   = progressEntries.reduce((s, p) => s + p.practiceCount, 0);
  const totalSuccess    = progressEntries.reduce((s, p) => s + (p.successCount || 0), 0);
  const learnedChunks   = progressEntries.filter(p => p.practiceCount >= 3).length;

  // Chunks with actual practice sessions (not just generated exercises)
  const chunksWithProgress = chunks
    .filter(c => allProgress[c.id] && allProgress[c.id].practiceCount > 0)
    .map(c => ({ chunk: c, progress: allProgress[c.id] }))
    .sort((a, b) => b.progress.lastPracticed - a.progress.lastPracticed);


  if (chunksWithProgress.length === 0) {
    return (
      <EmptyState
        icon={<BarChart2 size={24} />}
        title="Chưa có dữ liệu tiến độ"
        description="Luyện nói ít nhất một chunk để xem tiến độ tại đây."
      />
    );
  }

  // ── Group by transcript then by date ──────────────────────────
  // Build a map: transcriptId → transcript info
  const transcriptMap = {};
  transcripts.forEach(t => { transcriptMap[t.id] = t; });

  // Group chunks by their transcriptId
  const groupMap = new Map(); // key: transcriptId | 'unknown'
  chunksWithProgress.forEach(({ chunk, progress }) => {
    const tId  = chunk.transcriptId || 'unknown';
    if (!groupMap.has(tId)) groupMap.set(tId, []);
    groupMap.get(tId).push({ chunk, progress });
  });

  // Sort groups: most recently practiced first
  const groups = Array.from(groupMap.entries()).map(([tId, items]) => {
    const transcript = transcriptMap[tId];
    const lastPracticed = Math.max(...items.map(i => i.progress.lastPracticed || 0));
    const label = transcript
      ? (transcript.themeVi || transcript.theme || `Đoạn hội thoại ${tId.slice(-4)}`)
      : 'Không rõ nguồn';
    const date  = transcript ? formatDate(transcript.createdAt) : null;
    return { tId, label, date, items, lastPracticed };
  }).sort((a, b) => b.lastPracticed - a.lastPracticed);

  return (
    <div>
      {/* Stats overview */}
      <div className="grid-3 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon={Award}      label="Chunks đã thuần thục" value={learnedChunks}   accent="99,102,241" />
        <StatCard icon={TrendingUp} label="Tổng lần luyện"       value={totalPractice}   accent="34,197,94"  />
        <StatCard icon={BarChart2}  label="Lần thành công"       value={totalSuccess}    accent="249,115,22" />
      </div>

      {/* Per-transcript groups */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-title">Chunk Progress</div>
          <div className="section-subtitle">
            {chunksWithProgress.length} chunks đã luyện · {groups.length} đoạn hội thoại
          </div>
        </div>
      </div>

      <div>
        {groups.map(({ tId, label, date, items }, i) => (
          <TranscriptGroup
            key={tId}
            groupKey={tId}
            groupLabel={label}
            groupDate={date}
            items={items}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
