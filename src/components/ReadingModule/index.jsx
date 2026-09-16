import React, { useState, useMemo } from 'react';
import {
  BookOpen, Award, CheckCircle2, Layers,
  Search, FileText, Clock, Compass, TrendingUp
} from 'lucide-react';
import {
  GRAMMAR_CATEGORIES,
  getAllGrammarTopics,
  getGrammarCatalogStats
} from '../../services/grammarData';
import {
  getGrammarProgress,
  getOverallGrammarStats
} from '../../services/grammarStorage';
import { TopicCard } from './TopicCard';
import { GrammarQuizArena } from './GrammarQuizArena';

export function ReadingModule({ onSaveChunk, onNavigate, addToast }) {
  const [activeTab, setActiveTab] = useState('grammar'); // 'grammar' | 'part5' | 'part6' | 'part7'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuizTopic, setCurrentQuizTopic] = useState(null);
  const [currentQuizLevel, setCurrentQuizLevel] = useState('standard');
  const [progress, setProgress] = useState(() => getGrammarProgress());

  // Reload progress whenever returning from a quiz
  const refreshProgress = () => {
    setProgress(getGrammarProgress());
  };

  const catalogStats = useMemo(() => getGrammarCatalogStats(), []);
  const overallStats = useMemo(() => getOverallGrammarStats(), [progress]);
  const allTopics = useMemo(() => getAllGrammarTopics(), []);

  // Filter topics by category and search query
  const filteredTopics = useMemo(() => {
    return allTopics.filter(topic => {
      // Category filter
      if (selectedCategory !== 'all' && topic.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVi = topic.nameVi.toLowerCase().includes(q);
        const matchEn = topic.nameEn.toLowerCase().includes(q);
        const matchDesc = topic.description.toLowerCase().includes(q);
        return matchVi || matchEn || matchDesc;
      }
      return true;
    });
  }, [allTopics, selectedCategory, searchQuery]);

  const handleStartPractice = (topic, level = 'standard') => {
    setCurrentQuizTopic(topic);
    setCurrentQuizLevel(level);
  };

  const handleBackToCatalog = () => {
    setCurrentQuizTopic(null);
    refreshProgress();
  };

  // If in quiz mode, show GrammarQuizArena
  if (currentQuizTopic) {
    return (
      <GrammarQuizArena
        topic={currentQuizTopic}
        initialLevel={currentQuizLevel}
        onBack={handleBackToCatalog}
        onSaveChunk={onSaveChunk}
        addToast={addToast}
      />
    );
  }

  return (
    <div className="reading-module animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── Header: Comprehension Training ───────────────────────── */}
      <div className="hero-heading" style={{ marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            COMPREHENSION TRAINING
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Reading Lab
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Rèn luyện phản xạ ngữ pháp TOEIC Part 5 & 6, giải phẫu cấu trúc câu và làm chủ 24 chuyên đề trọng tâm.
          </p>
        </div>

        {onNavigate && (
          <button
            className="btn btn-secondary btn-sm desktop-only"
            onClick={() => onNavigate('chunks')}
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
            title="Xem kho cụm từ trích xuất từ câu hỏi ngữ pháp"
          >
            <Layers size={14} />
            <span>Kho Chunks ngữ pháp</span>
          </button>
        )}
      </div>

      {/* ── Executive Metric Cards ───────────────────────────────── */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-icon blue">
            <BookOpen size={18} strokeWidth={1.75} />
          </div>
          <div>
            <span>Câu hỏi chuẩn hóa</span>
            <strong>{catalogStats.totalQuestions} câu</strong>
            <small>{catalogStats.availableTopicsCount} / 24 chuyên đề</small>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon emerald" style={{ background: 'rgba(37, 160, 109, 0.15)', color: '#25a06d' }}>
            <TrendingUp size={18} strokeWidth={1.75} />
          </div>
          <div>
            <span>Đã luyện tập</span>
            <strong>{overallStats.totalPracticed} lượt</strong>
            <small>{overallStats.totalCorrect} câu trả lời đúng</small>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon orange">
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </div>
          <div>
            <span>Độ chính xác</span>
            <strong>{overallStats.accuracy}%</strong>
            <small>Trung bình tất cả chặng</small>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon violet">
            <Award size={18} strokeWidth={1.75} />
          </div>
          <div>
            <span>Đã làm chủ (Mastered)</span>
            <strong>{overallStats.masteredTopicsCount} / 24</strong>
            <small>Đạt ngưỡng điểm cao (≥ 85%)</small>
          </div>
        </div>
      </div>

      {/* ── Main Module Tabs ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 18,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab('grammar')}
          style={{
            background: activeTab === 'grammar' ? 'var(--bg-elevated)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'grammar' ? 'var(--border-default)' : 'transparent',
            color: activeTab === 'grammar' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'grammar' ? 700 : 500,
            fontSize: 12.5,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          <BookOpen size={14} strokeWidth={1.75} />
          <span>24 Chuyên đề Trọng tâm</span>
        </button>

        <button
          onClick={() => setActiveTab('part5')}
          style={{
            background: activeTab === 'part5' ? 'var(--bg-elevated)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'part5' ? 'var(--border-default)' : 'transparent',
            color: activeTab === 'part5' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'part5' ? 700 : 500,
            fontSize: 12.5,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          <FileText size={14} strokeWidth={1.75} />
          <span>Part 5 Thực tế (500 câu)</span>
          <span style={{ fontSize: 9.5, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4, color: 'var(--text-muted)' }}>
            Sắp có
          </span>
        </button>

        <button
          onClick={() => setActiveTab('part6')}
          style={{
            background: activeTab === 'part6' ? 'var(--bg-elevated)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'part6' ? 'var(--border-default)' : 'transparent',
            color: activeTab === 'part6' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'part6' ? 700 : 500,
            fontSize: 12.5,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Layers size={14} strokeWidth={1.75} />
          <span>Part 6 Đoạn văn (500 câu)</span>
          <span style={{ fontSize: 9.5, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4, color: 'var(--text-muted)' }}>
            Sắp có
          </span>
        </button>

        <button
          onClick={() => setActiveTab('part7')}
          style={{
            background: activeTab === 'part7' ? 'var(--bg-elevated)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'part7' ? 'var(--border-default)' : 'transparent',
            color: activeTab === 'part7' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'part7' ? 700 : 500,
            fontSize: 12.5,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Compass size={14} strokeWidth={1.75} />
          <span>Part 7 Đọc hiểu (1.000 câu)</span>
          <span style={{ fontSize: 9.5, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4, color: 'var(--text-muted)' }}>
            Sắp có
          </span>
        </button>
      </div>

      {/* ── Tab 1 Content: 24 Grammar Topics ────────────────────── */}
      {activeTab === 'grammar' && (
        <div>
          {/* Filters & Search Control Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 18,
            }}
          >
            {/* Category Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GRAMMAR_CATEGORIES.map(cat => {
                const count = cat.id === 'all'
                  ? allTopics.length
                  : allTopics.filter(t => t.category === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      background: isSelected ? 'var(--accent-500)' : 'var(--bg-surface)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-400)' : 'var(--border-default)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{cat.shortLabel}</span>
                    <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 240 }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Tìm chủ điểm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 28px 6px 30px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
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

          {/* Topics Grid (24 Cards) */}
          <div className="lesson-grid">
            {filteredTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                progress={progress[topic.id]}
                onStartPractice={handleStartPractice}
              />
            ))}
          </div>

          {filteredTopics.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                Không tìm thấy chủ điểm nào phù hợp với bộ lọc & từ khóa "{searchQuery}".
              </p>
            </div>
          )}
        </div>
      )}

      {/* Placeholders for Part 5, 6, 7 */}
      {activeTab !== 'grammar' && (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-lg)',
              margin: '0 auto 14px',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(53, 106, 230, 0.12)',
              color: 'var(--accent-400)',
            }}
          >
            <Clock size={24} strokeWidth={1.75} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeTab === 'part5' && 'Kho 500 câu Part 5 Thực tế đang được cập nhật'}
            {activeTab === 'part6' && 'Kho 500 câu Part 6 Điền đoạn văn đang được chuẩn bị'}
            {activeTab === 'part7' && 'Kho 1.000 câu Part 7 Đọc hiểu đang được nạp dữ liệu'}
          </h3>
          <p style={{ maxWidth: 480, margin: '0 auto 16px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Khung làm bài và cơ chế chấm điểm tự động đã hoàn thiện. Hãy rèn luyện vững chắc 24 chuyên đề ngữ pháp trọng tâm trước để bứt phá điểm số!
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setActiveTab('grammar')}
            style={{ fontWeight: 600 }}
          >
            Luyện 24 Chuyên đề Ngữ pháp trước
          </button>
        </div>
      )}
    </div>
  );
}
