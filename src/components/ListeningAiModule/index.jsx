import React, { useState, useMemo, useRef } from 'react';
import {
  Headphones, Sparkles, Plus, Minus, Search, Trash2,
  PenLine, HelpCircle, CheckCircle, Flame, Layers, Globe,
  Calendar, ChevronRight, Filter, BookOpen, Volume2, Edit3,
  Check, X, FileText, Shuffle
} from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { analyzeTranscript } from '../../services/ai';
import { getApiKey, getChunks } from '../../store/storage';
import { PRESET_LISTENING_TOPICS } from '../../services/listeningAi';
import GenerateListeningModal from '../TranscriptModule/GenerateListeningModal';
import { TranscriptListeningModal } from '../TranscriptModule/TranscriptListeningModal';

function generateId() {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const QUICK_TOPIC_PRESETS = [
  {
    topicId: 'office_project',
    title: 'Họp dự án & Báo cáo tiến độ',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇬🇧 Anh',
    emoji: '💼',
  },
  {
    topicId: 'flight_travel',
    title: 'Sân bay & Đổi vé máy bay',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇦🇺 Úc',
    emoji: '✈️',
  },
  {
    topicId: 'recruitment_hr',
    title: 'Phỏng vấn & Tuyển dụng',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ, 🇬🇧 Anh & 🇨🇦 Canada',
    emoji: '🤝',
  },
  {
    topicId: 'flight_travel',
    title: 'Thông báo chuyến bay & Sân ga',
    part: 'Part 4',
    partLabel: 'Part 4 • Độc thoại',
    accents: '🇬🇧 Anh (Phát thanh)',
    emoji: '📢',
  },
  {
    topicId: 'customer_service',
    title: 'Xử lý khiếu nại & Hoàn tiền',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇦🇺 Úc & 🇺🇸 Mỹ',
    emoji: '🛍️',
  },
  {
    topicId: 'tech_support',
    title: 'Sự cố thiết bị & Bảo trì VP',
    part: 'Part 3',
    partLabel: 'Part 3 • Hội thoại',
    accents: '🇺🇸 Mỹ & 🇬🇧 Anh',
    emoji: '💻',
  },
];

// Helper trích xuất danh sách cờ accent từ nội dung script
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

// ─── Modal Chỉnh Sửa Tên / Chủ Đề Script ────────────────────────
function EditTranscriptModal({ transcript, onSave, onClose }) {
  const [title, setTitle] = useState(transcript?.title || '');
  const [themeVi, setThemeVi] = useState(transcript?.themeVi || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...transcript,
      title: title.trim(),
      themeVi: themeVi.trim(),
    });
    onClose();
  };

  return (
    <Modal title="Chỉnh sửa thông tin bài nghe" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Tên bài nghe / Nguồn đề thi</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ví dụ: ETS 2024 Test 1 (Q32-34) - Đặt hàng máy in"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <span className="text-muted text-xs mt-1 block">
            Đặt tên ngắn gọn theo bộ đề giúp bạn tìm kiếm nhanh chóng khi có nhiều bài nghe.
          </span>
        </div>

        <div>
          <label className="label">Chủ đề (Tiếng Việt)</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ví dụ: Dịch vụ khách hàng & Xử lý sự cố"
            value={themeVi}
            onChange={(e) => setThemeVi(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <Check size={14} /> Lưu thay đổi
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Form Dán Script Thủ Công (Dành cho đề ETS / sách ngoài) ──────
function ManualTranscriptInput({ onSave, onChunksExtracted, onToast, onClose }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [part, setPart] = useState('Part 3');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      onToast('error', 'Vui lòng nhập hoặc dán nội dung script trước.');
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vui lòng vào Cài đặt để nhập Google Gemini API key.');
      return;
    }

    setLoading(true);
    try {
      const id = generateId();
      const result = await analyzeTranscript(text.trim(), part, apiKey);

      const transcript = {
        id,
        text: text.trim(),
        title: title.trim() || `Script ${part} (${formatDate(Date.now())})`,
        part,
        createdAt: Date.now(),
        theme: result.theme || '',
        themeVi: result.themeVi || '',
        themeDescription: result.themeDescription || '',
        isAiGenerated: false,
      };
      onSave(transcript);

      // Trích xuất chunks
      const chunks = [];
      const ts = Date.now();
      (result.groups || []).forEach((group, gi) => {
        (group.chunks || []).forEach((c, ci) => {
          chunks.push({
            ...c,
            id: `chunk_${id}_${gi}_${ci}_${ts}`,
            groupId: `group_${id}_${gi}`,
            groupName: group.name || `Nhóm ${gi + 1}`,
            transcriptId: id,
          });
        });
      });

      if (chunks.length === 0 && Array.isArray(result.chunks)) {
        result.chunks.forEach((c, i) => {
          chunks.push({ ...c, id: `chunk_${id}_${i}_${ts}`, transcriptId: id });
        });
      }

      onChunksExtracted(id, chunks);
      onToast('success', `🎉 Đã lưu bài nghe và trích xuất ${chunks.length} chunks thành công!`);
      setText('');
      setTitle('');
      if (onClose) onClose();
    } catch (err) {
      onToast('error', `Lỗi AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card mb-6"
      style={{
        border: '1px solid rgba(56, 189, 248, 0.3)',
        background: 'rgba(15, 23, 42, 0.85)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            + Dán Script Đề Thi Ngoài (ETS / Hacker TOEIC)
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Hệ thống sẽ tự động nhận diện người nói (M / W), phân tích từ vựng và trích xuất Chunks để luyện tập
          </div>
        </div>
        {onClose && (
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Part selector */}
      <div style={{ marginBottom: 12 }}>
        <label className="label">Phần thi TOEIC</label>
        <div className="toggle-group" style={{ maxWidth: 280 }}>
          {['Part 3', 'Part 4'].map((p) => (
            <div
              key={p}
              className={`toggle-option ${part === p ? 'active' : ''}`}
              onClick={() => setPart(p)}
            >
              {p === 'Part 3' ? 'Part 3 (Hội thoại 2–3 người)' : 'Part 4 (Độc thoại 1 người)'}
            </div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <label className="label">Tên bài nghe / Nguồn đề (Tùy chọn)</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ví dụ: ETS 2024 Test 1 (Câu 32-34) - Bàn giao máy in"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: 14 }}>
        <label className="label">Nội dung Script</label>
        <textarea
          className="textarea-field"
          rows={7}
          placeholder={`Dán đoạn transcript tiếng Anh vào đây...\n\nVí dụ format chuẩn:\nM-Am: Good morning. I'd like to place an order for some office supplies.\nW-Br: Of course. What do you need?\nM-Am: We're running low on paper and printer ink.`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{text.length} ký tự</span>
          {text.length > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setText('')}
              style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none' }}
            >
              Xóa trắng
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {onClose && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
            Hủy
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #6366f1)',
            padding: '8px 18px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? (
            <>
              <Spinner size={14} /> Đang phân tích Chunks…
            </>
          ) : (
            <>
              <Sparkles size={14} color="#fef08a" /> Phân tích &amp; Lưu bài nghe
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Unified Listening Module ──────────────────────────────
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

  const [editingTranscript, setEditingTranscript] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'Part 3' | 'Part 4' | 'ai' | 'quiz'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Bộ lọc danh sách toàn bộ bài nghe
  const filteredList = useMemo(() => {
    return transcripts.filter(t => {
      // Filter theo tab
      if (filterType === 'Part 3' && t.part !== 'Part 3') return false;
      if (filterType === 'Part 4' && t.part !== 'Part 4') return false;
      if (filterType === 'ai' && !t.isAiGenerated) return false;
      if (filterType === 'quiz' && (!t.questions || t.questions.length === 0)) return false;

      // Filter theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchTheme = (t.themeVi || t.theme || '').toLowerCase().includes(q);
      const matchText = (t.text || '').toLowerCase().includes(q);
      return matchTitle || matchTheme || matchText;
    });
  }, [transcripts, filterType, searchQuery]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let part3 = 0;
    let part4 = 0;
    let aiCount = 0;
    let quizCount = 0;
    let totalChunks = 0;

    transcripts.forEach(t => {
      if (t.part === 'Part 3') part3++;
      if (t.part === 'Part 4') part4++;
      if (t.isAiGenerated) aiCount++;
      if (t.questions && t.questions.length > 0) quizCount++;
      const tChunks = getChunks(t.id) || t.chunks || [];
      totalChunks += tChunks.length;
    });

    return { total: transcripts.length, part3, part4, aiCount, quizCount, totalChunks };
  }, [transcripts]);

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
    // Mở ngay modal nghe để trải nghiệm
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

  return (
    <div className="listening-ai-page" style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 60 }}>
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 22px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', marginBottom: 10 }}>
              <Headphones size={13} color="#818cf8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trung tâm Luyện Nghe TOEIC &amp; Chép Chính Tả
              </span>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Luyện Nghe Đàm Thoại &amp; Độc Thoại TOEIC
            </h1>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, marginBottom: 16 }}>
              Tự động tạo bài nghe với AI hoặc dán script đề thi ETS / Hacker TOEIC.
              Luyện tai với giọng đọc bản xứ <strong style={{ color: '#ffffff' }}>Mỹ, Anh, Úc, Canada</strong>,
              chép chính tả (Dictation) và làm trắc nghiệm kiểm tra độ hiểu bài có chấm điểm tức thì.
            </p>

            {/* Main Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNew}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  borderColor: 'transparent',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                <Sparkles size={15} color="#fef08a" />
                ✨ Tạo bài nghe bằng AI
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowManualInput(prev => !prev)}
                style={{
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: showManualInput ? 'var(--accent-400)' : 'var(--border-subtle)',
                  color: showManualInput ? 'var(--accent-300)' : 'var(--text-primary)',
                }}
              >
                {showManualInput ? <Minus size={15} /> : <Plus size={15} />}
                {showManualInput ? 'Thu gọn ô dán' : '+ Dán Script đề thi'}
              </button>

              {/* Quick stats inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong> bài nghe ({stats.totalChunks} chunks)
                </span>
                {stats.quizCount > 0 && (
                  <span style={{ fontSize: 12, color: '#f472b6' }}>
                    • <strong>{stats.quizCount}</strong> bài có quiz
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Collapsible Manual Transcript Input Form ─────────────── */}
      {showManualInput && (
        <ManualTranscriptInput
          onSave={onSave}
          onChunksExtracted={onChunksExtracted}
          onToast={onToast}
          onClose={() => setShowManualInput(false)}
        />
      )}

      {/* ─── Quick Topic Presets ─────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={15} style={{ color: 'var(--accent-400)' }} />
            <h3 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Gợi ý chủ đề nhanh (Bấm để AI tạo kịch bản ngay)
            </h3>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Đa dạng ngữ điệu bản xứ</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {QUICK_TOPIC_PRESETS.map((preset, idx) => (
            <div
              key={idx}
              className="card"
              onClick={() => handleOpenPreset(preset)}
              style={{
                padding: '12px 14px',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{preset.emoji}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: preset.part === 'Part 3' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                      color: preset.part === 'Part 3' ? '#60a5fa' : '#fbbf24',
                    }}
                  >
                    {preset.partLabel}
                  </span>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {preset.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {preset.accents}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, color: 'var(--accent-400)', fontSize: 11.5, fontWeight: 600, gap: 2 }}>
                <span>Tạo bài này</span>
                <ChevronRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Library Header & Filters ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Kho bài nghe của bạn</span>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>{filteredList.length}</span>
          </h3>
        </div>

        {/* Toolbar: Search + Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 28px',
                fontSize: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `Tất cả (${stats.total})` },
              { id: 'Part 3', label: `Part 3 (${stats.part3})` },
              { id: 'Part 4', label: `Part 4 (${stats.part4})` },
              { id: 'ai', label: `✨ AI tạo (${stats.aiCount})` },
              { id: 'quiz', label: `📝 Quiz (${stats.quizCount})` },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                style={{
                  border: 'none',
                  background: filterType === f.id ? 'var(--accent-600)' : 'transparent',
                  color: filterType === f.id ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 11.5,
                  fontWeight: filterType === f.id ? 700 : 500,
                  padding: '3px 8px',
                  borderRadius: 5,
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
        <div className="card text-center" style={{ padding: '44px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 54, height: 54, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: 'var(--accent-400)',
            }}
          >
            <Headphones size={26} />
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            {searchQuery || filterType !== 'all' ? 'Không tìm thấy bài nghe phù hợp' : 'Chưa có bài luyện nghe nào'}
          </h3>

          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 18px', lineHeight: 1.5 }}>
            {searchQuery || filterType !== 'all'
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút bên dưới để xóa bộ lọc.'
              : 'Hãy chọn một chủ đề gợi ý ở trên, bấm "Tạo bài nghe bằng AI" hoặc bấm "Dán Script đề thi" để bắt đầu!'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {searchQuery || filterType !== 'all' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
              >
                Xóa bộ lọc tìm kiếm
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenNew}
                  style={{ background: 'linear-gradient(135deg, var(--accent-600), #7c3aed)' }}
                >
                  <Sparkles size={13} color="#fef08a" /> ✨ Tạo bài nghe bằng AI
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowManualInput(true)}
                >
                  + Dán Script đề thi
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredList.map((item) => {
            const accents = extractSpeakerAccents(item.text);
            const questionCount = item.questions?.length || 0;
            const tChunks = getChunks(item.id) || item.chunks || [];
            const chunkCount = tChunks.length;
            const isDeleting = confirmDeleteId === item.id;

            // Snippet preview
            const snippet = (item.text || '')
              .split('\n')
              .filter(l => l.trim() && !l.toLowerCase().includes('questions') && !l.toLowerCase().includes('refer to'))
              .slice(0, 2)
              .join(' • ');

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Header: Badges + Date + Edit / Delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Part Badge */}
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 5,
                        background: item.part === 'Part 4' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                        color: item.part === 'Part 4' ? '#fbbf24' : '#60a5fa',
                        border: `1px solid ${item.part === 'Part 4' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      }}
                    >
                      {item.part || 'Part 3'}
                    </span>

                    {/* AI Source badge */}
                    {item.isAiGenerated ? (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 5,
                          background: 'rgba(168,85,247,0.15)',
                          color: '#c084fc',
                          border: '1px solid rgba(168,85,247,0.3)',
                        }}
                      >
                        ✨ AI sinh
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 5,
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        📝 Tự dán
                      </span>
                    )}

                    {/* Level */}
                    {item.level && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 5,
                          background: item.level === 'advanced' ? 'rgba(168,85,247,0.15)' : 'rgba(16,185,129,0.15)',
                          color: item.level === 'advanced' ? '#c084fc' : '#34d399',
                        }}
                      >
                        {item.level === 'advanced' ? '750+' : '550-700'}
                      </span>
                    )}

                    {/* Accent Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {accents.map((acc, aIdx) => (
                        <span
                          key={aIdx}
                          style={{
                            fontSize: 10.5,
                            padding: '1px 5px',
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
                          fontSize: 10.5,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(99,102,241,0.12)',
                          color: 'var(--accent-300)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Layers size={10} /> {chunkCount} chunks
                      </span>
                    )}

                    {/* Quiz Questions count */}
                    {questionCount > 0 && (
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(236,72,153,0.12)',
                          color: '#f472b6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <HelpCircle size={10} /> {questionCount} câu quiz
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.createdAt && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Calendar size={11} /> {formatDate(item.createdAt)}
                      </span>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => setEditingTranscript(item)}
                      title="Chỉnh sửa tên và chủ đề"
                      style={{ color: 'var(--text-muted)', width: 26, height: 26, padding: 3 }}
                    >
                      <Edit3 size={13} />
                    </button>

                    {/* Delete action */}
                    {isDeleting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 600 }}>Xóa?</span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', fontSize: 10.5 }}
                          onClick={() => handleDelete(item.id)}
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 5px', fontSize: 10.5 }}
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
                        style={{ color: 'var(--text-muted)', width: 26, height: 26, padding: 3 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Title & Preview */}
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {item.title}
                  </h4>
                  {item.themeVi && (
                    <div style={{ fontSize: 11.5, color: 'var(--accent-400)', fontWeight: 600, marginBottom: 4 }}>
                      Chủ đề: {item.themeVi}
                    </div>
                  )}
                  {snippet && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                      &ldquo;{snippet}&rdquo;
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStartListening(item, 'listen')}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-600), #7c3aed)',
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Headphones size={13} />
                    Luyện nghe ngay
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStartListening(item, 'dictation')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <PenLine size={12} style={{ color: '#38bdf8' }} />
                    Chép chính tả
                  </button>

                  {questionCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartListening(item, 'quiz')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <HelpCircle size={12} style={{ color: '#f472b6' }} />
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

      {editingTranscript && (
        <EditTranscriptModal
          transcript={editingTranscript}
          onSave={(updated) => {
            if (onSave) onSave(updated);
            if (onToast) onToast('success', 'Đã cập nhật thông tin bài nghe!');
            setEditingTranscript(null);
          }}
          onClose={() => setEditingTranscript(null)}
        />
      )}

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
