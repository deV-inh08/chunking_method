import { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Layers, PenLine,
  CheckSquare, Square, BookOpen, EyeOff, Eye, Flame, Headphones,
  Sparkles, Search, X, Mic, CheckCircle2, RotateCcw
} from 'lucide-react';
import { EmptyState, Badge, SkeletonCard } from '../ui';
import { generateWritingExercises } from '../../services/ai';
import { getApiKey } from '../../store/storage';
import * as storage from '../../store/storage';
import { isDueForReview, formatTimeUntilReview } from '../../services/srs';
import { TranscriptListeningModal } from '../TranscriptModule/TranscriptListeningModal';
import { getChunkIPA, formatIPA } from '../../services/phonetics';
import './ChunkModule.css';

const CHUNK_TYPE_LABELS = {
  collocation: 'Collocation',
  functional:  'Functional',
  connector:   'Connector',
};

// ─── ChunkCard ────────────────────────────────────────────────
function ChunkCard({
  chunk,
  selected,
  onToggle,
  progress,
  generatingSit,
  onGenerate,
  onOpenAiSpeaking,
  showSourceBadge,
  transcriptName,
}) {
  const [expanded, setExpanded] = useState(false);
  const isDue = isDueForReview(progress);
  const reviewTimeInfo = formatTimeUntilReview(progress?.nextReviewAt);
  const chunkIpa = getChunkIPA(chunk);

  return (
    <div
      id={`chunk-card-${chunk.id}`}
      className="card cm-chunk-card animate-fade-in"
      style={{
        borderColor: selected ? 'rgba(99,102,241,0.5)' : isDue ? 'rgba(239,68,68,0.4)' : undefined,
        background:  selected ? 'rgba(99,102,241,0.07)' : isDue ? 'rgba(239,68,68,0.03)' : undefined,
      }}
    >
      <div className="cm-chunk-card-grid">
        {/* Checkbox */}
        <button
          id={`chunk-select-${chunk.id}`}
          onClick={() => onToggle(chunk.id)}
          className="btn btn-ghost btn-icon cm-chunk-checkbox"
          style={{ marginTop: 2 }}
          title={selected ? 'Bỏ chọn' : 'Chọn để tạo hội thoại AI hoặc luyện tập'}
        >
          {selected
            ? <CheckSquare size={18} style={{ color: 'var(--accent-400)' }} />
            : <Square     size={18} style={{ color: 'var(--text-muted)' }}  />
          }
        </button>

        {/* Content */}
        <div className="cm-chunk-content">
          {/* Phrase + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {chunk.phrase}
            </span>
            {chunkIpa && (
              <span style={{
                fontSize: 12,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}>
                {formatIPA(chunkIpa)}
              </span>
            )}
            <Badge type={chunk.type}>{CHUNK_TYPE_LABELS[chunk.type] || chunk.type}</Badge>
            
            {showSourceBadge && transcriptName && (
              <span className="cm-source-badge" title={transcriptName}>
                📚 {transcriptName}
              </span>
            )}

            {chunk.sourceType === 'vocab' && chunk.sourceWord && (
              <Badge type="neutral">📖 {chunk.sourceWord}</Badge>
            )}

            {progress && progress.practiceCount > 0 && (
              <Badge type="success">✓ {progress.practiceCount}×</Badge>
            )}

            {progress && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)',
                background: isDue ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
                color: isDue ? 'var(--error-text)' : 'var(--accent-300)',
                border: `1px solid ${isDue ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.25)'}`,
              }}>
                <Flame size={10} color={isDue ? '#ef4444' : '#f59e0b'} />
                {progress.status === 'mastered' ? '🧠 ' : ''}Lv.{progress.srsLevel || 1} · {isDue ? 'Cần ôn ngay' : reviewTimeInfo?.text || 'Đang học'}
              </span>
            )}
          </div>

          {/* Meaning (VI) */}
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {chunk.meaningVi}
          </p>

          {/* Expandable: original sentence + another example */}
          <button
            className="flex items-center gap-1 text-muted text-xs"
            onClick={() => setExpanded(e => !e)}
            style={{ marginBottom: 4 }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Thu gọn ví dụ' : 'Xem câu ví dụ'}
          </button>

          {expanded && (
            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chunk.originalSentence && (
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                    📌 Trong ngữ cảnh bài học
                  </span>
                  <blockquote style={{
                    borderLeft: '3px solid var(--accent-500)',
                    paddingLeft: 8,
                    color: 'var(--text-secondary)',
                    fontSize: 12.5,
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {chunk.originalSentence}
                  </blockquote>
                </div>
              )}
              {chunk.anotherExample && (
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                    💡 Ví dụ khác
                  </span>
                  <blockquote style={{
                    borderLeft: '3px solid var(--chunk-connector-text)',
                    paddingLeft: 8,
                    color: 'var(--text-secondary)',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {chunk.anotherExample}
                  </blockquote>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Actions (Luyện nói AI & Luyện viết) */}
        <div className="cm-card-actions">
          {onOpenAiSpeaking && (
            <button
              type="button"
              className="cm-btn-card-speak"
              onClick={() => onOpenAiSpeaking([chunk.id])}
              title="Luyện nói phản xạ với bạn bản xứ AI bằng cụm từ này"
            >
              <Mic size={12} />
              <span>Nói AI</span>
            </button>
          )}

          <button
            id={`gen-exercises-${chunk.id}`}
            className="cm-btn-card-write"
            onClick={() => onGenerate(chunk)}
            disabled={generatingSit}
            title="Sinh bài luyện viết ngữ cảnh"
          >
            {generatingSit ? '⏳' : <><PenLine size={12} /> Viết</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ChunkModule (main export) ────────────────────────────────
export function ChunkModule({
  chunks = [],
  allChunks = [],
  selectedTranscriptId = null,
  onSelectTranscript = () => {},
  transcripts = [],
  selectedChunks = new Set(),
  onToggleChunk = () => {},
  onSelectMultipleChunks = () => {},
  onClearSelectedChunks = () => {},
  onSituationsGenerated = () => {},
  allProgress = {},
  onToast = () => {},
  onStartPractice = () => {},
  onOpenAiSpeaking = () => {},
}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [genId, setGenId] = useState(null);
  const [listeningTranscript, setListeningTranscript] = useState(null);

  // 1. Xác định nguồn Chunks hiện tại theo Scope bài học
  const sourceChunks = useMemo(() => {
    if (!selectedTranscriptId) {
      return allChunks && allChunks.length > 0 ? allChunks : chunks;
    }
    if (selectedTranscriptId === '__vocab__') {
      const tIds = new Set(transcripts.map(t => t.id));
      const pool = allChunks.length > 0 ? allChunks : chunks;
      return pool.filter(c => c.sourceType === 'vocab' || !tIds.has(c.transcriptId));
    }
    return storage.getChunks(selectedTranscriptId);
  }, [selectedTranscriptId, allChunks, chunks, transcripts]);

  const currentTranscript = useMemo(() => {
    if (!selectedTranscriptId || selectedTranscriptId === '__vocab__') return null;
    return transcripts.find(t => t.id === selectedTranscriptId) || null;
  }, [selectedTranscriptId, transcripts]);

  // Map transcript ID sang title để hiển thị nhãn nguồn trên từng thẻ chunk
  const transcriptTitleMap = useMemo(() => {
    const map = new Map();
    transcripts.forEach(t => {
      const partStr = t.part ? `[${t.part}] ` : '';
      const name = t.themeVi || t.theme || t.text?.slice(0, 30) || 'Bài học';
      map.set(t.id, `${partStr}${name}`);
    });
    return map;
  }, [transcripts]);

  // Đếm số lượng chunks từ vocab
  const vocabChunksCount = useMemo(() => {
    const tIds = new Set(transcripts.map(t => t.id));
    const pool = allChunks.length > 0 ? allChunks : chunks;
    return pool.filter(c => c.sourceType === 'vocab' || !tIds.has(c.transcriptId)).length;
  }, [allChunks, chunks, transcripts]);

  // Helper kiểm tra đã luyện tập chưa
  const hasPracticed = (c) => {
    const p = allProgress[c.id];
    return p && (p.practiceCount > 0 || p.score > 0 || p.completed === true);
  };

  // 2. Thống kê theo bộ lọc của Scope hiện tại
  const counts = useMemo(() => {
    return {
      all: sourceChunks.length,
      due: sourceChunks.filter(c => isDueForReview(allProgress[c.id])).length,
      unpracticed: sourceChunks.filter(c => !hasPracticed(c)).length,
      practiced: sourceChunks.filter(c => hasPracticed(c)).length,
      collocation: sourceChunks.filter(c => c.type === 'collocation').length,
      functional: sourceChunks.filter(c => c.type === 'functional').length,
      connector: sourceChunks.filter(c => c.type === 'connector').length,
    };
  }, [sourceChunks, allProgress]);

  // 3. Lọc theo Search Query + Filter Type
  const filteredChunks = useMemo(() => {
    let list = sourceChunks;

    // Lọc theo search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c =>
        (c.phrase && c.phrase.toLowerCase().includes(q)) ||
        (c.meaningVi && c.meaningVi.toLowerCase().includes(q)) ||
        (c.sourceWord && c.sourceWord.toLowerCase().includes(q))
      );
    }

    // Lọc theo tabs/status
    if (filter === 'due') {
      list = list.filter(c => isDueForReview(allProgress[c.id]));
    } else if (filter === 'unpracticed') {
      list = list.filter(c => !hasPracticed(c));
    } else if (filter === 'practiced') {
      list = list.filter(c => hasPracticed(c));
    } else if (filter !== 'all') {
      list = list.filter(c => c.type === filter);
    }

    return list;
  }, [sourceChunks, searchQuery, filter, allProgress]);

  // Reset về trang 1 khi đổi bộ lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setPageNumber(1);
  }, [searchQuery, filter, selectedTranscriptId]);

  // 4. Phân trang (Pagination)
  const totalItems = filteredChunks.length;
  const isAllPages = pageSize === 'all' || totalItems <= pageSize;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  const pagedChunks = useMemo(() => {
    if (isAllPages) return filteredChunks;
    const start = (pageNumber - 1) * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, pageNumber, pageSize, isAllPages]);

  // 5. Gom nhóm hiển thị
  const groups = useMemo(() => {
    const grps = [];
    const seen = new Map();

    pagedChunks.forEach(chunk => {
      let key, name;
      if (selectedTranscriptId && selectedTranscriptId !== '__vocab__') {
        key = chunk.groupId || 'ungrouped';
        name = chunk.groupName || '';
      } else {
        // Khi xem tất cả bài học: gom theo tên bài học
        key = chunk.transcriptId || (chunk.sourceType === 'vocab' ? '__vocab__' : 'other');
        name = chunk.sourceType === 'vocab'
          ? '📖 Từ vựng cá nhân'
          : (transcriptTitleMap.get(chunk.transcriptId) || 'Bài học khác');
      }

      if (!seen.has(key)) {
        seen.set(key, grps.length);
        grps.push({ key, name, chunks: [] });
      }
      grps[seen.get(key)].chunks.push(chunk);
    });

    return grps;
  }, [pagedChunks, selectedTranscriptId, transcriptTitleMap]);

  // Xử lý chọn tất cả chunks trên trang hiện tại
  const currentPageChunkIds = useMemo(() => pagedChunks.map(c => c.id), [pagedChunks]);
  const isCurrentPageAllSelected = useMemo(() => {
    return currentPageChunkIds.length > 0 && currentPageChunkIds.every(id => selectedChunks.has(id));
  }, [currentPageChunkIds, selectedChunks]);

  const handleToggleCurrentPage = () => {
    if (isCurrentPageAllSelected) {
      onSelectMultipleChunks(currentPageChunkIds, false);
    } else {
      onSelectMultipleChunks(currentPageChunkIds, true);
    }
  };

  const handleGenerate = async (chunk) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vào Settings để nhập.');
      return;
    }

    setGenId(chunk.id);
    try {
      const result = await generateWritingExercises(chunk, apiKey);
      const exercises = (result.exercises || []).map((ex, i) => ({
        ...ex,
        id: ex.id || `ex_${chunk.id}_${i}`,
        chunkId: chunk.id,
      }));
      onSituationsGenerated(chunk.id, exercises);
      onToast('success', `Đã sinh ${exercises.length} bài luyện viết cho "${chunk.phrase}"`);
    } catch (err) {
      onToast('error', `Lỗi sinh bài luyện: ${err.message}`);
    } finally {
      setGenId(null);
    }
  };

  const filterOptions = [
    { id: 'all',         label: 'Tất cả',           count: counts.all },
    { id: 'due',         label: '🔥 Cần ôn tập',    count: counts.due },
    { id: 'unpracticed', label: 'Chưa luyện',       count: counts.unpracticed },
    { id: 'practiced',   label: '✓ Đã luyện',       count: counts.practiced },
    { id: 'collocation', label: 'Collocation',      count: counts.collocation },
    { id: 'functional',  label: 'Functional',       count: counts.functional },
    { id: 'connector',   label: 'Connector',        count: counts.connector },
  ];

  return (
    <div className="cm-container">
      {/* ─── 1. BỘ CHỌN PHẠM VI BÀI HỌC (SCOPE SELECTOR) ───────────── */}
      <div className="cm-scope-card">
        <div className="cm-scope-header">
          <div className="cm-scope-label-group">
            <BookOpen size={16} className="cm-scope-icon" />
            <span className="cm-scope-title">Phạm vi bài học:</span>
            <span className="cm-scope-count-badge">
              {sourceChunks.length} / {allChunks.length || chunks.length} chunks
            </span>
          </div>

          {selectedTranscriptId && (
            <button
              className="cm-btn-view-all"
              onClick={() => onSelectTranscript(null)}
              title="Xem toàn bộ 185 chunks trong kho"
            >
              🌟 Xem tất cả ({allChunks.length || chunks.length})
            </button>
          )}
        </div>

        <div className="cm-scope-select-wrap">
          <select
            value={selectedTranscriptId || '__all__'}
            onChange={(e) => {
              const val = e.target.value === '__all__' ? null : e.target.value;
              onSelectTranscript(val);
            }}
            className="cm-scope-select"
          >
            <option value="__all__">
              🌟 Tất cả bài học ({allChunks.length || chunks.length} chunks)
            </option>
            {transcripts.map(t => {
              const count = (storage.getChunks(t.id) || []).length;
              const partStr = t.part ? `[${t.part}] ` : '';
              const title = t.themeVi || t.theme || t.text?.slice(0, 35) + '...';
              return (
                <option key={t.id} value={t.id}>
                  {partStr}{title} ({count} chunks)
                </option>
              );
            })}
            {vocabChunksCount > 0 && (
              <option value="__vocab__">
                📖 Từ vựng cá nhân ({vocabChunksCount} chunks)
              </option>
            )}
          </select>
        </div>
      </div>

      {/* ─── 2. BANNER CHI TIẾT NẾU ĐANG CHỌN 1 TRANSCRIPT ─────────── */}
      {currentTranscript && (currentTranscript.themeVi || currentTranscript.theme) && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(67,56,202,0.08))',
            borderColor: 'rgba(99,102,241,0.25)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge type={currentTranscript.part === 'Part 3' ? 'part3' : 'part4'}>
                  {currentTranscript.part}
                </Badge>
                <span className="badge badge-neutral">{sourceChunks.length} chunks</span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setListeningTranscript(currentTranscript)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
                title="Luyện nghe đoạn script này"
              >
                <Headphones size={13} />
                <span>Luyện Listening</span>
              </button>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {currentTranscript.themeVi || currentTranscript.theme}
                {currentTranscript.theme && currentTranscript.themeVi && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12.5 }}>
                    ({currentTranscript.theme})
                  </span>
                )}
              </div>
              {currentTranscript.themeDescription && (
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '4px 0 0 0' }}>
                  {currentTranscript.themeDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Ô TÌM KIẾM NHANH (SEARCH BAR) ───────────────────────── */}
      <div className="cm-search-wrap">
        <Search size={15} className="cm-search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm cụm từ tiếng Anh, nghĩa tiếng Việt..."
          className="cm-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="cm-search-clear"
            title="Xóa tìm kiếm"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ─── 4. THANH BỘ LỌC CHIPS (FILTER BAR) ─────────────────────── */}
      <div className="cm-filter-bar">
        {filterOptions.map(({ id, label, count }) => (
          <button
            key={id}
            className={`cm-filter-chip ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
          >
            <span>{label}</span>
            <span className="cm-filter-chip-count">({count})</span>
          </button>
        ))}
      </div>

      {/* ─── 5. THANH TÁC VỤ KHI TICK CHỌN CHUNKS (ACTION BAR) ──────── */}
      {selectedChunks.size > 0 && (
        <div className="cm-action-bar">
          <div className="cm-action-left">
            <span className="cm-action-count">
              <CheckCircle2 size={16} />
              Đã chọn: {selectedChunks.size} cụm từ
            </span>
            <button
              className="cm-btn-select-all"
              onClick={handleToggleCurrentPage}
            >
              {isCurrentPageAllSelected ? 'Bỏ chọn trang này' : 'Chọn hết trang này'}
            </button>
            <button
              className="cm-btn-select-all"
              onClick={onClearSelectedChunks}
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="cm-action-right">
            {/* TẠO ĐOẠN HỘI THOẠI THỰC TẾ BẰNG CÁC CỤM CHUNK ĐÃ CHỌN */}
            <button
              className="cm-btn-ai-speaking"
              onClick={() => onOpenAiSpeaking(Array.from(selectedChunks))}
              title="Mở phòng luyện nói AI: AI sẽ tự sinh kịch bản hội thoại thực tế dựa trên các cụm từ này"
            >
              <Sparkles size={14} color="#fef08a" />
              <span>Tạo hội thoại AI ({selectedChunks.size})</span>
            </button>

            {/* LUYỆN VIẾT CÁC CHUNKS ĐÃ CHỌN */}
            <button
              className="cm-btn-practice-writing"
              onClick={onStartPractice}
              title="Chuyển sang tab Luyện Viết"
            >
              <PenLine size={13} />
              <span>Luyện viết ({selectedChunks.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. DANH SÁCH CHUNKS ĐÃ PHÂN TRANG (PAGED CHUNKS) ────────── */}
      {groups.length > 0 ? (
        <div className="flex flex-col gap-5">
          {groups.map((group, gi) => (
            <div key={group.key}>
              {/* Tiêu đề nhóm hoặc bài học */}
              {group.name && (
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--accent-400)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedTranscriptId && selectedTranscriptId !== '__vocab__' ? `Nhóm ${gi + 1}` : 'Nguồn'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {group.name}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {group.chunks.length} chunks
                  </span>
                </div>
              )}

              <div className="cm-chunk-list">
                {group.chunks.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    selected={selectedChunks.has(chunk.id)}
                    onToggle={onToggleChunk}
                    progress={allProgress[chunk.id] || null}
                    generatingSit={genId === chunk.id}
                    onGenerate={handleGenerate}
                    onOpenAiSpeaking={onOpenAiSpeaking}
                    showSourceBadge={!selectedTranscriptId}
                    transcriptName={transcriptTitleMap.get(chunk.transcriptId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Layers size={24} />}
          title={searchQuery ? 'Không tìm thấy cụm từ nào' : 'Không có chunk trong bộ lọc này'}
          description={
            searchQuery
              ? `Không có kết quả nào khớp với "${searchQuery}". Thử từ khóa khác.`
              : 'Thử chuyển sang bộ lọc "Tất cả" hoặc chọn bài học khác.'
          }
        />
      )}

      {/* ─── 7. THANH PHÂN TRANG (PAGINATION BAR) ───────────────────── */}
      {totalItems > 0 && (
        <div className="cm-pagination-bar">
          <div className="cm-pagination-info">
            Hiển thị <b>{(pageNumber - 1) * (pageSize === 'all' ? totalItems : pageSize) + 1}</b> - <b>{Math.min(pageNumber * (pageSize === 'all' ? totalItems : pageSize), totalItems)}</b> trên tổng số <b>{totalItems}</b> chunks
          </div>

          <div className="cm-pagination-controls">
            {/* Chọn số mục mỗi trang */}
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setPageNumber(1);
              }}
              className="cm-page-size-select"
              title="Số lượng chunks mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={15}>15 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
              <option value="all">Xem tất cả</option>
            </select>

            {/* Các nút phân trang */}
            {!isAllPages && totalPages > 1 && (
              <>
                <button
                  disabled={pageNumber === 1}
                  onClick={() => {
                    setPageNumber(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cm-page-btn"
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Danh sách số trang */}
                {[...Array(totalPages)].map((_, idx) => {
                  const pNum = idx + 1;
                  // Rút gọn nếu có nhiều hơn 7 trang
                  if (
                    totalPages > 7 &&
                    pNum !== 1 &&
                    pNum !== totalPages &&
                    Math.abs(pNum - pageNumber) > 1
                  ) {
                    if (pNum === 2 || pNum === totalPages - 1) {
                      return <span key={pNum} style={{ color: 'var(--text-muted)', padding: '0 2px' }}>…</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pNum}
                      onClick={() => {
                        setPageNumber(pNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`cm-page-btn ${pageNumber === pNum ? 'active' : ''}`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={pageNumber === totalPages}
                  onClick={() => {
                    setPageNumber(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cm-page-btn"
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── 8. MODAL LUYỆN LISTENING ────────────────────────────────── */}
      {listeningTranscript && (
        <TranscriptListeningModal
          transcript={listeningTranscript}
          chunks={sourceChunks}
          onClose={() => setListeningTranscript(null)}
        />
      )}
    </div>
  );
}
