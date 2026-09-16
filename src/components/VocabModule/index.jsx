import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft, Sparkles, Shuffle,
  X, CheckCircle, PenLine, RotateCcw,
  GraduationCap, Trophy, BookMarked,
  Briefcase, Cpu, HeartPulse, Plane,
  Utensils, Leaf, Palette, Landmark,
  Home, BookText, TrendingUp, BookOpen,
  AlertCircle, Search, Layers,
} from 'lucide-react';
import { Badge, Spinner } from '../ui';
import { generateChunksBatch } from '../../services/ai';
import {
  getApiKey, saveVocabChunks,
  getLearnedVocab, markVocabLearned,
  saveTodaySession, getChunks,
} from '../../store/storage';
import { getChunkIPA, formatIPA } from '../../services/phonetics';

// ── Tải vocab từ JSON tĩnh (không cần Supabase/script) ──────────
import VOCAB_RAW from '../../../data/vocab_5000.json';

// ── Helpers ──────────────────────────────────────────────────────
function makeWordId(word, topic) {
  const slug = (s) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  return `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POS_COLORS = {
  noun: 'part3', verb: 'part4', adjective: 'collocation',
  adverb: 'connector', conjunction: 'functional', preposition: 'neutral',
};

const MIN_WORDS = 20;
const MAX_WORDS = 50;

const TOPIC_METADATA = {
  'Daily Life & Family': {
    titleVi: 'Đời sống & Gia đình',
    desc: 'Từ vựng sinh hoạt hàng ngày, gia đình, nhà cửa và các mối quan hệ đời thường.',
    Icon: Home,
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.14)',
  },
  'General & Function Words': {
    titleVi: 'Từ vựng cốt lõi & Cấu trúc',
    desc: 'Đại từ, liên từ, từ nối và các mẫu cấu trúc ngữ pháp thông dụng trong giao tiếp.',
    Icon: BookText,
    accentColor: '#8b5cf6',
    accentBg: 'rgba(139, 92, 246, 0.14)',
  },
  'Business & Work': {
    titleVi: 'Kinh doanh & Công sở',
    desc: 'Đàm phán, thương mại, quy trình văn phòng, hợp đồng và quản trị dự án.',
    Icon: Briefcase,
    accentColor: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.14)',
  },
  'Food & Dining': {
    titleVi: 'Ẩm thực & Nhà hàng',
    desc: 'Món ăn, đồ uống, cách đặt bàn, phong cách phục vụ và ẩm thực quốc tế.',
    Icon: Utensils,
    accentColor: '#f97316',
    accentBg: 'rgba(249, 115, 22, 0.14)',
  },
  'Nature & Environment': {
    titleVi: 'Tự nhiên & Môi trường',
    desc: 'Thời tiết, sinh thái học, biến đổi khí hậu và thế giới động thực vật.',
    Icon: Leaf,
    accentColor: '#22c55e',
    accentBg: 'rgba(34, 197, 94, 0.14)',
  },
  'Arts & Entertainment': {
    titleVi: 'Nghệ thuật & Giải trí',
    desc: 'Điện ảnh, âm nhạc, triển lãm, nghệ thuật thị giác và sự kiện văn hóa.',
    Icon: Palette,
    accentColor: '#f43f5e',
    accentBg: 'rgba(244, 63, 94, 0.14)',
  },
  'Health & Medicine': {
    titleVi: 'Sức khỏe & Y tế',
    desc: 'Khám chữa bệnh, thể lực, triệu chứng thường gặp và chăm sóc sức khỏe.',
    Icon: HeartPulse,
    accentColor: '#ef4444',
    accentBg: 'rgba(239, 68, 68, 0.14)',
  },
  'Emotions & Personality': {
    titleVi: 'Cảm xúc & Tính cách',
    desc: 'Tâm trạng, cảm xúc cá nhân, phẩm chất đạo đức và tâm lý con người.',
    Icon: Sparkles,
    accentColor: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.14)',
  },
  'Education & Academic': {
    titleVi: 'Giáo dục & Học thuật',
    desc: 'Trường học, nghiên cứu học thuật, thi cử, học bổng và môi trường đại học.',
    Icon: GraduationCap,
    accentColor: '#06b6d4',
    accentBg: 'rgba(6, 182, 212, 0.14)',
  },
  'Social & Politics': {
    titleVi: 'Xã hội & Chính trị',
    desc: 'Cộng đồng, pháp chế, chính sách công quyền, ngoại giao và xã hội học.',
    Icon: Landmark,
    accentColor: '#ec4899',
    accentBg: 'rgba(236, 72, 153, 0.14)',
  },
  'Travel & Transportation': {
    titleVi: 'Du lịch & Di chuyển',
    desc: 'Sân bay, khách sạn, phương tiện công cộng, đặt vé và trải nghiệm khám phá.',
    Icon: Plane,
    accentColor: '#0ea5e9',
    accentBg: 'rgba(14, 165, 233, 0.14)',
  },
  'Communication & Media': {
    titleVi: 'Truyền thông & Báo chí',
    desc: 'Tin tức thời sự, mạng xã hội, viễn thông và trao đổi tương tác thông tin.',
    Icon: BookOpen,
    accentColor: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.14)',
  },
  'Science & Technology': {
    titleVi: 'Khoa học & Công nghệ',
    desc: 'Công nghệ số, điện tử, vi mạch, phát minh đổi mới và trí tuệ nhân tạo.',
    Icon: Cpu,
    accentColor: '#6366f1',
    accentBg: 'rgba(99, 102, 241, 0.14)',
  },
  'Law & Crime': {
    titleVi: 'Pháp luật & Tư pháp',
    desc: 'Hệ thống pháp luật, điều lệ tòa án, bản quyền và an ninh pháp lý.',
    Icon: AlertCircle,
    accentColor: '#eab308',
    accentBg: 'rgba(234, 179, 8, 0.14)',
  },
};

function getTopicMeta(topic) {
  if (TOPIC_METADATA[topic]) return TOPIC_METADATA[topic];
  return {
    titleVi: 'Chủ đề chuyên sâu',
    desc: 'Từ vựng trọng điểm và cụm chunking theo ngữ cảnh thực tế.',
    Icon: BookOpen,
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.14)',
  };
}

// ─── Screen 1: Topic Browser ─────────────────────────────────────
function TopicBrowser({ words, learnedVocab, onSelectTopic }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'completed'

  const topicStats = useMemo(() => {
    const map = {};
    words.forEach(w => {
      if (!map[w.topic]) map[w.topic] = { total: 0, learned: 0 };
      map[w.topic].total++;
      const wid = makeWordId(w.word, w.topic);
      if (learnedVocab[wid]) map[w.topic].learned++;
    });
    return map;
  }, [words, learnedVocab]);

  const topics = useMemo(() => Object.keys(topicStats).sort(), [topicStats]);
  const totalLearned = Object.values(learnedVocab).length;
  const totalWords = words.length;
  const overallPct = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  // Topic filter counts
  const completedTopicsCount = useMemo(() => {
    return topics.filter(t => {
      const s = topicStats[t];
      return s && s.total > 0 && s.learned >= s.total;
    }).length;
  }, [topics, topicStats]);

  const inProgressTopicsCount = useMemo(() => {
    return topics.filter(t => {
      const s = topicStats[t];
      return s && s.learned > 0 && s.learned < s.total;
    }).length;
  }, [topics, topicStats]);

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      const meta = getTopicMeta(topic);
      const s = topicStats[topic] || { total: 0, learned: 0 };
      const isCompleted = s.total > 0 && s.learned >= s.total;
      const isInProgress = s.learned > 0 && !isCompleted;

      // Status filter
      if (statusFilter === 'in_progress' && !isInProgress) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitleEn = topic.toLowerCase().includes(q);
        const matchTitleVi = meta.titleVi.toLowerCase().includes(q);
        const matchDesc = meta.desc.toLowerCase().includes(q);
        if (!matchTitleEn && !matchTitleVi && !matchDesc) return false;
      }

      return true;
    });
  }, [topics, topicStats, statusFilter, searchTerm]);

  return (
    <div className="vocab-container">
      {/* Hero Header Banner */}
      <div className="vocab-hero-card">
        <div className="vocab-hero-content">
          <div className="vocab-hero-badge">
            <GraduationCap size={13} /> Thư viện từ vựng chuẩn hóa
          </div>
          <h2 className="vocab-hero-title">Từ vựng TOEIC & Giao tiếp</h2>
          <p className="vocab-hero-desc">
            {words.length.toLocaleString()} từ vựng trọng tâm phân loại theo {topics.length} chủ đề thực chiến, tích hợp trích xuất cụm chunking phản xạ.
          </p>
        </div>

        {/* 3 Metric cards */}
        <div className="vocab-hero-stats">
          <div className="vocab-stat-card">
            <div className="vocab-stat-value">{totalLearned.toLocaleString()}</div>
            <div className="vocab-stat-label">Từ đã thành thạo</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#38bdf8' }}>{overallPct}%</div>
            <div className="vocab-stat-label">Độ phủ từ vựng</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#818cf8' }}>{topics.length}</div>
            <div className="vocab-stat-label">Chủ đề thực chiến</div>
          </div>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="vocab-controls-bar">
        <div className="vocab-search-wrapper">
          <Search size={16} className="vocab-search-icon" />
          <input
            type="text"
            className="vocab-search-input"
            placeholder="Tìm kiếm theo chủ đề, lĩnh vực..."
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
            Tất cả ({topics.length})
          </button>
          <button
            className={`vocab-filter-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            Đang học ({inProgressTopicsCount})
          </button>
          <button
            className={`vocab-filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Đã xong ({completedTopicsCount})
          </button>
        </div>
      </div>

      {/* Topic Grid */}
      {filteredTopics.length === 0 ? (
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
          {filteredTopics.map(topic => {
            const s = topicStats[topic] || { total: 0, learned: 0 };
            const pct = s.total > 0 ? Math.round((s.learned / s.total) * 100) : 0;
            const isCompleted = s.total > 0 && s.learned >= s.total;
            const meta = getTopicMeta(topic);
            const TopicIcon = meta.Icon;

            return (
              <div
                key={topic}
                id={`topic-btn-${topic.replace(/\W+/g, '-')}`}
                onClick={() => onSelectTopic(topic)}
                className={`vocab-topic-card ${isCompleted ? 'completed' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTopic(topic);
                  }
                }}
              >
                <div className="vocab-card-header">
                  <div
                    className="vocab-topic-icon"
                    style={{
                      backgroundColor: meta.accentBg,
                      color: meta.accentColor,
                    }}
                  >
                    <TopicIcon size={22} strokeWidth={1.8} />
                  </div>
                  <span className={`vocab-badge-count ${isCompleted ? 'done' : ''}`}>
                    {isCompleted ? '✓ Đã xong' : `${s.total} từ`}
                  </span>
                </div>

                <h3 className="vocab-topic-title-en">{topic}</h3>
                <div className="vocab-topic-title-vi">{meta.titleVi}</div>
                <p className="vocab-topic-desc">{meta.desc}</p>

                <div className="vocab-card-footer">
                  <div className="vocab-progress-row">
                    <span className="vocab-progress-label">
                      {isCompleted
                        ? 'Đã thành thạo 100%'
                        : s.learned > 0
                        ? `Đã học ${s.learned}/${s.total} từ`
                        : 'Chưa học từ nào'}
                    </span>
                    <span className="vocab-progress-value" style={{ color: isCompleted ? '#4ade80' : undefined }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="vocab-progress-track">
                    <div
                      className={`vocab-progress-bar ${isCompleted ? 'done' : ''}`}
                      style={{
                        width: `${pct}%`,
                        background: isCompleted
                          ? '#22c55e'
                          : `linear-gradient(90deg, ${meta.accentColor}, #818cf8)`,
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

// ─── Screen 2: Word Selector ──────────────────────────────────────
function WordSelector({ topic, words, learnedVocab, onStartLearning, onBack }) {
  // Tách từ chưa học và đã học
  const unlearnedWords = useMemo(() =>
    words.filter(w => !learnedVocab[makeWordId(w.word, w.topic)]),
    [words, learnedVocab]
  );
  const learnedCount = words.length - unlearnedWords.length;

  const [count, setCount] = useState(() => Math.min(MIN_WORDS, unlearnedWords.length));
  const [selectedWords, setSelectedWords] = useState([]);

  // Khởi tạo / khi count thay đổi: random N từ
  const randomize = useCallback(() => {
    const shuffled = shuffle(unlearnedWords);
    setSelectedWords(shuffled.slice(0, count));
  }, [unlearnedWords, count]);

  useEffect(() => { randomize(); }, [count]); // eslint-disable-line

  // Bỏ 1 từ → thay bằng từ random từ pool còn lại
  const handleSwap = useCallback((wordToRemove) => {
    setSelectedWords(prev => {
      const selectedIds = new Set(prev.map(w => makeWordId(w.word, w.topic)));
      const pool = unlearnedWords.filter(w => !selectedIds.has(makeWordId(w.word, w.topic)));
      const replacement = pool[Math.floor(Math.random() * pool.length)];
      return prev
        .filter(w => makeWordId(w.word, w.topic) !== makeWordId(wordToRemove.word, wordToRemove.topic))
        .concat(replacement ? [replacement] : []);
    });
  }, [unlearnedWords]);

  const canLearn = selectedWords.length > 0;

  return (
    <div>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-5">
        <button id="back-to-topics" className="btn btn-ghost btn-sm" onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={14} /> Chủ đề
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1 }}>
          {topic}
        </div>
        <Badge type="neutral">{words.length} từ · {learnedCount} đã học</Badge>
      </div>

      {/* Count stepper */}
      <div className="vocab-stepper-card mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
              Số từ muốn học hôm nay
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {unlearnedWords.length} từ chưa học trong chủ đề này
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCount(c => Math.max(1, c - 5))}
              disabled={count <= 1}
              style={{ width: 34, height: 34, padding: 0, borderRadius: 8 }}
            >-5</button>
            <span style={{
              fontWeight: 800, fontSize: 26, color: '#38bdf8',
              minWidth: 44, textAlign: 'center',
            }}>{count}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCount(c => Math.min(MAX_WORDS, unlearnedWords.length, c + 5))}
              disabled={count >= Math.min(MAX_WORDS, unlearnedWords.length)}
              style={{ width: 34, height: 34, padding: 0, borderRadius: 8 }}
            >+5</button>
          </div>
          {/* Quick preset buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[20, 30, 50].map(n => (
              <button
                key={n}
                className={`btn btn-sm ${count === n ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCount(Math.min(n, unlearnedWords.length))}
                disabled={unlearnedWords.length < n && n !== 20}
                style={{ padding: '5px 12px', borderRadius: 8 }}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginTop: 14 }}>
          <input
            type="range"
            min={1}
            max={Math.min(MAX_WORDS, unlearnedWords.length)}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>1 từ</span>
            <span>Tối đa {Math.min(MAX_WORDS, unlearnedWords.length)} từ</span>
          </div>
        </div>
      </div>

      {/* Selected words grid + actions */}
      {unlearnedWords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Trophy size={32} color="var(--accent-300)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Đã học hết toàn bộ từ trong chủ đề này!
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {learnedCount}/{words.length} từ đã hoàn thành
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedWords.length} từ được chọn
            </span>
            <button
              id="randomize-btn"
              className="btn btn-ghost btn-sm"
              onClick={randomize}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Shuffle size={13} /> Random lại
            </button>
          </div>

          {/* Word chips grid */}
          <div className="vocab-word-grid mb-5">
            {selectedWords.map((w) => {
              const wid = makeWordId(w.word, w.topic);
              const posColor = POS_COLORS[w.partOfSpeech] || 'neutral';
              return (
                <div
                  key={wid}
                  className="vocab-word-card animate-fade-in"
                >
                  <button
                    id={`swap-${wid}`}
                    onClick={() => handleSwap(w)}
                    title="Đổi từ khác"
                    className="vocab-word-swap-btn"
                  >
                    <X size={10} /> Đổi
                  </button>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', paddingRight: 40, marginBottom: 4 }}>
                    {w.word}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {w.meaningVi}
                  </div>
                  {w.partOfSpeech && (
                    <Badge type={posColor}>{w.partOfSpeech}</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start learning button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              id="start-chunking-btn"
              className="btn btn-primary"
              onClick={() => onStartLearning(selectedWords)}
              disabled={!canLearn}
              style={{ padding: '12px 32px', fontSize: 15, gap: 8 }}
            >
              <Sparkles size={16} />
              Học theo chunking ({selectedWords.length} từ)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Single Word Card (hiện chunks + nút nhảy sang tab Practice) ──
function WordLearningCard({
  word, wordId, chunks, learnedVocab, onStartPractice,
}) {
  const isLearned = !!learnedVocab[wordId];
  const posColor = POS_COLORS[word.partOfSpeech] || 'neutral';
  const isReady = chunks && chunks.length > 0;

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderColor: isLearned ? 'rgba(34,197,94,0.3)' : undefined,
        background: isLearned ? 'rgba(34,197,94,0.04)' : undefined,
        transition: 'all 0.4s',
      }}
    >
      {/* Word header */}
      <div className="flex items-center gap-3 mb-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>{word.word}</span>
            {word.partOfSpeech && <Badge type={posColor}>{word.partOfSpeech}</Badge>}
            {isLearned && <Badge type="success">✓ Đã học</Badge>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{word.meaningVi}</p>
        </div>
        {isReady && <Badge type="success">✓ {chunks.length} chunk</Badge>}
      </div>

      {/* Chunk pills */}
      {isReady && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {chunks.map((c, ci) => {
            const chunkIpa = getChunkIPA(c);
            return (
              <div key={ci} style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-300)' }}>{c.phrase}</span>
                {chunkIpa && (
                  <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600 }}>
                    {formatIPA(chunkIpa)}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>{c.meaningVi}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Chuyển sang Tab Practice để luyện viết */}
      {isReady && (
        <button
          id={`practice-btn-${wordId}`}
          className="btn btn-ghost btn-sm"
          onClick={() => onStartPractice(chunks)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(99,102,241,0.25)',
            color: 'var(--accent-300)', fontSize: 12,
          }}
        >
          <PenLine size={13} /> Luyện viết với chunk này →
        </button>
      )}

      {isLearned && (
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--success-text)', fontWeight: 600,
        }}>
          <CheckCircle size={14} /> Đã hoàn thành!
        </div>
      )}
    </div>
  );
}


// ─── Screen 3: Learning Session ────────────────────────────────────
function LearningSession({ topic, selectedWords, learnedVocab, onBack, onToast, onStartPractice }) {
  // chunks per wordId: { [wordId]: chunk[] }
  const [chunkMap, setChunkMap] = useState(() => {
    const initial = {};
    selectedWords.forEach(w => {
      const wid = makeWordId(w.word, w.topic);
      const existing = getChunks(wid);
      if (existing && existing.length > 0) {
        initial[wid] = existing;
      }
    });
    return initial;
  });

  // overall batch status: 'idle' | 'loading' | 'done' | 'error'
  const [batchStatus, setBatchStatus] = useState('idle');
  const [genProgress, setGenProgress] = useState({ done: 0, total: selectedWords.length });
  const [errorMsg, setErrorMsg] = useState('');
  const sessionIdRef = useRef(0);

  const runBatch = useCallback(async (sid) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vào Settings để nhập.');
      setBatchStatus('error');
      setErrorMsg('Chưa có Gemini API key. Vui lòng vào Cài đặt để nhập API key.');
      return;
    }

    // Filter words that actually need chunks generated
    const initial = {};
    const wordsToFetch = [];
    selectedWords.forEach(w => {
      const wid = makeWordId(w.word, w.topic);
      const existing = getChunks(wid);
      if (existing && existing.length > 0) {
        initial[wid] = existing;
      } else {
        wordsToFetch.push(w);
      }
    });

    setChunkMap(prev => ({ ...prev, ...initial }));

    if (wordsToFetch.length === 0) {
      setBatchStatus('done');
      setGenProgress({ done: selectedWords.length, total: selectedWords.length });
      return;
    }

    setBatchStatus('loading');
    setErrorMsg('');
    const alreadyDone = selectedWords.length - wordsToFetch.length;
    setGenProgress({ done: alreadyDone, total: selectedWords.length });

    try {
      const BATCH_SIZE = 10;
      const ts = Date.now();
      let currentMap = { ...initial };

      for (let i = 0; i < wordsToFetch.length; i += BATCH_SIZE) {
        if (sessionIdRef.current !== sid) return;
        const slice = wordsToFetch.slice(i, i + BATCH_SIZE);
        const result = await generateChunksBatch(slice, apiKey);
        if (sessionIdRef.current !== sid) return;

        const resultList = result.results || [];
        slice.forEach((word, wi) => {
          const wordId = makeWordId(word.word, word.topic);
          const match = resultList.find(r => r.word?.toLowerCase() === word.word.toLowerCase()) || resultList[wi];
          const rawChunks = match?.chunks || [];
          const chunks = rawChunks.map((c, ci) => ({
            ...c,
            id: `chunk_vocab_${wordId}_${ci}_${ts}`,
            sourceType: 'vocab',
            sourceWordId: wordId,
            sourceWord: word.word,
            topic: word.topic,
            groupId: `vocab_${wordId}`,
            groupName: word.word,
            transcriptId: null,
          }));

          if (chunks.length > 0) {
            saveVocabChunks(wordId, word.word, word.topic, chunks);
          }
          currentMap[wordId] = chunks;
        });

        setChunkMap({ ...currentMap });
        setGenProgress({
          done: alreadyDone + Math.min(i + BATCH_SIZE, wordsToFetch.length),
          total: selectedWords.length,
        });
      }

      setBatchStatus('done');
    } catch (err) {
      if (sessionIdRef.current !== sid) return;
      console.error('Batch chunk generation failed:', err);
      setErrorMsg(err.message || 'Lỗi không xác định khi sinh chunk');
      setBatchStatus('error');
      onToast('error', `Lỗi sinh chunk: ${err.message}`);
    }
  }, [selectedWords, onToast]);

  useEffect(() => {
    const sid = ++sessionIdRef.current;
    runBatch(sid);
  }, [runBatch]);

  const isLoading = batchStatus === 'loading';
  const learnedToday = selectedWords.filter(w => learnedVocab[makeWordId(w.word, w.topic)]).length;

  const allSessionChunks = useMemo(() => {
    const list = [];
    selectedWords.forEach(w => {
      const wid = makeWordId(w.word, w.topic);
      const chs = chunkMap[wid] || [];
      list.push(...chs);
    });
    return list;
  }, [selectedWords, chunkMap]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          id="back-to-selector"
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronLeft size={14} /> Chọn từ
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Học từ vựng – {topic}
        </div>
        <Badge type="success">{learnedToday}/{selectedWords.length} đã học</Badge>
        {allSessionChunks.length > 0 && !isLoading && (
          <button
            id="practice-all-vocab-btn"
            className="btn btn-primary btn-sm"
            onClick={() => onStartPractice(allSessionChunks)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <PenLine size={13} /> Luyện viết tất cả ({allSessionChunks.length} chunk) →
          </button>
        )}
      </div>

      {/* Progress / Loading bar */}
      {isLoading && (
        <div className="card mb-4" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(67,56,202,0.08))',
          borderColor: 'rgba(99,102,241,0.25)',
          padding: '14px 16px',
        }}>
          <div className="flex items-center gap-3 mb-2">
            <Spinner size={15} />
            <span style={{ fontSize: 13, color: 'var(--accent-300)', fontWeight: 600 }}>
              AI đang trích xuất chunks cho các từ vựng…
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {genProgress.done}/{genProgress.total} từ
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-base)', borderRadius: 99 }}>
            <div style={{
              height: '100%',
              width: `${genProgress.total > 0 ? (genProgress.done / genProgress.total) * 100 : 0}%`,
              background: 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, margin: '6px 0 0' }}>
            Đang chia theo batch tối ưu tốc độ và tránh giới hạn API
          </p>
        </div>
      )}

      {/* Error state with retry */}
      {batchStatus === 'error' && (
        <div className="card mb-4" style={{
          background: 'var(--error-bg)',
          borderColor: 'var(--error-border)',
          padding: '14px 16px',
        }}>
          <div style={{ color: 'var(--error-text)', fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={15} />
            <span>{errorMsg || 'Không thể tạo chunk cho danh sách từ này.'}</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { const sid = ++sessionIdRef.current; runBatch(sid); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={13} /> Thử lại
          </button>
        </div>
      )}

      {/* All words cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {selectedWords.map((word) => {
          const wordId = makeWordId(word.word, word.topic);
          return (
            <WordLearningCard
              key={wordId}
              word={word}
              wordId={wordId}
              chunks={chunkMap[wordId] || []}
              learnedVocab={learnedVocab}
              onStartPractice={onStartPractice}
            />
          );
        })}
      </div>

      {/* Completion banner */}
      {!isLoading && learnedToday === selectedWords.length && selectedWords.length > 0 && (
        <div className="card mt-6 animate-fade-in" style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))',
          borderColor: 'rgba(34,197,94,0.3)', textAlign: 'center', padding: '28px 24px',
        }}>
          <Trophy size={36} color="var(--success-text)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success-text)', marginBottom: 6 }}>
            Tuyệt vời! Hoàn thành {selectedWords.length} từ!
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Các từ đã được lưu vào danh sách đã học. Bạn có thể luyện tập tiếp bất kỳ lúc nào.
          </p>
          <button
            className="btn btn-primary mt-4"
            onClick={onBack}
            style={{ margin: '16px auto 0' }}
          >
            <BookMarked size={15} /> Chọn thêm từ khác
          </button>
        </div>
      )}
    </div>
  );
}

