import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, ChevronRight, ChevronLeft, Sparkles, Shuffle,
  X, CheckCircle, Loader, PenLine, RefreshCw, RotateCcw,
  GraduationCap, Target, Trophy, BookMarked,
} from 'lucide-react';
import { EmptyState, Badge, Spinner } from '../ui';
import { generateChunksFromWord, generateWritingExercises, gradeWriting } from '../../services/ai';
import {
  getApiKey, saveVocabChunks, saveSituations, getSituations,
  getLearnedVocab, markVocabLearned, isVocabLearned,
  getTodaySession, saveTodaySession, getAllChunks,
} from '../../store/storage';

// ── Tải vocab từ JSON tĩnh (không cần Supabase/script) ──────────
import VOCAB_RAW from '../../../data/vocab_5000.json';

// ── Helpers ──────────────────────────────────────────────────────
function makeWordId(word, topic) {
  const slug = (s) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  return `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Shuffle mảng (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POS_COLORS = {
  noun: 'part3', verb: 'part4', adjective: 'collocation',
  adverb: 'connector', conjunction: 'functional', preposition: 'neutral',
};

const CHUNK_TYPE_LABELS = { collocation: 'Collocation', functional: 'Functional', connector: 'Connector' };
const LEVEL_CONFIG = {
  1: { label: 'Cơ bản',   color: '34,197,94',  bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  2: { label: 'Trung cấp', color: '251,191,36', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  3: { label: 'Nâng cao', color: '239,68,68',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

const MIN_WORDS = 20;
const MAX_WORDS = 50;

// ─── Screen 1: Topic Browser ─────────────────────────────────────
function TopicBrowser({ words, learnedVocab, onSelectTopic }) {
  const topicStats = useMemo(() => {
    const map = {};
    words.forEach(w => {
      if (!map[w.topic]) map[w.topic] = { total: 0, learned: 0 };
      map[w.topic].total++;
      const wid = makeWordId(w.word, w.topic);
      if (learnedVocab[wid]) map[w.topic].learned++;
    });
    return map;
  }, [words, learnedVocab]);

  const topics = useMemo(() => Object.keys(topicStats).sort(), [topicStats]);
  const totalLearned = Object.values(learnedVocab).length;

  // Emoji map theo topic
  const topicEmoji = (t) => {
    if (t.includes('Business')) return '💼';
    if (t.includes('Tech') || t.includes('Science')) return '🔬';
    if (t.includes('Education')) return '📚';
    if (t.includes('Health') || t.includes('Medical')) return '🏥';
    if (t.includes('Travel') || t.includes('Transport')) return '✈️';
    if (t.includes('Food')) return '🍜';
    if (t.includes('Environment') || t.includes('Nature')) return '🌿';
    if (t.includes('Arts') || t.includes('Entertainment')) return '🎭';
    if (t.includes('Social') || t.includes('Politic')) return '🏛️';
    if (t.includes('Sport')) return '⚽';
    if (t.includes('Daily') || t.includes('Family')) return '🏠';
    if (t.includes('General') || t.includes('Function')) return '📖';
    if (t.includes('Finance') || t.includes('Economy')) return '📈';
    return '📝';
  };

  return (
    <div>
      {/* Header stats */}
      <div className="card mb-6" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(67,56,202,0.08))',
        borderColor: 'rgba(99,102,241,0.25)',
      }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                Thư viện từ vựng
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {words.length.toLocaleString()} từ · {topics.length} chủ đề
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent-300)' }}>
              {totalLearned}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>từ đã học</div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Chọn chủ đề để bắt đầu học từ vựng theo chunking method
      </p>

      {/* Topic grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {topics.map(topic => {
          const s = topicStats[topic];
          const pct = s.total > 0 ? (s.learned / s.total) * 100 : 0;
          const remaining = s.total - s.learned;
          return (
            <button
              key={topic}
              id={`topic-btn-${topic.replace(/\W+/g, '-')}`}
              onClick={() => onSelectTopic(topic)}
              className="card"
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: '16px',
                transition: 'all 0.2s',
                borderColor: pct === 100 ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{topicEmoji(topic)}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                {topic}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                {remaining > 0 ? `${remaining} từ chưa học` : '✓ Đã học hết!'}
                {' '}· {s.total} từ
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 99 }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct === 100
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Screen 2: Word Selector ──────────────────────────────────────
function WordSelector({ topic, words, learnedVocab, onStartLearning, onBack }) {
  // Tách từ chưa học và đã học
  const unlearnedWords = useMemo(() =>
    words.filter(w => !learnedVocab[makeWordId(w.word, w.topic)]),
    [words, learnedVocab]
  );
  const learnedCount = words.length - unlearnedWords.length;

  const [count, setCount] = useState(() => Math.min(MIN_WORDS, unlearnedWords.length));
  const [selectedWords, setSelectedWords] = useState([]);

  // Khởi tạo / khi count thay đổi: random N từ
  const randomize = useCallback(() => {
    const shuffled = shuffle(unlearnedWords);
    setSelectedWords(shuffled.slice(0, count));
  }, [unlearnedWords, count]);

  useEffect(() => { randomize(); }, [count]); // eslint-disable-line

  // Bỏ 1 từ → thay bằng từ random từ pool còn lại
  const handleSwap = useCallback((wordToRemove) => {
    setSelectedWords(prev => {
      const selectedIds = new Set(prev.map(w => makeWordId(w.word, w.topic)));
      const pool = unlearnedWords.filter(w => !selectedIds.has(makeWordId(w.word, w.topic)));
      const replacement = pool[Math.floor(Math.random() * pool.length)];
      return prev
        .filter(w => makeWordId(w.word, w.topic) !== makeWordId(wordToRemove.word, wordToRemove.topic))
        .concat(replacement ? [replacement] : []);
    });
  }, [unlearnedWords]);

  const canLearn = selectedWords.length > 0;

  return (
    <div>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-5">
        <button id="back-to-topics" className="btn btn-ghost btn-sm" onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={14} /> Chủ đề
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1 }}>
          {topic}
        </div>
        <Badge type="neutral">{words.length} từ · {learnedCount} đã học</Badge>
      </div>

      {/* Count stepper */}
      <div className="card mb-5" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(67,56,202,0.05))',
        borderColor: 'rgba(99,102,241,0.2)',
      }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
              Số từ muốn học hôm nay
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {unlearnedWords.length} từ chưa học trong chủ đề này
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCount(c => Math.max(1, c - 5))}
              disabled={count <= 1}
              style={{ width: 32, height: 32, padding: 0 }}
            >-5</button>
            <span style={{
              fontWeight: 800, fontSize: 24, color: 'var(--accent-300)',
              minWidth: 40, textAlign: 'center',
            }}>{count}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCount(c => Math.min(MAX_WORDS, unlearnedWords.length, c + 5))}
              disabled={count >= Math.min(MAX_WORDS, unlearnedWords.length)}
              style={{ width: 32, height: 32, padding: 0 }}
            >+5</button>
          </div>
          {/* Quick preset buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[20, 30, 50].map(n => (
              <button
                key={n}
                className={`btn btn-sm ${count === n ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setCount(Math.min(n, unlearnedWords.length))}
                disabled={unlearnedWords.length < n && n !== 20}
                style={{ padding: '4px 10px' }}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginTop: 12 }}>
          <input
            type="range"
            min={1}
            max={Math.min(MAX_WORDS, unlearnedWords.length)}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-500)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>1</span>
            <span style={{ color: 'var(--text-muted)' }}>Tối đa {Math.min(MAX_WORDS, unlearnedWords.length)}</span>
          </div>
        </div>
      </div>

      {/* Selected words grid + actions */}
      {unlearnedWords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Trophy size={32} color="var(--accent-300)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Đã học hết toàn bộ từ trong chủ đề này! 🎉
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {learnedCount}/{words.length} từ đã hoàn thành
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedWords.length} từ được chọn
            </span>
            <button
              id="randomize-btn"
              className="btn btn-ghost btn-sm"
              onClick={randomize}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Shuffle size={13} /> Random lại
            </button>
          </div>

          {/* Word chips grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 8,
            marginBottom: 20,
          }}>
            {selectedWords.map((w) => {
              const wid = makeWordId(w.word, w.topic);
              const posColor = POS_COLORS[w.partOfSpeech] || 'neutral';
              return (
                <div
                  key={wid}
                  className="card animate-fade-in"
                  style={{ padding: '10px 12px', position: 'relative' }}
                >
                  <button
                    id={`swap-${wid}`}
                    onClick={() => handleSwap(w)}
                    title="Đổi từ khác"
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 5px',
                      cursor: 'pointer',
                      color: 'var(--error-text)',
                      fontSize: 10,
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}
                  >
                    <X size={10} />
                  </button>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', paddingRight: 20, marginBottom: 3 }}>
                    {w.word}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, lineHeight: 1.4 }}>
                    {w.meaningVi}
                  </div>
                  {w.partOfSpeech && (
                    <Badge type={posColor}>{w.partOfSpeech}</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start learning button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              id="start-chunking-btn"
              className="btn btn-primary"
              onClick={() => onStartLearning(selectedWords)}
              disabled={!canLearn}
              style={{ padding: '12px 32px', fontSize: 15, gap: 8 }}
            >
              <Sparkles size={16} />
              Học theo chunking ({selectedWords.length} từ)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Writing Exercise Card (inline, per exercise) ────────────────
function InlineExerciseCard({ exercise, index, chunk, onPass, onToast }) {
  const [userInput, setUserInput] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [passed, setPassed] = useState(false);

  const level = exercise.level || (index + 1);
  const lvCfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

  const handleGrade = async () => {
    if (!userInput.trim()) { onToast('error', 'Vui lòng nhập bản dịch trước.'); return; }
    const apiKey = getApiKey();
    if (!apiKey) { onToast('error', 'Chưa có API key. Vào Settings để nhập.'); return; }
    setGrading(true);
    try {
      const result = await gradeWriting(chunk, exercise.vietnameseSentence, userInput.trim(), apiKey);
      setGradingResult(result);
      const isPass = result.usedChunk && result.correct;
      if (isPass && !passed) {
        setPassed(true);
        onPass(level, result); // notify parent
      }
    } catch (err) {
      onToast('error', `Lỗi chấm bài: ${err.message}`);
    } finally {
      setGrading(false);
    }
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '16px 18px',
        borderColor: passed ? 'rgba(34,197,94,0.35)' : undefined,
        background: passed ? 'rgba(34,197,94,0.04)' : undefined,
      }}
    >
      {/* Level badge */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: lvCfg.bg, border: `1px solid ${lvCfg.border}`,
          borderRadius: 'var(--radius-full)', padding: '2px 10px',
          fontSize: 11, fontWeight: 700, color: `rgb(${lvCfg.color})`,
        }}>
          {'★'.repeat(level)} {exercise.levelLabel || lvCfg.label}
        </span>
        {passed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 600 }}>
            <CheckCircle size={13} /> Hoàn thành!
          </span>
        )}
      </div>

      {/* Vietnamese sentence */}
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 10 }}>
        {exercise.vietnameseSentence}
      </p>

      {/* Textarea */}
      <textarea
        id={`ex-input-${chunk.id}-${index}`}
        className="textarea-field"
        rows={2}
        placeholder="Viết bản dịch tiếng Anh…"
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
        disabled={grading || passed}
        style={{ resize: 'none', minHeight: 64, fontSize: 13, marginBottom: 8 }}
      />

      {/* Sample answer */}
      {showSample && exercise.sampleTranslation && (
        <div style={{
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ✅ Câu tham khảo
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
            "{exercise.sampleTranslation}"
          </p>
        </div>
      )}

      {/* AI grading result */}
      {gradingResult && (
        <div style={{
          background: gradingResult.usedChunk && gradingResult.correct
            ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${gradingResult.usedChunk && gradingResult.correct
            ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {gradingResult.usedChunk && gradingResult.correct
              ? <><CheckCircle size={14} color="var(--success-text)" /><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)' }}>Đúng chunk + nghĩa!</span></>
              : <><X size={14} color="var(--error-text)" /><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--error-text)' }}>{!gradingResult.usedChunk ? `Chưa dùng chunk "${chunk.phrase}"` : 'Nghĩa chưa khớp'}</span></>
            }
            <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 'auto', color: gradingResult.score >= 80 ? 'var(--success-text)' : gradingResult.score >= 50 ? '#f59e0b' : 'var(--error-text)' }}>
              {gradingResult.score}đ
            </span>
          </div>
          {gradingResult.overallFeedback && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {gradingResult.overallFeedback}
            </p>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {!passed && (
          <button
            id={`grade-btn-${chunk.id}-${index}`}
            className="btn btn-ghost btn-sm"
            onClick={handleGrade}
            disabled={grading || !userInput.trim()}
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            {grading
              ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Đang chấm…</>
              : <><Sparkles size={12} /> Chấm bài AI</>
            }
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => setShowSample(s => !s)}
          style={{
            background: showSample ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
            color: 'var(--accent-300)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          👁 {showSample ? 'Ẩn câu mẫu' : 'Xem câu mẫu'}
        </button>
      </div>
    </div>
  );
}

// ─── Single Word Session ──────────────────────────────────────────
function WordLearningCard({
  word, wordId, chunkStatus, exercises, onGenChunks, onMarkLearned,
  learnedVocab, onToast,
}) {
  const isLearned = !!learnedVocab[wordId];
  const [level2Passed, setLevel2Passed] = useState(false);
  const [localLearned, setLocalLearned] = useState(isLearned);

  // Track which exercises have been completed per level
  const handleExercisePass = useCallback((level) => {
    if (level === 2 && !localLearned) {
      setLevel2Passed(true);
      setLocalLearned(true);
      onMarkLearned(wordId, word.word, word.topic);
    }
  }, [level2Passed, localLearned, wordId, word, onMarkLearned]);

  const posColor = POS_COLORS[word.partOfSpeech] || 'neutral';

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderColor: localLearned ? 'rgba(34,197,94,0.3)' : undefined,
        background: localLearned ? 'rgba(34,197,94,0.04)' : undefined,
        transition: 'all 0.4s',
      }}
    >
      {/* Word header */}
      <div className="flex items-center gap-3 mb-4">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>{word.word}</span>
            {word.partOfSpeech && <Badge type={posColor}>{word.partOfSpeech}</Badge>}
            {localLearned && <Badge type="success">✓ Đã học</Badge>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{word.meaningVi}</p>
        </div>

        {/* Status / action */}
        {chunkStatus === 'generating' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
            <Spinner size={14} /> Đang sinh chunk…
          </div>
        ) : chunkStatus === 'error' ? (
          <button className="btn btn-ghost btn-sm" onClick={() => onGenChunks(word, wordId)}
            style={{ color: 'var(--error-text)', fontSize: 12 }}>
            <RotateCcw size={12} /> Thử lại
          </button>
        ) : chunkStatus === 'done' ? (
          <Badge type="success">✓ {exercises.length} chunk</Badge>
        ) : null}
      </div>

      {/* Exercises per chunk */}
      {chunkStatus === 'done' && exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercises.map((chunk, ci) => (
            <div key={chunk.id}>
              {/* Chunk phrase */}
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--accent-300)',
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                }}>{chunk.phrase}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{chunk.meaningVi}</span>
              </div>
              {/* Writing exercises for this chunk */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 8 }}>
                {chunk.exercises.map((ex, ei) => (
                  <InlineExerciseCard
                    key={ex.id || ei}
                    exercise={ex}
                    index={ei}
                    chunk={chunk}
                    onPass={handleExercisePass}
                    onToast={onToast}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {chunkStatus === 'done' && localLearned && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--success-text)', fontWeight: 600,
        }}>
          <CheckCircle size={15} />
          Từ này đã được đánh dấu hoàn thành! Tiếp tục các từ bên dưới.
        </div>
      )}
    </div>
  );
}

