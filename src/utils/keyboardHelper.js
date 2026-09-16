/**
 * keyboardHelper.js
 * Solves Vietnamese Mobile Virtual Keyboard (Gboard, Laban Key, iOS) typing issues:
 * 1. Decomposes Vietnamese Telex diacritics back to the exact Latin keys tapped (e.g. ré -> res, cả -> car, stà -> staf).
 * 2. Strips all diacritics so English spelling verification is 100% accurate.
 * 3. Handles multi-word spaces gracefully without input buffer desynchronization.
 */

// Mapping of Vietnamese Telex composite characters to raw English Latin keystrokes
const TELEX_MAP = {
  // a combinations (s, f, r, x, j, w, a)
  'á': 'as', 'à': 'af', 'ả': 'ar', 'ã': 'ax', 'ạ': 'aj',
  'ắ': 'aws', 'ằ': 'awf', 'ẳ': 'awr', 'ẵ': 'awx', 'ặ': 'awj', 'ă': 'aw',
  'ấ': 'aas', 'ầ': 'aaf', 'ẩ': 'aar', 'ẫ': 'aax', 'ậ': 'aaj', 'â': 'aa',

  // e combinations (s, f, r, x, j, e)
  'é': 'es', 'è': 'ef', 'ẻ': 'er', 'ẽ': 'ex', 'ẹ': 'ej',
  'ế': 'ees', 'ề': 'eef', 'ể': 'eer', 'ễ': 'eex', 'ệ': 'eej', 'ê': 'ee',

  // i combinations
  'í': 'is', 'ì': 'if', 'ỉ': 'ir', 'ĩ': 'ix', 'ị': 'ij',

  // o combinations (s, f, r, x, j, w, o)
  'ó': 'os', 'ò': 'of', 'ỏ': 'or', 'õ': 'ox', 'ọ': 'oj',
  'ố': 'oos', 'ồ': 'oof', 'ổ': 'oor', 'ỗ': 'oox', 'ộ': 'ooj', 'ô': 'oo',
  'ớ': 'ows', 'ờ': 'owf', 'ở': 'owr', 'ỡ': 'owx', 'ợ': 'owj', 'ơ': 'ow',

  // u combinations (s, f, r, x, j, w)
  'ú': 'us', 'ù': 'uf', 'ủ': 'ur', 'ũ': 'ux', 'ụ': 'uj',
  'ứ': 'uws', 'ừ': 'uwf', 'ử': 'uwr', 'ữ': 'uwx', 'ự': 'uwj', 'ư': 'uw',

  // y combinations
  'ý': 'ys', 'ỳ': 'yf', 'ỷ': 'yr', 'ỹ': 'yx', 'ỵ': 'yj',

  // d (dd)
  'đ': 'dd', 'Đ': 'Dd',
};

/**
 * Normalizes user typing from mobile keyboards:
 * - Decomposes any Vietnamese Telex compound glyphs back to Latin keystrokes.
 * - Strips any remaining Unicode accents.
 * - Converts to lowercase.
 * - Normalizes consecutive whitespace to a single space.
 */
export function normalizeTypingInput(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();

  // 1. Replace Telex composite characters
  let decomposed = '';
  for (const char of s) {
    decomposed += TELEX_MAP[char] !== undefined ? TELEX_MAP[char] : char;
  }

  // 2. Strip Unicode diacritics
  const clean = decomposed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');

  // 3. Normalize multiple spaces to single space
  return clean.replace(/\s+/g, ' ');
}

/**
 * Aligns typed input with target letters spacing and hyphen positions.
 * Ensures the user can type seamlessly with or without manual spaces.
 */
export function alignToTargetSpacing(inputStr, targetLetters) {
  if (!inputStr || !targetLetters || targetLetters.length === 0) return inputStr || '';

  const cleanChars = inputStr.split('');
  let aligned = '';
  let inputIdx = 0;

  for (let targetIdx = 0; targetIdx < targetLetters.length && inputIdx < cleanChars.length; targetIdx++) {
    const targetChar = targetLetters[targetIdx];
    const typedChar = cleanChars[inputIdx];

    if (targetChar === ' ' || targetChar === '-') {
      if (typedChar === targetChar) {
        aligned += targetChar;
        inputIdx++;
      } else {
        // Auto-skip over space/hyphen gap
        aligned += targetChar;
      }
    } else {
      if (typedChar === ' ' || typedChar === '-') {
        // User typed space when none expected, skip over it
        inputIdx++;
        if (inputIdx < cleanChars.length) {
          aligned += cleanChars[inputIdx];
          inputIdx++;
        }
      } else {
        aligned += typedChar;
        inputIdx++;
      }
    }
  }

  return aligned;
}

