import React, { useState, useMemo } from 'react';
import {
  Headphones, Sparkles, Plus, Search, Trash2, Play,
  PenLine, HelpCircle, CheckCircle, Flame, Layers, Globe,
  Calendar, ChevronRight, Filter, BookOpen, Volume2, UserCheck, AlertCircle
} from 'lucide-react';
import { PRESET_LISTENING_TOPICS } from '../../services/listeningAi';
import GenerateListeningModal from '../TranscriptModule/GenerateListeningModal';
import { TranscriptListeningModal } from '../TranscriptModule/TranscriptListeningModal';

const QUICK_TOPIC_PRESETS = [
  {
    topicId: 'office_project',
    title: 'Họp dự án & Báo cáo tiến độ',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇬🇧 Anh',
    emoji: '💼',
    color: '#3b82f6',
  },
  {
    topicId: 'flight_travel',
    title: 'Sân bay & Đổi vé máy bay',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇦🇺 Úc',
    emoji: '✈️',
    color: '#06b6d4',
  },
  {
    topicId: 'recruitment_hr',
    title: 'Phỏng vấn & Tuyển dụng',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ, 🇬🇧 Anh & 🇨🇦 Canada',
    emoji: '🤝',
    color: '#8b5cf6',
  },
  {
    topicId: 'flight_travel',
    title: 'Thông báo chuyến bay & Sân ga',
    part: 'Part 4',
    partLabel: 'Part 4 • Độc thoại',
    accents: '🇬🇧 Anh (Phát thanh)',
    emoji: '📢',
    color: '#f59e0b',
  },
  {
    topicId: 'customer_service',
    title: 'Xử lý khiếu nại & Hoàn tiền',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇦🇺 Úc & 🇺🇸 Mỹ',
    emoji: '🛍️',
    color: '#ec4899',
  },
  {
    topicId: 'tech_support',
    title: 'Sự cố thiết bị & Bảo trì VP',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇬🇧 Anh',
    emoji: '💻',
    color: '#10b981',
  },
];

