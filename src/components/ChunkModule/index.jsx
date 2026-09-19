import { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Layers, PenLine,
  CheckSquare, Square, BookOpen, BookText, Flame, Headphones,
  Sparkles, Search, X, Mic, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import { EmptyState, Badge, Spinner } from '../ui';
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
  hideWordBadge = false,
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
                <BookOpen size={11} style={{ display: 'inline', marginRight: 4 }} />
                {transcriptName}
              </span>
            )}

            {!hideWordBadge && chunk.sourceType === 'vocab' && chunk.sourceWord && (
              <Badge type="neutral">
                <BookText size={11} style={{ display: 'inline', marginRight: 4 }} />
                {chunk.sourceWord}
              </Badge>
            )}

            {progress && progress.practiceCount > 0 && (
              <Badge type="success">{progress.practiceCount}×</Badge>
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
                {progress.status === 'mastered' ? 'Mastered · ' : ''}Lv.{progress.srsLevel || 1} · {isDue ? 'Cần ôn ngay' : reviewTimeInfo?.text || 'Đang học'}
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
                    Ngữ cảnh bài học
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
                    Ví dụ mở rộng
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
            {generatingSit ? <Spinner size={12} /> : <><PenLine size={12} strokeWidth={1.75} /> Viết</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Xác định từ vựng / nhóm của Chunk ────────────────
export function getChunkWordInfo(chunk, transcriptTitleMap) {
  // 1. Nếu là chunk thuộc một bài nghe transcript cụ thể
  if (chunk.transcriptId && chunk.sourceType !== 'vocab' && !chunk.sourceWordId) {
    const title = transcriptTitleMap?.get(chunk.transcriptId) || 'Bài học hội thoại';
    return {
      key: `transcript_${chunk.transcriptId}`,
      word: title,
      rawWord: title.toLowerCase(),
      topic: 'Transcript',
      type: 'transcript',
    };
  }

  // 2. Nếu là chunk từ vựng (vocab) hoặc có sourceWord / groupName
  let word = '';
  if (chunk.sourceWord && typeof chunk.sourceWord === 'string' && chunk.sourceWord.trim()) {
    word = chunk.sourceWord.trim();
  } else if (chunk.groupName && typeof chunk.groupName === 'string' && chunk.groupName.trim()) {
    const gn = chunk.groupName.trim();
    if (gn.startsWith('Từ mở rộng: ')) {
      word = gn.replace('Từ mở rộng: ', '').trim();
    } else if (!gn.toLowerCase().startsWith('nhóm ') && !gn.toLowerCase().startsWith('group ')) {
      word = gn;
    }
  }

  // Dự phòng: parse từ groupId nếu bắt đầu bằng vocab_
  if (!word && chunk.groupId && chunk.groupId.startsWith('vocab_')) {
    const raw = chunk.groupId.replace(/^vocab_/, '');
    if (raw.startsWith('w_')) {
      const parts = raw.split('_');
      if (parts.length >= 2) word = parts[1];
    } else {
      word = raw;
    }
  }

  // Dự phòng: lấy từ đầu tiên trong phrase
  if (!word && chunk.phrase) {
    word = chunk.phrase.trim().split(/\s+/)[0].toLowerCase();
  }

  if (!word) word = 'Cụm từ khác';

  const cleanWord = word.trim();
  return {
    key: `word_${cleanWord.toLowerCase()}`,
    word: cleanWord,
    rawWord: cleanWord.toLowerCase(),
    topic: chunk.topic || null,
    type: 'word',
  };
}

// ─── WordGroupCard ────────────────────────────────────────────
function WordGroupCard({
  group,
  selectedChunks,
  onToggleChunk,
  onSelectMultipleChunks,
  allProgress,
  genId,
  onGenerate,
  onOpenAiSpeaking,
  onStartPractice,
  isCollapsed,
  onToggleCollapse,
  transcriptTitleMap,
  selectedTranscriptId,
}) {
  const groupChunkIds = useMemo(() => group.chunks.map(c => c.id), [group.chunks]);
  const allSelected = groupChunkIds.length > 0 && groupChunkIds.every(id => selectedChunks.has(id));
  const someSelected = groupChunkIds.some(id => selectedChunks.has(id));

  const dueCount = useMemo(() => {
    return group.chunks.filter(c => isDueForReview(allProgress[c.id])).length;
  }, [group.chunks, allProgress]);

  const handleToggleSelectGroup = (e) => {
    e.stopPropagation();
    if (allSelected) {
      onSelectMultipleChunks(groupChunkIds, false);
    } else {
      onSelectMultipleChunks(groupChunkIds, true);
    }
  };

  const handleGroupAiSpeak = (e) => {
    e.stopPropagation();
    if (onOpenAiSpeaking) {
      onOpenAiSpeaking(groupChunkIds);
    }
  };

  const handleGroupPractice = (e) => {
    e.stopPropagation();
    onSelectMultipleChunks(groupChunkIds, true);
    if (onStartPractice) {
      onStartPractice();
    }
  };

  return (
    <div className={`cm-word-group-card animate-fade-in ${isCollapsed ? 'is-collapsed' : ''} ${someSelected ? 'has-selected' : ''}`}>
      {/* Header */}
      <div className="cm-word-header" onClick={onToggleCollapse}>
        <div className="cm-word-header-left">
          {/* Checkbox select all chunks of word */}
          <button
            type="button"
            className="btn btn-ghost btn-icon cm-chunk-checkbox"
            onClick={handleToggleSelectGroup}
            title={allSelected ? 'Bỏ chọn cả từ này' : 'Chọn tất cả cụm của từ này'}
          >
            {allSelected ? (
              <CheckSquare size={18} style={{ color: 'var(--accent-400)' }} />
            ) : (
              <Square size={18} style={{ color: 'var(--text-muted)' }} />
            )}
          </button>

          {/* Word Name */}
          <div className="cm-word-title">
            <span>{group.word}</span>
          </div>

          {/* Count Badge */}
          <span className="cm-word-count-badge">
            {group.chunks.length} {group.chunks.length === 1 ? 'chunk' : 'chunks'}
          </span>

          {/* Topic Badge if available */}
          {group.topic && (
            <span className="cm-word-topic-badge">
              {group.topic}
            </span>
          )}

          {/* Due Badge if any chunk due */}
          {dueCount > 0 && (
            <span className="cm-word-due-badge" title={`${dueCount} cụm cần ôn tập SRS`}>
              <Flame size={10} />
              {dueCount} cần ôn
            </span>
          )}
        </div>

        <div className="cm-word-header-right">
          {/* AI Speaking button for this word */}
          {onOpenAiSpeaking && (
            <button
              type="button"
              className="cm-btn-word-speak"
              onClick={handleGroupAiSpeak}
              title={`Luyện nói AI với tất cả ${group.chunks.length} cụm của từ "${group.word}"`}
            >
              <Mic size={12} />
              <span>Nói AI ({group.chunks.length})</span>
            </button>
          )}

          {/* Practice writing button for this word */}
          {onStartPractice && (
            <button
              type="button"
              className="cm-btn-word-write"
              onClick={handleGroupPractice}
              title={`Luyện viết ${group.chunks.length} cụm của từ "${group.word}"`}
            >
              <PenLine size={12} />
              <span>Viết ({group.chunks.length})</span>
            </button>
          )}

          {/* Chevron */}
          <ChevronDown size={18} className="cm-word-chevron" />
        </div>
      </div>

      {/* Chunks List */}
      {!isCollapsed && (
        <div className="cm-word-chunks">
          {group.chunks.map(chunk => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              selected={selectedChunks.has(chunk.id)}
              onToggle={onToggleChunk}
              progress={allProgress[chunk.id] || null}
              generatingSit={genId === chunk.id}
              onGenerate={onGenerate}
              onOpenAiSpeaking={onOpenAiSpeaking}
              showSourceBadge={!selectedTranscriptId && group.type === 'transcript'}
              transcriptName={transcriptTitleMap?.get(chunk.transcriptId)}
              hideWordBadge={group.type === 'word'}
            />
          ))}
        </div>
      )}
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

  // Chế độ xem & sắp xếp
  const [viewMode, setViewMode] = useState('byWord'); // 'byWord' | 'flat'
  const [sortBy, setSortBy] = useState('alpha-asc'); // 'alpha-asc' | 'alpha-desc' | 'count-desc' | 'due-first'
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

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
        (c.sourceWord && c.sourceWord.toLowerCase().includes(q)) ||
        (c.groupName && c.groupName.toLowerCase().includes(q))
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

  // Reset về trang 1 khi đổi bộ lọc, từ khóa tìm kiếm, chế độ xem hoặc sắp xếp
  useEffect(() => {
    setPageNumber(1);
  }, [searchQuery, filter, selectedTranscriptId, viewMode, sortBy]);

  // 4a. Gom nhóm theo Từ vựng (Word Grouping)
  const wordGroups = useMemo(() => {
    const groupMap = new Map();

    filteredChunks.forEach(chunk => {
      const info = getChunkWordInfo(chunk, transcriptTitleMap);
      if (!groupMap.has(info.key)) {
        groupMap.set(info.key, {
          key: info.key,
          word: info.word,
          rawWord: info.rawWord || info.word.toLowerCase(),
          topic: info.topic,
          type: info.type,
          chunks: [],
        });
      }
      groupMap.get(info.key).chunks.push(chunk);
    });

    const list = Array.from(groupMap.values());

    // Sắp xếp các nhóm từ
    if (sortBy === 'alpha-asc') {
      list.sort((a, b) => a.rawWord.localeCompare(b.rawWord));
    } else if (sortBy === 'alpha-desc') {
      list.sort((a, b) => b.rawWord.localeCompare(a.rawWord));
    } else if (sortBy === 'count-desc') {
      list.sort((a, b) => b.chunks.length - a.chunks.length || a.rawWord.localeCompare(b.rawWord));
    } else if (sortBy === 'due-first') {
      list.sort((a, b) => {
        const aDue = a.chunks.some(c => isDueForReview(allProgress[c.id]));
        const bDue = b.chunks.some(c => isDueForReview(allProgress[c.id]));
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        return a.rawWord.localeCompare(b.rawWord);
      });
    }

    return list;
  }, [filteredChunks, transcriptTitleMap, sortBy, allProgress]);

  // 4b. Phân trang (Pagination)
  const totalChunksCount = filteredChunks.length;
  const totalWordsCount = wordGroups.length;
  const totalDisplayItems = viewMode === 'byWord' ? totalWordsCount : totalChunksCount;

  const isAllPages = pageSize === 'all' || totalDisplayItems <= pageSize;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalDisplayItems / pageSize));

  // Paged word groups (khi ở chế độ byWord)
  const pagedGroups = useMemo(() => {
    if (viewMode !== 'byWord') return [];
    if (isAllPages) return wordGroups;
    const start = (pageNumber - 1) * pageSize;
    return wordGroups.slice(start, start + pageSize);
  }, [wordGroups, pageNumber, pageSize, isAllPages, viewMode]);

  // Paged chunks (khi ở chế độ flat)
  const pagedChunks = useMemo(() => {
    if (viewMode !== 'flat') return [];
    if (isAllPages) return filteredChunks;
    const start = (pageNumber - 1) * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, pageNumber, pageSize, isAllPages, viewMode]);

  // Gom nhóm phẳng cho chế độ flat
  const flatGroups = useMemo(() => {
    if (viewMode !== 'flat') return [];
    const grps = [];
    const seen = new Map();

    pagedChunks.forEach(chunk => {
      let key, name;
      if (selectedTranscriptId && selectedTranscriptId !== '__vocab__') {
        key = chunk.groupId || 'ungrouped';
        name = chunk.groupName || '';
      } else {
        key = chunk.transcriptId || (chunk.sourceType === 'vocab' ? '__vocab__' : 'other');
        name = chunk.sourceType === 'vocab'
          ? 'Từ vựng cá nhân'
          : (transcriptTitleMap.get(chunk.transcriptId) || 'Bài học khác');
      }

      if (!seen.has(key)) {
        seen.set(key, grps.length);
        grps.push({ key, name, chunks: [] });
      }
      grps[seen.get(key)].chunks.push(chunk);
    });

    return grps;
  }, [pagedChunks, selectedTranscriptId, transcriptTitleMap, viewMode]);

  // Xử lý collapse/expand word groups
  const isAllCollapsed = useMemo(() => {
    return wordGroups.length > 0 && wordGroups.every(g => collapsedGroups.has(g.key));
  }, [wordGroups, collapsedGroups]);

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleAllCollapse = () => {
    if (isAllCollapsed) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(wordGroups.map(g => g.key)));
    }
  };

  // Chunks trên trang hiện tại
  const currentPageChunkIds = useMemo(() => {
    if (viewMode === 'byWord') {
      return pagedGroups.flatMap(g => g.chunks.map(c => c.id));
    }
    return pagedChunks.map(c => c.id);
  }, [viewMode, pagedGroups, pagedChunks]);

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
    { id: 'all',         label: 'Tất cả',       count: counts.all },
    { id: 'due',         label: 'Cần ôn tập',   count: counts.due },
    { id: 'unpracticed', label: 'Chưa luyện',   count: counts.unpracticed },
    { id: 'practiced',   label: 'Đã luyện',     count: counts.practiced },
    { id: 'collocation', label: 'Collocation',  count: counts.collocation },
    { id: 'functional',  label: 'Functional',   count: counts.functional },
    { id: 'connector',   label: 'Connector',    count: counts.connector },
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
              title="Xem toàn bộ chunks trong kho"
            >
              Xem tất cả ({allChunks.length || chunks.length})
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
              Tất cả bài học ({allChunks.length || chunks.length} chunks)
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
                Từ vựng cá nhân ({vocabChunksCount} chunks)
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

      {/* ─── 4b. THANH CÔNG CỤ HIỂN THỊ & SẮP XẾP (TOOLBAR ROW) ─────────── */}
      <div className="cm-toolbar-row">
        <div className="cm-toolbar-left">
          {/* Chế độ hiển thị: Gom theo từ / Danh sách lẻ */}
          <div className="cm-view-mode-group">
            <button
              type="button"
              className={`cm-view-mode-btn ${viewMode === 'byWord' ? 'active' : ''}`}
              onClick={() => setViewMode('byWord')}
              title="Gom nhóm các cụm từ theo từ vựng gốc (economic, sales...)"
            >
              <Layers size={13} />
              <span>Theo từ vựng</span>
            </button>
            <button
              type="button"
              className={`cm-view-mode-btn ${viewMode === 'flat' ? 'active' : ''}`}
              onClick={() => setViewMode('flat')}
              title="Hiển thị danh sách từng cụm từ riêng lẻ"
            >
              <BookText size={13} />
              <span>Danh sách lẻ</span>
            </button>
          </div>

          {/* Sắp xếp (Sort select khi ở chế độ gom theo từ) */}
          {viewMode === 'byWord' && (
            <div className="cm-sort-wrap">
              <ArrowUpDown size={12} />
              <span>Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cm-sort-select"
              >
                <option value="alpha-asc">Từ A → Z</option>
                <option value="alpha-desc">Từ Z → A</option>
                <option value="count-desc">Nhiều cụm nhất</option>
                <option value="due-first">Cần ôn tập trước</option>
              </select>
            </div>
          )}
        </div>

        <div className="cm-toolbar-right">
          {/* Mở rộng / Thu gọn tất cả (khi ở chế độ byWord) */}
          {viewMode === 'byWord' && wordGroups.length > 0 && (
            <button
              type="button"
              className="cm-btn-toggle-all"
              onClick={handleToggleAllCollapse}
              title={isAllCollapsed ? 'Mở rộng tất cả các thẻ từ' : 'Thu gọn tất cả các thẻ từ'}
            >
              {isAllCollapsed ? (
                <>
                  <ChevronDown size={13} />
                  <span>Mở rộng tất cả</span>
                </>
              ) : (
                <>
                  <ChevronUp size={13} />
                  <span>Thu gọn tất cả</span>
                </>
              )}
            </button>
          )}
        </div>
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

      {/* ─── 6. DANH SÁCH CHUNKS ĐÃ PHÂN TRANG (PAGED CHUNKS / WORD GROUPS) ── */}
      {viewMode === 'byWord' ? (
        pagedGroups.length > 0 ? (
          <div className="flex flex-col gap-4">
            {pagedGroups.map((group) => (
              <WordGroupCard
                key={group.key}
                group={group}
                selectedChunks={selectedChunks}
                onToggleChunk={onToggleChunk}
                onSelectMultipleChunks={onSelectMultipleChunks}
                allProgress={allProgress}
                genId={genId}
                onGenerate={handleGenerate}
                onOpenAiSpeaking={onOpenAiSpeaking}
                onStartPractice={onStartPractice}
                isCollapsed={collapsedGroups.has(group.key)}
                onToggleCollapse={() => toggleGroupCollapse(group.key)}
                transcriptTitleMap={transcriptTitleMap}
                selectedTranscriptId={selectedTranscriptId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Layers size={24} />}
            title={searchQuery ? 'Không tìm thấy từ vựng nào' : 'Không có từ trong bộ lọc này'}
            description={
              searchQuery
                ? `Không có kết quả nào khớp với "${searchQuery}". Thử từ khóa khác.`
                : 'Thử chuyển sang bộ lọc "Tất cả" hoặc chọn bài học khác.'
            }
          />
        )
      ) : (
        flatGroups.length > 0 ? (
          <div className="flex flex-col gap-5">
            {flatGroups.map((group, gi) => (
              <div key={group.key}>
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
                      transcriptName={transcriptTitleMap?.get(chunk.transcriptId)}
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
        )
      )}

      {/* ─── 7. THANH PHÂN TRANG (PAGINATION BAR) ───────────────────── */}
      {totalDisplayItems > 0 && (
        <div className="cm-pagination-bar">
          <div className="cm-pagination-info">
            {viewMode === 'byWord' ? (
              <>
                Hiển thị <b>{(pageNumber - 1) * (pageSize === 'all' ? totalWordsCount : pageSize) + 1}</b> - <b>{Math.min(pageNumber * (pageSize === 'all' ? totalWordsCount : pageSize), totalWordsCount)}</b> trên tổng số <b>{totalWordsCount}</b> từ vựng ({totalChunksCount} cụm)
              </>
            ) : (
              <>
                Hiển thị <b>{(pageNumber - 1) * (pageSize === 'all' ? totalChunksCount : pageSize) + 1}</b> - <b>{Math.min(pageNumber * (pageSize === 'all' ? totalChunksCount : pageSize), totalChunksCount)}</b> trên tổng số <b>{totalChunksCount}</b> chunks
              </>
            )}
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
              title="Số lượng mỗi trang"
            >
              <option value={10}>10 {viewMode === 'byWord' ? 'từ' : 'cụm'} / trang</option>
              <option value={15}>15 {viewMode === 'byWord' ? 'từ' : 'cụm'} / trang</option>
              <option value={25}>25 {viewMode === 'byWord' ? 'từ' : 'cụm'} / trang</option>
              <option value={50}>50 {viewMode === 'byWord' ? 'từ' : 'cụm'} / trang</option>
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