// ─── Screen 3: Learning Session ───────────────────────────────────
function LearningSession({ topic, selectedWords, learnedVocab, onMarkLearned, onBack, onToast }) {
  // chunkStatus per wordId: 'pending' | 'generating' | 'done' | 'error'
  const [chunkStatuses, setChunkStatuses] = useState(() =>
    Object.fromEntries(selectedWords.map(w => [makeWordId(w.word, w.topic), 'pending']))
  );
  // exerciseData: { [wordId]: Array<{ ...chunk, exercises: [] }> }
  const [exerciseData, setExerciseData] = useState({});

  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ done: 0, total: selectedWords.length });
  // Dùng sessionId để cancel generation an toàn (tránh abortRef bị set sai khi component hide/show)
  const sessionIdRef = useRef(0);

  // Auto-generate chunks for all words on mount (chỉ chạy 1 lần)
  useEffect(() => {
    const sid = ++sessionIdRef.current;
    generateAll(sid);
    // Không cần cleanup abort vì component không unmount (luôn mounted, ẩn bằng CSS)
  }, []); // eslint-disable-line

  const generateAll = async (sid) => {
    const apiKey = getApiKey();
    if (!apiKey) { onToast('error', 'Chưa có API key. Vào Settings để nhập.'); return; }

    setGenerating(true);
    setGenProgress({ done: 0, total: selectedWords.length });

    for (let i = 0; i < selectedWords.length; i++) {
      // Nếu có session mới hơn (user bấm Start lại) thì dừng session này
      if (sessionIdRef.current !== sid) break;
      const word = selectedWords[i];
      const wordId = makeWordId(word.word, word.topic);

      setChunkStatuses(s => ({ ...s, [wordId]: 'generating' }));
      try {
        // 1. Generate chunks
        const result = await generateChunksFromWord(word.word, word.meaningVi, word.topic, word.partOfSpeech, apiKey);
        const rawChunks = result.chunks || [];
        if (rawChunks.length === 0) throw new Error('Không có chunk');

        const ts = Date.now();
        const chunks = rawChunks.map((c, ci) => ({
          ...c,
          id: `chunk_vocab_${wordId}_${ci}_${ts}`,
          sourceType: 'vocab', sourceWordId: wordId, sourceWord: word.word, topic: word.topic,
          groupId: `vocab_${wordId}`, groupName: word.word,
          transcriptId: null,
        }));

        // Save chunks to storage
        saveVocabChunks(wordId, word.word, word.topic, chunks);

        // 2. Generate writing exercises for each chunk
        const chunksWithExercises = [];
        for (const chunk of chunks) {
          if (sessionIdRef.current !== sid) break;
          try {
            const exResult = await generateWritingExercises(chunk, apiKey, { mode: 'situation' });
            const exercises = (exResult.exercises || []).map((ex, ei) => ({
              ...ex, id: ex.id || `ex_${chunk.id}_${ei}`, chunkId: chunk.id,
            }));
            saveSituations(chunk.id, exercises);
            chunksWithExercises.push({ ...chunk, exercises });
          } catch {
            chunksWithExercises.push({ ...chunk, exercises: [] });
          }
        }

        setExerciseData(d => ({ ...d, [wordId]: chunksWithExercises }));
        setChunkStatuses(s => ({ ...s, [wordId]: 'done' }));
      } catch (err) {
        console.error(`Failed for "${word.word}":`, err);
        setChunkStatuses(s => ({ ...s, [wordId]: 'error' }));
      }

      setGenProgress(p => ({ done: p.done + 1, total: p.total }));
    }

    setGenerating(false);
  };

  // Retry single word
  const handleRetryWord = async (word, wordId) => {
    const apiKey = getApiKey();
    if (!apiKey) { onToast('error', 'Chưa có API key.'); return; }
    setChunkStatuses(s => ({ ...s, [wordId]: 'generating' }));
    try {
      const result = await generateChunksFromWord(word.word, word.meaningVi, word.topic, word.partOfSpeech, apiKey);
      const rawChunks = result.chunks || [];
      const ts = Date.now();
      const chunks = rawChunks.map((c, ci) => ({
        ...c, id: `chunk_vocab_${wordId}_${ci}_${ts}`,
        sourceType: 'vocab', sourceWordId: wordId, sourceWord: word.word, topic: word.topic,
        groupId: `vocab_${wordId}`, groupName: word.word, transcriptId: null,
      }));
      saveVocabChunks(wordId, word.word, word.topic, chunks);

      const chunksWithExercises = [];
      for (const chunk of chunks) {
        try {
          const exResult = await generateWritingExercises(chunk, apiKey, { mode: 'situation' });
          const exercises = (exResult.exercises || []).map((ex, ei) => ({
            ...ex, id: ex.id || `ex_${chunk.id}_${ei}`, chunkId: chunk.id,
          }));
          saveSituations(chunk.id, exercises);
          chunksWithExercises.push({ ...chunk, exercises });
        } catch {
          chunksWithExercises.push({ ...chunk, exercises: [] });
        }
      }
      setExerciseData(d => ({ ...d, [wordId]: chunksWithExercises }));
      setChunkStatuses(s => ({ ...s, [wordId]: 'done' }));
    } catch {
      setChunkStatuses(s => ({ ...s, [wordId]: 'error' }));
    }
  };

  const doneCount = Object.values(chunkStatuses).filter(s => s === 'done').length;
  const learnedToday = selectedWords.filter(w => learnedVocab[makeWordId(w.word, w.topic)]).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button id="back-to-selector" className="btn btn-ghost btn-sm" onClick={onBack}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={14} /> Chọn từ
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', flex: 1 }}>
          Học từ vựng – {topic}
        </div>
        <Badge type="success">{learnedToday}/{selectedWords.length} đã học</Badge>
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="card mb-4" style={{
          background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)',
          padding: '12px 16px',
        }}>
          <div className="flex items-center gap-3 mb-2">
            <Spinner size={14} />
            <span style={{ fontSize: 13, color: 'var(--accent-300)', fontWeight: 600 }}>
              Đang sinh chunk và bài luyện…
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {genProgress.done}/{genProgress.total} từ
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-base)', borderRadius: 99 }}>
            <div style={{
              height: '100%',
              width: `${genProgress.total > 0 ? (genProgress.done / genProgress.total) * 100 : 0}%`,
              background: 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* All words */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedWords.map((word) => {
          const wordId = makeWordId(word.word, word.topic);
          return (
            <WordLearningCard
              key={wordId}
              word={word}
              wordId={wordId}
              chunkStatus={chunkStatuses[wordId] || 'pending'}
              exercises={exerciseData[wordId] || []}
              onGenChunks={handleRetryWord}
              onMarkLearned={onMarkLearned}
              learnedVocab={learnedVocab}
              onToast={onToast}
            />
          );
        })}
      </div>

      {/* Completion banner */}
      {!generating && learnedToday === selectedWords.length && selectedWords.length > 0 && (
        <div className="card mt-6 animate-fade-in" style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))',
          borderColor: 'rgba(34,197,94,0.3)', textAlign: 'center', padding: '28px 24px',
        }}>
          <Trophy size={36} color="var(--success-text)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success-text)', marginBottom: 6 }}>
            Tuyệt vời! Hoàn thành {selectedWords.length} từ! 🎉
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Các từ đã được lưu vào danh sách đã học. Ngày mai bạn sẽ thấy từ mới.
          </p>
          <button className="btn btn-primary mt-4" onClick={onBack}
            style={{ margin: '16px auto 0' }}>
            <BookMarked size={15} /> Chọn thêm từ khác
          </button>
        </div>
      )}
    </div>
  );
}

