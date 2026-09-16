import React from 'react';
import {
  Package, Users, Sparkles, Zap, Compass, GitMerge,
  Clock, History, Shield, Scale, Sliders, Repeat,
  Scissors, Link, HelpCircle, TrendingUp, Boxes, Calendar,
  RefreshCw, PieChart, Share2, AlertTriangle, Workflow, BookOpen,
  Award, Play, Lock
} from 'lucide-react';

const ICON_MAP = {
  Package, Users, Sparkles, Zap, Compass, GitMerge,
  Clock, History, Shield, Scale, Sliders, Repeat,
  Scissors, Link, HelpCircle, TrendingUp, Boxes, Calendar,
  RefreshCw, PieChart, Share2, AlertTriangle, Workflow, BookOpen,
};

// Map category to enterprise color theme class
const CATEGORY_COLORS = {
  word_forms: 'blue',
  verbs_tenses: 'amber',
  clauses_syntax: 'violet',
  advanced_traps: 'emerald',
};

export function TopicCard({ topic, progress, onStartPractice }) {
  const IconComponent = ICON_MAP[topic.icon] || BookOpen;
  const isAvailable = topic.isAvailable;

  const stdProg = progress?.standard;
  const advProg = progress?.advanced;
  const isMastered = progress?.isMastered;

  // Calculate overall completion percent for this topic
  let completedPercent = 0;
  if (isMastered) {
    completedPercent = 100;
  } else {
    const stdScore = stdProg ? Math.min(100, stdProg.score || 0) : 0;
    const advScore = advProg ? Math.min(100, advProg.score || 0) : 0;
    if (stdProg && advProg) {
      completedPercent = Math.round((stdScore + advScore) / 2);
    } else if (stdProg) {
      completedPercent = Math.round(stdScore / 2);
    } else if (advProg) {
      completedPercent = Math.round(advScore / 2);
    }
  }

  const colorClass = CATEGORY_COLORS[topic.category] || 'blue';

  return (
    <div
      className={`lesson-card ${colorClass} ${!isAvailable ? 'opacity-60' : ''}`}
      style={{
        cursor: isAvailable ? 'pointer' : 'default',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
      onClick={() => {
        if (isAvailable) {
          onStartPractice(topic, stdProg && !advProg ? 'advanced' : 'standard');
        }
      }}
    >
      <div>
        {/* Top bar: Icon & Pill badges */}
        <div className="lesson-top" style={{ marginBottom: 12 }}>
          <div className="lesson-icon">
            <IconComponent size={18} strokeWidth={1.75} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isMastered && (
              <span
                className="level-pill"
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  color: '#eab308',
                  borderColor: 'rgba(234, 179, 8, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 700,
                }}
              >
                <Award size={11} /> Mastered
              </span>
            )}
            <span className="level-pill">
              Chuyên đề #{String(topic.topicNumber).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="line-clamp-1"
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
            color: isAvailable ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {topic.nameVi}
        </h3>

        {/* Subtitle & English Name */}
        <p
          className="line-clamp-2"
          style={{
            margin: '0 0 10px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{topic.nameEn}</span>
          {' · '}
          {topic.description}
        </p>

        {/* 1-line clean Mẹo 3s hint */}
        {topic.tips && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
              border: '1px solid var(--border-subtle)',
            }}
            title={topic.tips}
          >
            <Sparkles size={11} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Mẹo 3s:</strong> {topic.tips}
            </span>
          </div>
        )}
      </div>

      {/* Meta, Progress & Launch Buttons */}
      <div style={{ marginTop: 'auto' }}>
        <div className="lesson-meta" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{topic.totalQuestions || 60} câu hỏi</span>
          <span className="accent-dot" />
          <span>{completedPercent}% hoàn thành</span>
          {(stdProg || advProg) && (
            <>
              <span className="accent-dot" />
              <span style={{ color: isMastered ? 'var(--success-text)' : 'var(--text-muted)', fontWeight: 600 }}>
                {stdProg ? `${stdProg.score}đ TC` : ''}
                {stdProg && advProg ? ' · ' : ''}
                {advProg ? `${advProg.score}đ Bẫy` : ''}
              </span>
            </>
          )}
        </div>

        {/* Progress Track */}
        <div className="progress-track mb-3" style={{ height: 5, borderRadius: 999 }}>
          <span style={{ width: `${completedPercent}%`, borderRadius: 999 }} />
        </div>

        {/* Action Buttons: 2 Levels */}
        {isAvailable ? (
          <div className="lesson-card-secondary-actions" style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="lesson-card-secondary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onStartPractice(topic, 'standard');
              }}
              style={{
                borderColor: stdProg ? 'rgba(53, 106, 230, 0.35)' : undefined,
                color: stdProg ? '#60a5fa' : undefined,
                padding: '6px 8px',
                fontSize: 11,
              }}
              title={`Luyện ${topic.standardCount || 30} câu tiêu chuẩn`}
            >
              <Play size={11} strokeWidth={2} />
              <span>Tiêu chuẩn ({topic.standardCount || 30})</span>
            </button>

            <button
              type="button"
              className="lesson-card-secondary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onStartPractice(topic, 'advanced');
              }}
              style={{
                borderColor: advProg ? 'rgba(245, 158, 11, 0.35)' : undefined,
                color: advProg ? '#fbbf24' : undefined,
                padding: '6px 8px',
                fontSize: 11,
              }}
              title={`Luyện ${topic.advancedCount || 30} câu bẫy 990`}
            >
              <Zap size={11} strokeWidth={2} />
              <span>Bẫy 990 ({topic.advancedCount || 30})</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 11, color: 'var(--text-muted)' }}>
            <Lock size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
            Sắp ra mắt
          </div>
        )}
      </div>
    </div>
  );
}
