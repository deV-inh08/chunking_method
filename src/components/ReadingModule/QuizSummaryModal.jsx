import React from 'react';
import {
  Award, CheckCircle2, XCircle, RotateCcw,
  ArrowRight, Zap, Trophy, ShieldCheck, ChevronRight
} from 'lucide-react';

export function QuizSummaryModal({
  isOpen,
  onClose,
  topic,
  level,
  results,
  onRetryMistakes,
  onSwitchLevel,
  onRestart,
}) {
  if (!isOpen || !results) return null;

  const { correctCount = 0, totalCount = 30, wrongQuestions = [], timeSpentSec = 0 } = results;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const isMastered = accuracy >= 85;
  const levelLabel = level === 'standard' ? 'Chặng Tiêu Chuẩn (550 - 750)' : 'Chặng Bẫy Nâng Cao 990';
  const oppositeLevel = level === 'standard' ? 'advanced' : 'standard';
  const oppositeLabel = level === 'standard' ? 'Thử sức Chặng Bẫy 990 ⚡' : 'Luyện lại Chặng Tiêu Chuẩn';

  const formatMinutes = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card, #1c1d25)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header with celebratory gradient */}
        <div
          style={{
            padding: '1.5rem 1.5rem 1rem',
            textAlign: 'center',
            background: isMastered
              ? 'linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 0.75rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isMastered ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: isMastered ? '#facc15' : '#818cf8',
              border: `2px solid ${isMastered ? 'rgba(234, 179, 8, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
            }}
          >
            {isMastered ? <Trophy size={28} /> : <Award size={28} />}
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              color: 'var(--text-muted, #9ca3af)',
            }}
          >
            {topic?.nameVi} • {levelLabel}
          </span>

          <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-normal, #f4f4f5)' }}>
            {isMastered ? 'Làm Chủ Xuất Sắc!' : accuracy >= 60 ? 'Hoàn Thành Tốt!' : 'Cần Rèn Luyện Thêm!'}
          </h2>
        </div>

        {/* Stats Grid */}
        <div style={{ padding: '1rem 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', marginBottom: 2 }}>ĐIỂM SỐ</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399' }}>
                {correctCount} / {totalCount}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', marginBottom: 2 }}>ĐỘ CHÍNH XÁC</div>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: accuracy >= 80 ? '#34d399' : accuracy >= 60 ? '#fbbf24' : '#f87171',
                }}
              >
                {accuracy}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)', marginBottom: 2 }}>THỜI GIAN</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-normal, #f4f4f5)', marginTop: 3 }}>
                {formatMinutes(timeSpentSec)}
              </div>
            </div>
          </div>
        </div>

        {/* Wrong questions list (scrollable if any) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem' }}>
          {wrongQuestions.length > 0 ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <XCircle size={15} /> Cần khắc phục ({wrongQuestions.length} câu)
                </span>
                {onRetryMistakes && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={onRetryMistakes}
                    style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <RotateCcw size={12} /> Làm lại ngay
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {wrongQuestions.slice(0, 5).map((wq, idx) => (
                  <div
                    key={wq.id || idx}
                    style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: 8,
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-normal, #f4f4f5)', marginBottom: 4 }}>
                      {wq.question}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
                      <span style={{ color: '#f87171' }}>Bạn chọn: ({wq.selected}) {wq.options?.[wq.selected]}</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Đáp án: ({wq.correctAnswer}) {wq.options?.[wq.correctAnswer]}</span>
                    </div>
                    {wq.clue && (
                      <div style={{ color: 'var(--text-muted, #9ca3af)', marginTop: 4, fontStyle: 'italic' }}>
                        💡 Manh mối: {wq.clue}
                      </div>
                    )}
                  </div>
                ))}
                {wrongQuestions.length > 5 && (
                  <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted, #71717a)' }}>
                    và còn {wrongQuestions.length - 5} câu khác...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '1.25rem',
                background: 'rgba(16, 185, 129, 0.06)',
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#34d399', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                Tuyệt đối không mắc lỗi nào!
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #9ca3af)' }}>
                Bạn đã nắm rất vững cấu trúc và các bẫy của phần này.
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(0,0,0,0.2)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {wrongQuestions.length > 0 && onRetryMistakes ? (
            <button
              className="btn btn-primary"
              onClick={onRetryMistakes}
              style={{
                width: '100%',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              }}
            >
              <RotateCcw size={16} /> Làm lại {wrongQuestions.length} câu làm sai
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => onSwitchLevel(oppositeLevel)}
              style={{
                width: '100%',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Zap size={16} /> {oppositeLabel}
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onRestart}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: '0.78rem',
              }}
            >
              <RotateCcw size={13} /> Làm lại toàn bộ
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: '0.78rem',
              }}
            >
              Quay lại danh mục <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