// ─── VocabModule (main export) ────────────────────────────────────
export function VocabModule({ onToast, onStartPractice }) {
  // Parse vocab from static JSON
  const words = useMemo(() => VOCAB_RAW.map(w => ({
    ...w,
    id: makeWordId(w.word, w.topic),
  })), []);

  const [screen, setScreen] = useState('topics'); // 'topics' | 'selector' | 'learning'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [wordsToLearn, setWordsToLearn] = useState([]);
  const [learnedVocab, setLearnedVocab] = useState(() => getLearnedVocab());

  const handleSelectTopic = useCallback((topic) => {
    setSelectedTopic(topic);
    setScreen('selector');
  }, []);

  const handleStartLearning = useCallback((words) => {
    setWordsToLearn(words);
    // Save today's session
    saveTodaySession(words.map(w => makeWordId(w.word, w.topic)));
    setScreen('learning');
  }, []);

  const handleMarkLearned = useCallback((wordId, word, topic) => {
    markVocabLearned(wordId, word, topic);
    setLearnedVocab(getLearnedVocab()); // refresh state
    onToast('success', `"${word}" đã được đánh dấu hoàn thành!`);
  }, [onToast]);

  const topicWords = useMemo(() =>
    selectedTopic ? words.filter(w => w.topic === selectedTopic) : [],
    [words, selectedTopic]
  );

  return (
    <div>
      {screen === 'topics' && (
        <TopicBrowser
          words={words}
          learnedVocab={learnedVocab}
          onSelectTopic={handleSelectTopic}
        />
      )}
      {screen === 'selector' && (
        <WordSelector
          topic={selectedTopic}
          words={topicWords}
          learnedVocab={learnedVocab}
          onStartLearning={handleStartLearning}
          onBack={() => setScreen('topics')}
        />
      )}
      {screen === 'learning' && (
        <LearningSession
          topic={selectedTopic}
          selectedWords={wordsToLearn}
          learnedVocab={learnedVocab}
          onBack={() => setScreen('selector')}
          onToast={onToast}
          onStartPractice={onStartPractice}
        />
      )}
    </div>
  );
}
