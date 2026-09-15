import React from 'react';
import {
  Package, Users, Sparkles, Zap, Compass, GitMerge,
  Clock, History, Shield, Scale, Sliders, Repeat,
  Scissors, Link, HelpCircle, TrendingUp, Boxes, Calendar,
  RefreshCw, PieChart, Share2, AlertTriangle, Workflow, BookOpen,
  CheckCircle2, Award, Play, ChevronRight, Lock
} from 'lucide-react';

const ICON_MAP = {
  Package, Users, Sparkles, Zap, Compass, GitMerge,
  Clock, History, Shield, Scale, Sliders, Repeat,
  Scissors, Link, HelpCircle, TrendingUp, Boxes, Calendar,
  RefreshCw, PieChart, Share2, AlertTriangle, Workflow, BookOpen,
};

export function TopicCard({ topic, progress, onStartPractice }) {
  const IconComponent = ICON_MAP[topic.icon] || BookOpen;
  const isAvailable = topic.isAvailable;

  const stdProg = progress?.standard;
  const advProg = progress?.advanced;
  const isMastered = progress?.isMastered;

  return (
    <div
      className={`card reading-topic-card animate-fade-in ${!isAvailable ? 'topic-unavailable' : ''}`}
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '12px',
        border: isMastered
          ? '1px solid rgba(234, 179, 8, 0.4)'
          : isAvailable
            ? '1px solid var(--border-subtle, rgba(255,255,255,0.08))'
            : '1px dashed rgba(255,255,255,0.06)',
        background: isMastered
          ? 'linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(20, 20, 24, 0.95) 100%)'
          : isAvailable
            ? 'var(--bg-elevated, #16171d)'
            : 'rgba(255,255,255,0.02)',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isAvailable
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))'
                  : 'rgba(255,255,255,0.04)',
                color: isAvailable ? 'var(--accent-400, #818cf8)' : 'var(--text-muted, #71717a)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <IconComponent size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted, #71717a)',
                    textTransform: 'uppercase',
                  }}
                >
                  Chuyên đề #{String(topic.topicNumber).padStart(2, '0')}
                </span>
                {isMastered && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#eab308',
                      background: 'rgba(234, 179, 8, 0.15)',
                      padding: '1px 6px',
                      borderRadius: 99,
                    }}
                  >
                    <Award size={11} /> Mastered
                  </span>
                )}
              </div>
              <h3
                style={{
                  margin: '2px 0 0',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: isAvailable ? 'var(--text-normal, #f4f4f5)' : 'var(--text-muted, #a1a1aa)',
                }}
              >
                {topic.nameVi}
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          {isAvailable ? (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              60 câu (30+30)
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#71717a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Chờ nạp JSON
            </span>
          )}
        </div>

        {/* English Name & Description */}
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-300, #a5b4fc)', marginBottom: '0.4rem', fontWeight: 500 }}>
          {topic.nameEn}
        </div>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted, #9ca3af)',
            lineHeight: 1.45,
            margin: '0 0 0.75rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {topic.description}
        </p>

        {/* Tip / Clue */}
        {topic.tips && (
          <div
            style={{
              fontSize: '0.75rem',
              background: 'rgba(99, 102, 241, 0.06)',
              borderLeft: '2px solid var(--accent-400, #818cf8)',
              padding: '4px 8px',
              borderRadius: '0 4px 4px 0',
              color: '#c7d2fe',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            <strong>Mẹo 3s:</strong> {topic.tips}
          </div>
        )}
      </div>

      {/* Progress & Actions Section */}
      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {isAvailable ? (
          <div>
            {/* Progress indicators for 2 levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted, #9ca3af)' }}>
                  <span>Tiêu chuẩn</span>
                  <span style={{ fontWeight: 600, color: stdProg ? '#34d399' : '#71717a' }}>
                    {stdProg ? `${stdProg.score}%` : 'Chưa thi'}
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stdProg ? stdProg.score : 0}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted, #9ca3af)' }}>
                  <span>Bẫy 990</span>
                  <span style={{ fontWeight: 600, color: advProg ? '#f59e0b' : '#71717a' }}>
                    {advProg ? `${advProg.score}%` : 'Chưa thi'}
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${advProg ? advProg.score : 0}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Level Launch Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <button
                className="btn btn-sm"
                onClick={() => onStartPractice(topic, 'standard')}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 8px',
                }}
              >
                <Play size={12} fill="#93c5fd" /> Tiêu chuẩn (30)
              </button>

              <button
                className="btn btn-sm"
                onClick={() => onStartPractice(topic, 'advanced')}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fcd34d',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 8px',
                }}
              >
                <Zap size={12} fill="#fcd34d" /> Bẫy 990 (30)
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.4rem 0' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Lock size={12} /> Thêm file JSON vào data/grammar/ để mở khóa
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
