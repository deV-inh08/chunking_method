import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft, Sparkles, Shuffle,
  X, CheckCircle, PenLine, RotateCcw,
  GraduationCap, Trophy, BookMarked,
  Briefcase, Cpu, HeartPulse, Plane,
  Utensils, Leaf, Palette, Landmark,
  Home, BookText, TrendingUp, BookOpen,
  AlertCircle, Search, Layers, Flame,
  ShoppingBag, Headphones, FileCheck, Compass,
  Users,
} from 'lucide-react';
import { Badge, Spinner } from '../ui';
import { generateChunksBatch } from '../../services/ai';
import {
  getApiKey, saveVocabChunks,
  getLearnedVocab, markVocabLearned,
  saveTodaySession, getChunks,
} from '../../store/storage';
import { getChunkIPA, formatIPA } from '../../services/phonetics';
import { FlashcardSession } from './FlashcardSession';

// ── Tải vocab từ JSON tĩnh (không cần Supabase/script) ──────────
import VOCAB_RAW from '../../../data/vocab_5000.json';
import HACKERS_RAW from '../../../data/hackers_toeic_30days.json';

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

const HACKERS_DAY_METADATA = {
  1: { desc: 'Hồ sơ xin việc, ứng tuyển, tiêu chuẩn nhân sự và phỏng vấn công sở.', Icon: Briefcase, accentColor: '#3b82f6', accentBg: 'rgba(59, 130, 246, 0.14)' },
  2: { desc: 'Nội quy công ty, kỷ luật, quy tắc đạo đức nghề nghiệp và pháp chế tuân thủ.', Icon: Landmark, accentColor: '#6366f1', accentBg: 'rgba(99, 102, 241, 0.14)' },
  3: { desc: 'Tác vụ văn phòng, quản lý hồ sơ, công văn thư tín và giao tiếp đồng nghiệp.', Icon: BookText, accentColor: '#8b5cf6', accentBg: 'rgba(139, 92, 246, 0.14)' },
  4: { desc: 'Thiết bị văn phòng, xử lý tài liệu, công việc thường nhật và phân công nhiệm vụ.', Icon: BookText, accentColor: '#a855f7', accentBg: 'rgba(168, 85, 247, 0.14)' },
  5: { desc: 'Báo cáo công tác, điều phối phòng ban, deadline và tiến độ dự án nội bộ.', Icon: BookText, accentColor: '#d946ef', accentBg: 'rgba(217, 70, 239, 0.14)' },
  6: { desc: 'Hoạt động giải trí sau giờ làm, giao lưu cộng đồng, sự kiện thiện nguyện.', Icon: Sparkles, accentColor: '#ec4899', accentBg: 'rgba(236, 72, 153, 0.14)' },
  7: { desc: 'Chiến dịch tiếp thị, quảng bá thương hiệu, tiếp cận và thu hút khách hàng tiềm năng.', Icon: TrendingUp, accentColor: '#f43f5e', accentBg: 'rgba(244, 63, 94, 0.14)' },
  8: { desc: 'Nghiên cứu thị trường, khảo sát hành vi tiêu dùng, phân tích đối thủ cạnh tranh.', Icon: TrendingUp, accentColor: '#ef4444', accentBg: 'rgba(239, 68, 68, 0.14)' },
  9: { desc: 'Tình hình kinh tế vĩ mô, lạm phát, tỷ giá, chu kỳ tăng trưởng và suy thoái.', Icon: TrendingUp, accentColor: '#f97316', accentBg: 'rgba(249, 115, 22, 0.14)' },
  10: { desc: 'Mua sắm bán lẻ, giỏ hàng, chương trình giảm giá khuyến mãi và bảo hành.', Icon: ShoppingBag, accentColor: '#f59e0b', accentBg: 'rgba(245, 158, 11, 0.14)' },
  11: { desc: 'Nghiên cứu phát triển (R&D), mẫu thử nghiệm, sáng chế và cải tiến tính năng.', Icon: Cpu, accentColor: '#eab308', accentBg: 'rgba(234, 179, 8, 0.14)' },
  12: { desc: 'Dây chuyền lắp ráp, chế tạo nhà máy, quy trình gia công và kiểm chuẩn chất lượng.', Icon: Cpu, accentColor: '#84cc16', accentBg: 'rgba(132, 204, 22, 0.14)' },
  13: { desc: 'Hỗ trợ khách hàng, giải quyết khiếu nại, dịch vụ hậu mãi và sự hài lòng.', Icon: Headphones, accentColor: '#22c55e', accentBg: 'rgba(34, 197, 94, 0.14)' },
  14: { desc: 'Thủ tục sân bay, vé máy bay, đặt phòng khách sạn, hải quan và chuyển tiếp.', Icon: Plane, accentColor: '#10b981', accentBg: 'rgba(16, 185, 129, 0.14)' },
  15: { desc: 'Đàm phán hợp đồng thương mại, điều khoản pháp lý, thỏa thuận và chữ ký.', Icon: FileCheck, accentColor: '#14b8a6', accentBg: 'rgba(20, 184, 166, 0.14)' },
  16: { desc: 'Ký kết thương vụ, giao dịch thanh toán, trao đổi thương phẩm và chuyển giao.', Icon: TrendingUp, accentColor: '#06b6d4', accentBg: 'rgba(6, 182, 212, 0.14)' },
  17: { desc: 'Xuất nhập khẩu hàng hóa, vận tải đường biển/hàng không, kho bãi và logistics.', Icon: Plane, accentColor: '#0ea5e9', accentBg: 'rgba(14, 165, 233, 0.14)' },
  18: { desc: 'Khách sạn, khu nghỉ dưỡng, phục vụ ăn uống và đặt bàn tiệc hội nghị.', Icon: Utensils, accentColor: '#38bdf8', accentBg: 'rgba(56, 189, 248, 0.14)' },
  19: { desc: 'Số liệu doanh số, lợi nhuận ròng, dòng tiền và chỉ tiêu tăng trưởng tài chính.', Icon: TrendingUp, accentColor: '#3b82f6', accentBg: 'rgba(59, 130, 246, 0.14)' },
  20: { desc: 'Hạch toán chi phí, bảng cân đối kế toán, biên lai thuế và kiểm toán độc lập.', Icon: BookText, accentColor: '#6366f1', accentBg: 'rgba(99, 102, 241, 0.14)' },
  21: { desc: 'Chiến lược tái cơ cấu, xu hướng ngành, sáp nhập doanh nghiệp và tầm nhìn dài hạn.', Icon: Compass, accentColor: '#8b5cf6', accentBg: 'rgba(139, 92, 246, 0.14)' },
  22: { desc: 'Hội nghị ban giám đốc, lịch họp giao ban, thuyết trình dự án và biên bản cuộc họp.', Icon: Users, accentColor: '#a855f7', accentBg: 'rgba(168, 85, 247, 0.14)' },
  23: { desc: 'Chế độ đãi ngộ, bảo hiểm y tế xã hội, ngày phép năm và thưởng hiệu suất.', Icon: HeartPulse, accentColor: '#ec4899', accentBg: 'rgba(236, 72, 153, 0.14)' },
  24: { desc: 'Tuyển dụng nội bộ, thăng tiến, chuyển giao công tác và quản lý biến động nhân sự.', Icon: Users, accentColor: '#f43f5e', accentBg: 'rgba(244, 63, 94, 0.14)' },
  25: { desc: 'Hệ thống giao thông đô thị, giờ cao điểm, định tuyến đường và an toàn lưu thông.', Icon: Compass, accentColor: '#f97316', accentBg: 'rgba(249, 115, 22, 0.14)' },
  26: { desc: 'Giao dịch ngân hàng, khoản vay thế chấp, lãi suất tiết kiệm và thẻ tín dụng.', Icon: Landmark, accentColor: '#f59e0b', accentBg: 'rgba(245, 158, 11, 0.14)' },
  27: { desc: 'Đầu tư chứng khoán, danh mục tài sản, quản trị rủi ro vốn và lợi tức cổ phiếu.', Icon: TrendingUp, accentColor: '#10b981', accentBg: 'rgba(16, 185, 129, 0.14)' },
  28: { desc: 'Thuê văn phòng, quản lý tòa nhà thương mại, bảo dưỡng hạ tầng và bất động sản.', Icon: Home, accentColor: '#0ea5e9', accentBg: 'rgba(14, 165, 233, 0.14)' },
  29: { desc: 'Bảo vệ sinh thái, năng lượng tái tạo, quản lý chất thải và tiêu chuẩn xanh.', Icon: Leaf, accentColor: '#22c55e', accentBg: 'rgba(34, 197, 94, 0.14)' },
  30: { desc: 'Chăm sóc sức khỏe y tế, triệu chứng điều trị, thể lực và lối sống lành mạnh.', Icon: HeartPulse, accentColor: '#ef4444', accentBg: 'rgba(239, 68, 68, 0.14)' },
};

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
  // Check if topic is a Hackers TOEIC day e.g. "Day 01: Tuyển dụng"
  const match = topic.match(/^Day\s*(\d+):\s*(.+)$/i);
  if (match) {
    const dayNum = parseInt(match[1], 10);
    const dayTitle = match[2];
    const meta = HACKERS_DAY_METADATA[dayNum] || {};
    return {
      titleEn: `Day ${String(dayNum).padStart(2, '0')}`,
      titleVi: dayTitle,
      desc: meta.desc || `Từ vựng trọng tâm chuyên đề ${dayTitle} trong đề thi TOEIC.`,
      Icon: meta.Icon || BookOpen,
      accentColor: meta.accentColor || '#3b82f6',
      accentBg: meta.accentBg || 'rgba(59, 130, 246, 0.14)',
      isHackersDay: true,
      dayNum,
    };
  }

  if (TOPIC_METADATA[topic]) {
    return {
      titleEn: topic,
      ...TOPIC_METADATA[topic],
    };
  }

  return {
    titleEn: topic,
    titleVi: 'Chủ đề chuyên sâu',
    desc: 'Từ vựng trọng điểm và cụm chunking theo ngữ cảnh thực tế.',
    Icon: BookOpen,
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.14)',
  };
}

