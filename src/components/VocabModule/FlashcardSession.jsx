import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft, RotateCw, RotateCcw, Volume2, CheckCircle2,
  AlertCircle, Trophy, Sparkles, BookOpen, Layers, ArrowRight,
  Shuffle, Check, VolumeX, Keyboard, Lightbulb, CornerDownLeft
} from 'lucide-react';
import { Badge } from '../ui';
import { wordToIPA, formatIPA } from '../../services/phonetics';
import { getVocabChunks } from '../../store/storage';

const POS_COLORS = {
  noun: 'part3',
  verb: 'part4',
  adjective: 'collocation',
  adverb: 'connector',
  conjunction: 'functional',
  preposition: 'neutral',
};

export function FlashcardSession({
  topic,
  selectedWords = [],
  learnedVocab = {},
  onBack,
  onMarkLearned,
  onToast,
  onStartPractice,
}) {
  // Study queue can be filtered down if user chooses to review difficult words
  const [studyQueue, setStudyQueue] = useState(selectedWords);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    return localStorage.getItem('speaking_chunk_flashcard_autoplay') !== 'false';
  });

  // Stage 1 ('card') -> Stage 2 ('spelling') flow
  const [stage, setStage] = useState('card'); // 'card' | 'spelling'
  const [typedInput, setTypedInput] = useState('');
  const [spellShake, setSpellShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Track session progress
  const [masteredIds, setMasteredIds] = useState(() => new Set());
  const [reviewIds, setReviewIds] = useState(() => new Set());
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef(null);
  const currentWord = studyQueue[currentIndex] || null;

  // Helper to normalize characters by removing diacritics / accents (e.g. résumé -> resume)
  const stripAccents = (str) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Target word letters decomposition
  const targetWord = useMemo(() => {
    return currentWord ? currentWord.word.trim() : '';
  }, [currentWord]);

  // Normalized version without diacritics for spelling verification
  const normalizedTarget = useMemo(() => {
    return targetWord ? stripAccents(targetWord) : '';
  }, [targetWord]);

  const targetLetters = useMemo(() => {
    return normalizedTarget ? normalizedTarget.split('') : [];
  }, [normalizedTarget]);

  // Pronunciation audio playback using Web Speech API
  const playAudio = useCallback((text) => {
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, []);

  // Toggle auto play audio setting
  const toggleAutoPlay = useCallback(() => {
    setAutoPlayAudio(prev => {
      const next = !prev;
      localStorage.setItem('speaking_chunk_flashcard_autoplay', String(next));
      return next;
    });
  }, []);

  // Reset stage and state when card index changes
  useEffect(() => {
    setIsFlipped(false);
    setStage('card');
    setTypedInput('');
    setSpellShake(false);
    setIsSuccess(false);

    if (!isFinished && currentWord && autoPlayAudio) {
      const timer = setTimeout(() => {
        playAudio(currentWord.word);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, autoPlayAudio, isFinished, playAudio]);

  // Focus input automatically when entering Stage 2
  useEffect(() => {
    if (stage === 'spelling') {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Flip card in Stage 1
  const handleFlip = useCallback(() => {
    if (stage === 'card') {
      setIsFlipped(prev => !prev);
    }
  }, [stage]);

  // Mark as Need Review
  const handleNeedReview = useCallback(() => {
    if (!currentWord) return;
    const wordId = currentWord.id;

    setReviewIds(prev => new Set(prev).add(wordId));
    setMasteredIds(prev => {
      const next = new Set(prev);
      next.delete(wordId);
      return next;
    });

    if (currentIndex + 1 < studyQueue.length) {
      setCurrentIndex(i => i + 1);
      setStage('card');
      setTypedInput('');
    } else {
      setIsFinished(true);
    }
  }, [currentWord, currentIndex, studyQueue.length]);

  // Advance after spelling is verified 100% correct
  const handleSpellingSuccess = useCallback(() => {
    if (!currentWord) return;
    const wordId = currentWord.id;

    setIsSuccess(true);
    playAudio(currentWord.word);

    setMasteredIds(prev => new Set(prev).add(wordId));
    setReviewIds(prev => {
      const next = new Set(prev);
      next.delete(wordId);
      return next;
    });

    if (onMarkLearned) {
      onMarkLearned(wordId, currentWord.word, currentWord.topic);
    }

    setTimeout(() => {
      if (currentIndex + 1 < studyQueue.length) {
        setCurrentIndex(i => i + 1);
        setStage('card');
        setTypedInput('');
        setIsSuccess(false);
      } else {
        setIsFinished(true);
      }
    }, 550);
  }, [currentWord, currentIndex, studyQueue.length, onMarkLearned, playAudio]);

  // Verify spelling accuracy
  const verifySpelling = useCallback((inputVal) => {
    if (!currentWord) return;
    const cleanInput = stripAccents(inputVal.trim()).toLowerCase();
    const cleanTarget = stripAccents(targetWord).toLowerCase();

    if (cleanInput === cleanTarget) {
      handleSpellingSuccess();
    } else {
      setSpellShake(true);
      setTimeout(() => setSpellShake(false), 500);
    }
  }, [currentWord, targetWord, handleSpellingSuccess]);

  // Handle typing input change in Stage 2
  const handleInputChange = useCallback((newVal) => {
    // Only accept length up to target length
    let sliced = newVal.slice(0, targetLetters.length);

    // Auto-advance if next target character is hyphen or space
    if (sliced.length < targetLetters.length) {
      const nextTargetChar = targetLetters[sliced.length];
      if (nextTargetChar === '-' || nextTargetChar === ' ') {
        sliced = sliced + nextTargetChar;
      }
    }

    setTypedInput(sliced);

    // If typed letters reach target word length, check accuracy
    if (sliced.length === targetLetters.length) {
      const cleanInput = stripAccents(sliced.trim()).toLowerCase();
      const cleanTarget = stripAccents(targetWord).toLowerCase();

      if (cleanInput === cleanTarget) {
        handleSpellingSuccess();
      } else {
        setSpellShake(true);
        setTimeout(() => setSpellShake(false), 500);
      }
    }
  }, [targetLetters, targetWord, handleSpellingSuccess]);

  // Hint button: clean any trailing incorrect characters and reveal next correct letter
  const handleHint = useCallback(() => {
    let base = typedInput;
    while (base.length > 0) {
      const lastIdx = base.length - 1;
      const typed = stripAccents(base[lastIdx]).toLowerCase();
      const target = stripAccents(targetLetters[lastIdx] || '').toLowerCase();
      if (typed === target) break;
      base = base.slice(0, -1);
    }
    if (base.length < targetLetters.length) {
      const nextChar = targetLetters[base.length];
      const updated = base + nextChar;
      handleInputChange(updated);
      inputRef.current?.focus();
    }
  }, [typedInput, targetLetters, handleInputChange]);

  // Skip and review later (user forgot spelling)
  const handleSkipAndReview = useCallback(() => {
    if (!currentWord) return;
    const wordId = currentWord.id;

    // Reveal correct word in input
    setTypedInput(normalizedTarget);
    setReviewIds(prev => new Set(prev).add(wordId));
    setMasteredIds(prev => {
      const next = new Set(prev);
      next.delete(wordId);
      return next;
    });

    setTimeout(() => {
      if (currentIndex + 1 < studyQueue.length) {
        setCurrentIndex(i => i + 1);
        setStage('card');
        setTypedInput('');
      } else {
        setIsFinished(true);
      }
    }, 750);
  }, [currentWord, targetWord, currentIndex, studyQueue.length]);

  // Button "Đã thuộc" in Stage 1 -> Transitions to Stage 2
  const handleMasteredClick = useCallback(() => {
    if (stage === 'card') {
      setStage('spelling');
      setTypedInput('');
      setSpellShake(false);
      setIsSuccess(false);
    } else {
      verifySpelling(typedInput);
    }
  }, [stage, typedInput, verifySpelling]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (isFinished) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        // If typing inside input, allow Escape to go back to card
        if (stage === 'spelling') {
          if (e.key === 'Escape') {
            e.preventDefault();
            setStage('card');
          }
        }
        return;
      }

      if (stage === 'card') {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFlip();
        } else if (e.code === 'ArrowLeft' || e.key === '1') {
          e.preventDefault();
          handleNeedReview();
        } else if (e.code === 'ArrowRight' || e.key === '2') {
          e.preventDefault();
          handleMasteredClick();
        } else if (e.code === 'KeyA') {
          e.preventDefault();
          if (currentWord) playAudio(currentWord.word);
        }
      } else if (stage === 'spelling') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setStage('card');
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          setTypedInput(prev => prev.slice(0, -1));
          inputRef.current?.focus();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && /[a-zA-Z\s\-']/.test(e.key)) {
          e.preventDefault();
          handleInputChange(typedInput + e.key);
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, stage, currentWord, typedInput, handleFlip, handleNeedReview, handleMasteredClick, playAudio, handleInputChange]);

  // Restart only review words
  const handleRestartReview = useCallback(() => {
    const reviewWords = studyQueue.filter(w => reviewIds.has(w.id));
    if (reviewWords.length === 0) return;
    setStudyQueue(reviewWords);
    setCurrentIndex(0);
    setStage('card');
    setIsFlipped(false);
    setIsFinished(false);
  }, [studyQueue, reviewIds]);

  // Restart all words
  const handleRestartAll = useCallback(() => {
    setStudyQueue(selectedWords);
    setCurrentIndex(0);
    setStage('card');
    setIsFlipped(false);
    setIsFinished(false);
    setMasteredIds(new Set());
    setReviewIds(new Set());
  }, [selectedWords]);

  // Derived data for current card
  const ipaString = useMemo(() => {
    if (!currentWord) return '';
    return formatIPA(wordToIPA(currentWord.word));
  }, [currentWord]);

  const currentChunks = useMemo(() => {
    if (!currentWord) return [];
    try {
      return getVocabChunks(currentWord.id) || [];
    } catch {
      return [];
    }
  }, [currentWord]);

  const posColor = currentWord ? (POS_COLORS[currentWord.partOfSpeech] || 'neutral') : 'neutral';
  const progressPercent = studyQueue.length > 0
    ? Math.round(((currentIndex + (isFinished ? 1 : 0)) / studyQueue.length) * 100)
    : 0;

  // Completion Screen
  if (isFinished) {
    const masteredCount = masteredIds.size;
    const reviewCount = reviewIds.size;
    const masteredPercent = studyQueue.length > 0 ? Math.round((masteredCount / studyQueue.length) * 100) : 0;

    return (
      <div className="flashcard-session-container animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ChevronLeft size={14} /> Quay lại danh sách
          </button>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            Hoàn thành phiên học Flashcard
          </div>
        </div>

        <div className="flashcard-summary-card">
          <div className="flashcard-summary-trophy">
            <Trophy size={48} color="#38bdf8" />
          </div>
          <h2 className="flashcard-summary-title">Tuyệt vời! Bạn đã hoàn thành {studyQueue.length} thẻ</h2>
          <p className="flashcard-summary-subtitle">
            Chủ đề: <strong style={{ color: '#fff' }}>{topic}</strong>
          </p>

          <div className="flashcard-summary-metrics">
            <div className="flashcard-metric-box success">
              <div className="flashcard-metric-num">{masteredCount}</div>
              <div className="flashcard-metric-label">Đã ghi nhớ & gõ đúng ({masteredPercent}%)</div>
            </div>
            <div className="flashcard-metric-box warning">
              <div className="flashcard-metric-num">{reviewCount}</div>
              <div className="flashcard-metric-label">Cần ôn lại</div>
            </div>
            <div className="flashcard-metric-box neutral">
              <div className="flashcard-metric-num">{studyQueue.length}</div>
              <div className="flashcard-metric-label">Tổng số thẻ</div>
            </div>
          </div>

          <div className="flashcard-summary-actions">
            {reviewCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handleRestartReview}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
              >
                <RotateCcw size={16} /> Ôn lại {reviewCount} từ chưa thuộc
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleRestartAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <RotateCw size={16} /> Luyện lại toàn bộ {selectedWords.length} từ
            </button>
            <button
              className="btn btn-primary"
              onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <BookOpen size={16} /> Chọn bài / danh sách khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="card text-center p-8">
        <p>Không tìm thấy từ vựng trong phiên này.</p>
        <button className="btn btn-primary mt-4" onClick={onBack}>Quay lại</button>
      </div>
    );
  }

  return (
    <div className="flashcard-session-container animate-fade-in">
      {/* Header bar */}
      <div className="flashcard-topbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronLeft size={14} /> Thoát
        </button>

        <div className="flashcard-topic-title">
          <Layers size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <span>{topic}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAutoPlay}
            className={`flashcard-audio-toggle ${autoPlayAudio ? 'active' : ''}`}
            title={autoPlayAudio ? 'Tắt tự động phát âm' : 'Bật tự động phát âm'}
          >
            {autoPlayAudio ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden-sm">Tự động phát âm</span>
          </button>

          <span className="flashcard-progress-counter">
            {currentIndex + 1} / {studyQueue.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flashcard-progress-track">
        <div
          className="flashcard-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ──── STAGE 1: 3D FLIP CARD ──── */}
      {stage === 'card' && (
        <>
          <div className="flashcard-card-scene" onClick={handleFlip}>
            <div className={`flashcard-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
              
              {/* FRONT SIDE (English, Phonetics, Audio) */}
              <div className="flashcard-card-face flashcard-front">
                <div className="flashcard-face-header">
                  <span className="flashcard-card-number">
                    Thẻ {currentIndex + 1} / {studyQueue.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentWord.partOfSpeech && (
                      <Badge type={posColor}>{currentWord.partOfSpeech}</Badge>
                    )}
                    {masteredIds.has(currentWord.id) && (
                      <span className="flashcard-status-badge mastered">
                        <Check size={11} /> Đã thuộc
                      </span>
                    )}
                    {reviewIds.has(currentWord.id) && (
                      <span className="flashcard-status-badge reviewing">
                        Cần ôn
                      </span>
                    )}
                  </div>
                </div>

                <div className="flashcard-face-body">
                  <div className="flashcard-word-en">
                    {currentWord.word}
                  </div>

                  {ipaString && (
                    <div className="flashcard-word-ipa">
                      {ipaString}
                    </div>
                  )}

                  <button
                    type="button"
                    className="flashcard-pronounce-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(currentWord.word);
                    }}
                    title="Nghe phát âm chuẩn (phím A)"
                  >
                    <Volume2 size={18} />
                    <span>Phát âm (A)</span>
                  </button>
                </div>

                <div className="flashcard-face-footer">
                  <span className="flashcard-flip-hint">
                    <RotateCw size={13} className="spin-hover" />
                    Nhấn thẻ hoặc phím <kbd>Space</kbd> để xem nghĩa tiếng Việt
                  </span>
                </div>
              </div>

              {/* BACK SIDE (Vietnamese Meaning, Examples, Chunks) */}
              <div className="flashcard-card-face flashcard-back">
                <div className="flashcard-face-header">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white" style={{ fontSize: 14 }}>
                      {currentWord.word}
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: 13 }}>{ipaString}</span>
                    <button
                      type="button"
                      className="flashcard-mini-audio"
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(currentWord.word);
                      }}
                      title="Phát âm"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                  {currentWord.partOfSpeech && (
                    <Badge type={posColor}>{currentWord.partOfSpeech}</Badge>
                  )}
                </div>

                <div className="flashcard-face-body back-content">
                  <div className="flashcard-meaning-vi">
                    {currentWord.meaningVi}
                  </div>

                  {currentWord.exampleEn && (
                    <div className="flashcard-example-card">
                      <div className="flashcard-example-en">
                        <span>"{currentWord.exampleEn}"</span>
                        <button
                          type="button"
                          className="flashcard-mini-audio"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(currentWord.exampleEn);
                          }}
                          title="Nghe ví dụ"
                        >
                          <Volume2 size={12} />
                        </button>
                      </div>
                      {currentWord.exampleVi && (
                        <div className="flashcard-example-vi">
                          {currentWord.exampleVi}
                        </div>
                      )}
                    </div>
                  )}

                  {currentChunks.length > 0 && (
                    <div className="flashcard-chunks-preview">
                      <div className="flashcard-chunks-title">
                        <Sparkles size={13} style={{ color: '#38bdf8' }} />
                        <span>Các chunk ứng dụng trong giao tiếp:</span>
                      </div>
                      <div className="flashcard-chunks-tags">
                        {currentChunks.slice(0, 2).map((chunk, idx) => (
                          <div key={chunk.id || idx} className="flashcard-chunk-item">
                            <span className="flashcard-chunk-text">{chunk.text || chunk.phrase}</span>
                            <span className="flashcard-chunk-meaning"> — {chunk.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flashcard-face-footer">
                  <span className="flashcard-flip-hint">
                    <RotateCw size={13} />
                    Nhấn thẻ hoặc phím <kbd>Space</kbd> để lật lại mặt trước
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Stage 1 Control Buttons Bar */}
          <div className="flashcard-controls-bar">
            <button
              type="button"
              className="btn flashcard-ctrl-btn review"
              onClick={handleNeedReview}
              title="Cần ôn lại từ này (Phím mũi tên Trái hoặc 1)"
            >
              <RotateCcw size={17} />
              <div className="ctrl-btn-text">
                <span>Cần ôn lại</span>
                <kbd>←</kbd>
              </div>
            </button>

            <button
              type="button"
              className="btn flashcard-ctrl-btn flip"
              onClick={handleFlip}
              title="Lật thẻ xem nghĩa / tiếng Anh (Phím Space)"
            >
              <RotateCw size={17} />
              <div className="ctrl-btn-text">
                <span>{isFlipped ? 'Xem tiếng Anh' : 'Xem nghĩa'}</span>
                <kbd>Space</kbd>
              </div>
            </button>

            <button
              type="button"
              className="btn flashcard-ctrl-btn master"
              onClick={handleMasteredClick}
              title="Đã thuộc từ này → Vào Ải 2 gõ từ (Phím mũi tên Phải hoặc 2)"
            >
              <CheckCircle2 size={17} />
              <div className="ctrl-btn-text">
                <span>Đã thuộc</span>
                <kbd>→</kbd>
              </div>
            </button>
          </div>

          <div className="flashcard-shortcuts-legend">
            <Keyboard size={13} />
            <span>Phím tắt:</span>
            <span className="legend-item"><kbd>Space</kbd> Lật thẻ</span>
            <span className="legend-item"><kbd>←</kbd> Cần ôn lại</span>
            <span className="legend-item"><kbd>→</kbd> Đã thuộc</span>
            <span className="legend-item"><kbd>A</kbd> Phát âm</span>
          </div>
        </>
      )}

      {/* ──── STAGE 2: SPELLING VERIFICATION (ẢI 2) ──── */}
      {stage === 'spelling' && (
        <div className="flashcard-spelling-card animate-fade-in">
          {/* Header */}
          <div className="flashcard-face-header">
            <span className="flashcard-stage-badge">
              <Sparkles size={12} /> Ải 2: Ghi nhớ từ vựng ({targetLetters.length} chữ cái)
            </span>
            <div className="flex items-center gap-2">
              {currentWord.partOfSpeech && (
                <Badge type={posColor}>{currentWord.partOfSpeech}</Badge>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flashcard-face-body">
            <div className="flashcard-spelling-prompt">
              Gõ trực tiếp các chữ cái vào ô bên dưới để qua từ:
            </div>

            {/* Meaning in Vietnamese */}
            <div className="flashcard-spelling-meaning">
              {currentWord.meaningVi}
            </div>

            {/* Phonetic transcription and speaker */}
            {ipaString && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="flashcard-word-ipa" style={{ marginBottom: 0 }}>
                  {ipaString}
                </span>
                <button
                  type="button"
                  className="flashcard-mini-audio"
                  onClick={() => playAudio(currentWord.word)}
                  title="Nghe lại phát âm"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            )}

            {/* Dots / Slots displaying corresponding number of letters */}
            <div
              className={`flashcard-slots-wrapper ${spellShake ? 'shake' : ''}`}
              onClick={() => inputRef.current?.focus()}
              title="Chạm vào đây để gõ chữ cái"
            >
              {targetLetters.map((char, idx) => {
                const isSpace = char === ' ';
                const isHyphen = char === '-';
                const isFilled = idx < typedInput.length;
                const isActive = idx === typedInput.length;
                const typedChar = typedInput[idx] || '';

                if (isSpace) {
                  return <div key={idx} className="flashcard-letter-slot space" />;
                }
                if (isHyphen) {
                  return <div key={idx} className="flashcard-letter-slot filled">-</div>;
                }

                const expectedChar = char;
                const isMatch = isFilled && (
                  stripAccents(typedChar).toLowerCase() === stripAccents(expectedChar).toLowerCase()
                );
                const isWrong = isFilled && !isMatch;

                let slotClass = 'flashcard-letter-slot';
                if (isSuccess || (isFilled && isMatch)) {
                  slotClass += ' correct';
                } else if (isWrong) {
                  slotClass += ' wrong';
                } else if (isActive) {
                  slotClass += ' active dot';
                } else {
                  slotClass += ' dot';
                }

                return (
                  <div
                    key={idx}
                    className={slotClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTypedInput(typedInput.slice(0, idx));
                      inputRef.current?.focus();
                    }}
                    title={isFilled ? 'Bấm để sửa từ vị trí này' : 'Gõ chữ cái'}
                  >
                    {isFilled ? (isMatch ? expectedChar.toLowerCase() : typedChar.toLowerCase()) : null}
                  </div>
                );
              })}
            </div>

            {/* Hidden native input for mobile virtual keyboard and IME support */}
            <input
              ref={inputRef}
              type="text"
              className="flashcard-hidden-input"
              value={typedInput}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-label="Nhập từ chính xác"
            />

            {/* Helper guide */}
            <div className="flashcard-spelling-guide">
              <span className="guide-item"><span className="guide-indicator green" /> Đúng (Xanh)</span>
              <span className="guide-item"><span className="guide-indicator red" /> Sai (Đỏ)</span>
              <span className="guide-item guide-note">• Bấm <kbd>Backspace</kbd> để xóa</span>
            </div>
          </div>

          {/* Footer Actions / Help options */}
          <div className="flashcard-face-footer">
            <div className="flashcard-spelling-actions">
              <button
                type="button"
                className="flashcard-hint-btn"
                onClick={handleHint}
                title="Gợi ý thêm 1 chữ cái tiếp theo"
                disabled={isSuccess || typedInput.length >= targetWord.length}
              >
                <Lightbulb size={14} />
                <span>Gợi ý 1 chữ</span>
              </button>

              <button
                type="button"
                className="flashcard-back-card-btn"
                onClick={() => setStage('card')}
                title="Quay lại mặt thẻ flashcard"
                disabled={isSuccess}
              >
                <RotateCw size={13} />
                <span>Xem lại thẻ</span>
              </button>

              <button
                type="button"
                className="flashcard-skip-btn"
                onClick={handleSkipAndReview}
                title="Chưa nhớ từ này, ôn lại sau"
                disabled={isSuccess}
              >
                <RotateCcw size={13} />
                <span>Chưa nhớ (Ôn lại sau)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