/**
 * Compares typed input with target word:
 * Supports exact match OR match without spaces/hyphens.
 */
export function isSpellingMatch(typedInput, targetWord) {
  if (!typedInput || !targetWord) return false;

  const cleanTyped = normalizeTypingInput(typedInput).trim();
  const cleanTarget = normalizeTypingInput(targetWord).trim();

  if (cleanTyped === cleanTarget) return true;

  // Also match ignoring spaces and hyphens
  const strippedTyped = cleanTyped.replace(/[\s-]/g, '');
  const strippedTarget = cleanTarget.replace(/[\s-]/g, '');

  return strippedTyped === strippedTarget && strippedTyped.length > 0;
}

/**
 * Resolves input string from mobile virtual keyboards, specifically fixing:
 * 1. Caret-at-0 prepending bug: On mobile (iOS/Android), controlled inputs often reset caret
 *    to position 0, causing newly typed letters to be inserted in front of existing text
 *    (e.g., user typed "t", then types "e" -> browser produces "et" instead of "te").
 * 2. Vietnamese Telex diacritic decomposition back to Latin keystrokes.
 * 3. Inverted Backspace: Deleting at position 0 instead of the end.
 * 4. Aligning spaces and hyphens with targetLetters.
 *
 * @param {string} newVal - The raw value from onChange (e.target.value)
 * @param {string} prevVal - The previously resolved/typed value
 * @param {string[]} targetLetters - Target letters array (optional, for spacing alignment)
 * @returns {string} - The corrected, normalized, aligned string
 */
export function resolveTypingInput(newVal, prevVal = '', targetLetters = []) {
  if (!newVal) return '';

  // 1. Decompose Vietnamese Telex and strip diacritics
  const normNew = normalizeTypingInput(newVal);
  const normPrev = normalizeTypingInput(prevVal || '');

  let resolved = normNew;

  const trimmedNew = normNew.trimEnd();
  const trimmedPrev = normPrev.trimEnd();

  // 2. Mobile caret-at-0 prepend detection (Length grew)
  if (trimmedPrev.length > 0 && trimmedNew.length > trimmedPrev.length) {
    const diff = trimmedNew.length - trimmedPrev.length;

    // Check if new characters were prepended at index 0:
    // e.g. normPrev = "t", normNew = "et" -> endsWith("t") is true!
    // Or normPrev = "te", normNew = "ate" -> endsWith("te") is true!
    if (trimmedNew.endsWith(trimmedPrev)) {
      const prepended = trimmedNew.slice(0, diff);
      resolved = trimmedPrev + prepended;
    } else if (trimmedNew.startsWith(trimmedPrev)) {
      // Normal forward typing at end: normPrev = "t", normNew = "te"
      resolved = normNew;
    } else {
      // Fallback: check without trailing punctuation
      const cleanPrev = trimmedPrev.replace(/[\s-]+$/, '');
      if (cleanPrev.length > 0 && trimmedNew.endsWith(cleanPrev)) {
        const prepended = trimmedNew.slice(0, trimmedNew.length - cleanPrev.length);
        resolved = trimmedPrev + prepended;
      } else {
        resolved = normNew;
      }
    }
  } else if (trimmedPrev.length > 0 && trimmedNew.length < trimmedPrev.length) {
    // 3. Backspace / deletion detection
    const diff = trimmedPrev.length - trimmedNew.length;
    // If caret was at 0, backspace deleted from the FRONT instead of the END
    // e.g. trimmedPrev = "te", user pressed backspace -> browser produced "e" (deleted "t" at 0)
    // trimmedPrev.slice(diff) === "e" === trimmedNew -> Front was deleted!
    if (trimmedPrev.length > diff && trimmedPrev.slice(diff) === trimmedNew) {
      // Recover user intent: delete the last character(s)
      resolved = trimmedPrev.slice(0, trimmedPrev.length - diff);
    } else {
      resolved = normNew;
    }
  }

  // 4. Align spacing and hyphens if targetLetters is provided
  if (targetLetters && targetLetters.length > 0) {
    const aligned = alignToTargetSpacing(resolved, targetLetters);
    return aligned.slice(0, targetLetters.length);
  }

  return resolved;
}
