import { useState, useMemo } from 'react';
import {
  FileText, Plus, Minus, Trash2, ChevronRight, Calendar, Headphones,
  Search, Edit3, X, Check, ArrowUpDown, Flame, CheckCircle, PenLine, Layers
} from 'lucide-react';
import { EmptyState, Badge, SkeletonCard, Modal } from '../ui';
import { analyzeTranscript } from '../../services/ai';
import { getApiKey, getChunks } from '../../store/storage';
import { isDueForReview } from '../../services/srs';
import { TranscriptListeningModal } from './TranscriptListeningModal';

// ─── Helpers ───────────────────────────────────────────────────
function generateId() {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function truncateText(text, maxLen = 85) {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

// ─── Edit Transcript Modal (Rename / Test Tag) ───────────────────
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
    <Modal title="Chỉnh sửa thông tin Script" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Tên gợi nhớ / Nguồn đề thi</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ví dụ: ETS 2024 Test 1 (Q32-34) - Đặt hàng máy in"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <span className="text-muted text-xs mt-1 block">
            Đặt tên ngắn gọn theo bộ đề giúp bạn tìm kiếm và quản lý nhanh chóng khi có nhiều script.
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

// ─── TranscriptInput ──────────────────────────────────────────
function TranscriptInput({ onSave, onChunksExtracted, onToast, onPreviewListen }) {
  const [text, setText]   = useState('');
  const [title, setTitle] = useState('');
  const [part, setPart]   = useState('Part 3');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      onToast('error', 'Vui lòng nhập transcript trước.');
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vui lòng vào Settings để nhập.');
      return;
    }

    setLoading(true);
    try {
      const id = generateId();
      const result = await analyzeTranscript(text.trim(), part, apiKey);

      // Save transcript with theme info & custom title
      const transcript = {
        id,
        text: text.trim(),
        title: title.trim(),
        part,
        createdAt: Date.now(),
        theme:            result.theme || '',
        themeVi:          result.themeVi || '',
        themeDescription: result.themeDescription || '',
      };
      onSave(transcript);

      // Flatten groups → chunks with guaranteed unique IDs
      const chunks = [];
      const ts = Date.now();
      (result.groups || []).forEach((group, gi) => {
        (group.chunks || []).forEach((c, ci) => {
          chunks.push({
            ...c,
            id:        `chunk_${id}_${gi}_${ci}_${ts}`,
            groupId:   `group_${id}_${gi}`,
            groupName: group.name || `Nhóm ${gi + 1}`,
            transcriptId: id,
          });
        });
      });

      // Fallback: if AI returned flat chunks (old format)
      if (chunks.length === 0 && Array.isArray(result.chunks)) {
        result.chunks.forEach((c, i) => {
          chunks.push({ ...c, id: `chunk_${id}_${i}_${ts}`, transcriptId: id });
        });
      }

      onChunksExtracted(id, chunks);
      onToast('success', `Đã trích xuất ${chunks.length} chunk từ transcript!`);
      setText('');
      setTitle('');
    } catch (err) {
      onToast('error', `Lỗi AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-6">
      <div className="section-header mb-4">
        <div>
          <div className="section-title">Thêm Transcript Mới</div>
          <div className="section-subtitle">Dán đoạn hội thoại hoặc độc thoại TOEIC để trích xuất chunk</div>
        </div>
      </div>

      {/* Part toggle */}
      <div className="mb-4">
        <label className="label">Phần thi (Part)</label>
        <div className="toggle-group" style={{ maxWidth: 240 }}>
          {['Part 3', 'Part 4'].map((p) => (
            <div
              key={p}
              id={`toggle-${p.replace(' ', '').toLowerCase()}`}
              className={`toggle-option ${part === p ? 'active' : ''}`}
              onClick={() => setPart(p)}
            >
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Title / Test source name (Optional) */}
      <div className="mb-3">
        <label className="label">Tên bài / Nguồn đề (Tùy chọn)</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ví dụ: ETS 2024 Test 1 (Câu 32-34)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Textarea */}
      <div className="mb-4">
        <label className="label">Nội dung Script</label>
        <textarea
          id="transcript-input"
          className="textarea-field"
          rows={9}
          placeholder={`Paste transcript TOEIC ${part} vào đây...\n\nVí dụ:\nM: Good morning. I'd like to place an order for some office supplies.\nW: Of course. What do you need?\nM: We're running low on paper and printer ink.`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <div className="flex justify-between mt-1">
          <span className="text-muted text-xs">{text.length} ký tự</span>
          {text.length > 0 && (
            <button className="text-muted text-xs btn-ghost" onClick={() => setText('')} style={{ padding: '2px 6px' }}>
              Xóa
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          id="analyze-btn"
          className="btn btn-primary btn-lg"
          style={{ flex: 1, minWidth: 200, justifyContent: 'center' }}
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <>
              <span className="animate-spin" style={{ display: 'inline-block' }}>⚙️</span>
              Đang phân tích…
            </>
          ) : (
            <>✨ Analyze &amp; Extract Chunks</>
          )}
        </button>

        {text.trim().length > 0 && onPreviewListen && (
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => onPreviewListen({ text: text.trim(), part, title: title.trim() })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
            }}
            title="Luyện nghe đoạn script này với AI giọng đọc"
          >
            <Headphones size={18} />
            <span>Nghe thử script</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-4">
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
          <p className="text-center text-muted text-sm mt-4">AI đang phân tích transcript… (~10-20 giây)</p>
        </div>
      )}
    </div>
  );
}

// ─── TranscriptCard (Enhanced with Title, Progress & Actions) ────
function TranscriptCard({
  item,
  onSelect,
  onDelete,
  onListen,
  onStartPractice,
  onEdit,
}) {
  const {
    id, part, createdAt, text, title, themeVi, theme,
    totalCount, practicedCount, dueCount, isCompleted, progressPct, avgScore
  } = item;

  const displayTitle = title || themeVi || theme || `Đoạn hội thoại #${id.slice(-4)}`;

  return (
    <div
      id={`transcript-card-${id}`}
      className="card animate-fade-in"
      style={{
        padding: '16px 18px',
        borderColor: isCompleted
          ? 'rgba(34, 197, 94, 0.35)'
          : dueCount > 0
          ? 'rgba(239, 68, 68, 0.35)'
          : undefined,
        background: isCompleted
          ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.03) 0%, var(--bg-surface) 100%)'
          : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Top Header: Badges & Quick Action Icons */}
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge type={part === 'Part 3' ? 'part3' : 'part4'}>
            {part}
          </Badge>
          <span className="text-muted text-xs flex items-center gap-1">
            <Calendar size={11} /> {formatDate(createdAt)}
          </span>
          {isCompleted && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10.5, fontWeight: 700, padding: '1px 7px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(34,197,94,0.15)', color: 'var(--success-text)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}>
              <CheckCircle size={11} /> Đã xong 100%
            </span>
          )}
          {dueCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10.5, fontWeight: 700, padding: '1px 7px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(239,68,68,0.15)', color: 'var(--error-text)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <Flame size={11} color="#ef4444" /> {dueCount} chunk đến hạn ôn
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              title="Đổi tên / Gắn nhãn đề thi"
              style={{ color: 'var(--text-muted)' }}
            >
              <Edit3 size={15} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            title="Xóa transcript"
            style={{ color: 'var(--error-text)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Title / Test Label */}
      <div style={{ marginBottom: 6 }}>
        <h4 style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {displayTitle}
        </h4>
        {title && (themeVi || theme) && (
          <span style={{ fontSize: 11.5, color: 'var(--accent-400)', fontWeight: 600 }}>
            🏷️ {themeVi || theme}
          </span>
        )}
      </div>

      {/* Snippet text */}
      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        marginBottom: 12,
      }}>
        {truncateText(text, 100)}
      </p>

      {/* Progress Bar Row */}
      {totalCount > 0 && (
        <div style={{ marginBottom: 14, background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Tiến độ: <strong style={{ color: 'var(--text-primary)' }}>{practicedCount}/{totalCount}</strong> chunks ({progressPct}%)
            </span>
            {avgScore != null && (
              <span style={{ fontWeight: 700, color: avgScore >= 80 ? 'var(--success-text)' : '#fbbf24' }}>
                Điểm TB: {avgScore}đ
              </span>
            )}
          </div>
          {/* Visual Progress Bar */}
          <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: progressPct >= 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #38bdf8)',
              borderRadius: 99,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onListen && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onListen(item);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
              }}
              title="Luyện nghe đoạn script này"
            >
              <Headphones size={13} /> Luyện Listening
            </button>
          )}

          {onStartPractice && totalCount > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartPractice(id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
              }}
              title="Bắt đầu luyện viết và nói các chunk trong bài này"
            >
              <PenLine size={13} /> Luyện {totalCount} Chunks
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onSelect(id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
          title="Xem danh sách chi tiết các chunk đã trích xuất"
        >
          <span>Xem chi tiết</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── TranscriptModule (Main Export) ───────────────────────────
export function TranscriptModule({
  transcripts = [],
  onSave,
  onDelete,
  onChunksExtracted,
  onSelectTranscript,
  _chunkCounts = {},
  allProgress = {},
  onToast,
  onStartPractice,
}) {
  const [showInput, setShowInput] = useState(() => transcripts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [editingTranscript, setEditingTranscript] = useState(null);
  const [listeningTranscript, setListeningTranscript] = useState(null);

  // Enriched transcripts with chunks and progress calculations
  const enrichedTranscripts = useMemo(() => {
    return transcripts.map(t => {
      const tChunks = getChunks(t.id) || [];
      const totalCount = tChunks.length;
      let practicedCount = 0;
      let dueCount = 0;
      let totalScore = 0;
      let scoredChunks = 0;

      tChunks.forEach(c => {
        const prog = allProgress?.[c.id];
        if (prog && prog.practiceCount > 0) {
          practicedCount++;
          if (prog.lastScore != null) {
            totalScore += prog.lastScore;
            scoredChunks++;
          }
        }
        if (isDueForReview(prog)) {
          dueCount++;
        }
      });

      const isCompleted = totalCount > 0 && practicedCount === totalCount && dueCount === 0;
      const progressPct = totalCount > 0 ? Math.round((practicedCount / totalCount) * 100) : 0;
      const avgScore = scoredChunks > 0 ? Math.round(totalScore / scoredChunks) : null;

      return {
        ...t,
        chunks: tChunks,
        totalCount,
        practicedCount,
        dueCount,
        isCompleted,
        progressPct,
        avgScore,
      };
    });
  }, [transcripts, allProgress]);

  // Total statistics across all transcripts
  const totalStats = useMemo(() => {
    let totalChunks = 0;
    let totalPracticed = 0;
    let totalCompletedTranscripts = 0;
    let totalDueTranscripts = 0;
    let part3Count = 0;
    let part4Count = 0;

    enrichedTranscripts.forEach(t => {
      totalChunks += t.totalCount;
      totalPracticed += t.practicedCount;
      if (t.isCompleted) totalCompletedTranscripts++;
      if (t.dueCount > 0) totalDueTranscripts++;
      if (t.part === 'Part 3') part3Count++;
      if (t.part === 'Part 4') part4Count++;
    });

    return {
      totalScripts: enrichedTranscripts.length,
      totalChunks,
      totalPracticed,
      totalCompletedTranscripts,
      totalDueTranscripts,
      part3Count,
      part4Count,
    };
  }, [enrichedTranscripts]);

  // Filtered & Sorted transcripts
  const filteredTranscripts = useMemo(() => {
    let result = [...enrichedTranscripts];

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const matchText = (t.text || '').toLowerCase().includes(q);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchThemeVi = (t.themeVi || '').toLowerCase().includes(q);
        const matchTheme = (t.theme || '').toLowerCase().includes(q);
        const matchPart = (t.part || '').toLowerCase().includes(q);
        const matchChunk = (t.chunks || []).some(c => (c.phrase || '').toLowerCase().includes(q));
        return matchText || matchTitle || matchThemeVi || matchTheme || matchPart || matchChunk;
      });
    }

    // 2. Filter tabs
    if (activeFilter === 'part3') {
      result = result.filter(t => t.part === 'Part 3');
    } else if (activeFilter === 'part4') {
      result = result.filter(t => t.part === 'Part 4');
    } else if (activeFilter === 'completed') {
      result = result.filter(t => t.isCompleted);
    } else if (activeFilter === 'due') {
      result = result.filter(t => t.dueCount > 0);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortBy === 'chunks') {
        return b.totalCount - a.totalCount;
      }
      if (sortBy === 'progress') {
        return b.progressPct - a.progressPct;
      }
      // Default: newest
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }, [enrichedTranscripts, searchQuery, activeFilter, sortBy]);

  return (
    <div>
      {/* Top Bar: Stats Summary + Toggle Add Form */}
      {transcripts.length > 0 && (
        <div
          className="card mb-4"
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
            borderColor: 'rgba(99,102,241,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#fff',
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Quản lý {totalStats.totalScripts} bài hội thoại ({totalStats.totalChunks} chunks)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <span>✓ {totalStats.totalPracticed} chunks đã luyện</span>
                <span>·</span>
                <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                  🏆 {totalStats.totalCompletedTranscripts} bài xong 100%
                </span>
                {totalStats.totalDueTranscripts > 0 && (
                  <>
                    <span>·</span>
                    <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <Flame size={11} /> {totalStats.totalDueTranscripts} bài cần ôn
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={showInput ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
            onClick={() => setShowInput(s => !s)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {showInput ? (
              <><Minus size={14} /> Thu gọn ô nhập</>
            ) : (
              <><Plus size={14} /> + Thêm Script Mới</>
            )}
          </button>
        </div>
      )}

      {/* Collapsible Input Form */}
      {showInput && (
        <TranscriptInput
          onSave={onSave}
          onChunksExtracted={(id, chunks) => {
            onChunksExtracted(id, chunks);
            setShowInput(false);
          }}
          onToast={onToast}
          onPreviewListen={(previewData) => setListeningTranscript(previewData)}
        />
      )}

      {/* Search & Filter Management Toolbar */}
      {transcripts.length > 0 && (
        <div className="card mb-4" style={{ padding: '14px 16px' }}>
          {/* Live Search Input */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Tìm kiếm theo tên đề, từ vựng, câu thoại, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38, paddingRight: searchQuery ? 36 : 14, height: 42, fontSize: 13.5 }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 4,
                  color: 'var(--text-muted)',
                }}
                title="Xóa tìm kiếm"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Chips & Sort Select */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `Tất cả (${totalStats.totalScripts})` },
                { id: 'part3', label: `Part 3 (${totalStats.part3Count})` },
                { id: 'part4', label: `Part 4 (${totalStats.part4Count})` },
                { id: 'completed', label: `✓ Đã xong (${totalStats.totalCompletedTranscripts})` },
                { id: 'due', label: `🔥 Cần ôn (${totalStats.totalDueTranscripts})` },
              ].map(chip => (
                <button
                  key={chip.id}
                  className={`chip ${activeFilter === chip.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(chip.id)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)' }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-field"
                style={{ fontSize: 12, padding: '4px 8px', height: 32, borderRadius: 'var(--radius-sm)' }}
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="progress">% Hoàn thành cao</option>
                <option value="chunks">Nhiều chunks nhất</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Transcript History List */}
      <div className="section-header">
        <div>
          <div className="section-title">Danh sách bài Script</div>
          <div className="section-subtitle">
            {filteredTranscripts.length} / {transcripts.length} transcript hiển thị
          </div>
        </div>
      </div>

      {transcripts.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="Chưa có transcript nào"
          description="Paste transcript TOEIC Part 3 hoặc Part 4 vào ô phía trên để bắt đầu trích xuất chunks và luyện tập."
        />
      ) : filteredTranscripts.length === 0 ? (
        <div className="card text-center" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <Search size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Không tìm thấy script nào
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Không có kết quả nào khớp với từ khóa &ldquo;{searchQuery}&rdquo; hoặc bộ lọc hiện tại.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
            style={{ margin: '0 auto' }}
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger-children">
          {filteredTranscripts.map((t) => (
            <TranscriptCard
              key={t.id}
              item={t}
              onSelect={onSelectTranscript}
              onDelete={onDelete}
              onListen={(tr) => setListeningTranscript(tr)}
              onStartPractice={onStartPractice}
              onEdit={(tr) => setEditingTranscript(tr)}
            />
          ))}
        </div>
      )}

      {/* Edit Title Modal */}
      {editingTranscript && (
        <EditTranscriptModal
          transcript={editingTranscript}
          onSave={(updated) => {
            onSave(updated);
            if (onToast) onToast('success', 'Đã cập nhật tên và thông tin transcript!');
          }}
          onClose={() => setEditingTranscript(null)}
        />
      )}

      {/* Transcript Listening Modal */}
      {listeningTranscript && (
        <TranscriptListeningModal
          transcript={listeningTranscript}
          chunks={listeningTranscript.chunks}
          onClose={() => setListeningTranscript(null)}
        />
      )}
    </div>
  );
}
