import { BarChart2, TrendingUp, Award, Clock } from 'lucide-react';
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

// ─── ProgressModule (main export) ─────────────────────────────
export function ProgressModule({ allProgress, chunks }) {
  const progressEntries = Object.values(allProgress);
  const totalPractice   = progressEntries.reduce((s, p) => s + p.practiceCount, 0);
  const totalSuccess    = progressEntries.reduce((s, p) => s + (p.successCount || 0), 0);
  const learnedChunks   = progressEntries.filter(p => p.practiceCount >= 3).length;

  // Chunks with progress data
  const chunksWithProgress = chunks
    .filter(c => allProgress[c.id])
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

  return (
    <div>
      {/* Stats overview */}
      <div className="grid-3 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon={Award}      label="Chunks đã thuần thục" value={learnedChunks}   accent="99,102,241" />
        <StatCard icon={TrendingUp} label="Tổng lần luyện"       value={totalPractice}   accent="34,197,94"  />
        <StatCard icon={BarChart2}  label="Lần thành công"       value={totalSuccess}    accent="249,115,22" />
      </div>

      {/* Per-chunk progress */}
      <div className="section-header">
        <div>
          <div className="section-title">Chunk Progress</div>
          <div className="section-subtitle">{chunksWithProgress.length} chunks đã luyện</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 stagger-children">
        {chunksWithProgress.map(({ chunk, progress }) => (
          <ChunkProgressCard key={chunk.id} chunk={chunk} progress={progress} />
        ))}
      </div>
    </div>
  );
}
