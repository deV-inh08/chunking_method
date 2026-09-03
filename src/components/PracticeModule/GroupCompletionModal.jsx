import React, { useMemo } from 'react';
import { Award, CheckCircle, Headphones, ArrowRight, X, Sparkles } from 'lucide-react';

export function GroupCompletionModal({
  group,
  allProgress = {},
  hasNextGroup = false,
  onNextGroup,
  onListenScript,
  onClose,
}) {
  const { chunkItems, avgScore } = useMemo(() => {
    if (!group) return { chunkItems: [], avgScore: 100 };
    let total = 0;
    let count = 0;
    const items = (group.chunks || []).map((chunk, idx) => {
      const prog = allProgress[chunk.id];
      const score = prog?.lastScore != null ? prog.lastScore : 100;
      total += score;
      count += 1;
      return {
        chunk,
        index: idx + 1,
        score,
        practiceCount: prog?.practiceCount || 1,
      };
    });
    return {
      chunkItems: items,
      avgScore: count > 0 ? Math.round(total / count) : 100,
    };
  }, [group, allProgress]);

  if (!group) return null;

  const isTranscript = group.type === 'transcript' || group.id?.startsWith('transcript_');

  return (
    <div
      className="modal-overlay animate-fade-in"
      style={{ zIndex: 1060 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-box animate-scale-up"
        style={{
          maxWidth: 520,
          width: '92%',
          padding: '28px 24px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #1e1b4b 0%, var(--bg-surface) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-icon"
          style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-muted)' }}
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Big Celebration Icon */}
        <div style={{
          width: 68,
          height: 68,
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
        }}>
          <Award size={36} color="#1e1b4b" />
        </div>

        {/* Heading */}
        <span style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#fbbf24',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <Sparkles size={13} /> Hoàn thành mục tiêu!
        </span>

        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#fff',
          marginTop: 6,
          marginBottom: 6,
          lineHeight: 1.3,
        }}>
          Đã hoàn thành các chunk trong group:
        </h2>

        {/* Group Name Box */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 16,
          display: 'inline-block',
          maxWidth: '100%',
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--accent-300)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {group.title}
          </div>
          {group.subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {group.subtitle}
            </div>
          )}
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Xuất sắc! Bạn đã luyện xong toàn bộ <strong>{chunkItems.length}/{chunkItems.length} chunks</strong> với điểm trung bình <strong>{avgScore}đ</strong>!
        </p>

        {/* List of Chunks & Scores */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          marginBottom: 24,
          maxHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          textAlign: 'left',
        }}>
          {chunkItems.map(({ chunk, index, score }) => (
            <div
              key={chunk.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                <CheckCircle size={15} color="var(--success-text)" style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {index}. {chunk.phrase}
                </span>
              </div>

              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: score >= 80 ? 'var(--success-text)' : '#fbbf24',
                background: score >= 80 ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                padding: '1px 7px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0,
              }}>
                {score}đ
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* If from transcript: Primary action is Listen Script! */}
          {isTranscript && onListenScript && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onListenScript();
              }}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 800,
                gap: 8,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
                border: 'none',
              }}
            >
              <Headphones size={18} />
              <span>🎧 Luyện Listening (Nghe lại Transcript này)</span>
            </button>
          )}

          {/* Next Group action */}
          {hasNextGroup && onNextGroup && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onNextGroup();
              }}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '11px 18px',
                fontSize: 13.5,
                fontWeight: 700,
                gap: 8,
                background: isTranscript ? undefined : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              }}
            >
              <span>Tiếp tục sang nhóm tiếp theo</span>
              <ArrowRight size={16} />
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: '100%', justifyContent: 'center', padding: '9px 16px', fontSize: 13 }}
          >
            Đóng / Xem lại bài luyện
          </button>
        </div>
      </div>
    </div>
  );
}
