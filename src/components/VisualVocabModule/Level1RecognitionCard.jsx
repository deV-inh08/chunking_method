import { useEffect, useCallback } from 'react';
import { Volume2, CheckCircle2, X, Zap, Box } from 'lucide-react';

/**
 * Level1RecognitionCard Component
 * Non-intrusive card shown below the scene when a hotspot is tapped in Level 1.
 * Shows English word, IPA, Vietnamese meaning, Collocation Chunk, audio pronunciation.
 */
export function Level1RecognitionCard({
  item,
  onClose,
  onRecognized,
  isLastInZone = false,
}) {
  // Pronounce audio using Web Speech API
  const playAudio = useCallback(() => {
    if (!window.speechSynthesis || !item?.word) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(item.word);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [item?.word]);

  // Auto-play pronunciation when card opens
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(playAudio, 150);
    return () => clearTimeout(timer);
  }, [playAudio, item]);

  if (!item) return null;

  const isAction = item.visualType === 'action';

  return (
    <div
      className="level1-recognition-card animate-fade-in"
      style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        marginTop: 10,
        position: 'relative',
        zIndex: 50,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header bar: Type badge, Audio button, Close */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 99,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: isAction ? 'rgba(168, 85, 247, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              color: isAction ? '#c084fc' : '#fbbf24',
              border: isAction ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {isAction ? <Zap size={11} /> : <Box size={11} />}
            {isAction ? 'Hành động' : 'Vật thể'}
          </span>

          {item.collocation && isAction && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted, #94a3b8)',
                background: 'rgba(51, 65, 85, 0.4)',
                padding: '2px 7px',
                borderRadius: 6,
                maxWidth: '100%',
              }}
              className="truncate"
            >
              Chunk: <strong style={{ color: '#e2e8f0' }}>{item.collocation}</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs"
          style={{
            padding: 4,
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            borderRadius: 6,
          }}
          title="Đóng bảng"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main content row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Term + IPA + Audio Play */}
          <div className="flex items-center flex-wrap gap-2.5">
            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {item.word}
            </h3>

            {item.ipa && (
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--accent-300, #38bdf8)',
                  fontFamily: 'ui-monospace, monospace',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}
              >
                {item.ipa}
              </span>
            )}

            <button
              type="button"
              onClick={playAudio}
              className="btn btn-ghost btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
              }}
              title="Phát âm tiếng Anh"
            >
              <Volume2 size={15} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Nghe (A)</span>
            </button>
          </div>

          {/* Vietnamese meaning */}
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#f8fafc',
              margin: '6px 0 2px',
            }}
          >
            {item.meaningVi}
          </p>

          {/* Real TOEIC example sentence */}
          {item.example && (
            <p
              style={{
                fontSize: 13,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Ví dụ: <em style={{ color: '#cbd5e1' }}>"{item.example}"</em>
            </p>
          )}
        </div>

        {/* Action Button: Mark recognized */}
        <div className="w-full sm:w-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => onRecognized(item)}
            className="btn btn-primary w-full sm:w-auto"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{isLastInZone ? 'Hoàn tất Zone này →' : 'Đã nhớ từ này →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