// ─── Screen 1: Topic Browser ─────────────────────────────────────
function TopicBrowser({
  words,
  learnedVocab,
  activeCourse,
  onCourseChange,
  onSelectTopic,
}) {
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

  const topics = useMemo(() => Object.keys(topicStats).sort((a, b) => {
    const matchA = a.match(/^Day\s*(\d+)/i);
    const matchB = b.match(/^Day\s*(\d+)/i);
    if (matchA && matchB) {
      return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
    }
    return a.localeCompare(b);
  }), [topicStats]);

  const totalWords = words.length;
  const totalLearnedInCourse = useMemo(() => {
    let count = 0;
    words.forEach(w => {
      const wid = makeWordId(w.word, w.topic);
      if (learnedVocab[wid]) count++;
    });
    return count;
  }, [words, learnedVocab]);

  const overallPct = totalWords > 0 ? Math.round((totalLearnedInCourse / totalWords) * 100) : 0;

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
      {/* Course Switcher */}
      <div className="vocab-course-tabs">
        <button
          className={`vocab-course-tab ${activeCourse === 'hackers_toeic' ? 'active' : ''}`}
          onClick={() => onCourseChange('hackers_toeic')}
        >
          <div className="vocab-tab-icon-box">
            <Flame size={20} />
          </div>
          <div className="vocab-tab-text">
            <span className="vocab-tab-title">Lộ trình Hackers TOEIC 30 Ngày</span>
            <span className="vocab-tab-sub">30 ngày chuyên đề · 5.980 từ bám sát đề thi</span>
          </div>
          <span className="vocab-badge-highlight">Khuyên dùng</span>
        </button>

        <button
          className={`vocab-course-tab ${activeCourse === 'vocab_5000' ? 'active' : ''}`}
          onClick={() => onCourseChange('vocab_5000')}
        >
          <div className="vocab-tab-icon-box">
            <BookOpen size={20} />
          </div>
          <div className="vocab-tab-text">
            <span className="vocab-tab-title">Thư viện 5.000 Từ vựng Cốt lõi</span>
            <span className="vocab-tab-sub">14 chủ đề đời sống & giao tiếp thực tế</span>
          </div>
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="vocab-hero-card">
        <div className="vocab-hero-content">
          <div className="vocab-hero-badge">
            {activeCourse === 'hackers_toeic' ? (
              <>
                <Flame size={13} /> Lộ trình bám sát đề thi chuẩn Hackers TOEIC
              </>
            ) : (
              <>
                <GraduationCap size={13} /> Thư viện từ vựng chuẩn hóa
              </>
            )}
          </div>
          <h2 className="vocab-hero-title">
            {activeCourse === 'hackers_toeic'
              ? 'Lộ trình Hackers TOEIC 30 Ngày'
              : 'Từ vựng TOEIC & Giao tiếp'}
          </h2>
          <p className="vocab-hero-desc">
            {activeCourse === 'hackers_toeic'
              ? `${words.length.toLocaleString()} từ vựng trọng điểm bám sát format đề thi TOEIC mới nhất, phân chia theo lộ trình 30 ngày tập trung cùng cụm chunking phản xạ.`
              : `${words.length.toLocaleString()} từ vựng trọng tâm phân loại theo ${topics.length} chủ đề thực chiến, tích hợp trích xuất cụm chunking phản xạ.`}
          </p>
        </div>

        {/* 3 Metric cards */}
        <div className="vocab-hero-stats">
          <div className="vocab-stat-card">
            <div className="vocab-stat-value">{totalLearnedInCourse.toLocaleString()}</div>
            <div className="vocab-stat-label">Từ đã thành thạo</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#38bdf8' }}>{overallPct}%</div>
            <div className="vocab-stat-label">Độ phủ lộ trình</div>
          </div>
          <div className="vocab-stat-card">
            <div className="vocab-stat-value" style={{ color: '#818cf8' }}>{topics.length}</div>
            <div className="vocab-stat-label">
              {activeCourse === 'hackers_toeic' ? 'Ngày học' : 'Chủ đề'}
            </div>
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
            placeholder={
              activeCourse === 'hackers_toeic'
                ? 'Tìm kiếm theo ngày (Day 01..), chuyên đề, từ khóa...'
                : 'Tìm kiếm theo chủ đề, lĩnh vực...'
            }
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
                <div className="vocab-topic-title-vi">
                  {meta.isHackersDay ? `Chuyên đề: ${meta.titleVi}` : meta.titleVi}
                </div>
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
function WordSelector({ topic, words, learnedVocab, activeCourse, onStartLearning, onStartFlashcard, onBack }) {
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
          <ChevronLeft size={14} /> {activeCourse === 'hackers_toeic' ? '30 Ngày TOEIC' : 'Chủ đề'}
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

          {/* Start learning buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              id="start-flashcard-btn"
              className="btn btn-primary"
              onClick={() => onStartFlashcard && onStartFlashcard(selectedWords)}
              disabled={!canLearn}
              style={{
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              }}
            >
              <Layers size={18} />
              Học Flashcard ({selectedWords.length} từ)
            </button>

            <button
              id="start-chunking-btn"
              className="btn btn-secondary"
              onClick={() => onStartLearning(selectedWords)}
              disabled={!canLearn}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
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
function LearningSession({ topic, selectedWords, learnedVocab, onBack, onToast, onStartPractice, onStartFlashcard }) {
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
        {onStartFlashcard && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onStartFlashcard(selectedWords)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Chuyển sang học lật thẻ Flashcard"
          >
            <Layers size={13} /> Học Flashcard
          </button>
        )}
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
  const [activeCourse, setActiveCourse] = useState(() => {
    return localStorage.getItem('speaking_chunk_vocab_course') || 'hackers_toeic';
  });

  // Parse vocab from static JSON depending on activeCourse
  const words = useMemo(() => {
    const rawList = activeCourse === 'hackers_toeic' ? HACKERS_RAW : VOCAB_RAW;
    return rawList.map(w => ({
      ...w,
      id: makeWordId(w.word, w.topic),
    }));
  }, [activeCourse]);

  // Clean up legacy visual mode state from localStorage so VocabModule always stays in Flashcard/Course mode
  useEffect(() => {
    try {
      localStorage.removeItem('speaking_chunk_vocab_mode');
    } catch { /* ignore */ }
  }, []);

  const [screen, setScreen] = useState('topics'); // 'topics' | 'selector' | 'learning'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [wordsToLearn, setWordsToLearn] = useState([]);
  const [learnedVocab, setLearnedVocab] = useState(() => getLearnedVocab());

  const handleCourseChange = useCallback((c) => {
    setActiveCourse(c);
    localStorage.setItem('speaking_chunk_vocab_course', c);
    setSelectedTopic(null);
    setScreen('topics');
  }, []);

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

  const handleStartFlashcard = useCallback((words) => {
    setWordsToLearn(words);
    // Save today's session
    saveTodaySession(words.map(w => makeWordId(w.word, w.topic)));
    setScreen('flashcard');
  }, []);

  const handleMarkLearned = useCallback((wordId, word, topic) => {
    markVocabLearned(wordId, word, topic);
    setLearnedVocab(getLearnedVocab()); // refresh state
  }, []);

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
          activeCourse={activeCourse}
          onCourseChange={handleCourseChange}
          onSelectTopic={handleSelectTopic}
        />
      )}
      {screen === 'selector' && (
        <WordSelector
          topic={selectedTopic}
          words={topicWords}
          learnedVocab={learnedVocab}
          activeCourse={activeCourse}
          onStartLearning={handleStartLearning}
          onStartFlashcard={handleStartFlashcard}
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
          onStartFlashcard={handleStartFlashcard}
        />
      )}
      {screen === 'flashcard' && (
        <FlashcardSession
          topic={selectedTopic}
          selectedWords={wordsToLearn}
          learnedVocab={learnedVocab}
          onBack={() => setScreen('selector')}
          onMarkLearned={handleMarkLearned}
          onToast={onToast}
          onStartPractice={onStartPractice}
        />
      )}
    </div>
  );
}
