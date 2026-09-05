import { useState } from 'react';
import { BarChart2, TrendingUp, Award, Clock, ChevronDown, ChevronUp, MessageSquare, Flame } from 'lucide-react';
import { EmptyState, Badge } from '../ui';
import { isDueForReview, formatTimeUntilReview, getSrsStats } from '../../services/srs';

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
    <div className="card" style={{ textAlign: 'center', padding: '16px 14px' }}>
      <div style={{
        width: 38, height: 38, margin: '0 auto 8px',
        background: `rgba(${accent}, 0.15)`, borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} style={{ color: `rgb(${accent})` }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── ChunkProgressCard ────────────────────────────────────────
function ChunkProgressCard({ chunk, progress, onRepractice }) {
  const successRate = progress.practiceCount > 0
    ? Math.round((progress.successCount / progress.practiceCount) * 100)
    : 0;

  const isDue = isDueForReview(progress);
  const reviewInfo = formatTimeUntilReview(progress?.nextReviewAt);

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
            {progress && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)',
                background: isDue ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
                color: isDue ? 'var(--error-text)' : 'var(--accent-300)',
                border: `1px solid ${isDue ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.25)'}`,
              }}>
                <Flame size={10} color={isDue ? '#ef4444' : '#f59e0b'} />
                {progress.status === 'mastered' ? '🧠 ' : ''}Level {progress.srsLevel || 1} · {isDue ? 'Đến hạn ôn' : reviewInfo?.text || 'Đang học'}
              </span>
            )}
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

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: levelColor }}>
              {progress.practiceCount}
            </div>
            <div className="text-muted text-xs">lần luyện</div>
          </div>
          {onRepractice && (
            <button
              onClick={() => onRepractice(chunk.id)}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12, padding: '4px 10px', fontSize: 11 }}
              title="Luyện tập lại chunk này"
            >
              Luyện lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TranscriptGroup ──────────────────────────────────────────
function TranscriptGroup({ groupKey, groupLabel, groupDate, items, defaultOpen = true, onRepractice }) {
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
            <ChunkProgressCard key={chunk.id} chunk={chunk} progress={progress} onRepractice={onRepractice} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProgressModule (main export) ─────────────────────────────
export function ProgressModule({ allProgress, chunks, transcripts = [], onRepractice }) {
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

  // Build a map: transcriptId | vocab_topic_{topic} | 'unknown'
  const groupMap = new Map();
  chunksWithProgress.forEach(({ chunk, progress }) => {
    let tId;
    if (chunk.transcriptId) {
      tId = chunk.transcriptId;
    } else if (chunk.sourceType === 'vocab') {
      tId = `vocab_topic_${chunk.topic || 'misc'}`;
    } else {
      tId = 'unknown';
    }
    if (!groupMap.has(tId)) groupMap.set(tId, []);
    groupMap.get(tId).push({ chunk, progress });
  });

  // Sort groups: most recently practiced first
  const groups = Array.from(groupMap.entries()).map(([tId, items]) => {
    const transcript = transcriptMap[tId];
    const lastPracticed = Math.max(...items.map(i => i.progress.lastPracticed || 0));
    let label;
    if (transcript) {
      label = transcript.themeVi || transcript.theme || `Đoạn hội thoại ${tId.slice(-4)}`;
    } else if (tId.startsWith('vocab_topic_')) {
      const topicName = tId.replace('vocab_topic_', '').replace('misc', 'Chung');
      label = `📖 Từ vựng: ${topicName}`;
    } else {
      label = 'Khác';
    }
    const date  = transcript ? formatDate(transcript.createdAt) : null;
    return { tId, label, date, items, lastPracticed };
  }).sort((a, b) => b.lastPracticed - a.lastPracticed);

  // SRS Stats
  const srsStats = getSrsStats(allProgress, chunks);

  return (
    <div>
      {/* SRS Spaced Repetition Overview */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))', border: '1px solid rgba(99,102,241,0.25)', padding: '18px 20px' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame size={18} color="#f59e0b" />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
              Lộ trình Lặp lại ngắt quãng (Spaced Repetition)
            </span>
          </div>
          {srsStats.dueCount > 0 && onRepractice && (
            <span style={{ fontSize: 12, color: 'var(--error-text)', fontWeight: 700 }}>
              🔥 Có {srsStats.dueCount} chunk cần ôn hôm nay
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: srsStats.dueCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              {srsStats.dueCount}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>🔥 Cần ôn ngay</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-400)' }}>
              {srsStats.learningCount}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>⚡ Đang trong chu trình</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success-text)' }}>
              {srsStats.masteredCount}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>🧠 Đã thành thạo</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              {srsStats.dueSoon24hCount}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>⏳ Sắp đến hạn (24h)</div>
          </div>
        </div>
      </div>

      {/* General Stats overview */}
      <div className="grid-3 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon={Award}      label="Chunks đã thuần thục" value={learnedChunks}   accent="99,102,241" />
        <StatCard icon={TrendingUp} label="Tổng lần luyện"       value={totalPractice}   accent="34,197,94"  />
        <StatCard icon={BarChart2}  label="Lần thành công"       value={totalSuccess}    accent="249,115,22" />
      </div>

      {/* Per-transcript groups */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-title">Chi tiết tiến độ theo nguồn bài học</div>
          <div className="section-subtitle">
            {chunksWithProgress.length} chunks đã luyện ·{' '}
            {groups.filter(g => !g.tId.startsWith('vocab_topic_')).length} đoạn hội thoại ·{' '}
            {groups.filter(g => g.tId.startsWith('vocab_topic_')).length} chủ đề từ vựng
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
            onRepractice={onRepractice}
          />
        ))}
      </div>
    </div>
  );
}
