import React, { useState, useMemo } from 'react';
import {
  BarChart2, TrendingUp, Award, Clock, ChevronDown, ChevronUp,
  Flame, CheckCircle2, Headphones, BookOpen, BrainCircuit, Zap,
  Search, ArrowRight, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { EmptyState, Badge, Pagination } from '../ui';
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

// ─── Stat Card Component (Clean Enterprise Metric Card) ───────
function ExecutiveMetricCard({ icon: Icon, title, value, subtitle, accentColor, progressPercent }) {
  return (
    <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <strong style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 2px' }}>
            {value}
          </strong>
          <small style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>
            {subtitle}
          </small>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-lg)',
            display: 'grid',
            placeItems: 'center',
            background: `rgba(${accentColor}, 0.12)`,
            color: `rgb(${accentColor})`,
            flexShrink: 0,
          }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>

      {typeof progressPercent === 'number' && (
        <div style={{ width: '100%', marginTop: 8 }}>
          <div style={{ height: 5, background: 'var(--border-default)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                height: '100%',
                background: `rgb(${accentColor})`,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skill Track Card Component ───────────────────────────────
function SkillTrackCard({ icon: Icon, title, subtitle, statsLabel, progressPercent, colorClass, onAction, actionLabel }) {
  return (
    <div className={`lesson-card ${colorClass}`}>
      <div className="lesson-top">
        <div className="lesson-icon">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <span className="level-pill">{progressPercent}% hoàn thành</span>
      </div>

      <h3>{title}</h3>
      <p>{subtitle}</p>

      <div className="lesson-meta" style={{ marginTop: 'auto', marginBottom: 12 }}>
        <CheckCircle2 size={13} strokeWidth={1.75} style={{ color: 'var(--success-text)' }} />
        <span>{statsLabel}</span>
      </div>

      <div className="progress-track mb-3" style={{ height: 6, background: 'var(--border-default)', borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%`, display: 'block', height: '100%', borderRadius: 999 }} />
      </div>

      {onAction && (
        <button
          className="lesson-action"
          onClick={onAction}
          title={actionLabel}
        >
          <span>{actionLabel}</span>
          <ArrowRight size={13} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

// ─── Individual Chunk Item Card ───────────────────────────────
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
    <div
      id={`progress-card-${chunk.id}`}
      style={{
        padding: '12px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        transition: 'all var(--transition-fast)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
            {chunk.phrase}
          </span>
          <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
          {progress && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: isDue ? 'rgba(239, 68, 68, 0.12)' : 'rgba(53, 106, 230, 0.12)',
                color: isDue ? '#ef4444' : '#60a5fa',
                border: `1px solid ${isDue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(53, 106, 230, 0.25)'}`,
              }}
            >
              {isDue && <Flame size={10} color="#ef4444" />}
              {progress.status === 'mastered' ? 'Mastered · ' : ''}Level {progress.srsLevel || 1} · {isDue ? 'Cần ôn ngay' : reviewInfo?.text || 'Đang học'}
            </span>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {chunk.meaningVi}
        </div>

        {/* Accuracy and time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: levelColor }} />
            {progress.practiceCount} lần luyện · {successRate}% chính xác
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {formatRelativeTime(progress.lastPracticed)}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {onRepractice && (
          <button
            onClick={() => onRepractice(chunk.id)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="Luyện tập lại chunk này"
          >
            <RotateCcw size={12} />
            <span>Luyện lại</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Consolidated Source Group Row Component ───────────────────
function SourceGroupAccordion({ group, isExpanded, onToggle, onRepracticeGroup, onRepracticeChunk }) {
  const { title, category, date, items, totalPractice, avgSuccess, masteredCount, dueCount } = group;

  const categoryIcon = category === 'listening' ? Headphones : category === 'vocab' ? Zap : BrainCircuit;
  const CategoryIcon = categoryIcon;

  const categoryBadgeLabel = category === 'listening' ? 'Listening Lab' : category === 'vocab' ? 'Từ vựng' : 'Kho Cụm từ';
  const categoryBadgeColor = category === 'listening' ? '#60a5fa' : category === 'vocab' ? '#df932c' : '#8564dc';
  const categoryBg = category === 'listening' ? 'rgba(53, 106, 230, 0.12)' : category === 'vocab' ? 'rgba(229, 155, 50, 0.12)' : 'rgba(131, 98, 221, 0.12)';

  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {/* Group Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
          background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              placeItems: 'center',
              background: categoryBg,
              color: categoryBadgeColor,
              flexShrink: 0,
            }}
          >
            <CategoryIcon size={16} strokeWidth={1.75} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                {title}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: categoryBg,
                  color: categoryBadgeColor,
                }}
              >
                {categoryBadgeLabel}
              </span>
              {dueCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Flame size={10} /> {dueCount} cần ôn
                </span>
              )}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{items.length} chunks</span>
              <span>·</span>
              <span>{totalPractice} lần luyện</span>
              <span>·</span>
              <span style={{ color: avgSuccess >= 70 ? 'var(--success-text)' : 'var(--text-secondary)' }}>
                {avgSuccess}% chính xác
              </span>
              <span>·</span>
              <span>{masteredCount} thuần thục</span>
              {date && (
                <>
                  <span>·</span>
                  <span>{date}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right action & toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {onRepracticeGroup && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRepracticeGroup(items.map(i => i.chunk.id));
              }}
              style={{ fontSize: 11, padding: '4px 9px', gap: 4 }}
              title="Luyện tập lại tất cả chunks trong nhóm này"
            >
              <RotateCcw size={11} />
              <span className="desktop-only">Luyện cả nhóm</span>
            </button>
          )}

          <div style={{ color: 'var(--text-muted)', display: 'grid', placeItems: 'center', width: 24, height: 24 }}>
            {isExpanded ? <ChevronUp size={16} strokeWidth={1.75} /> : <ChevronDown size={16} strokeWidth={1.75} />}
          </div>
        </div>
      </div>

      {/* Expanded Chunk List Drawer */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {items.map(({ chunk, progress }) => (
            <ChunkProgressCard
              key={chunk.id}
              chunk={chunk}
              progress={progress}
              onRepractice={onRepracticeChunk}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProgressModule Main Dashboard ────────────────────────────
export function ProgressModule({
  allProgress = {},
  chunks = [],
  transcripts = [],
  onRepractice,
  onNavigate,
  onStartDueReview,
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'listening' | 'vocab' | 'due'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  // 1. Chunks with actual practice history
  const chunksWithProgress = useMemo(() => {
    return chunks
      .filter(c => allProgress[c.id] && allProgress[c.id].practiceCount > 0)
      .map(c => ({ chunk: c, progress: allProgress[c.id] }))
      .sort((a, b) => (b.progress.lastPracticed || 0) - (a.progress.lastPracticed || 0));
  }, [chunks, allProgress]);

  // 2. High-level metric sums
  const progressEntries = Object.values(allProgress);
  const totalPractice   = progressEntries.reduce((s, p) => s + (p.practiceCount || 0), 0);
  const totalSuccess    = progressEntries.reduce((s, p) => s + (p.successCount || 0), 0);
  const learnedChunksCount = chunksWithProgress.length;
  const masteredChunksCount = chunksWithProgress.filter(
    ({ progress }) => progress.status === 'mastered' || (progress.practiceCount >= 5 && (progress.successCount / progress.practiceCount) >= 0.75)
  ).length;

  const totalChunksCount = chunks.length || 1;
  const overallAccuracy = totalPractice > 0 ? Math.round((totalSuccess / totalPractice) * 100) : 0;
  const overallMasteryPercent = Math.round((masteredChunksCount / totalChunksCount) * 100);

  // 3. Spaced Repetition Stats
  const srsStats = useMemo(() => getSrsStats(allProgress, chunks), [allProgress, chunks]);

  // 4. Learning Tracks Progress Breakdown
  // Listening Lab:
  const totalTranscripts = transcripts.length || 23;
  const practicedTranscriptsCount = useMemo(() => {
    return transcripts.filter(t =>
      chunks.some(c => c.transcriptId === t.id && allProgress[c.id]?.practiceCount > 0)
    ).length;
  }, [transcripts, chunks, allProgress]);
  const listeningPercent = Math.round((practicedTranscriptsCount / totalTranscripts) * 100);

  // Vocab:
  const vocabChunks = useMemo(() => chunks.filter(c => c.sourceType === 'vocab' || (!c.transcriptId && c.topic)), [chunks]);
  const vocabPracticedChunks = useMemo(() => vocabChunks.filter(c => allProgress[c.id]?.practiceCount > 0), [vocabChunks, allProgress]);
  const vocabPercent = vocabChunks.length > 0 ? Math.round((vocabPracticedChunks.length / vocabChunks.length) * 100) : 0;
  const vocabTopicsCount = useMemo(() => {
    const topics = new Set();
    vocabPracticedChunks.forEach(c => { if (c.topic) topics.add(c.topic); });
    return topics.size;
  }, [vocabPracticedChunks]);

  // Chunk Library:
  const chunkLibraryPercent = Math.round((learnedChunksCount / totalChunksCount) * 100);

  // 5. Consolidated Groups Calculation (FIXING DUPLICATE "Khác" & GROUPING CLEANLY)
  const consolidatedGroups = useMemo(() => {
    const transcriptMap = new Map();
    transcripts.forEach(t => transcriptMap.set(t.id, t));

    const map = new Map();

    chunksWithProgress.forEach(({ chunk, progress }) => {
      let gKey;
      let category = 'listening';
      let title = '';
      let date = null;

      if (chunk.transcriptId && transcriptMap.has(chunk.transcriptId)) {
        // Known transcript from Listening Lab
        gKey = `t_${chunk.transcriptId}`;
        category = 'listening';
        const t = transcriptMap.get(chunk.transcriptId);
        title = t.themeVi || t.theme || `Hội thoại #${chunk.transcriptId.slice(-4)}`;
        date = formatDate(t.createdAt);
      } else if (chunk.sourceType === 'vocab' || (!chunk.transcriptId && chunk.topic)) {
        // Vocabulary topic
        const topicRaw = chunk.topic || 'chung';
        gKey = `v_${topicRaw}`;
        category = 'vocab';
        title = `Từ vựng: ${topicRaw.charAt(0).toUpperCase() + topicRaw.slice(1)}`;
      } else {
        // ALL orphan or supplemental chunks grouped into ONE unified group!
        gKey = 'general_chunks';
        category = 'chunks';
        title = 'Cụm từ tổng hợp & Tự do';
      }

      if (!map.has(gKey)) {
        map.set(gKey, {
          key: gKey,
          category,
          title,
          date,
          items: [],
          lastPracticed: 0,
        });
      }

      const g = map.get(gKey);
      g.items.push({ chunk, progress });
      if (progress.lastPracticed && progress.lastPracticed > g.lastPracticed) {
        g.lastPracticed = progress.lastPracticed;
      }
    });

    // Compute aggregates for each group
    return Array.from(map.values()).map(g => {
      const groupPractice = g.items.reduce((s, { progress }) => s + (progress.practiceCount || 0), 0);
      const groupSuccess = g.items.reduce((s, { progress }) => s + (progress.successCount || 0), 0);
      const avgSuccess = groupPractice > 0 ? Math.round((groupSuccess / groupPractice) * 100) : 0;
      const masteredCount = g.items.filter(({ progress }) => progress.status === 'mastered' || (progress.practiceCount >= 5 && progress.successCount / progress.practiceCount >= 0.75)).length;
      const dueCount = g.items.filter(({ progress }) => isDueForReview(progress)).length;

      return {
        ...g,
        totalPractice: groupPractice,
        avgSuccess,
        masteredCount,
        dueCount,
      };
    }).sort((a, b) => b.lastPracticed - a.lastPracticed);
  }, [chunksWithProgress, transcripts]);

  // 6. Filter & Search
  const filteredGroups = useMemo(() => {
    let result = consolidatedGroups;

    // Filter by tab
    if (activeTab === 'listening') {
      result = result.filter(g => g.category === 'listening');
    } else if (activeTab === 'vocab') {
      result = result.filter(g => g.category === 'vocab');
    } else if (activeTab === 'due') {
      result = result.filter(g => g.dueCount > 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => {
        if (g.title.toLowerCase().includes(q)) return true;
        return g.items.some(
          i => i.chunk.phrase.toLowerCase().includes(q) || (i.chunk.meaningVi && i.chunk.meaningVi.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [consolidatedGroups, activeTab, searchQuery]);

  // Pagination calculation
  const totalItems = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + pageSize);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(paginatedGroups.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleRepracticeAllInGroup = (chunkIds) => {
    if (onRepractice && chunkIds.length > 0) {
      onRepractice(chunkIds[0]); // Practice start
    }
  };

  if (chunksWithProgress.length === 0) {
    return (
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px' }}>
        <EmptyState
          icon={<BarChart2 size={32} />}
          title="Chưa có dữ liệu tiến độ học tập"
          description="Bắt đầu luyện phản xạ với bài nghe hoặc từ vựng để theo dõi tiến độ và chu kỳ lặp lại ngắt quãng tại đây."
          action={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              {onNavigate && (
                <>
                  <button className="btn btn-primary" onClick={() => onNavigate('ai_listening')}>
                    <Headphones size={15} />
                    <span>Vào Listening Lab</span>
                  </button>
                  <button className="btn btn-secondary" onClick={() => onNavigate('vocab')}>
                    <Zap size={15} />
                    <span>Học từ vựng</span>
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 60 }} className="stagger-children">
      {/* ── Section 1: Executive KPI Metrics ─────────────────────── */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Tổng quan Tiến độ Toàn khóa
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Theo dõi khối lượng kiến thức đã tích lũy, tỷ lệ phản xạ tự nhiên và hiệu quả ghi nhớ
          </p>
        </div>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
        <ExecutiveMetricCard
          icon={Award}
          title="Cụm từ đã bắt đầu"
          value={`${learnedChunksCount} / ${totalChunksCount}`}
          subtitle={`Đạt ${overallMasteryPercent}% kho lưu trữ`}
          accentColor="53, 106, 230"
          progressPercent={overallMasteryPercent}
        />
        <ExecutiveMetricCard
          icon={ShieldCheck}
          title="Độ chính xác trung bình"
          value={`${overallAccuracy}%`}
          subtitle={`${totalSuccess} / ${totalPractice} lượt đạt chuẩn`}
          accentColor="34, 197, 94"
          progressPercent={overallAccuracy}
        />
        <ExecutiveMetricCard
          icon={TrendingUp}
          title="Cụm từ đã thuần thục"
          value={masteredChunksCount}
          subtitle="Đạt ngưỡng phản xạ tự nhiên (Level 5+)"
          accentColor="131, 98, 221"
          progressPercent={learnedChunksCount > 0 ? Math.round((masteredChunksCount / learnedChunksCount) * 100) : 0}
        />
        <ExecutiveMetricCard
          icon={Flame}
          title="Chu kỳ SRS hôm nay"
          value={srsStats.dueCount > 0 ? `${srsStats.dueCount} cần ôn` : 'Đã hoàn tất'}
          subtitle={`${srsStats.learningCount} cụm từ đang trong chu kỳ`}
          accentColor={srsStats.dueCount > 0 ? '239, 68, 68' : '34, 197, 94'}
        />
      </div>

      {/* ── Section 2: Progress by Skill & Learning Track ───────── */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Tiến độ theo từng Học phần & Kỹ năng
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Nắm rõ bạn đã học được những gì và khối lượng cụ thể trong từng hợp phần TOEIC
          </p>
        </div>
      </div>

      <div className="lesson-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
        <SkillTrackCard
          icon={Headphones}
          title="Listening Lab"
          subtitle="Hội thoại thực tế Part 3 & 4 và Dictation chép chính tả"
          statsLabel={`${practicedTranscriptsCount} / ${totalTranscripts} bài hội thoại đã thực hành`}
          progressPercent={listeningPercent}
          colorClass="blue"
          onAction={onNavigate ? () => onNavigate('ai_listening') : null}
          actionLabel="Vào phòng nghe"
        />
        <SkillTrackCard
          icon={Zap}
          title="Vocabulary Core"
          subtitle="5000 từ vựng cốt lõi trích xuất theo ngữ cảnh câu chuyện"
          statsLabel={`${vocabPracticedChunks.length} chunks đã học · ${vocabTopicsCount} chủ đề`}
          progressPercent={vocabPercent}
          colorClass="amber"
          onAction={onNavigate ? () => onNavigate('vocab') : null}
          actionLabel="Khám phá từ vựng"
        />
        <SkillTrackCard
          icon={BrainCircuit}
          title="Chunk Library"
          subtitle="Kho Collocation, Functional & Connector trọng tâm"
          statsLabel={`${learnedChunksCount} / ${totalChunksCount} cụm từ đã kích hoạt`}
          progressPercent={chunkLibraryPercent}
          colorClass="violet"
          onAction={onNavigate ? () => onNavigate('chunks') : null}
          actionLabel="Xem kho cụm từ"
        />
        <SkillTrackCard
          icon={BookOpen}
          title="Reading Lab"
          subtitle="24 chuyên đề ngữ pháp trọng tâm TOEIC Part 5 & 6"
          statsLabel="24 chuyên đề ngữ pháp hoàn chỉnh"
          progressPercent={100}
          colorClass="emerald"
          onAction={onNavigate ? () => onNavigate('reading') : null}
          actionLabel="Luyện ngữ pháp"
        />
      </div>

      {/* ── Section 3: Spaced Repetition Retention Funnel ───────── */}
      <div
        className="card mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(53, 106, 230, 0.06), rgba(131, 98, 221, 0.06))',
          border: '1px solid rgba(53, 106, 230, 0.22)',
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', display: 'grid', placeItems: 'center', color: '#ef4444' }}>
              <Flame size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text-primary)' }}>
                Chu trình Lặp lại ngắt quãng (Spaced Repetition System)
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Tối ưu hóa thời điểm ôn tập khoa học để chuyển kiến thức vào vùng trí nhớ dài hạn
              </div>
            </div>
          </div>

          {srsStats.dueCount > 0 && (
            <button
              id="progress-srs-review-btn"
              className="btn btn-primary"
              onClick={onStartDueReview}
              style={{ fontSize: 12, padding: '6px 14px', gap: 6, background: '#ef4444', borderColor: '#ef4444' }}
              title="Bắt đầu bài ôn tập ngắt quãng ngay"
            >
              <Flame size={14} />
              <span>Ôn tập ngay ({srsStats.dueCount} bài)</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: srsStats.dueCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              {srsStats.dueCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>Cần ôn ngay</div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#df932c' }}>
              {srsStats.dueSoon24hCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>Sắp đến hạn (24h)</div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#60a5fa' }}>
              {srsStats.learningCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>Đang ghi nhớ</div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success-text)' }}>
              {srsStats.masteredCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>Đã thuần thục</div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Compact History & Source Management ──────── */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nhật ký & Chi tiết theo Nguồn bài học
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Quản lý chi tiết từng bài học, tỷ lệ đạt và danh sách cụm từ đã ghi nhớ
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="text-button"
            onClick={expandAll}
            title="Mở tất cả các nhóm trên trang này"
          >
            Mở tất cả
          </button>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <button
            className="text-button"
            onClick={collapseAll}
            title="Thu gọn tất cả"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          background: 'var(--bg-surface)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            style={{ fontSize: 11.5, padding: '4px 10px' }}
          >
            Tất cả ({consolidatedGroups.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'listening' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('listening'); setCurrentPage(1); }}
            style={{ fontSize: 11.5, padding: '4px 10px', gap: 5 }}
          >
            <Headphones size={13} />
            <span>Listening ({consolidatedGroups.filter(g => g.category === 'listening').length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'vocab' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('vocab'); setCurrentPage(1); }}
            style={{ fontSize: 11.5, padding: '4px 10px', gap: 5 }}
          >
            <Zap size={13} />
            <span>Từ vựng ({consolidatedGroups.filter(g => g.category === 'vocab').length})</span>
          </button>
          {srsStats.dueCount > 0 && (
            <button
              className={`btn btn-sm ${activeTab === 'due' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setActiveTab('due'); setCurrentPage(1); }}
              style={{ fontSize: 11.5, padding: '4px 10px', gap: 5, color: activeTab === 'due' ? '#fff' : '#ef4444' }}
            >
              <Flame size={13} />
              <span>Cần ôn ({consolidatedGroups.filter(g => g.dueCount > 0).length})</span>
            </button>
          )}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
          <Search
            size={14}
            strokeWidth={1.75}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm cụm từ, bài học..."
            style={{ paddingLeft: 30, fontSize: 12, height: 32 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Paginated Groups List */}
      {paginatedGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            {searchQuery ? `Không tìm thấy bài học nào khớp với từ khóa "${searchQuery}"` : 'Không có bài học nào trong danh mục này'}
          </p>
        </div>
      ) : (
        <div>
          {paginatedGroups.map(group => (
            <SourceGroupAccordion
              key={group.key}
              group={group}
              isExpanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onRepracticeGroup={handleRepracticeAllInGroup}
              onRepracticeChunk={onRepractice}
            />
          ))}

          {/* Clean Enterprise Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: 18 }}>
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20]}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={Math.min(startIndex + pageSize, totalItems)}
                itemLabel="nguồn bài học"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
