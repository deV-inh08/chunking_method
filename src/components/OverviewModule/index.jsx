import React, { useMemo } from 'react';
import {
  Play, BarChart3, Zap, Trophy, Headphones, Volume2,
  BrainCircuit, BookOpen, Clock3, ChevronRight, Sparkles, Check,
} from 'lucide-react';
import { SkeletonMetric, SkeletonLessonCard } from '../ui';

export function OverviewModule({
  user,
  transcripts = [],
  chunks = [],
  allProgress = {},
  dueCount = 0,
  isLoading = false,
  onNavigate,
  onStartPractice,
  onOpenAiSpeaking,
}) {
  const userName = user?.email ? user.email.split('@')[0] : 'Alex';

  // Format today's date in enterprise uppercase style: MONDAY, SEPTEMBER 16, 2026
  const formattedDate = useMemo(() => {
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }, []);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Metrics calculation
  const totalChunks = chunks.length || 24;
  const practicedChunks = useMemo(() => {
    return Object.values(allProgress).filter(p => (p.practiceCount || 0) > 0).length;
  }, [allProgress]);

  const weeklyProgressPercent = Math.min(100, Math.max(15, Math.round((practicedChunks / Math.max(totalChunks, 1)) * 100)));

  // Estimate TOEIC score based on practice and grammar stats
  const estimatedToeic = useMemo(() => {
    const base = 650;
    const bonus = Math.min(250, practicedChunks * 6);
    return base + bonus;
  }, [practicedChunks]);

  // Curated list of recommended lessons (combining real transcripts or smart presets)
  const recommendedLessons = useMemo(() => {
    if (transcripts && transcripts.length > 0) {
      return transcripts.slice(0, 3).map((t, idx) => {
        const colors = ['blue', 'violet', 'emerald'];
        const levels = ['Intermediate', 'Intermediate', 'Advanced'];
        const accents = ['US English', 'UK English', 'AU English'];
        const icons = [Headphones, Volume2, BrainCircuit];
        return {
          id: t.id,
          title: t.theme || (t.part === 'part3' ? 'Workplace Meeting' : 'Public Announcement'),
          subtitle: t.theme_vi || 'Giao tiếp tình huống công sở',
          level: levels[idx % 3],
          duration: `${10 + idx * 3} min`,
          accent: accents[idx % 3],
          progress: idx === 0 ? 72 : idx === 1 ? 35 : 0,
          color: colors[idx % 3],
          icon: icons[idx % 3],
          isReal: true,
        };
      });
    }

    // Default presets matching design screenshot
    return [
      {
        id: 'lesson_1',
        title: 'Office Conversations',
        subtitle: 'Workplace communication',
        level: 'Intermediate',
        duration: '12 min',
        accent: 'US English',
        progress: 72,
        color: 'blue',
        icon: Headphones,
      },
      {
        id: 'lesson_2',
        title: 'Travel & Transportation',
        subtitle: 'Airport and commute phrases',
        level: 'Intermediate',
        duration: '15 min',
        accent: 'UK English',
        progress: 35,
        color: 'violet',
        icon: Volume2,
      },
      {
        id: 'lesson_3',
        title: 'Business Meetings',
        subtitle: 'Opinions, decisions, follow-ups',
        level: 'Advanced',
        duration: '18 min',
        accent: 'US English',
        progress: 0,
        color: 'emerald',
        icon: BrainCircuit,
      },
    ];
  }, [transcripts]);

  return (
    <div className="overview-container stagger-children">
      {/* ── 1. Hero Welcome Heading ──────────────────────────── */}
      <section className="hero-heading">
        <div>
          <p className="eyebrow">{formattedDate}</p>
          <h1>{greeting}, {userName}.</h1>
          <p className="lede">
            Make today count. You&apos;re 18 minutes away from your weekly goal.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            if (dueCount > 0) onNavigate('practice');
            else onNavigate('ai_listening');
          }}
          title="Tiếp tục buổi học gần nhất"
        >
          <Play size={16} fill="currentColor" />
          <span>Continue learning</span>
        </button>
      </section>

      {/* ── 2. Metric Cards Grid (3 Cards) ──────────────────── */}
      <section className="metric-grid" aria-label="Key study metrics">
        {isLoading ? (
          <>
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
          </>
        ) : (
          <>
            <div className="metric-card">
              <div className="metric-icon blue">
                <BarChart3 size={20} strokeWidth={1.75} />
              </div>
              <div>
                <span>Weekly progress</span>
                <strong>{weeklyProgressPercent}%</strong>
                <small>+12% from last week</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon orange">
                <Zap size={20} strokeWidth={1.75} />
              </div>
              <div>
                <span>Study streak</span>
                <strong>12 days</strong>
                <small>Your best: 21 days</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon violet">
                <Trophy size={20} strokeWidth={1.75} />
              </div>
              <div>
                <span>TOEIC estimate</span>
                <strong>{estimatedToeic}</strong>
                <small>+35 points this month</small>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 3. Recommended For You: Continue Your Path ──────── */}
      <section style={{ marginBottom: 36 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">RECOMMENDED FOR YOU</p>
            <h2>Continue your path</h2>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate('ai_listening')}
          >
            View all <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        </div>

        <div className="lesson-grid">
          {isLoading ? (
            <>
              <SkeletonLessonCard />
              <SkeletonLessonCard />
              <SkeletonLessonCard />
            </>
          ) : (
            recommendedLessons.map((lesson) => {
              const Icon = lesson.icon;
              return (
                <article key={lesson.id} className={`lesson-card ${lesson.color}`}>
                  <div className="lesson-top">
                    <div className="lesson-icon">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <span className="level-pill">{lesson.level}</span>
                  </div>

                  <h3>{lesson.title}</h3>
                  <p>{lesson.subtitle}</p>

                  <div className="lesson-meta">
                    <span>
                      <Clock3 size={13} strokeWidth={1.75} /> {lesson.duration}
                    </span>
                    <span className="accent-dot" />
                    <span>{lesson.accent}</span>
                  </div>

                  <div className="card-progress">
                    <div className="progress-track">
                      <span style={{ width: `${lesson.progress}%` }} />
                    </div>
                    <small>
                      {lesson.progress === 100
                        ? 'Completed'
                        : lesson.progress > 0
                        ? `${lesson.progress}% complete`
                        : 'Not started'}
                    </small>
                  </div>

                  <button
                    className="lesson-action"
                    onClick={() => {
                      if (lesson.isReal) {
                        onNavigate('ai_listening');
                      } else if (onStartPractice) {
                        onNavigate('ai_listening');
                      } else {
                        onNavigate('ai_listening');
                      }
                    }}
                  >
                    {lesson.progress === 100 ? (
                      <>
                        <Check size={14} strokeWidth={1.75} /> Review lesson
                      </>
                    ) : lesson.progress > 0 ? (
                      <>
                        <Play size={14} fill="currentColor" strokeWidth={1.75} /> Resume
                      </>
                    ) : (
                      <>
                        Start lesson <ChevronRight size={14} strokeWidth={1.75} />
                      </>
                    )}
                  </button>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* ── 4. Lower Grid: Weekly Commitment & AI Study Insight ─ */}
      <section className="lower-grid">
        {/* Weekly commitment card */}
        <div className="goal-card">
          <div className="goal-copy">
            <p className="eyebrow">WEEKLY COMMITMENT</p>
            <h3>Keep your momentum</h3>
            <p>Complete 3 more sessions to reach your goal.</p>
            <div className="progress-track">
              <span style={{ width: '64%' }} />
            </div>
            <small style={{ marginTop: 8, display: 'block', color: 'var(--text-muted)' }}>
              4 of 7 sessions complete
            </small>
          </div>

          <div className="goal-ring" aria-label="Goal completion rate 64%">
            <strong>64</strong>
            <span>%</span>
          </div>
        </div>

        {/* AI Study Insight card */}
        <div className="focus-card">
          <div className="focus-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="eyebrow">AI STUDY INSIGHT</p>
            <h3>Your listening is improving</h3>
            <p>You&apos;re strongest with short conversations. Try a business meeting next.</p>
          </div>
          <button
            className="circle-arrow"
            onClick={() => onNavigate('ai_speaking')}
            title="Mở phòng Luyện Nói AI để thử thách"
            aria-label="Try AI Speaking session"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}
