import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Headphones, Sparkles, Plus, Minus, Search, Trash2,
  Edit3, Check, X,
} from 'lucide-react';
import { Modal, Spinner, Pagination } from '../ui';
import { analyzeTranscript } from '../../services/ai';
import { getApiKey, getChunks } from '../../store/storage';
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

export function getTranscriptDisplayTitle(item = {}) {
  if (item.title && item.title.trim()) return item.title.trim();
  if (item.themeVi && item.themeVi.trim()) return item.themeVi.trim();
  if (item.theme && item.theme.trim()) return item.theme.trim();
  if (item.sourceTopic && item.sourceTopic.trim()) return item.sourceTopic.trim();
  if (item.topic && item.topic.trim()) return item.topic.trim();

  // Try extracting the first line or first dialogue
  if (item.text) {
    const firstLine = item.text.split('\n').find(l => l.trim().length > 0) || '';
    const cleanLine = firstLine.replace(/^[A-Za-z0-9_-]+:\s*/, '').trim();
    if (cleanLine) {
      return cleanLine.length > 55 ? cleanLine.slice(0, 52) + '...' : cleanLine;
    }
  }

  return `Hội thoại TOEIC ${item.part || 'Part 3'} (#${(item.id || '').slice(-4)})`;
}

const DEFAULT_TRANSCRIPTS = [
  {
    id: 'tr_office_conversations',
    title: 'Office Conversations',
    theme: 'Office Conversations',
    themeVi: 'Hội thoại văn phòng & Báo cáo tiến độ',
    part: 'Part 3',
    level: 'Intermediate',
    duration: 12,
    progress: 72,
    isAiGenerated: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    text: `M-Am: Good morning, Rachel. Do you have a moment to review the quarterly budget report before the executive meeting?
W-Am: Sure, Mark. I looked over the marketing projections earlier today. Most departments stayed well within their targets, but our cloud infrastructure costs increased by about fifteen percent.
M-Am: That makes sense given the server upgrades we deployed last month. I'll make sure to highlight the long-term cost efficiencies in our slide deck.
W-Am: Excellent idea. Let's make sure the revised figures are sent to everyone thirty minutes before the presentation starts.`,
    chunks: [
      { id: 'c_off_1', text: 'review the quarterly budget report', meaning: 'xem lại báo cáo ngân sách quý', type: 'collocation' },
      { id: 'c_off_2', text: 'well within their targets', meaning: 'hoàn toàn nằm trong mục tiêu', type: 'collocation' },
      { id: 'c_off_3', text: 'cloud infrastructure costs', meaning: 'chi phí hạ tầng đám mây', type: 'collocation' },
      { id: 'c_off_4', text: 'long-term cost efficiencies', meaning: 'hiệu quả chi phí dài hạn', type: 'collocation' },
      { id: 'c_off_5', text: 'revised figures', meaning: 'số liệu đã điều chỉnh', type: 'collocation' },
    ],
    questions: [
      {
        question: 'What are the speakers mainly discussing?',
        options: ['A quarterly budget report', 'An employee orientation', 'An office relocation', 'A marketing campaign'],
        answer: 0,
        explanation: 'Người nam hỏi xem lại báo cáo ngân sách quý ("review the quarterly budget report").',
      },
      {
        question: 'Why did the infrastructure costs increase?',
        options: ['Office rent increase', 'Recent server upgrades', 'External consultants', 'Equipment repairs'],
        answer: 1,
        explanation: 'Người nam nhắc đến việc nâng cấp máy chủ vào tháng trước ("server upgrades we deployed last month").',
      },
      {
        question: 'What does the woman suggest doing before the meeting?',
        options: ['Print handouts', 'Cancel the meeting', 'Send revised figures to attendees', 'Call the director'],
        answer: 2,
        explanation: 'Người nữ đề xuất gửi số liệu đã chỉnh sửa cho người tham gia 30 phút trước giờ họp ("make sure the revised figures are sent to everyone thirty minutes before the presentation starts").',
      },
    ],
  },
  {
    id: 'tr_travel_transportation',
    title: 'Travel & Transportation',
    theme: 'Travel & Transportation',
    themeVi: 'Lịch trình công tác & Đặt phòng khách sạn',
    part: 'Part 3',
    level: 'Intermediate',
    duration: 15,
    progress: 35,
    isAiGenerated: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    text: `W-Br: Good afternoon, Oliver. Have you managed to finalize the travel arrangements for next Tuesday's regional conference in Manchester?
M-Br: Almost done, Fiona. I booked our round-trip train tickets leaving Euston Station at eight in the morning. However, the conference hotel is completely booked up for Tuesday night.
W-Br: That's inconvenient. Did you check the boutique hotel across from the convention center?
M-Br: Yes, I spoke with their front desk this morning. They have two executive rooms available, so I'll go ahead and confirm the reservation right away.`,
    chunks: [
      { id: 'c_trv_1', text: 'finalize the travel arrangements', meaning: 'hoàn tất sắp xếp chuyến đi', type: 'collocation' },
      { id: 'c_trv_2', text: 'round-trip train tickets', meaning: 'vé tàu khứ hồi', type: 'collocation' },
      { id: 'c_trv_3', text: 'completely booked up', meaning: 'đã hết sạch chỗ', type: 'collocation' },
      { id: 'c_trv_4', text: 'confirm the reservation', meaning: 'xác nhận đặt phòng', type: 'collocation' },
    ],
    questions: [
      {
        question: 'Where are the speakers traveling next week?',
        options: ['To Manchester', 'To Edinburgh', 'To Birmingham', 'To Bristol'],
        answer: 0,
        explanation: 'Người nữ nhắc tới hội nghị khu vực ở Manchester ("regional conference in Manchester").',
      },
      {
        question: 'What problem does the man mention?',
        options: ['Train tickets sold out', 'The conference hotel is fully booked', 'Flight was delayed', 'Meeting canceled'],
        answer: 1,
        explanation: 'Người nam cho biết khách sạn hội nghị đã hết phòng ("the conference hotel is completely booked up").',
      },
      {
        question: 'What will the man do next?',
        options: ['Cancel the trip', 'Book train tickets', 'Confirm hotel reservation', 'Contact organizers'],
        answer: 2,
        explanation: 'Người nam sẽ xác nhận đặt phòng ở khách sạn đối diện ("confirm the reservation right away").',
      },
    ],
  },
];

