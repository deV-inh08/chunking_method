import React, { useState, useMemo } from 'react';
import {
  Briefcase, Landmark, BookText, Cpu, Users,
  Sparkles, UtensilsCrossed, Plane, TrendingUp, ShoppingBag,
  Search, X, BookOpen, Eye
} from 'lucide-react';
import { ALL_SCENES } from '../../data/scenes';
import { getVisualProgress } from '../../store/storage';

const ICON_MAP = {
  Briefcase,
  Landmark,
  BookText,
  Cpu,
  Users,
  Sparkles,
  UtensilsCrossed,
  Plane,
  TrendingUp,
  ShoppingBag,
};

/**
 * TopicGridCatalog Component
 * Completely matches the UX/UI of the Vocab tab (media_1789579785734.png):
 * 1. Hero Card: Badge, Title, Description, and 3 Metric stat cards
 * 2. Controls Bar: Search bar & Status filter pills (Tất cả, Đang học, Đã xong)
 * 3. Topic Grid: Standard 3-column responsive grid (.vocab-topic-grid)
 */
export function TopicGridCatalog({ onSelectScene }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'completed'

  // Load progress for all scenes
  const allProgress = useMemo(() => {
    return getVisualProgress();
  }, []);

  // Compute stats for each scene
  const { sceneStatsMap, totalWords, totalLearned } = useMemo(() => {
    const map = {};
    let words = 0;
    let learned = 0;

    ALL_SCENES.forEach((s) => {
      const sceneItemsCount = s.data.zones.reduce((acc, z) => acc + (z.items?.length || 0), 0);
      words += sceneItemsCount;

      const sp = allProgress[s.sceneId] || {};
      const ch = sp.completedHotspots || {};
      const learnedCount = ch.level1 ? Object.keys(ch.level1).length : Object.keys(ch).length;
      learned += learnedCount;

      map[s.sceneId] = {
        total: sceneItemsCount,
        learned: learnedCount,
        pct: sceneItemsCount > 0 ? Math.round((learnedCount / sceneItemsCount) * 100) : 0,
        isCompleted: sceneItemsCount > 0 && learnedCount >= sceneItemsCount,
        isInProgress: learnedCount > 0 && learnedCount < sceneItemsCount,
      };
    });

    return { sceneStatsMap: map, totalWords: words, totalLearned: learned };
  }, [allProgress]);

  const overallPct = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  // Counts for filter pills
  const inProgressCount = useMemo(() => {
    return ALL_SCENES.filter((s) => sceneStatsMap[s.sceneId]?.isInProgress).length;
  }, [sceneStatsMap]);

  const completedCount = useMemo(() => {
    return ALL_SCENES.filter((s) => sceneStatsMap[s.sceneId]?.isCompleted).length;
  }, [sceneStatsMap]);

  // Filtered scenes
  const filteredScenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return ALL_SCENES.filter((s) => {
      // 1. Status Filter
      const stats = sceneStatsMap[s.sceneId] || {};
      if (statusFilter === 'in_progress' && !stats.isInProgress) return false;
      if (statusFilter === 'completed' && !stats.isCompleted) return false;

      // 2. Search Filter
      if (term) {
        const matchTitle = s.dayTitle.toLowerCase().includes(term);
        const matchCategory = s.category.toLowerCase().includes(term);
        const matchDesc = s.desc.toLowerCase().includes(term);
        const matchDay = `day ${s.dayNumber}`.includes(term) || `day 0${s.dayNumber}`.includes(term);
        if (!matchTitle && !matchCategory && !matchDesc && !matchDay) return false;
      }

      return true;
    });
  }, [searchTerm, statusFilter, sceneStatsMap]);

  return (
    <div className="vocab-container animate-fade-in" style={{ paddingBottom: 48 }}>
      {/* 1. Hero Header Banner (Exact replica of media_1789579785734.png) */}
      <div className="vocab-hero-card">
        <div className="vocab-hero-content">
          <div className="vocab-hero-badge">
            <Eye size={13} /> Thư viện từ vựng trực quan (Dual Coding)
          </div>
          <h2 className="vocab-hero-title">
            Không Gian Thị Giác & Bối Cảnh Thực Tế
          </h2>
          <p className="vocab-hero-desc">
            {totalWords} từ vựng & cụm collocation trọng tâm phân loại theo {ALL_SCENES.length} bối cảnh ảnh thực tế 16:9, tích hợp nhận diện vật thể và kích hoạt phản xạ hành động.
          </p>
        </div>

        {/* 3 Metric Stat Cards */}
        <div className="vocab-hero-stats">
          <div className="vocab-stat-card">
            <div className="vocab-stat-value">{totalLearned}</div>
            <div className="vocab-stat-label">Từ đã thành thạo</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#38bdf8' }}>{overallPct}%</div>
            <div className="vocab-stat-label">Độ phủ lộ trình</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#818cf8' }}>{ALL_SCENES.length}</div>
            <div className="vocab-stat-label">Chủ đề</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Status Filters Bar (Identical to Vocab tab) */}
      <div className="vocab-controls-bar">
        <div className="vocab-search-wrapper">
          <Search size={16} className="vocab-search-icon" />
          <input
            type="text"
            className="vocab-search-input"
            placeholder="Tìm kiếm theo ngày (Day 01..), chuyên đề, từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="vocab-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="vocab-filter-pills">
          <button
            className={`vocab-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({ALL_SCENES.length})
          </button>
          <button
            className={`vocab-filter-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            Đang học ({inProgressCount})
          </button>
          <button
            className={`vocab-filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Đã xong ({completedCount})
          </button>
        </div>
      </div>

      {/* 3. Topic Grid or Empty State */}
      {filteredScenes.length === 0 ? (
        <div className="vocab-empty-state">
          <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Không tìm thấy chủ đề phù hợp
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc trạng thái.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="vocab-topic-grid">
          {filteredScenes.map((scene) => {
            const IconComp = ICON_MAP[scene.icon] || BookText;
            const stats = sceneStatsMap[scene.sceneId] || { total: 20, learned: 0, pct: 0, isCompleted: false };
            const isCompleted = stats.isCompleted;

            return (
              <div
                key={scene.sceneId}
                id={`scene-card-${scene.sceneId}`}
                onClick={() => onSelectScene(scene.sceneId)}
                className={`vocab-topic-card ${isCompleted ? 'completed' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectScene(scene.sceneId);
                  }
                }}
              >
                {/* Header: Themed Icon + Badge */}
                <div className="vocab-card-header">
                  <div
                    className="vocab-topic-icon"
                    style={{
                      backgroundColor: scene.accentBg,
                      color: scene.accentColor,
                    }}
                  >
                    <IconComp size={22} strokeWidth={1.8} />
                  </div>
                  <span className={`vocab-badge-count ${isCompleted ? 'done' : ''}`}>
                    {isCompleted ? '✓ Đã xong' : `${stats.total} từ`}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="vocab-topic-title-en">{scene.dayTitle}</h3>
                <div className="vocab-topic-title-vi">
                  Chuyên đề: {scene.category}
                </div>

                {/* Description */}
                <p className="vocab-topic-desc">{scene.desc}</p>

                {/* Footer: Progress & Bar */}
                <div className="vocab-card-footer">
                  <div className="vocab-progress-row">
                    <span className="vocab-progress-label">
                      {isCompleted
                        ? 'Đã thành thạo 100%'
                        : stats.learned > 0
                        ? `Đã học ${stats.learned}/${stats.total} từ`
                        : 'Chưa học từ nào'}
                    </span>
                    <span
                      className="vocab-progress-value"
                      style={{ color: isCompleted ? '#4ade80' : undefined }}
                    >
                      {stats.pct}%
                    </span>
                  </div>
                  <div className="vocab-progress-track">
                    <div
                      className={`vocab-progress-bar ${isCompleted ? 'done' : ''}`}
                      style={{
                        width: `${stats.pct}%`,
                        background: isCompleted
                          ? '#22c55e'
                          : `linear-gradient(90deg, ${scene.accentColor}, #818cf8)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
