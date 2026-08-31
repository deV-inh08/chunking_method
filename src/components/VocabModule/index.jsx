import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookMarked, Search, ChevronRight, Sparkles, Layers, RefreshCw, BookOpen } from 'lucide-react';
import { EmptyState, Badge, Spinner } from '../ui';
import { generateChunksFromWord, generateWritingExercises } from '../../services/ai';
import {
  getApiKey,
  getCachedVocabWords,
  fetchVocabWordsFromSupabase,
  cacheVocabWords,
  saveVocabChunks,
  wordHasChunks,
  saveSituations,
  getAllChunks,
} from '../../store/storage';

// ─── Lấy danh sách topic từ data ───────────────────────────────
function getTopics(words) {
  const topics = [...new Set(words.map(w => w.topic))].sort();
  return [{ id: 'all', label: 'Tất cả' }, ...topics.map(t => ({ id: t, label: t }))];
}

// ─── Hàm sinh id từ word + topic (giống import script) ─────────
function makeWordId(word, topic) {
  const slug = (s) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  return `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
}

// ─── Badge màu cho partOfSpeech ────────────────────────────────
const POS_COLORS = {
  noun: 'part3', verb: 'part4', adjective: 'collocation',
  adverb: 'connector', conjunction: 'functional', preposition: 'neutral',
};

// ─── WordCard ──────────────────────────────────────────────────
function WordCard({ word, hasChunks, generating, onAnalyze, onViewChunks }) {
  const wordId = makeWordId(word.word, word.topic);
  const posColor = POS_COLORS[word.partOfSpeech] || 'neutral';

  return (
    <div
      id={`word-card-${wordId}`}
      className="card animate-fade-in"
      style={{
        borderColor: hasChunks ? 'rgba(99,102,241,0.25)' : undefined,
        background:  hasChunks ? 'rgba(99,102,241,0.03)' : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Word info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {word.word}
            </span>
            {word.partOfSpeech && (
              <Badge type={posColor}>{word.partOfSpeech}</Badge>
            )}
            {hasChunks && (
              <Badge type="success">✓ Có chunk</Badge>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {word.meaningVi}
          </p>
        </div>

        {/* Action button */}
        {hasChunks ? (
          <button
            id={`view-chunks-${wordId}`}
            className="btn btn-ghost btn-sm"
            onClick={() => onViewChunks(wordId, word.word)}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Layers size={13} />
            Xem chunk
            <ChevronRight size={12} />
          </button>
        ) : (
          <button
            id={`analyze-word-${wordId}`}
            className="btn btn-secondary btn-sm"
            onClick={() => onAnalyze(word, wordId)}
            disabled={generating}
            style={{ flexShrink: 0 }}
          >
            {generating
              ? <><Spinner size={12} /> Đang sinh…</>
              : <><Sparkles size={13} /> Phân tích từ</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ─── VocabModule (main export) ─────────────────────────────────
export function VocabModule({ allChunks, onChunksExtracted, onNavigateToChunks, onToast }) {
  const [words, setWords]           = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [topic, setTopic]           = useState('all');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [generatingId, setGeneratingId] = useState(null); // wordId đang sinh

  const PAGE_SIZE = 50;

  // ── Tính set wordId đã có chunk (từ allChunks) ───────────────
  const chunkedWordIds = useMemo(() => {
    const ids = new Set();
    allChunks.forEach(c => {
      if (c.sourceType === 'vocab' && c.sourceWordId) ids.add(c.sourceWordId);
    });
    return ids;
  }, [allChunks]);

  // ── Load từ vựng ─────────────────────────────────────────────
  const loadWords = useCallback(async (force = false) => {
    // 1. Thử đọc từ cache (nếu không force refresh)
    if (!force) {
      const cached = getCachedVocabWords();
      if (cached && cached.length > 0) {
        setWords(cached);
        return;
      }
    }

    // 2. Fetch từ Supabase
    setLoadingWords(true);
    try {
      const fetched = await fetchVocabWordsFromSupabase();
      if (fetched && fetched.length > 0) {
        setWords(fetched);
      } else {
        // Supabase chưa cấu hình hoặc chưa import — thông báo
        onToast('info', 'Chưa có từ vựng trong Supabase. Hãy chạy script import-vocab.js trước.');
      }
    } catch (err) {
      onToast('error', `Lỗi tải từ vựng: ${err.message}`);
    } finally {
      setLoadingWords(false);
    }
  }, [onToast]);

  useEffect(() => { loadWords(); }, [loadWords]);

  // Reset page khi đổi filter
  useEffect(() => { setPage(1); }, [topic, search]);

  // ── Topics ───────────────────────────────────────────────────
  const topics = useMemo(() => getTopics(words), [words]);

  // ── Filter + search ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = topic === 'all' ? words : words.filter(w => w.topic === topic);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.meaningVi.toLowerCase().includes(q)
      );
    }
    return list;
  }, [words, topic, search]);

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const displayWords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Thống kê
  const chunkedCount = words.filter(w => chunkedWordIds.has(makeWordId(w.word, w.topic))).length;

  // ── Xử lý "Phân tích từ" ────────────────────────────────────
  const handleAnalyze = useCallback(async (word, wordId) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast('error', 'Chưa có API key. Vào Settings để nhập.');
      return;
    }

    setGeneratingId(wordId);
    try {
      const result = await generateChunksFromWord(
        word.word, word.meaningVi, word.topic, word.partOfSpeech, apiKey
      );

      const rawChunks = result.chunks || [];
      if (rawChunks.length === 0) throw new Error('AI không trả về chunk nào.');

      const ts = Date.now();
      const chunks = rawChunks.map((c, i) => ({
        ...c,
        id: `chunk_vocab_${wordId}_${i}_${ts}`,
        transcriptId: null,
      }));

      // Lưu vào storage với metadata vocab
      saveVocabChunks(wordId, word.word, word.topic, chunks);

      // Auto-generate writing exercises (situation mode)
      const apiKeyForExercises = getApiKey();
      if (apiKeyForExercises) {
        for (const chunk of chunks) {
          try {
            const exResult = await generateWritingExercises(chunk, apiKeyForExercises, { mode: 'situation' });
            const exercises = (exResult.exercises || []).map((ex, i) => ({
              ...ex,
              id: ex.id || `ex_${chunk.id}_${i}`,
              chunkId: chunk.id,
            }));
            saveSituations(chunk.id, exercises);
          } catch (exErr) {
            console.warn(`Auto-gen exercise failed for "${chunk.phrase}":`, exErr);
          }
        }
      }

      // Thông báo App.jsx để cập nhật allChunks state
      onChunksExtracted(wordId, chunks);
      onToast('success', `Đã sinh ${chunks.length} chunk cho "${word.word}"!`);
      // Điều hướng sang tab Chunks
      onNavigateToChunks();
    } catch (err) {
      onToast('error', `Lỗi phân tích: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  }, [onChunksExtracted, onNavigateToChunks, onToast]);

  // ── Xem chunks của từ đã phân tích ──────────────────────────
  const handleViewChunks = useCallback((_wordId, _word) => {
    onNavigateToChunks();
  }, [onNavigateToChunks]);

  // ── Render ───────────────────────────────────────────────────
  if (loadingWords) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 60 }}>
        <Spinner size={28} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải từ vựng từ Supabase…</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <EmptyState
        icon={<BookMarked size={24} />}
        title="Chưa có từ vựng nào"
        description="Chạy script import-vocab.js để import 5000 từ vào Supabase, sau đó chạy generate-chunks-batch.js để sinh chunk."
      />
    );
  }

  return (
    <div>
      {/* ── Stats banner ───────────────────────────────────── */}
      <div
        className="card mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(67,56,202,0.07))',
          borderColor: 'rgba(99,102,241,0.2)',
        }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                Thư viện từ vựng
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {words.length} từ · {chunkedCount} đã có chunk
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            id="vocab-refresh-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => loadWords(true)}
            title="Tải lại từ Supabase"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={13} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Topic chips ─────────────────────────────────────── */}
      <div className="filter-group mb-4" style={{ flexWrap: 'wrap', gap: 6 }}>
        {topics.map(({ id, label }) => (
          <button
            key={id}
            id={`vocab-topic-${id.replace(/\W+/g, '-')}`}
            className={`chip ${topic === id ? 'active' : ''}`}
            onClick={() => setTopic(id)}
          >
            {label}
            <span style={{ opacity: 0.6 }}>
              ({id === 'all'
                ? words.length
                : words.filter(w => w.topic === id).length
              })
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <Search
          size={14}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}
        />
        <input
          id="vocab-search"
          type="text"
          className="textarea-field"
          placeholder="Tìm kiếm từ vựng…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px 8px 34px',
            height: 'auto',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
          }}
        />
      </div>

      {/* ── Kết quả filter ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} từ · Trang {page}/{totalPages || 1}
        </span>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Trước
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* ── Word list ──────────────────────────────────────── */}
      {displayWords.length === 0 ? (
        <EmptyState
          icon={<BookMarked size={24} />}
          title="Không tìm thấy từ nào"
          description="Thử từ khoá khác hoặc chọn chủ đề khác."
        />
      ) : (
        <div className="flex flex-col gap-3 stagger-children">
          {displayWords.map(word => {
            const wordId = makeWordId(word.word, word.topic);
            return (
              <WordCard
                key={wordId}
                word={word}
                hasChunks={chunkedWordIds.has(wordId)}
                generating={generatingId === wordId}
                onAnalyze={handleAnalyze}
                onViewChunks={handleViewChunks}
              />
            );
          })}
        </div>
      )}

      {/* ── Pagination footer ──────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
          >
            ← Trang trước
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
          >
            Trang sau →
          </button>
        </div>
      )}
    </div>
  );
}
