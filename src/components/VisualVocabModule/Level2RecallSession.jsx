import { useState, useEffect, useCallback } from 'react';
import { Trophy, Eye } from 'lucide-react';
import { DotMaskInput } from '../common/DotMaskInput';
import { recordVisualRecallSuccess } from '../../store/storage';

/**
 * Level2RecallSession Component
 * Active recall test for items in a zone.
 * - No labels or hints on hotspots.
 * - Direct dot-mask typing (lowercase, 100% exact match).
 * - Skip triggers 3-second Quick Peek then re-queues word at the end.
 * - Success on all items writes progress to toeic_progress & SM-2.
 */
export function Level2RecallSession({
  zone,
  topic = 'Business & Work',
  onCompleteZone,
  onCancel,
}) {
  // Queue of items to recall in this zone
  const [queue, setQueue] = useState(() => [...zone.items]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Quick peek modal / banner when user forgot/skipped
  const [quickPeekItem, setQuickPeekItem] = useState(null);
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);

  // Set of successfully completed item IDs in this session
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [firstAttemptErrors, setFirstAttemptErrors] = useState(() => new Set());

  const currentItem = queue[currentIndex] || null;
  const isFinished = currentIndex >= queue.length;

  // Pronounce audio
  const playAudio = useCallback((text) => {
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, []);

  // Handle typing success (100% match)
  const handleItemSuccess = useCallback(() => {
    if (!currentItem) return;

    setIsSuccessFlash(true);
    playAudio(currentItem.word);

    // Record SRS and learned status: if user skipped/peeked earlier, score is 60 (grade 3), else 95 (grade 5)
    const itemId = currentItem.vocabId || currentItem.id;
    const wasQuickPeeked = firstAttemptErrors.has(itemId) || firstAttemptErrors.has(currentItem.id);
    const score = wasQuickPeeked ? 60 : 95;

    recordVisualRecallSuccess(
      itemId,
      currentItem.term || currentItem.word,
      topic,
      currentItem.collocation || null,
      score
    );

    setCompletedIds(prev => new Set(prev).add(itemId));

    setTimeout(() => {
      setIsSuccessFlash(false);
      setCurrentIndex(i => i + 1);
    }, 600);
  }, [currentItem, topic, playAudio, firstAttemptErrors]);

  // Handle Skip / Forgot: Show quick peek for 3s, then re-queue at end
  const handleSkip = useCallback(() => {
    if (!currentItem) return;

    const itemId = currentItem.vocabId || currentItem.id;
    setFirstAttemptErrors(prev => new Set(prev).add(itemId));
    setQuickPeekItem(currentItem);
    playAudio(currentItem.word);

    // Re-queue item at the end of queue
    setQueue(prev => [...prev, currentItem]);

    // Close peek after 3 seconds and advance
    setTimeout(() => {
      setQuickPeekItem(null);
      setCurrentIndex(i => i + 1);
    }, 3200);
  }, [currentItem, playAudio]);

  // Trigger onCompleteZone when queue finished
  useEffect(() => {
    if (isFinished && queue.length > 0) {
      onCompleteZone(zone.zoneId);
    }
  }, [isFinished, queue.length, onCompleteZone, zone.zoneId]);

  if (isFinished) {
    return (
      <div
        className="p-4 rounded-xl text-center animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(15,23,42,0.95))',
          border: '1.5px solid #14b8a6',
          boxShadow: '0 8px 24px rgba(20,184,166,0.25)',
          marginTop: 12,
        }}
      >
        <Trophy size={36} color="#2dd4bf" className="mx-auto mb-2" />
        <h4 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>
          Tuyệt vời! Đã vượt qua Level 2 khu vực "{zone.label}"
        </h4>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}>
          Tất cả {zone.items.length} từ/cụm từ đã được lưu vào Spaced Repetition (SM-2) để ôn tập định kỳ!
        </p>
      </div>
    );
  }

  return (
    <div
      className="level2-recall-container animate-fade-in"
      style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        backdropFilter: 'blur(12px)',
        border: isSuccessFlash
          ? '1.5px solid #22c55e'
          : '1.5px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: isSuccessFlash
          ? '0 0 24px rgba(34, 197, 94, 0.3)'
          : '0 12px 32px rgba(0,0,0,0.6)',
        marginTop: 12,
        position: 'relative',
        zIndex: 50,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Quick Peek Overlay Banner (3 seconds) */}
      {quickPeekItem && (
        <div
          className="quick-peek-banner flex items-center justify-between gap-3 p-3 rounded-lg mb-3 animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
          }}
        >
          <div className="flex items-center gap-2">
            <Eye size={16} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                {quickPeekItem.word}
              </span>
              <span style={{ fontSize: 12, marginLeft: 8, color: '#fca5a5' }}>
                ({quickPeekItem.meaningVi})
              </span>
            </div>
          </div>
          <span style={{ fontSize: 11, fontStyle: 'italic', color: '#cbd5e1' }}>
            Đã xếp ôn lại cuối phiên...
          </span>
        </div>
      )}

      {/* Header Info: Progress & Target Type */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 9px',
              borderRadius: 99,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            Level 2 — Active Recall
          </span>

          <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
            Từ {Math.min(currentIndex + 1, queue.length)} / {queue.length}
          </span>
        </div>

        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
          {currentItem?.visualType === 'action'
            ? '⚡ Nhập cụm hành động (Collocation)'
            : '🎯 Nhập tên vật thể'}
        </span>
      </div>

      {/* Meaning Hint (without showing English word) */}
      <div className="mb-3">
        <p style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Vật thể/hành động đang chọn:{' '}
          <span style={{ color: '#38bdf8' }}>"{currentItem?.meaningVi}"</span>
        </p>
        {currentItem?.collocation && currentItem.visualType === 'action' && (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            Gợi ý ngữ cảnh: Cụm từ đi liền với vật thể liên quan
          </p>
        )}
      </div>

      {/* Reusable DotMaskInput */}
      {currentItem && (
        <DotMaskInput
          targetWord={currentItem.word}
          onSuccess={handleItemSuccess}
          onSkip={handleSkip}
          placeholderHelp="Gõ đúng 100% chữ cái tiếng Anh..."
        />
      )}
    </div>
  );
}
