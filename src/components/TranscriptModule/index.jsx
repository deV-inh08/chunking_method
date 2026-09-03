import { useState } from 'react';
import { FileText, Plus, Trash2, ChevronRight, Calendar, Headphones } from 'lucide-react';
import { EmptyState, Badge, SkeletonCard } from '../ui';
import { analyzeTranscript } from '../../services/ai';
import { getApiKey } from '../../store/storage';
import { TranscriptListeningModal } from './TranscriptListeningModal';

// ─── Helper ───────────────────────────────────────────────────
function generateId() {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function truncateText(text, maxLen = 80) {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

// ─── TranscriptInput ──────────────────────────────────────────
function TranscriptInput({ onSave, onChunksExtracted, onToast, onPreviewListen }) {
  const [text, setText]   = useState('');
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

      // Save transcript with theme info
      const transcript = {
        id,
        text: text.trim(),
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
            // Always override AI's generic IDs (chunk_1, chunk_2...) with unique ones
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
          <div className="section-title">New Transcript</div>
          <div className="section-subtitle">Paste transcript TOEIC để phân tích chunk</div>
        </div>
      </div>

      {/* Part toggle */}
      <div className="mb-4">
        <label className="label">Part</label>
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

      {/* Textarea */}
      <div className="mb-4">
        <label className="label">Transcript</label>
        <textarea
          id="transcript-input"
          className="textarea-field"
          rows={10}
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
            onClick={() => onPreviewListen({ text: text.trim(), part })}
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

// ─── TranscriptCard ───────────────────────────────────────────
function TranscriptCard({ transcript, chunkCount, onSelect, onDelete, onListen }) {
  return (
    <div
      id={`transcript-card-${transcript.id}`}
      className="card animate-fade-in"
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(transcript.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={18} style={{ color: 'var(--accent-400)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge type={transcript.part === 'Part 3' ? 'part3' : 'part4'}>
                {transcript.part}
              </Badge>
              <span className="text-muted text-xs flex items-center gap-1">
                <Calendar size={10} /> {formatDate(transcript.createdAt)}
              </span>
            </div>
            <p className="text-secondary text-sm" style={{ lineHeight: 1.5 }}>
              {truncateText(transcript.text)}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {chunkCount > 0 && (
                <span className="text-accent text-xs font-medium">
                  {chunkCount} chunks đã trích xuất
                </span>
              )}
              {onListen && (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onListen(transcript);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    color: '#38bdf8',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: 'var(--radius-full)',
                  }}
                  title="Nghe lại đoạn script này để luyện Listening"
                >
                  <Headphones size={12} /> Luyện Listening
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-icon"
            onClick={(e) => { e.stopPropagation(); onDelete(transcript.id); }}
            title="Xóa transcript"
          >
            <Trash2 size={15} style={{ color: 'var(--error-text)' }} />
          </button>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── TranscriptModule (main export) ──────────────────────────
export function TranscriptModule({ transcripts, onSave, onDelete, onChunksExtracted, onSelectTranscript, chunkCounts, onToast }) {
  const [listeningTranscript, setListeningTranscript] = useState(null);

  return (
    <div>
      <TranscriptInput
        onSave={onSave}
        onChunksExtracted={onChunksExtracted}
        onToast={onToast}
        onPreviewListen={(previewData) => setListeningTranscript(previewData)}
      />

      <div className="section-header">
        <div>
          <div className="section-title">History</div>
          <div className="section-subtitle">{transcripts.length} transcript đã lưu</div>
        </div>
      </div>

      {transcripts.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="Chưa có transcript nào"
          description="Paste transcript TOEIC Part 3 hoặc Part 4 vào ô phía trên để bắt đầu."
        />
      ) : (
        <div className="flex flex-col gap-3 stagger-children">
          {transcripts.map((t) => (
            <TranscriptCard
              key={t.id}
              transcript={t}
              chunkCount={chunkCounts[t.id] || 0}
              onSelect={onSelectTranscript}
              onDelete={onDelete}
              onListen={(tr) => setListeningTranscript(tr)}
            />
          ))}
        </div>
      )}

      {listeningTranscript && (
        <TranscriptListeningModal
          transcript={listeningTranscript}
          onClose={() => setListeningTranscript(null)}
        />
      )}
    </div>
  );
}