// Helper trích xuất danh sách accent từ nội dung script
function extractSpeakerAccents(text = '') {
  const accents = new Set();
  const lower = (text || '').toLowerCase();
  if (lower.includes('-am') || lower.includes('mỹ') || lower.includes('us')) accents.add('US English');
  if (lower.includes('-br') || lower.includes('-uk') || lower.includes('anh') || lower.includes('gb')) accents.add('UK English');
  if (lower.includes('-au') || lower.includes('úc') || lower.includes('australia')) accents.add('AU English');
  if (lower.includes('-ca') || lower.includes('canada')) accents.add('CA English');
  if (accents.size === 0) accents.add('US English');
  return Array.from(accents);
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

  // Danh sách bài nghe (sử dụng DEFAULT_TRANSCRIPTS nếu chưa có bài nào)
  const displayList = useMemo(() => {
    return transcripts && transcripts.length > 0 ? transcripts : DEFAULT_TRANSCRIPTS;
  }, [transcripts]);

  // Bộ lọc danh sách toàn bộ bài nghe
  const filteredList = useMemo(() => {
    return displayList.filter(t => {
      // Filter theo tab
      if (filterType === 'Part 3' && t.part !== 'Part 3') return false;
      if (filterType === 'Part 4' && t.part !== 'Part 4') return false;
      if (filterType === 'ai' && !t.isAiGenerated) return false;
      if (filterType === 'quiz' && (!t.questions || t.questions.length === 0)) return false;

      // Filter theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = getTranscriptDisplayTitle(t).toLowerCase();
      const matchTitle = title.includes(q);
      const matchTheme = (t.themeVi || t.theme || t.sourceTopic || '').toLowerCase().includes(q);
      const matchText = (t.text || '').toLowerCase().includes(q);
      return matchTitle || matchTheme || matchText;
    });
  }, [displayList, filterType, searchQuery]);

  // Pagination states (Mặc định 10 bài / trang)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const listTopRef = useRef(null);

  // Reset về trang 1 khi thay đổi tìm kiếm, bộ lọc hoặc pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, pageSize]);

  // Phân trang danh sách bài nghe
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Tự động điều chỉnh trang nếu tổng số trang giảm xuống (do xóa bài)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedList = useMemo(() => {
    return filteredList.slice(startIndex, endIndex);
  }, [filteredList, startIndex, endIndex]);

  const handlePageChange = (newPage) => {
    const p = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(p);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    let part3 = 0;
    let part4 = 0;
    let aiCount = 0;
    let quizCount = 0;
    let totalChunks = 0;

    displayList.forEach(t => {
      if (t.part === 'Part 3') part3++;
      if (t.part === 'Part 4') part4++;
      if (t.isAiGenerated) aiCount++;
      if (t.questions && t.questions.length > 0) quizCount++;
      const tChunks = getChunks(t.id) || t.chunks || [];
      totalChunks += tChunks.length;
    });

    return { total: displayList.length, part3, part4, aiCount, quizCount, totalChunks };
  }, [displayList]);

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
    if (onToast) onToast('success', `Đã tạo bài nghe "${newTranscript.title}" thành công!`);
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
    <div className="listening-lab-page">
      {/* ─── Header: Exact match to media_1789550413700.png ─── */}
      <div className="listening-lab-header">
        <div>
          <div className="listening-lab-tag">AUDIO TRAINING</div>
          <h1 className="listening-lab-title">Listening Lab</h1>
          <p className="listening-lab-subtitle">Train your ear with realistic workplace conversations.</p>
        </div>

        <div className="listening-lab-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenNew}
            style={{ padding: '9px 18px', fontWeight: 600, fontSize: 13, gap: 7 }}
          >
            <Sparkles size={15} strokeWidth={1.75} />
            <span>Tạo bài bằng AI</span>
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowManualInput(prev => !prev)}
            style={{ padding: '9px 16px', fontWeight: 600, fontSize: 13, gap: 6 }}
          >
            {showManualInput ? <Minus size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
            <span>{showManualInput ? 'Thu gọn' : 'Dán Script đề thi'}</span>
          </button>
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

      {/* ─── Minimal Toolbar (Search & Filter Chips) ─────────────── */}
      <div ref={listTopRef} className="listening-lab-toolbar">
        {/* Filter Chips */}
        <div className="listening-filter-chips">
          {[
            { id: 'all', label: `Tất cả (${stats.total})` },
            { id: 'Part 3', label: `Part 3 (${stats.part3})` },
            { id: 'Part 4', label: `Part 4 (${stats.part4})` },
            { id: 'ai', label: `AI tạo (${stats.aiCount})` },
            { id: 'quiz', label: `Quiz (${stats.quizCount})` },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`listening-filter-chip ${filterType === f.id ? 'active' : ''}`}
              onClick={() => setFilterType(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search box */}
        <div className="listening-lab-search">
          <Search size={13} className="listening-lab-search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tên, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Lessons Grid (Cards matching media_1789550413700.png) ─── */}
      {filteredList.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 50, height: 50, borderRadius: 'var(--radius-full)',
              background: 'rgba(53, 106, 230, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: 'var(--primary)',
            }}
          >
            <Headphones size={24} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Không tìm thấy bài nghe phù hợp
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 16px' }}>
            Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
          </p>
          <button
            type="button"
            className="secondary-button btn-sm"
            onClick={() => { setSearchQuery(''); setFilterType('all'); }}
            style={{ margin: '0 auto' }}
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <>
          <div className="listening-lab-grid">
            {paginatedList.map((item) => {
              const accents = extractSpeakerAccents(item.text);
              const primaryAccent = accents[0] || (item.part === 'Part 4' ? 'UK English' : 'US English');
              const tChunks = getChunks(item.id) || item.chunks || [];
              const chunkCount = tChunks.length;
              const isDeleting = confirmDeleteId === item.id;

              // Calculate practice progress
              const practicedChunksCount = tChunks.filter(c => (allProgress[c.id]?.practiceCount || 0) > 0).length;
              const calculatedPct = chunkCount > 0 ? Math.round((practicedChunksCount / chunkCount) * 100) : 0;
              const displayProgress = calculatedPct > 0 ? calculatedPct : (item.progress ?? 0);

              // Duration estimate
              const wordCount = (item.text || '').split(/\s+/).filter(Boolean).length;
              const durationMin = item.duration || Math.max(8, Math.min(25, Math.round(wordCount / 16) + (item.questions?.length ? 4 : 0)));

              const displayTitle = getTranscriptDisplayTitle(item);
              const extraTheme = (item.themeVi && item.themeVi !== displayTitle)
                ? item.themeVi
                : (item.theme && item.theme !== displayTitle ? item.theme : null);

              return (
                <article
                  key={item.id}
                  className="listening-lab-card"
                  onClick={() => handleStartListening(item, 'listen')}
                >
                  {/* Top Row: Icon + Corner Shape & Badge + Hover Actions */}
                  <div className="listening-card-top">
                    <div className="listening-card-icon-box">
                      <Headphones size={20} color="#2563eb" strokeWidth={2} />
                    </div>

                    {/* Top Right Corner Organic Decor & Level Pill */}
                    <div className="listening-card-corner-shape">
                      <span className="listening-level-pill">
                        {item.level || (item.part === 'Part 4' ? 'Advanced' : 'Intermediate')}
                      </span>
                    </div>

                    {/* Hover Action Menu (Edit / Delete) */}
                    <div className="listening-card-hover-actions" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="listening-card-icon-btn"
                        onClick={() => setEditingTranscript(item)}
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit3 size={13} strokeWidth={1.75} />
                      </button>
                      {isDeleting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className="listening-card-del-btn"
                            onClick={() => handleDelete(item.id)}
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            className="listening-card-cancel-btn"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="listening-card-icon-btn danger"
                          onClick={() => setConfirmDeleteId(item.id)}
                          title="Xóa bài nghe"
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="listening-card-title" title={displayTitle}>
                    {displayTitle}
                  </h3>
                  <div className="listening-card-subtitle" title={extraTheme ? `Listening · ${primaryAccent} · ${extraTheme}` : `Listening · ${primaryAccent}`}>
                    <span>Listening · {primaryAccent}</span>
                    {extraTheme && (
                      <>
                        <span style={{ opacity: 0.35 }}>•</span>
                        <span style={{ color: 'var(--accent-400)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {extraTheme}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Meta row & Progress track */}
                  <div className="listening-card-footer">
                    <div className="listening-card-meta">
                      <span>{durationMin} min</span>
                      <span>{displayProgress}% complete</span>
                    </div>
                    <div className="listening-progress-track">
                      <div
                        className="listening-progress-fill"
                        style={{ width: `${Math.max(displayProgress, 3)}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div style={{ marginTop: 24 }}>
              <Pagination
                currentPage={validPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                itemLabel="bài nghe"
              />
            </div>
          )}
        </>
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
          chunks={activeListeningTranscript.chunks || getChunks(activeListeningTranscript.id) || []}
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