// ─── VocabModule (main export) ────────────────────────────────────
export function VocabModule({ onToast }) {
  // Parse vocab from static JSON
  const words = useMemo(() => VOCAB_RAW.map(w => ({
    ...w,
    id: makeWordId(w.word, w.topic),
  })), []);

  const [screen, setScreen] = useState('topics'); // 'topics' | 'selector' | 'learning'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [wordsToLearn, setWordsToLearn] = useState([]);
  const [learnedVocab, setLearnedVocab] = useState(() => getLearnedVocab());

  const handleSelectTopic = useCallback((topic) => {
    setSelectedTopic(topic);
    setScreen('selector');
  }, []);

  const handleStartLearning = useCallback((words) => {
    setWordsToLearn(words);
    // Save today's session
    saveTodaySession(words.map(w => makeWordId(w.word, w.topic)));
    setScreen('learning');
  }, []);

  const handleMarkLearned = useCallback((wordId, word, topic) => {
    markVocabLearned(wordId, word, topic);
    setLearnedVocab(getLearnedVocab()); // refresh state
    onToast('success', `✓ "${word}" đã được đánh dấu hoàn thành!`);
  }, [onToast]);

  const topicWords = useMemo(() =>
    selectedTopic ? words.filter(w => w.topic === selectedTopic) : [],
    [words, selectedTopic]
  );

  return (
    <div>
      {screen === 'topics' && (
        <TopicBrowser
          words={words}
          learnedVocab={learnedVocab}
          onSelectTopic={handleSelectTopic}
        />
      )}
      {screen === 'selector' && (
        <WordSelector
          topic={selectedTopic}
          words={topicWords}
          learnedVocab={learnedVocab}
          onStartLearning={handleStartLearning}
          onBack={() => setScreen('topics')}
        />
      )}
      {screen === 'learning' && (
        <LearningSession
          topic={selectedTopic}
          selectedWords={wordsToLearn}
          learnedVocab={learnedVocab}
          onMarkLearned={handleMarkLearned}
          onBack={() => setScreen('selector')}
          onToast={onToast}
        />
      )}
    </div>
  );
}
