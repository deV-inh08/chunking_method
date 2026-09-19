import React from 'react';
import { Zap, Check, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';

/**
 * ChunkRadar: Live target chunk activation indicator
 */
export function ChunkRadar({ phrase, isActivated }) {
  if (!phrase) return null;

  return (
    <div
      className={`chunk-radar-pill ${isActivated ? 'is-active' : ''}`}
      title={isActivated ? 'Đã kích hoạt thành công chunk trong câu!' : `Hãy sử dụng cụm "${phrase}" trong câu của bạn`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: 12,
        fontWeight: 700,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isActivated
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(234, 88, 12, 0.18) 100%)'
          : 'rgba(255, 255, 255, 0.04)',
        border: isActivated
          ? '1.5px solid rgba(245, 158, 11, 0.6)'
          : '1px dashed rgba(255, 255, 255, 0.15)',
        color: isActivated ? '#fbbf24' : 'var(--text-muted, #94a3b8)',
        boxShadow: isActivated
          ? '0 0 14px rgba(245, 158, 11, 0.35), inset 0 0 8px rgba(245, 158, 11, 0.15)'
          : 'none',
      }}
    >
      <Zap
        size={14}
        className={isActivated ? 'animate-bounce' : ''}
        style={{
          color: isActivated ? '#f59e0b' : 'rgba(255,255,255,0.3)',
          filter: isActivated ? 'drop-shadow(0 0 4px #f59e0b)' : 'none',
          transition: 'transform 0.2s',
        }}
      />
      <span>Chunk: <strong style={{ color: isActivated ? '#fff' : 'inherit' }}>"{phrase}"</strong></span>
      <span
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '1px 6px',
          borderRadius: 4,
          background: isActivated ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.06)',
          color: isActivated ? '#fef08a' : 'inherit',
          fontWeight: 800,
        }}
      >
        {isActivated ? 'Đã kích hoạt ⚡' : 'Chờ gõ...'}
      </span>
    </div>
  );
}

/**
 * InteractiveVocabCollector: Interactive collectible badges for vocab hints
 */
export function InteractiveVocabCollector({ hints = [], collectedIndices = new Set() }) {
  if (!hints || hints.length === 0) return null;

  const total = hints.length;
  const collectedCount = collectedIndices.size;
  const isAllCollected = collectedCount === total && total > 0;

  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Từ gợi ý ({collectedCount}/{total}):
        </span>
        {isAllCollected && (
          <span
            className="animate-fade-in"
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: 'var(--success-text, #43d19b)',
              background: 'rgba(34, 197, 94, 0.15)',
              padding: '1px 6px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Sparkles size={11} /> Thu thập đủ!
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {hints.map((h, i) => {
          const isCollected = collectedIndices.has(i);

          return (
            <span
              key={i}
              className={`vocab-collect-badge ${isCollected ? 'collected animate-pop-scale' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: isCollected ? 'rgba(34, 197, 94, 0.14)' : 'rgba(251, 191, 36, 0.06)',
                border: isCollected
                  ? '1px solid rgba(34, 197, 94, 0.45)'
                  : '1px dashed rgba(251, 191, 36, 0.25)',
                borderRadius: 'var(--radius-full, 9999px)',
                padding: '3px 10px',
                fontSize: 12,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isCollected ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none',
              }}
            >
              {isCollected ? (
                <Check size={12} style={{ color: 'var(--success-text, #43d19b)', strokeWidth: 3 }} />
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(251, 191, 36, 0.4)' }} />
              )}
              <span style={{ color: isCollected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {h.vi}
              </span>
              <span style={{ color: isCollected ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)' }}>
                →
              </span>
              <span
                style={{
                  color: isCollected ? 'var(--success-text, #43d19b)' : '#fbbf24',
                  fontWeight: 700,
                  textDecoration: isCollected ? 'none' : 'none',
                }}
              >
                {h.en}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ComboMeter: Displays real-time typing flow & combo multiplier
 */
export function ComboMeter({ combo }) {
  if (!combo || combo < 2) return null;

  const isSuper = combo >= 5;

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full, 9999px)',
        background: isSuper
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(217, 70, 239, 0.25) 100%)'
          : 'rgba(249, 115, 22, 0.18)',
        border: isSuper
          ? '1px solid rgba(239, 68, 68, 0.45)'
          : '1px solid rgba(249, 115, 22, 0.35)',
        color: isSuper ? '#fca5a5' : '#fb923c',
        fontSize: 11.5,
        fontWeight: 800,
        letterSpacing: '0.03em',
        boxShadow: isSuper ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
      }}
    >
      <Flame size={13} style={{ color: isSuper ? '#ef4444' : '#f97316' }} />
      <span>{isSuper ? 'ON FIRE x' : 'COMBO x'}{combo}</span>
    </div>
  );
}

/**
 * SoundToggleBtn: Minimal toggle button for Zen Wood Block sound
 */
export function SoundToggleBtn({ isMuted, onToggle, onToggleMute }) {
  const handleToggle = onToggle || onToggleMute;

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isMuted ? 'Bật âm gõ mõ gỗ' : 'Tắt âm gõ mõ gỗ'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: isMuted ? 'rgba(255,255,255,0.04)' : 'rgba(99, 102, 241, 0.12)',
        border: `1px solid ${isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(99, 102, 241, 0.3)'}`,
        color: isMuted ? 'var(--text-muted)' : 'var(--accent-300)',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      <span>{isMuted ? 'Âm: Tắt' : '🪵 Mõ gỗ'}</span>
    </button>
  );
}

export const SoundPicker = SoundToggleBtn;

