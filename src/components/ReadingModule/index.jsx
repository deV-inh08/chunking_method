import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Sparkles, Award, CheckCircle2, Zap, Layers,
  Search, FileText, Clock, Network, Flame, ShieldAlert,
  ArrowRight, Filter, AlertCircle, Compass
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
    <div className="reading-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Hero Header & Statistics */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(20, 20, 26, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-400, #818cf8)', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: 6, marginBottom: '0.5rem' }}>
              <BookOpen size={14} /> TOEIC READING MASTERY
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-normal, #f4f4f5)' }}>
              Luyện Đọc & 24 Chuyên Đề Ngữ Pháp
            </h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #9ca3af)' }}>
              Phản xạ 20s/câu không dịch nghĩa • Giải phẫu xương sống câu S-V-O • Khắc chế bẫy 990
            </p>
          </div>

          {/* Quick CTA to Chunks deck */}
          {onNavigate && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('chunks')}
              style={{
                fontSize: '0.78rem',
                color: 'var(--accent-300, #a5b4fc)',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Layers size={14} /> Xem kho Chunks đã lưu <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Dashboard Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12,
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
              Câu hỏi đã nạp
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {catalogStats.totalQuestions} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#9ca3af' }}>/ 1.440 câu</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #71717a)' }}>
              {catalogStats.availableTopicsCount} / 24 chuyên đề
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
              Đã luyện tập
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-normal, #f4f4f5)', marginTop: 2 }}>
              {overallStats.totalPracticed} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#9ca3af' }}>lượt</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
              {overallStats.totalCorrect} câu trả lời đúng
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
              Độ chính xác
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overallStats.accuracy >= 80 ? '#34d399' : '#f59e0b', marginTop: 2 }}>
              {overallStats.accuracy}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #71717a)' }}>
              Trung bình tất cả chặng
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
              Đã làm chủ (Mastered)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#facc15', marginTop: 2 }}>
              {overallStats.masteredTopicsCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#9ca3af' }}>/ 24</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#facc15' }}>
              Huy hiệu Chuyên gia 🏆
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs (24 Chuyên đề | Part 5 | Part 6 | Part 7) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <button
          onClick={() => setActiveTab('grammar')}
          style={{
            background: activeTab === 'grammar' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'grammar' ? '1px solid var(--accent-400, #818cf8)' : '1px solid transparent',
            color: activeTab === 'grammar' ? 'var(--accent-300, #a5b4fc)' : 'var(--text-muted, #9ca3af)',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={16} /> 24 Chuyên đề Trọng tâm
        </button>

        <button
          onClick={() => setActiveTab('part5')}
          style={{
            background: activeTab === 'part5' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'part5' ? '1px solid var(--accent-400, #818cf8)' : '1px solid transparent',
            color: activeTab === 'part5' ? 'var(--accent-300, #a5b4fc)' : 'var(--text-muted, #9ca3af)',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>Part 5 Thực tế (500 câu)</span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>
            Sắp có
          </span>
        </button>

        <button
          onClick={() => setActiveTab('part6')}
          style={{
            background: activeTab === 'part6' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'part6' ? '1px solid var(--accent-400, #818cf8)' : '1px solid transparent',
            color: activeTab === 'part6' ? 'var(--accent-300, #a5b4fc)' : 'var(--text-muted, #9ca3af)',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>Part 6 Đoạn văn (500 câu)</span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>
            Sắp có
          </span>
        </button>

        <button
          onClick={() => setActiveTab('part7')}
          style={{
            background: activeTab === 'part7' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'part7' ? '1px solid var(--accent-400, #818cf8)' : '1px solid transparent',
            color: activeTab === 'part7' ? 'var(--accent-300, #a5b4fc)' : 'var(--text-muted, #9ca3af)',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span>Part 7 Đọc hiểu (1.000 câu)</span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>
            Sắp có
          </span>
        </button>
      </div>

      {/* Tab 1 Content: 24 Grammar Topics */}
      {activeTab === 'grammar' && (
        <div>
          {/* Filters & Search Row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Category Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {GRAMMAR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    background: selectedCategory === cat.id ? 'var(--accent-500, #6366f1)' : 'rgba(255,255,255,0.04)',
                    border: selectedCategory === cat.id ? '1px solid var(--accent-400, #818cf8)' : '1px solid rgba(255,255,255,0.08)',
                    color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-muted, #9ca3af)',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: selectedCategory === cat.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.shortLabel}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #71717a)' }}
              />
              <input
                type="text"
                placeholder="Tìm chủ điểm ngữ pháp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-normal, #f4f4f5)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Topics Grid (24 Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1rem',
            }}
          >
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
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted, #71717a)' }}>
              <p>Không tìm thấy chủ điểm nào phù hợp với bộ lọc.</p>
            </div>
          )}
        </div>
      )}

      {/* Placeholders for Part 5, 6, 7 */}
      {activeTab !== 'grammar' && (
        <div
          className="card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: 14,
            background: 'var(--bg-elevated, #16171d)',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-400, #818cf8)',
            }}
          >
            <Clock size={28} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-normal, #f4f4f5)' }}>
            {activeTab === 'part5' && 'Đang chuẩn bị kho 500 câu Part 5 Thực tế'}
            {activeTab === 'part6' && 'Đang chuẩn bị kho 500 câu Part 6 Điền đoạn văn'}
            {activeTab === 'part7' && 'Đang chuẩn bị kho 1.000 câu Part 7 Đọc hiểu'}
          </h3>
          <p style={{ maxWidth: '520px', margin: '0 auto 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted, #9ca3af)', lineHeight: 1.5 }}>
            Khung làm bài và cơ chế chấm thi đã hoàn thiện. Khi bạn nạp file JSON đề thi thực tế vào thư mục, phần thi sẽ được kích hoạt tự động!
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
