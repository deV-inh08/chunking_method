import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag, Sparkles, Trash2, ExternalLink, CheckSquare, Square,
  Search, Filter, RefreshCw, AlertCircle, ArrowRight, BookOpen, Clock, Check
} from 'lucide-react';
import { Badge, Spinner } from '../ui';
import {
  getSavedWords,
  updateSavedWordStatusLocal,
  deleteSavedWordLocal,
  syncSavedWordsFromCloud,
  saveChunks,
  saveSituations,
  getApiKey,
} from '../../store/storage';
import { generateChunksBatch, generateExercisesForChunks } from '../../services/ai';

export function WordBasketModule({ onStartPractice, onOpenSettings }) {
  const [words, setWords] = useState(() => getSavedWords());
  const [selectedWordIds, setSelectedWordIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'chunked' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatusText, setGenStatusText] = useState('');

  // Tải dữ liệu từ Supabase Cloud khi mở tab
  const refreshWords = useCallback(async () => {
    setLoading(true);
    try {
      const cloudWords = await syncSavedWordsFromCloud();
      setWords(cloudWords || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWords();
  }, [refreshWords]);

  // Lọc từ vựng
  const filteredWords = useMemo(() => {
    return words.filter(item => {
      // Filter by status
      if (filterStatus === 'pending' && item.status !== 'pending') return false;
      if (filterStatus === 'chunked' && item.status !== 'chunked') return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const wordMatch = item.word?.toLowerCase().includes(q);
        const meaningMatch = item.meaningVi?.toLowerCase().includes(q);
        const sentenceMatch = item.contextSentence?.toLowerCase().includes(q);
        if (!wordMatch && !meaningMatch && !sentenceMatch) return false;
      }

      return true;
    });
  }, [words, filterStatus, searchQuery]);

  // Chọn / Bỏ chọn từ
  const toggleSelectWord = (id) => {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingInFilter = filteredWords.filter(w => w.status === 'pending');
    const allSelected = pendingInFilter.every(w => selectedWordIds.has(w.id));

    if (allSelected) {
      setSelectedWordIds(new Set());
    } else {
      setSelectedWordIds(new Set(pendingInFilter.map(w => w.id)));
    }
  };

  // Xóa từ
  const handleDeleteWord = (id, e) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa từ này khỏi giỏ không?')) {
      deleteSavedWordLocal(id);
      setWords(prev => prev.filter(w => w.id !== id));
      setSelectedWordIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ─── TẠO CHUNKS & BÀI TẬP DỊCH TỰ ĐỘNG BẰNG AI ──────────────
  const handleGenerateChunksAndPractice = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert('Vui lòng nhập Gemini API Key trong Settings trước khi sinh bài học.');
      if (onOpenSettings) onOpenSettings();
      return;
    }

    const wordsToProcess = words.filter(w => selectedWordIds.has(w.id));
    if (wordsToProcess.length === 0) {
      alert('Vui lòng chọn ít nhất 1 từ để tạo bài học.');
      return;
    }

    setIsGenerating(true);
    setGenStatusText(`Đang phân tích ${wordsToProcess.length} từ để sinh Collocations...`);

    try {
      // 1. Gọi AI sinh Chunks theo batch
      const batchPayload = wordsToProcess.map(w => ({
        word: w.word,
        meaningVi: w.meaningVi,
        topic: 'Extension Reading',
        partOfSpeech: w.partOfSpeech || 'n/a',
      }));

      const chunkBatchRes = await generateChunksBatch(batchPayload, apiKey);
      const results = chunkBatchRes?.results || [];

      if (!results.length) {
        throw new Error('AI không trả về danh sách chunks. Vui lòng thử lại.');
      }

      // Tạo danh sách chunk phẳng (flatten)
      const newChunks = [];
      const createdChunkIds = [];

      results.forEach((r, idx) => {
        const originWord = wordsToProcess[idx] || wordsToProcess.find(w => w.word.toLowerCase() === r.word?.toLowerCase());
        const wordId = originWord?.id || `w_${Date.now()}_${idx}`;

        (r.chunks || []).forEach((c, cIdx) => {
          const chunkId = `c_ext_${Date.now()}_${idx}_${cIdx}`;
          createdChunkIds.push(chunkId);

          newChunks.push({
            id: chunkId,
            transcriptId: null,
            phrase: c.phrase,
            meaningVi: c.meaningVi,
            usageNote: c.usageNote || '',
            originalSentence: originWord?.contextSentence || c.anotherExample || '',
            anotherExample: c.anotherExample || '',
            type: c.type || 'collocation',
            formality: c.formality || 'neutral',
            groupId: `grp_ext_${wordId}`,
            groupName: `Từ mở rộng: ${originWord?.word || r.word}`,
            sourceType: 'extension',
            sourceWordId: wordId,
            topic: 'Extension Reading',
            ipa: c.ipa || '',
          });
        });
      });

      if (!newChunks.length) {
        throw new Error('Không tạo được chunk nào từ danh sách từ đã chọn.');
      }

      // Lưu chunks vào storage
      saveChunks(newChunks);

      // 2. Tự động sinh bài tập dịch 3 cấp độ cho các chunks mới
      setGenStatusText(`Đang tạo 3 bài luyện dịch cho ${newChunks.length} Chunks mới...`);
      const exRes = await generateExercisesForChunks(newChunks, apiKey);
      const exResults = exRes?.results || [];

      const allSituations = [];
      exResults.forEach(item => {
        const matchedChunk = newChunks.find(c => c.phrase.toLowerCase() === item.phrase?.toLowerCase());
        if (matchedChunk && Array.isArray(item.exercises)) {
          item.exercises.forEach(ex => {
            allSituations.push({
              id: `${matchedChunk.id}_${ex.id || Math.random().toString(36).slice(2, 7)}`,
              chunkId: matchedChunk.id,
              level: ex.level || 1,
              levelLabel: ex.levelLabel || `Cấp độ ${ex.level}`,
              vietnameseSentence: ex.vietnameseSentence || '',
              sampleTranslation: ex.sampleTranslation || '',
              ipa: ex.ipa || '',
              tenseUsed: ex.tenseUsed || '',
              tenseExplanation: ex.tenseExplanation || '',
              vocabHints: ex.vocabHints || [],
              sentenceBreakdown: ex.sentenceBreakdown || [],
            });
          });
        }
      });

      if (allSituations.length > 0) {
        saveSituations(allSituations);
      }

      // 3. Đánh dấu trạng thái đã tạo chunk
      wordsToProcess.forEach(w => {
        updateSavedWordStatusLocal(w.id, 'chunked');
      });

      // Cập nhật lại state local
      setWords(prev => prev.map(w => selectedWordIds.has(w.id) ? { ...w, status: 'chunked' } : w));
      setSelectedWordIds(new Set());

      // 4. Chuyển thẳng sang PracticeModule
      if (onStartPractice) {
        onStartPractice(createdChunkIds);
      }
    } catch (err) {
      console.error('Error generating chunks:', err);
      alert(err.message || 'Lỗi khi tạo Chunks với AI. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
      setGenStatusText('');
    }
  };

  const pendingCount = words.filter(w => w.status === 'pending').length;
  const chunkedCount = words.filter(w => w.status === 'chunked').length;

  return (
    <div className="module-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}>
            <ShoppingBag size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Giỏ từ vựng Extension
              </h2>
              <Badge variant="part3">Đồng bộ Cloud</Badge>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '4px 0 0', lineHeight: 1.5 }}>
              Các từ bạn đã bôi đen và AI dịch theo ngữ cảnh trên trình duyệt. Chọn từ để biến thành bài học Chunking!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={refreshWords}
            disabled={loading}
            title="Đồng bộ từ Supabase"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        marginBottom: 20,
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-surface-2, #1e293b)', padding: 4, borderRadius: 10 }}>
          <button
            className={`btn btn-sm ${filterStatus === 'pending' ? 'primary-button' : 'btn-ghost'}`}
            onClick={() => setFilterStatus('pending')}
            style={{ fontSize: 12.5 }}
          >
            Chờ tạo bài ({pendingCount})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'chunked' ? 'primary-button' : 'btn-ghost'}`}
            onClick={() => setFilterStatus('chunked')}
            style={{ fontSize: 12.5 }}
          >
            Đã tạo Chunk ({chunkedCount})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'all' ? 'primary-button' : 'btn-ghost'}`}
            onClick={() => setFilterStatus('all')}
            style={{ fontSize: 12.5 }}
          >
            Tất cả ({words.length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm theo từ, nghĩa hoặc câu gốc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-card, #0f172a)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Select All & Multi-Action Floating Bar */}
      {filterStatus === 'pending' && filteredWords.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 10,
          marginBottom: 16,
        }}>
          <button
            onClick={toggleSelectAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
            }}
          >
            {filteredWords.every(w => selectedWordIds.has(w.id)) ? (
              <CheckSquare size={18} color="var(--accent-400, #818cf8)" />
            ) : (
              <Square size={18} color="var(--text-muted)" />
            )}
            <span>Chọn tất cả {filteredWords.length} từ</span>
          </button>

          <button
            className="primary-button btn-sm"
            onClick={handleGenerateChunksAndPractice}
            disabled={selectedWordIds.size === 0 || isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              boxShadow: selectedWordIds.size > 0 ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
            }}
          >
            {isGenerating ? (
              <>
                <Spinner size="sm" />
                <span>{genStatusText || 'Đang tạo Chunks...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Tạo Chunks & Luyện tập ({selectedWordIds.size} từ đã chọn)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {isGenerating && (
        <div style={{
          padding: 18,
          borderRadius: 12,
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <Spinner size="md" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>
              {genStatusText}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Gemini đang trích xuất collocations giá trị cao và tạo bài luyện dịch 3 cấp độ.
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredWords.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: 14,
          border: '1px dashed var(--border-color, #334155)',
        }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {filterStatus === 'pending' ? 'Chưa có từ mới nào chờ tạo bài' : 'Không tìm thấy từ vựng phù hợp'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
            Hãy cài đặt Speaking Chunk Chrome Extension, lướt web đọc bài báo và bôi đen từ/cụm từ bất kỳ để AI dịch ngữ cảnh và lưu vào đây.
          </p>
          <button className="btn btn-sm btn-ghost" onClick={refreshWords}>
            Làm mới danh sách
          </button>
        </div>
      )}

      {/* Word Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filteredWords.map(item => {
          const isSelected = selectedWordIds.has(item.id);
          const isPending = item.status === 'pending';

          return (
            <div
              key={item.id}
              onClick={() => isPending && toggleSelectWord(item.id)}
              style={{
                background: isSelected ? 'rgba(99, 102, 241, 0.09)' : 'var(--bg-card, #1e293b)',
                border: `1.5px solid ${isSelected ? 'var(--accent-400, #818cf8)' : 'var(--border-color, #334155)'}`,
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                cursor: isPending ? 'pointer' : 'default',
                transition: 'all 0.18s ease',
                position: 'relative',
              }}
            >
              {/* Top Row: Word & Actions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPending && (
                      <div style={{ color: isSelected ? 'var(--accent-400, #818cf8)' : 'var(--text-muted)' }}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                    )}
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {item.word}
                    </h3>
                    {item.ipa && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {item.ipa}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.status === 'chunked' ? (
                      <Badge variant="functional">Đã tạo Chunks</Badge>
                    ) : (
                      <Badge variant="collocation">Chờ luyện</Badge>
                    )}
                    <button
                      onClick={(e) => handleDeleteWord(item.id, e)}
                      className="icon-button"
                      title="Xóa khỏi giỏ"
                      style={{ padding: 4, color: 'var(--text-muted)', background: 'transparent' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Part of Speech & Meaning */}
                {item.partOfSpeech && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    display: 'inline-block',
                    marginBottom: 6,
                  }}>
                    {item.partOfSpeech}
                  </span>
                )}

                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#34d399', marginBottom: 10, lineHeight: 1.4 }}>
                  {item.meaningVi}
                </div>

                {/* Original Context Sentence */}
                {item.contextSentence && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderLeft: '3px solid var(--accent-400, #818cf8)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    color: 'var(--text-secondary, #cbd5e1)',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                    marginBottom: 8,
                  }}>
                    "{item.contextSentence}"
                  </div>
                )}
              </div>

              {/* Bottom Metadata: Source & Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: 8,
                fontSize: 11.5,
                color: 'var(--text-muted)',
              }}>
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      color: 'var(--accent-300, #a5b4fc)', textDecoration: 'none',
                      maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={item.sourceTitle || item.sourceUrl}
                  >
                    <ExternalLink size={12} />
                    <span>{item.sourceTitle || new URL(item.sourceUrl).hostname}</span>
                  </a>
                ) : (
                  <span>Extension</span>
                )}

                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
