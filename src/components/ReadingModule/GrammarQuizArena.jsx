import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, CheckCircle2, XCircle, Zap, Clock, Bookmark,
  BookmarkCheck, Sparkles, ChevronRight, RotateCcw, Award,
  Volume2, HelpCircle, Eye, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { QuizSummaryModal } from './QuizSummaryModal';
import {
  saveTopicQuizResult,
  saveGrammarChunkToDeck,
  isGrammarChunkSaved
} from '../../services/grammarStorage';

export function GrammarQuizArena({
  topic,
  initialLevel = 'standard',
  onBack,
  onSaveChunk,
  addToast,
}) {
  const [level, setLevel] = useState(initialLevel);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qId]: optionKey }
  const [answeredState, setAnsweredState] = useState({}); // { [qId]: boolean }
  const [speedMode, setSpeedMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [savedChunksMap, setSavedChunksMap] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [wrongQuestionsList, setWrongQuestionsList] = useState([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Load questions for the chosen level
  useEffect(() => {
    if (!topic) return;
    const qList = level === 'standard' ? topic.standardQuestions : topic.advancedQuestions;
    setQuestions(qList || []);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setAnsweredState({});
    setShowSummary(false);
    setIsReviewMode(false);
    setStartTime(Date.now());
    setTimeLeft(20);
  }, [topic, level]);

  const currentQ = questions[currentIndex];
  const isAnswered = currentQ ? !!answeredState[currentQ.id] : false;
  const currentSelected = currentQ ? selectedAnswers[currentQ.id] : null;

  // Check saved state for current question's targetChunk
  useEffect(() => {
    if (currentQ?.targetChunk?.phrase) {
      const saved = isGrammarChunkSaved(currentQ.targetChunk.phrase);
      setSavedChunksMap(prev => ({ ...prev, [currentQ.targetChunk.phrase]: saved }));
    }
  }, [currentQ]);

  // 20s Countdown Timer per question in speedMode
  useEffect(() => {
    if (!speedMode || isAnswered || !currentQ || showSummary) return;

    setTimeLeft(20);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-timeout: mark as wrong if not yet answered
          handleSelectAnswer(null, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [speedMode, currentIndex, isAnswered, currentQ, showSummary]);

  // Handle selecting an answer
  const handleSelectAnswer = useCallback((optionKey, isTimeout = false) => {
    if (isAnswered || !currentQ) return;

    const isCorrect = optionKey === currentQ.correctAnswer;

    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: isTimeout ? 'TIMEOUT' : optionKey,
    }));

    setAnsweredState(prev => ({
      ...prev,
      [currentQ.id]: true,
    }));

    if (!isCorrect) {
      setWrongQuestionsList(prev => [
        ...prev.filter(q => q.id !== currentQ.id),
        { ...currentQ, selected: isTimeout ? 'Hết giờ (Timeout)' : optionKey },
      ]);
    }
  }, [isAnswered, currentQ]);

  // Keyboard shortcut listener (A, B, C, D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSummary || isAnswered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        handleSelectAnswer(key);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        handleSelectAnswer(map[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, showSummary, currentQ, handleSelectAnswer]);

  // Next question or trigger summary
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(20);
    } else {
      // Finished all questions in this set!
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const totalCount = questions.length;
    let correctCount = 0;
    const finalWrong = [];

    questions.forEach(q => {
      const ans = selectedAnswers[q.id];
      if (ans === q.correctAnswer) {
        correctCount += 1;
      } else {
        finalWrong.push({ ...q, selected: ans || 'Chưa làm' });
      }
    });

    const timeSpentSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Save to localStorage & sync progress
    saveTopicQuizResult(topic.id, level, {
      correctCount,
      totalCount,
      wrongIds: finalWrong.map(w => w.id),
      timeSpentSec,
    });

    setWrongQuestionsList(finalWrong);
    setShowSummary(true);
  };

  // Save Target Chunk to SRS Deck
  const handleSaveTargetChunk = () => {
    if (!currentQ?.targetChunk?.phrase) return;
    const chunk = saveGrammarChunkToDeck(
      currentQ.targetChunk,
      topic.id,
      topic.nameVi,
      currentQ
    );

    if (chunk) {
      setSavedChunksMap(prev => ({ ...prev, [currentQ.targetChunk.phrase]: true }));
      if (onSaveChunk) onSaveChunk(chunk);
      if (addToast) {
        addToast('success', `Đã lưu cụm "${chunk.phrase}" vào kho Chunks (SRS)!`);
      }
    }
  };

  // Retry only wrong questions
  const handleRetryMistakes = () => {
    if (wrongQuestionsList.length === 0) return;
    setQuestions([...wrongQuestionsList]);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setAnsweredState({});
    setShowSummary(false);
    setIsReviewMode(true);
    setStartTime(Date.now());
    setTimeLeft(20);
  };

  // Restart entire level
  const handleRestart = () => {
    const qList = level === 'standard' ? topic.standardQuestions : topic.advancedQuestions;
    setQuestions(qList || []);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setAnsweredState({});
    setShowSummary(false);
    setIsReviewMode(false);
    setWrongQuestionsList([]);
    setStartTime(Date.now());
    setTimeLeft(20);
  };

  // Switch between standard & advanced levels
  const handleSwitchLevel = (newLevel) => {
    setLevel(newLevel);
  };

  if (!topic || questions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Không tìm thấy câu hỏi cho chuyên đề này.</p>
        <button className="btn btn-primary" onClick={onBack}>Trở về</button>
      </div>
    );
  }

  // Calculate current live score
  const answeredCount = Object.keys(answeredState).length;
  const currentCorrectCount = questions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length;

  return (
    <div className="reading-quiz-arena animate-fade-in" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={onBack}
            title="Trở về danh sách chuyên đề"
            style={{ borderRadius: 8 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-300, #a5b4fc)', fontWeight: 700 }}>
                CHUYÊN ĐỀ #{String(topic.topicNumber).padStart(2, '0')}
              </span>
              {isReviewMode && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  ÔN LẠI CÂU SAI
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-normal, #f4f4f5)' }}>
              {topic.nameVi}
            </h2>
          </div>
        </div>

        {/* Level Selector & Speed Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Level Switcher */}
          {!isReviewMode && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 2,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <button
                onClick={() => handleSwitchLevel('standard')}
                style={{
                  border: 'none',
                  background: level === 'standard' ? 'var(--accent-500, #6366f1)' : 'transparent',
                  color: level === 'standard' ? '#fff' : 'var(--text-muted, #9ca3af)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Tiêu chuẩn (30)
              </button>
              <button
                onClick={() => handleSwitchLevel('advanced')}
                style={{
                  border: 'none',
                  background: level === 'advanced' ? '#f59e0b' : 'transparent',
                  color: level === 'advanced' ? '#000' : 'var(--text-muted, #9ca3af)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Bẫy 990 ⚡ (30)
              </button>
            </div>
          )}

          {/* Speed Challenge Button */}
          <button
            onClick={() => setSpeedMode(!speedMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: speedMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
              background: speedMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
              color: speedMode ? '#fcd34d' : 'var(--text-muted, #9ca3af)',
              padding: '5px 9px',
              borderRadius: 8,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Thử thách phản xạ 20s/câu không dịch nghĩa"
          >
            <Zap size={13} fill={speedMode ? '#fcd34d' : 'none'} />
            <span>20s/câu</span>
          </button>
        </div>
      </div>

      {/* Progress and Timer Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted, #9ca3af)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-normal, #f4f4f5)', fontSize: '0.95rem' }}>
            Câu {currentIndex + 1}
          </span>
          <span>/ {questions.length}</span>
          <span style={{ marginLeft: '0.5rem', color: '#34d399', fontWeight: 600 }}>
            • Đúng: {currentCorrectCount}
          </span>
        </div>

        {speedMode && !isAnswered && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 800,
              fontSize: '0.85rem',
              color: timeLeft <= 5 ? '#ef4444' : '#f59e0b',
            }}
          >
            <Clock size={14} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3,
          marginBottom: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
            background: level === 'advanced' ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #6366f1, #3b82f6)',
            borderRadius: 3,
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      {/* Question Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          borderRadius: 14,
          background: 'var(--bg-elevated, #16171d)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          marginBottom: '1.25rem',
        }}
      >
        {/* Question Text */}
        <div
          style={{
            fontSize: '1.12rem',
            fontWeight: 600,
            lineHeight: 1.6,
            color: 'var(--text-normal, #f4f4f5)',
            marginBottom: '1.5rem',
          }}
        >
          {currentQ.question.split('______').map((segment, i, arr) => (
            <React.Fragment key={i}>
              {segment}
              {i < arr.length - 1 && (
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 80,
                    margin: '0 4px',
                    padding: '1px 8px',
                    borderRadius: 6,
                    borderBottom: isAnswered
                      ? currentSelected === currentQ.correctAnswer
                        ? '2px solid #10b981'
                        : '2px solid #ef4444'
                      : '2px dashed var(--accent-400, #818cf8)',
                    background: isAnswered
                      ? currentSelected === currentQ.correctAnswer
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(99, 102, 241, 0.1)',
                    color: isAnswered
                      ? currentSelected === currentQ.correctAnswer
                        ? '#34d399'
                        : '#f87171'
                      : 'var(--accent-300, #a5b4fc)',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {isAnswered ? currentQ.options[currentQ.correctAnswer] : '______'}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 4 Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
          {['A', 'B', 'C', 'D'].map(optKey => {
            const optText = currentQ.options?.[optKey];
            if (!optText) return null;

            const isSelected = currentSelected === optKey;
            const isCorrect = optKey === currentQ.correctAnswer;

            let btnBg = 'rgba(255,255,255,0.03)';
            let btnBorder = '1px solid rgba(255,255,255,0.08)';
            let btnColor = 'var(--text-normal, #f4f4f5)';
            let badgeBg = 'rgba(255,255,255,0.08)';
            let badgeColor = 'var(--text-muted, #9ca3af)';

            if (isAnswered) {
              if (isCorrect) {
                btnBg = 'rgba(16, 185, 129, 0.15)';
                btnBorder = '1px solid #10b981';
                btnColor = '#34d399';
                badgeBg = '#10b981';
                badgeColor = '#ffffff';
              } else if (isSelected && !isCorrect) {
                btnBg = 'rgba(239, 68, 68, 0.15)';
                btnBorder = '1px solid #ef4444';
                btnColor = '#f87171';
                badgeBg = '#ef4444';
                badgeColor = '#ffffff';
              } else {
                btnBg = 'rgba(255,255,255,0.01)';
                btnColor = 'var(--text-muted, #71717a)';
              }
            }

            return (
              <button
                key={optKey}
                disabled={isAnswered}
                onClick={() => handleSelectAnswer(optKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.1rem',
                  borderRadius: 10,
                  background: btnBg,
                  border: btnBorder,
                  color: btnColor,
                  fontSize: '0.95rem',
                  fontWeight: isSelected || (isAnswered && isCorrect) ? 700 : 500,
                  cursor: isAnswered ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {optKey}
                  </span>
                  <span>{optText}</span>
                </div>

                {isAnswered && (
                  <div>
                    {isCorrect ? (
                      <CheckCircle2 size={20} color="#34d399" />
                    ) : isSelected ? (
                      <XCircle size={20} color="#f87171" />
                    ) : null}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deep Analysis Card (Shows immediately once answered) */}
      {isAnswered && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 14,
            background: 'rgba(22, 23, 29, 0.85)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Header of analysis */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-400, #818cf8)', fontWeight: 700, fontSize: '0.88rem' }}>
              <ShieldCheck size={18} />
              <span>Phân Tích Giải Phẫu Câu & Manh Mối 3 Giây</span>
            </div>

            {/* SRS Save Chunk Action */}
            {currentQ.targetChunk?.phrase && (
              <button
                className="btn btn-sm"
                onClick={handleSaveTargetChunk}
                style={{
                  background: savedChunksMap[currentQ.targetChunk.phrase]
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(99, 102, 241, 0.15)',
                  border: savedChunksMap[currentQ.targetChunk.phrase]
                    ? '1px solid #10b981'
                    : '1px solid var(--accent-400, #818cf8)',
                  color: savedChunksMap[currentQ.targetChunk.phrase] ? '#34d399' : '#c7d2fe',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                }}
              >
                {savedChunksMap[currentQ.targetChunk.phrase] ? (
                  <>
                    <BookmarkCheck size={14} /> Đã lưu vào Chunks (SRS)
                  </>
                ) : (
                  <>
                    <Bookmark size={14} /> + Lưu cụm vào Chunks
                  </>
                )}
              </button>
            )}
          </div>

          {/* 1. Sentence Skeleton (Xương sống câu S-V-O) */}
          {currentQ.skeleton && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, marginBottom: 6 }}>
                Xương sống câu (Sentence Skeleton):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {currentQ.skeleton.subject && (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                    }}
                  >
                    <strong style={{ color: '#93c5fd' }}>[S] Chủ ngữ:</strong>{' '}
                    <span style={{ color: '#e0e7ff' }}>{currentQ.skeleton.subject}</span>
                  </div>
                )}
                {currentQ.skeleton.verb && (
                  <div
                    style={{
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                    }}
                  >
                    <strong style={{ color: '#d8b4fe' }}>[V] Động từ:</strong>{' '}
                    <span style={{ color: '#fae8ff' }}>{currentQ.skeleton.verb}</span>
                  </div>
                )}
                {currentQ.skeleton.object && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                    }}
                  >
                    <strong style={{ color: '#6ee7b7' }}>[O] Tân ngữ:</strong>{' '}
                    <span style={{ color: '#d1fae5' }}>{currentQ.skeleton.object}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Manh mối 3s (Clue) */}
          {currentQ.clue && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                borderLeft: '3px solid #f59e0b',
                padding: '6px 10px',
                borderRadius: '0 6px 6px 0',
                marginBottom: '0.85rem',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                color: '#fef3c7',
              }}
            >
              <strong style={{ color: '#fcd34d' }}>💡 Manh mối 3 giây:</strong> {currentQ.clue}
            </div>
          )}

          {/* 3. Target Chunk Highlight */}
          {currentQ.targetChunk && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '6px 10px',
                borderRadius: 6,
                marginBottom: '0.85rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ color: '#a5b4fc' }}>🎯 Cụm từ trọng tâm (Target Chunk):</strong>{' '}
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentQ.targetChunk.phrase}</span>
              </div>
              <span style={{ color: 'var(--text-muted, #9ca3af)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                {currentQ.targetChunk.meaningVi}
              </span>
            </div>
          )}

          {/* 4. Detailed Vietnamese Explanation */}
          <div style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-normal, #e4e4e7)' }}>
            <strong style={{ color: '#a1a1aa' }}>📖 Giải thích chi tiết:</strong> {currentQ.explanationVi}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn btn-ghost"
          onClick={onBack}
          style={{ fontSize: '0.85rem', color: 'var(--text-muted, #9ca3af)' }}
        >
          Trở về danh mục
        </button>

        {isAnswered && (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            style={{
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.65rem 1.35rem',
            }}
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Câu tiếp theo <ChevronRight size={18} />
              </>
            ) : (
              <>
                Xem tổng kết kết quả <Award size={18} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Quiz Summary Modal */}
      <QuizSummaryModal
        isOpen={showSummary}
        onClose={onBack}
        topic={topic}
        level={level}
        results={{
          correctCount: currentCorrectCount,
          totalCount: questions.length,
          wrongQuestions: wrongQuestionsList,
          timeSpentSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
        }}
        onRetryMistakes={wrongQuestionsList.length > 0 ? handleRetryMistakes : null}
        onSwitchLevel={handleSwitchLevel}
        onRestart={handleRestart}
      />
    </div>
  );
}
