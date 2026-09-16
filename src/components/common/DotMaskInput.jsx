import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Lightbulb, HelpCircle, ArrowRight } from 'lucide-react';
import { normalizeTypingInput, alignToTargetSpacing, isSpellingMatch, resolveTypingInput } from '../../utils/keyboardHelper';

/**
 * Strip accents / diacritics (e.g., résumé -> resume)
 */
export function stripAccents(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * DotMaskInput Component
 * Renders letters as interactive dot slots.
 * User types directly; correct letters turn green, wrong turn red.
 * All letters in lowercase. Spaces/hyphens auto-filled.
 */
export function DotMaskInput({
  targetWord = '',
  onSuccess,
  onSkip,
  disabled = false,
  autoFocus = true,
  placeholderHelp = 'Gõ trực tiếp các chữ cái để điền từ...',
  showHint = true,
  showSkip = true,
}) {
  const [typedInput, setTypedInput] = useState('');
  const [isShake, setIsShake] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const inputRef = useRef(null);
  const typedInputRef = useRef('');

  // Keep ref synchronized with state
  useEffect(() => {
    typedInputRef.current = typedInput;
  }, [typedInput]);

  // Ensure DOM caret is pinned to the end
  const ensureCaretAtEnd = useCallback(() => {
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      try {
        inputRef.current.setSelectionRange(len, len);
      } catch (_) {}
    }
  }, []);

  // Synchronously lock caret to the end of input after every render of typedInput
  useLayoutEffect(() => {
    if (!disabled && !isPassed) {
      ensureCaretAtEnd();
    }
  }, [typedInput, disabled, isPassed, ensureCaretAtEnd]);

  const cleanTarget = useMemo(() => {
    return stripAccents(targetWord.trim()).toLowerCase();
  }, [targetWord]);

  const targetLetters = useMemo(() => {
    return cleanTarget.split('');
  }, [cleanTarget]);

  // Reset when target word changes
  useEffect(() => {
    typedInputRef.current = '';
    setTypedInput('');
    setIsShake(false);
    setIsPassed(false);
    if (autoFocus) {
      const t = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          ensureCaretAtEnd();
        }
      }, 80);
      return () => clearTimeout(t);
    }
  }, [targetWord, autoFocus, ensureCaretAtEnd]);

  // Handle typing changes
  const handleInputChange = useCallback((newVal) => {
    if (isPassed || disabled) return;

    const prevVal = typedInputRef.current;
    // Resolve mobile caret inversion, Telex decomposition, backspace, and spacing
    const resolved = resolveTypingInput(newVal, prevVal, targetLetters);

    typedInputRef.current = resolved;
    setTypedInput(resolved);

    // Keep DOM caret at the end
    if (inputRef.current) {
      const len = resolved.length;
      try {
        inputRef.current.setSelectionRange(len, len);
      } catch (_) {}
    }

    // Verify match
    if (isSpellingMatch(resolved, targetWord)) {
      setIsPassed(true);
      if (onSuccess) onSuccess();
    } else if (resolved.length === targetLetters.length) {
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
    }
  }, [targetLetters, targetWord, isPassed, disabled, onSuccess]);

  // Hint button: reveal next correct character
  const handleHint = useCallback(() => {
    if (isPassed || disabled) return;
    let base = typedInputRef.current;

    // Strip trailing mismatches
    while (base.length > 0) {
      const idx = base.length - 1;
      const typed = stripAccents(base[idx]).toLowerCase();
      const target = stripAccents(targetLetters[idx] || '').toLowerCase();
      if (typed === target) break;
      base = base.slice(0, -1);
    }

    if (base.length < targetLetters.length) {
      const nextChar = targetLetters[base.length];
      const updated = base + nextChar;
      handleInputChange(updated);
      inputRef.current?.focus();
      ensureCaretAtEnd();
    }
  }, [targetLetters, isPassed, disabled, handleInputChange, ensureCaretAtEnd]);

  // Focus keeper
  const handleSlotAreaClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      ensureCaretAtEnd();
    }
  };

  return (
    <div className="dot-mask-input-container" style={{ width: '100%', position: 'relative' }}>
      {/* Hidden input field capturing keystrokes directly with full overlay */}
      <input
        ref={inputRef}
        type="text"
        lang="en-US"
        dir="ltr"
        inputMode="text"
        value={typedInput}
        onChange={(e) => handleInputChange(e.target.value)}
        onSelect={(e) => {
          const len = e.currentTarget.value.length;
          if (e.currentTarget.selectionStart !== len || e.currentTarget.selectionEnd !== len) {
            try {
              e.currentTarget.setSelectionRange(len, len);
            } catch (_) {}
          }
        }}
        onClick={ensureCaretAtEnd}
        onTouchEnd={() => {
          if (inputRef.current) {
            inputRef.current.focus();
            ensureCaretAtEnd();
          }
        }}
        onFocus={ensureCaretAtEnd}
        disabled={disabled || isPassed}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'text',
          zIndex: 5,
          fontSize: '16px', // Prevents iOS auto-zoom
          background: 'transparent',
          border: 'none',
          color: 'transparent',
          textAlign: 'left',
          direction: 'ltr',
          caretColor: 'transparent',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        aria-label="Nhập từ vựng tiếng Anh"
      />

      {/* Interactive letter slot display */}
      <div
        onClick={handleSlotAreaClick}
        onTouchEnd={handleSlotAreaClick}
        tabIndex={0}
        onFocus={() => {
          inputRef.current?.focus();
          ensureCaretAtEnd();
        }}
        className={`dot-mask-slots flex items-center justify-center flex-wrap gap-1.5 cursor-pointer ${
          isShake ? 'flashcard-shake' : ''
        }`}
        style={{
          minHeight: 52,
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.65)',
          borderRadius: 12,
          border: isPassed
            ? '1.5px solid #22c55e'
            : isShake
            ? '1.5px solid #ef4444'
            : '1.5px solid rgba(148, 163, 184, 0.25)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isPassed
            ? '0 0 16px rgba(34, 197, 94, 0.25)'
            : 'inset 0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        {targetLetters.map((expectedChar, idx) => {
          const isSeparator = expectedChar === ' ' || expectedChar === '-';
          const typedChar = typedInput[idx] || '';
          const isFilled = idx < typedInput.length;
          const isMatch = isFilled && stripAccents(typedChar).toLowerCase() === stripAccents(expectedChar).toLowerCase();

          if (isSeparator) {
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: expectedChar === ' ' ? 16 : 14,
                  fontSize: 16,
                  color: 'var(--text-muted, #94a3b8)',
                  userSelect: 'none',
                }}
              >
                {expectedChar === '-' ? '-' : ''}
              </span>
            );
          }

          return (
            <div
              key={idx}
              className={`flashcard-letter-slot ${
                isFilled
                  ? isMatch
                    ? 'slot-correct'
                    : 'slot-wrong'
                  : idx === typedInput.length
                  ? 'slot-current-focus'
                  : 'slot-empty'
              }`}
              style={{
                width: 34,
                height: 42,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                textTransform: 'lowercase',
                userSelect: 'none',
                transition: 'all 0.15s ease',
                background: isFilled
                  ? isMatch
                    ? 'rgba(34, 197, 94, 0.18)'
                    : 'rgba(239, 68, 68, 0.18)'
                  : idx === typedInput.length
                  ? 'rgba(56, 189, 248, 0.12)'
                  : 'rgba(30, 41, 59, 0.8)',
                color: isFilled
                  ? isMatch
                    ? '#4ade80'
                    : '#f87171'
                  : '#64748b',
                border: isFilled
                  ? isMatch
                    ? '1.5px solid #22c55e'
                    : '1.5px solid #ef4444'
                  : idx === typedInput.length
                  ? '1.5px solid #38bdf8'
                  : '1.5px solid rgba(100, 116, 139, 0.3)',
                boxShadow: idx === typedInput.length ? '0 0 8px rgba(56, 189, 248, 0.3)' : 'none',
              }}
            >
              {isFilled ? (
                isMatch ? expectedChar.toLowerCase() : typedChar.toLowerCase()
              ) : (
                <span style={{ fontSize: 20, lineHeight: 0, opacity: 0.45 }}>•</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action controls below the slot */}
      <div className="flex items-center justify-between mt-2.5 px-1" style={{ fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
          {placeholderHelp}
        </span>

        <div className="flex items-center gap-2">
          {showHint && !isPassed && (
            <button
              type="button"
              onClick={handleHint}
              className="btn btn-ghost btn-xs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 12,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                borderRadius: 6,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                cursor: 'pointer',
              }}
              title="Mở 1 ký tự gợi ý"
            >
              <Lightbulb size={13} /> Gợi ý
            </button>
          )}

          {showSkip && !isPassed && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="btn btn-ghost btn-xs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 12,
                color: '#94a3b8',
                background: 'rgba(148, 163, 184, 0.1)',
                borderRadius: 6,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                cursor: 'pointer',
              }}
              title="Quên từ: Xem đáp án 3s & xếp ôn lại cuối phiên"
            >
              <HelpCircle size={13} /> Tôi quên rồi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