// Helper trích xuất danh sách cờ accent từ nội dung transcript
function extractSpeakerAccents(text = '') {
  const flags = new Set();
  const lower = (text || '').toLowerCase();
  if (lower.includes('-am') || lower.includes('mỹ') || lower.includes('us')) flags.add('🇺🇸 US');
  if (lower.includes('-br') || lower.includes('-uk') || lower.includes('anh') || lower.includes('gb')) flags.add('🇬🇧 UK');
  if (lower.includes('-au') || lower.includes('úc') || lower.includes('australia')) flags.add('🇦🇺 AU');
  if (lower.includes('-ca') || lower.includes('canada')) flags.add('🇨🇦 CA');
  if (flags.size === 0) flags.add('🇺🇸 US');
  return Array.from(flags);
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function ListeningAiModule({
  transcripts = [],
  onSave,
  onDelete,
  onChunksExtracted,
  onToast,
  allProgress = {},
  onStartPractice,
}) {
  // Modal states
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateInitialTopicId, setGenerateInitialTopicId] = useState(null);
  const [generateInitialPart, setGenerateInitialPart] = useState('Part 3');

  const [activeListeningTranscript, setActiveListeningTranscript] = useState(null);
  const [listeningInitialMode, setListeningInitialMode] = useState('listen'); // 'listen' | 'dictation' | 'quiz'

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [partFilter, setPartFilter] = useState('all'); // 'all' | 'Part 3' | 'Part 4' | 'quiz'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Danh sách bài nghe AI
  // Nhận diện: có cờ `isAiGenerated: true` hoặc có câu hỏi `questions` hoặc có gắn tag speaker chuẩn
  const aiTranscripts = useMemo(() => {
    return transcripts.filter(t => {
      if (t.isAiGenerated) return true;
      if (t.questions && t.questions.length > 0) return true;
      // Nhận diện kịch bản có tag speaker (W-Am:, M-Au:, v.v.)
      const text = t.text || '';
      return /^(W-|M-|Woman|Man|Speaker)/m.test(text);
    });
  }, [transcripts]);

  // Bộ lọc tìm kiếm
  const filteredList = useMemo(() => {
    return aiTranscripts.filter(t => {
      // Filter theo tab
      if (partFilter === 'Part 3' && t.part !== 'Part 3') return false;
      if (partFilter === 'Part 4' && t.part !== 'Part 4') return false;
      if (partFilter === 'quiz' && (!t.questions || t.questions.length === 0)) return false;

      // Filter theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchTheme = (t.themeVi || t.theme || '').toLowerCase().includes(q);
      const matchText = (t.text || '').toLowerCase().includes(q);
      return matchTitle || matchTheme || matchText;
    });
  }, [aiTranscripts, partFilter, searchQuery]);

  // Mở modal sinh kịch bản với chủ đề gợi ý
  const handleOpenPreset = (preset) => {
    setGenerateInitialTopicId(preset.topicId);
    setGenerateInitialPart(preset.part);
    setIsGenerateOpen(true);
  };

  // Mở modal sinh bài rỗng
  const handleOpenNew = () => {
    setGenerateInitialTopicId(null);
    setGenerateInitialPart('Part 3');
    setIsGenerateOpen(true);
  };

  // Khi AI tạo xong kịch bản mới
  const handleAiGenerated = (newTranscript) => {
    if (onSave) onSave(newTranscript);
    if (newTranscript.chunks && newTranscript.chunks.length > 0 && onChunksExtracted) {
      onChunksExtracted(newTranscript.id, newTranscript.chunks);
    }
    setIsGenerateOpen(false);
    // Mở ngay modal nghe
    setActiveListeningTranscript(newTranscript);
    setListeningInitialMode('listen');
    if (onToast) onToast('success', `🎉 Đã tạo bài nghe "${newTranscript.title}" thành công!`);
  };

  // Mở trình nghe theo mode
  const handleStartListening = (transcript, mode = 'listen') => {
    setActiveListeningTranscript(transcript);
    setListeningInitialMode(mode);
  };

  const handleDelete = (id) => {
    if (onDelete) onDelete(id);
    setConfirmDeleteId(null);
    if (onToast) onToast('success', 'Đã xóa bài nghe khỏi thư viện!');
  };

  // Thống kê nhanh
  const totalAiLessons = aiTranscripts.length;
  const totalQuizQuestions = useMemo(() => {
    return aiTranscripts.reduce((acc, t) => acc + (t.questions?.length || 0), 0);
  }, [aiTranscripts]);

  return (
    <div className="listening-ai-page" style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 60 }}>
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 24px',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', marginBottom: 12 }}>
              <Sparkles size={13} color="#818cf8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Interactive Listening Lab
              </span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', marginBottom: 10, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Luyện Nghe TOEIC Tương Tác với AI
            </h1>

            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, marginBottom: 18 }}>
              Tự động tạo kịch bản hội thoại Part 3 & bài nói Part 4 chuẩn format đề thi ETS.
              Nghe phát âm chuẩn qua giọng đọc bản xứ <strong style={{ color: '#ffffff' }}>Mỹ, Anh, Úc, Canada</strong>,
              luyện tập chép chính tả (Dictation) và làm trắc nghiệm kiểm tra độ hiểu bài có chấm điểm tức thì.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNew}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  borderColor: 'transparent',
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: 13.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
                }}
              >
                <Sparkles size={16} color="#fef08a" />
                ✨ Tạo bài nghe mới bằng AI
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <Headphones size={15} style={{ color: '#38bdf8' }} />
                  <span><strong style={{ color: 'var(--text-primary)' }}>{totalAiLessons}</strong> bài nghe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <HelpCircle size={15} style={{ color: '#a855f7' }} />
                  <span><strong style={{ color: 'var(--text-primary)' }}>{totalQuizQuestions}</strong> câu trắc nghiệm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Topic Presets ─────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Globe size={16} style={{ color: 'var(--accent-400)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Gợi ý chủ đề nhanh (1 chạm để sinh kịch bản)
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đa dạng ngữ điệu bản xứ</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {QUICK_TOPIC_PRESETS.map((preset, idx) => (
            <div
              key={idx}
              className="card"
              onClick={() => handleOpenPreset(preset)}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{preset.emoji}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: preset.part === 'Part 3' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                      color: preset.part === 'Part 3' ? '#60a5fa' : '#fbbf24',
                    }}
                  >
                    {preset.partLabel}
                  </span>
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {preset.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {preset.accents}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, color: 'var(--accent-400)', fontSize: 12, fontWeight: 600, gap: 3 }}>
                <span>Tạo bài này</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Library Header & Filters ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Kho bài nghe AI của bạn</span>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>{filteredList.length}</span>
          </h3>
        </div>

        {/* Toolbar: Search + Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm bài nghe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12.5,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'Part 3', label: 'Part 3' },
              { id: 'Part 4', label: 'Part 4' },
              { id: 'quiz', label: 'Có Trắc nghiệm' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPartFilter(f.id)}
                style={{
                  border: 'none',
                  background: partFilter === f.id ? 'var(--accent-600)' : 'transparent',
                  color: partFilter === f.id ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: partFilter === f.id ? 700 : 500,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Lessons List / Empty State ─────────────────────────── */}
      {filteredList.length === 0 ? (
        <div className="card text-center" style={{ padding: '50px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 60, height: 60, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: 'var(--accent-400)',
            }}
          >
            <Headphones size={28} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {searchQuery || partFilter !== 'all' ? 'Không tìm thấy bài nghe phù hợp' : 'Chưa có bài luyện nghe AI nào'}
          </h3>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
            {searchQuery || partFilter !== 'all'
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả".'
              : 'Hãy chọn một chủ đề gợi ý ở trên hoặc bấm nút bên dưới để AI tự động tạo bài nghe hội thoại TOEIC kèm giọng phát thanh viên bản xứ ngay lập tức!'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {searchQuery || partFilter !== 'all' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchQuery(''); setPartFilter('all'); }}
              >
                Xóa bộ lọc tìm kiếm
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenNew}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-600), #7c3aed)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  padding: '8px 16px',
                }}
              >
                <Sparkles size={14} color="#fef08a" /> ✨ Tạo bài nghe đầu tiên
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredList.map((item) => {
            const accents = extractSpeakerAccents(item.text);
            const questionCount = item.questions?.length || 0;
            const chunkCount = item.chunks?.length || 0;
            const isDeleting = confirmDeleteId === item.id;

            // Snippet preview
            const snippet = (item.text || '')
              .split('\n')
              .filter(l => l.trim() && !l.toLowerCase().includes('questions'))
              .slice(0, 2)
              .join(' • ');

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Card Header: Badges + Date + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Part Badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: item.part === 'Part 4' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                        color: item.part === 'Part 4' ? '#fbbf24' : '#60a5fa',
                        border: `1px solid ${item.part === 'Part 4' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      }}
                    >
                      {item.part || 'Part 3'}
                    </span>

                    {/* Level Badge */}
                    {item.level && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: item.level === 'advanced' ? 'rgba(168,85,247,0.15)' : 'rgba(16,185,129,0.15)',
                          color: item.level === 'advanced' ? '#c084fc' : '#34d399',
                        }}
                      >
                        {item.level === 'advanced' ? '750+ Nâng cao' : '550-700'}
                      </span>
                    )}

                    {/* Accent Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {accents.map((acc, aIdx) => (
                        <span
                          key={aIdx}
                          style={{
                            fontSize: 11,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {acc}
                        </span>
                      ))}
                    </div>

                    {/* Target Chunks count */}
                    {chunkCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(99,102,241,0.12)',
                          color: 'var(--accent-300)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Layers size={11} /> {chunkCount} chunks
                      </span>
                    )}

                    {/* Quiz Questions count */}
                    {questionCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(236,72,153,0.12)',
                          color: '#f472b6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <HelpCircle size={11} /> {questionCount} câu hỏi
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {item.createdAt && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} /> {formatDate(item.createdAt)}
                      </span>
                    )}

                    {/* Delete action */}
                    {isDeleting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Xác nhận xóa?</span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleDelete(item.id)}
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => setConfirmDeleteId(item.id)}
                        title="Xóa bài nghe này"
                        style={{ color: 'var(--text-muted)', width: 28, height: 28, padding: 4 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body: Title & Text Preview */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {item.title}
                  </h4>
                  {item.themeVi && (
                    <div style={{ fontSize: 12, color: 'var(--accent-400)', fontWeight: 600, marginBottom: 6 }}>
                      Chủ đề: {item.themeVi}
                    </div>
                  )}
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                    &ldquo;{snippet}&rdquo;
                  </p>
                </div>

                {/* Card Footer: Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
                  {/* Primary: Nghe đàm thoại */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStartListening(item, 'listen')}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-600), #7c3aed)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Headphones size={13} />
                    Luyện nghe ngay
                  </button>

                  {/* Dictation */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStartListening(item, 'dictation')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <PenLine size={13} style={{ color: '#38bdf8' }} />
                    Chép chính tả
                  </button>

                  {/* Comprehension Quiz (if available) */}
                  {questionCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartListening(item, 'quiz')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <HelpCircle size={13} style={{ color: '#f472b6' }} />
                      Làm trắc nghiệm ({questionCount})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modals ──────────────────────────────────────────────── */}
      <GenerateListeningModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onGenerated={handleAiGenerated}
        onToast={onToast}
        initialTopicId={generateInitialTopicId}
        initialPart={generateInitialPart}
      />

      {activeListeningTranscript && (
        <TranscriptListeningModal
          transcript={activeListeningTranscript}
          chunks={activeListeningTranscript.chunks}
          initialMode={listeningInitialMode}
          onClose={() => setActiveListeningTranscript(null)}
          onSaveGenerated={(tr) => {
            if (onSave) onSave(tr);
            if (tr.chunks && tr.chunks.length > 0 && onChunksExtracted) {
              onChunksExtracted(tr.id, tr.chunks);
            }
            if (onToast) onToast('success', `Đã lưu "${tr.title}" vào kho bài nghe!`);
          }}
        />
      )}
    </div>
  );
}

export default ListeningAiModule;
