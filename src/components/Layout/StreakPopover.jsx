import React, { useEffect, useRef } from 'react';
import { Flame, Trophy, Sparkles, Check, X } from 'lucide-react';
import { getWeekStreakOverview } from '../../services/streakService';

export function StreakPopover({ isOpen, onClose }) {
  const popoverRef = useRef(null);
  const overview = getWeekStreakOverview();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { week, currentStreak, longestStreak, isLearnedToday } = overview;

  return (
    <div
      ref={popoverRef}
      className="animate-fade-in"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 330,
        background: 'var(--bg-surface, #111b2d)',
        border: '1px solid var(--border-default, #24334b)',
        borderRadius: 'var(--radius-lg, 14px)',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(249, 115, 22, 0.15)',
        zIndex: 1000,
        padding: '18px 20px',
        color: 'var(--text-primary, #f4f7fb)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(239, 68, 68, 0.2) 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(249, 115, 22, 0.4)',
            }}
          >
            <Flame size={24} style={{ color: '#f97316', filter: 'drop-shadow(0 0 6px #f97316)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>
                {currentStreak}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                ngày streak
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: isLearnedToday ? 'var(--success-text)' : '#fbbf24', fontWeight: 600 }}>
              {isLearnedToday ? '✅ Đã thắp lửa hôm nay!' : '⚡ Cần học 1 bài để giữ chuỗi!'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Motivation Message */}
      <div
        style={{
          background: isLearnedToday ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${isLearnedToday ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          borderRadius: 'var(--radius-sm, 6px)',
          padding: '8px 12px',
          fontSize: 12,
          color: isLearnedToday ? 'var(--success-text)' : '#fbbf24',
          marginBottom: 16,
          lineHeight: 1.45,
        }}
      >
        {isLearnedToday ? (
          <span>🎉 Tuyệt vời! Bạn đã duy trì thói quen học tiếng Anh hôm nay. Hãy quay lại vào ngày mai nhé!</span>
        ) : (
          <span>🔥 Đừng để ngọn lửa bị dập tắt! Hoàn thành 1 bài viết, nói hoặc từ vựng để duy trì chuỗi.</span>
        )}
      </div>

      {/* 7-Day Week Calendar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tuần này
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            T2 - CN
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {week.map((day, idx) => {
            let bg = 'rgba(255, 255, 255, 0.03)';
            let borderColor = 'rgba(255, 255, 255, 0.08)';
            let iconColor = 'rgba(255, 255, 255, 0.2)';

            if (day.isLearned) {
              bg = 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.15) 100%)';
              borderColor = 'rgba(249, 115, 22, 0.45)';
              iconColor = '#f97316';
            } else if (day.isToday) {
              bg = 'rgba(245, 158, 11, 0.06)';
              borderColor = 'rgba(245, 158, 11, 0.4)';
              iconColor = '#fbbf24';
            }

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 2px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: day.isToday ? '#fbbf24' : 'var(--text-muted)' }}>
                  {day.dayLabel}
                </span>

                <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {day.isLearned ? (
                    <Flame size={15} style={{ color: iconColor, filter: 'drop-shadow(0 0 3px #f97316)' }} />
                  ) : day.isToday ? (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#fbbf24',
                        boxShadow: '0 0 6px #fbbf24',
                      }}
                    />
                  ) : (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>

                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {day.dayOfMonth}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Longest streak record */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 12,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <Trophy size={14} style={{ color: '#fbbf24' }} />
          <span>Kỷ lục dài nhất:</span>
        </div>
        <strong style={{ color: '#fbbf24', fontWeight: 800 }}>
          {longestStreak} ngày
        </strong>
      </div>
    </div>
  );
}
