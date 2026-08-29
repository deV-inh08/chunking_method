// ─── Check browser support ────────────────────────────────────
export function isSpeechSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// ─── Create recognition instance ─────────────────────────────
function createRecognition(lang = 'en-US') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;
  return recognition;
}

// ─── Start recognition ────────────────────────────────────────
let activeRecognition = null;

export function startRecognition({ onInterim, onFinal, onError, lang = 'en-US' }) {
  stopRecognition();

  const recognition = createRecognition(lang);
  if (!recognition) {
    onError?.('Web Speech API không được hỗ trợ trên trình duyệt này.');
    return;
  }

  activeRecognition = recognition;

  recognition.onresult = (event) => {
    let interim = '';
    let final   = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    if (interim) onInterim?.(interim);
    if (final)   onFinal?.(final.trim());
  };

  recognition.onerror = (event) => {
    const messages = {
      'not-allowed':    'Không có quyền truy cập microphone. Vui lòng cấp quyền trong trình duyệt.',
      'no-speech':      'Không nghe thấy giọng nói. Vui lòng thử lại.',
      'network':        'Lỗi mạng. Vui lòng kiểm tra kết nối.',
      'audio-capture':  'Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.',
      'aborted':        null, // user-initiated, ignore
    };
    const msg = messages[event.error];
    if (msg) onError?.(msg);
  };

  recognition.onend = () => {
    activeRecognition = null;
  };

  recognition.start();
  return recognition;
}

export function stopRecognition() {
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch {}
    activeRecognition = null;
  }
}

// ─── Match chunk in transcript ────────────────────────────────
export function matchChunk(spokenText, chunkPhrase) {
  if (!spokenText || !chunkPhrase) return false;

  const normalize = (str) =>
    str.toLowerCase()
       .replace(/[^\w\s]/g, '')  // remove punctuation
       .replace(/\s+/g, ' ')
       .trim();

  const spoken    = normalize(spokenText);
  const phrase    = normalize(chunkPhrase);
  const words     = phrase.split(' ');

  // Exact match
  if (spoken.includes(phrase)) return true;

  // Partial match: at least 70% of words present in sequence
  const threshold = Math.ceil(words.length * 0.7);
  let matchedWords = 0;
  let lastIdx = -1;

  for (const word of words) {
    const idx = spoken.indexOf(word, lastIdx + 1);
    if (idx > lastIdx) {
      matchedWords++;
      lastIdx = idx;
    }
  }

  return matchedWords >= threshold;
}

// ─── Highlight matched chunk in spoken text ───────────────────
export function highlightChunk(spokenText, chunkPhrase) {
  if (!spokenText || !chunkPhrase) return spokenText;

  const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedPhrase = normalize(chunkPhrase);
  const normalizedSpoken = normalize(spokenText);

  const startIdx = normalizedSpoken.indexOf(normalizedPhrase);
  if (startIdx === -1) return spokenText;

  // Map normalized index back to original text (approximate)
  return spokenText; // fallback: return as-is; highlighting done at component level
}
