import { wordToArpabet } from '@ingglish/g2p';
import { arpabetToIPARaw } from '@ingglish/ipa';

const CACHE_KEY = 'toeic_ipa_cache';

// Common words dictionary / natural pronunciation overrides
const COMMON_WORD_OVERRIDES = {
  // Function words & prepositions
  'the': 'ðə',
  'to': 'tu',
  'of': 'əv',
  'a': 'ə',
  'an': 'ən',
  'in': 'ɪn',
  'on': 'ɑn',
  'at': 'æt',
  'by': 'baɪ',
  'for': 'fɔr',
  'from': 'frʌm',
  'with': 'wɪð',
  'about': 'əˈbaʊt',
  'into': 'ˈɪntu',
  'over': 'ˈoʊvər',
  'after': 'ˈæftər',
  'before': 'bɪˈfɔr',
  'between': 'bɪˈtwin',
  'under': 'ˈʌndər',
  'through': 'θru',

  // Pronouns
  'i': 'aɪ',
  'me': 'mi',
  'my': 'maɪ',
  'we': 'wi',
  'us': 'ʌs',
  'our': 'aʊər',
  'you': 'ju',
  'your': 'jʊr',
  'he': 'hi',
  'him': 'hɪm',
  'his': 'hɪz',
  'she': 'ʃi',
  'her': 'hɜr',
  'it': 'ɪt',
  'its': 'ɪts',
  'they': 'ðeɪ',
  'them': 'ðɛm',
  'their': 'ðɛr',
  'this': 'ðɪs',
  'that': 'ðæt',
  'these': 'ðiz',
  'those': 'ðoʊz',

  // Auxiliaries & common verbs
  'is': 'ɪz',
  'am': 'æm',
  'are': 'ɑr',
  'was': 'wʌz',
  'were': 'wɜr',
  'be': 'bi',
  'been': 'bɪn',
  'being': 'ˈbiɪŋ',
  'have': 'hæv',
  'has': 'hæz',
  'had': 'hæd',
  'do': 'du',
  'does': 'dʌz',
  'did': 'dɪd',
  'will': 'wɪl',
  'would': 'wʊd',
  'shall': 'ʃæl',
  'should': 'ʃʊd',
  'can': 'kæn',
  'could': 'kʊd',
  'may': 'meɪ',
  'might': 'maɪt',
  'must': 'mʌst',

  // Conjunctions & adverbs
  'and': 'ænd',
  'but': 'bʌt',
  'or': 'ɔr',
  'so': 'soʊ',
  'if': 'ɪf',
  'as': 'æz',
  'than': 'ðæn',
  'too': 'tu',
  'very': 'ˈvɛri',
  'not': 'nɑt',
  'here': 'hɪr',
  'there': 'ðɛr',
  'where': 'wɛr',
  'when': 'wɛn',
  'why': 'waɪ',
  'how': 'haʊ',
  'what': 'wɑt',
  'who': 'hu',
  'which': 'wɪtʃ',

  // Common Business / TOEIC terms
  'yesterday': 'ˈjɛstərdeɪ',
  'director': 'dəˈrɛktər',
  'strategy': 'ˈstrætədʒi',
  'marketing': 'ˈmɑrkətɪŋ',
  'expansion': 'ɪkˈspænʃən',
  'market': 'ˈmɑrkət',
  'business': 'ˈbɪznəs',
  'project': 'ˈprɑdʒɛkt',
  'company': 'ˈkʌmpəni',
  'meeting': 'ˈmitɪŋ',
  'report': 'rɪˈpɔrt',
  'manager': 'ˈmænədʒər',
  'presentation': 'ˌprɛzənˈteɪʃən',
  'schedule': 'ˈskɛdʒul',
  'client': 'ˈklaɪənt',
  'customer': 'ˈkʌstəmər',
};

// In-memory cache
let _memCache = null;

function loadCache() {
  if (_memCache) return _memCache;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    _memCache = raw ? JSON.parse(raw) : {};
  } catch {
    _memCache = {};
  }
  return _memCache;
}

export function saveIpaToCache(text, ipa) {
  if (!text || !ipa) return;
  const key = text.trim().toLowerCase();
  const cache = loadCache();
  cache[key] = ipa;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    console.warn('Failed to save IPA cache:', e);
  }
}

/**
 * Chuyển đổi một từ đơn sang ký hiệu IPA.
 */
export function wordToIPA(word) {
  if (!word) return '';
  const clean = word.toLowerCase().trim();
  if (COMMON_WORD_OVERRIDES[clean]) {
    return COMMON_WORD_OVERRIDES[clean];
  }
  try {
    const arpa = wordToArpabet(clean);
    const ipa = arpabetToIPARaw(arpa);
    return ipa ? ipa.replace(/[\u2060]/g, '') : word;
  } catch {
    return word;
  }
}

/**
 * Chuyển đổi một câu hoặc cụm từ bất kỳ sang chuỗi phiên âm IPA hoàn chỉnh.
 */
export function convertTextToIPA(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Tokenize theo từ (gồm dấu nháy đơn trong từ như don't, I'm) và các ký tự phân cách/dấu câu
  const tokens = trimmed.split(/([a-zA-Z]+(?:'[a-zA-Z]+)?)/);
  const ipaParts = tokens.map(token => {
    if (/^[a-zA-Z]+(?:'[a-zA-Z]+)?$/.test(token)) {
      return wordToIPA(token);
    }
    return token;
  });

  return ipaParts.join('').replace(/\s+/g, ' ').trim();
}

/**
 * Lấy IPA cho text (ưu tiên cache -> tính toán -> lưu cache).
 */
export function getIPA(text) {
  if (!text || typeof text !== 'string') return '';
  const key = text.trim().toLowerCase();
  const cache = loadCache();

  if (cache[key]) {
    return cache[key];
  }

  const generated = convertTextToIPA(text);
  if (generated) {
    saveIpaToCache(key, generated);
  }
  return generated;
}

/**
 * Lấy IPA cho câu (alias của getIPA)
 */
export const getSentenceIPA = getIPA;

/**
 * Lấy IPA cho Chunk: nếu chunk đã có sẵn ipa thì dùng, nếu chưa thì tự sinh & cache.
 */
export function getChunkIPA(chunk) {
  if (!chunk) return '';
  if (chunk.ipa && typeof chunk.ipa === 'string' && chunk.ipa.trim()) {
    const clean = chunk.ipa.trim().replace(/^\/|\/$/g, '');
    return clean;
  }
  const phrase = chunk.phrase || '';
  return getIPA(phrase);
}

/**
 * Format chuỗi IPA để hiển thị đẹp mắt (trong dấu gạch chéo /.../).
 */
export function formatIPA(ipa) {
  if (!ipa) return '';
  const clean = ipa.trim().replace(/^\/|\/$/g, '');
  return `/${clean}/`;
}

// ─── Hướng dẫn Khẩu hình Miệng & Vị trí Lưỡi cho các âm khó của người Việt ──
export const PHONETIC_MOUTH_TIPS = {
  // Âm đuôi xì & ma sát
  's': {
    title: 'Âm xì vô thanh /s/',
    tip: 'Khép nhẹ hai hàm răng, đầu lưỡi hướng sát lợi hàm trên, đẩy luồng hơi mạnh qua khe răng tạo tiếng xì nhẹ (không rung thanh quản).',
  },
  'z': {
    title: 'Âm xì hữu thanh /z/',
    tip: 'Khẩu hình giống âm /s/ nhưng rung dây thanh quản ở cổ họng (nghe như tiếng ong kêu râm ran).',
  },
  't': {
    title: 'Âm bật vô thanh /t/',
    tip: 'Áp chặt đầu lưỡi lên vòm họng ngay sau răng cửa trên, nén hơi rồi hạ lưỡi nhanh để bật hơi mạnh dứt khoát ra ngoài.',
  },
  'd': {
    title: 'Âm bật hữu thanh /d/',
    tip: 'Khẩu hình như /t/ nhưng bật nhẹ hơn và rung dây thanh quản ở cổ họng.',
  },
  'k': {
    title: 'Âm bật cổ họng /k/',
    tip: 'Nâng cuống lưỡi chạm ngạc mềm phía trong cùng vòm họng, chặn hơi rồi bật nhanh một luồng hơi khô ra ngoài.',
  },
  'p': {
    title: 'Âm bật môi /p/',
    tip: 'Mím chặt hai môi lại để chặn luồng khí, sau đó bật môi mở nhanh tạo luồng hơi bật nhẹ.',
  },
  'ed': {
    title: 'Âm đuôi quá khứ -ed',
    tip: 'Tùy âm đứng trước: phát âm là /t/ sau âm vô thanh (k, p, f, s, sh, ch); là /d/ sau âm hữu thanh; là /ɪd/ sau âm /t/ hoặc /d/.',
  },
  'θ': {
    title: 'Âm th thổi gió /θ/ (think, thank)',
    tip: 'Đặt đầu lưỡi kẹp nhẹ giữa hai hàm răng, thổi một luồng hơi êm qua khe giữa lưỡi và răng cửa trên (không thụt lưỡi vào trong).',
  },
  'ð': {
    title: 'Âm th rung /ð/ (this, that, with)',
    tip: 'Vị trí lưỡi kẹp nhẹ giữa răng như /θ/ nhưng phát âm rung thanh quản mạnh.',
  },
  'ʃ': {
    title: 'Âm sh nặng /ʃ/ (she, fish)',
    tip: 'Chu tròn môi về phía trước, thân lưỡi nâng cao gần vòm họng, đẩy luồng hơi mạnh tạo tiếng "suỵt" gió.',
  },
  'tʃ': {
    title: 'Âm ch bật /tʃ/ (church, match)',
    tip: 'Kết hợp chặn hơi như /t/ và bật mở chu môi như /ʃ/.',
  },
  'dʒ': {
    title: 'Âm j rung /dʒ/ (job, bridge)',
    tip: 'Khẩu hình như /tʃ/ nhưng rung dây thanh quản mạnh mẽ.',
  },
};

/**
 * Lấy lời khuyên khẩu hình miệng dựa vào âm vị hoặc loại lỗi
 */
export function getPhoneticTip(soundKey) {
  if (!soundKey) return null;
  const key = soundKey.toLowerCase().replace(/[\/\[\]]/g, '');
  return PHONETIC_MOUTH_TIPS[key] || null;
}

/**
 * Phân tích đối soát ngữ âm giữa câu mẫu và câu người học đã nói
 * Bắt chính xác lỗi nuốt âm đuôi, lệch nguyên âm và gắn thẻ trạng thái
 * 
 * @param {string} targetSentence - Câu chuẩn mục tiêu
 * @param {string} spokenSentence - Câu người học đã nói (từ ASR / STT)
 * @param {Array<string>} targetChunks - Danh sách chunk cần kích hoạt
 * @returns {Object} { words, accuracyScore, isPassed, chunksUsed, summaryFeedback }
 */
export function analyzeSpokenPhonetics(targetSentence = '', spokenSentence = '', targetChunks = []) {
  if (!targetSentence) {
    return { words: [], accuracyScore: 0, isPassed: false, chunksUsed: [], summaryFeedback: '' };
  }

  const cleanTarget = targetSentence.trim();
  const cleanSpoken = (spokenSentence || '').trim();

  const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
  const spokenTokensNorm = cleanSpoken
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, ''))
    .filter(Boolean);

  // Chuẩn hóa danh sách chunk để đối soát kích hoạt
  const normalizedChunks = (targetChunks || []).map(chunk => {
    const phrase = typeof chunk === 'string' ? chunk : (chunk?.phrase || '');
    return {
      raw: phrase,
      tokens: phrase.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9']/g, '')).filter(Boolean),
    };
  }).filter(c => c.tokens.length > 0);

  // Kiểm tra chunk nào đã được kích hoạt trong câu nói
  const spokenJoined = spokenTokensNorm.join(' ');
  const chunksUsed = [];
  normalizedChunks.forEach(chunkObj => {
    const chunkJoined = chunkObj.tokens.join(' ');
    if (spokenJoined.includes(chunkJoined)) {
      chunksUsed.push(chunkObj.raw);
    }
  });

  const pool = [...spokenTokensNorm];
  let totalScore = 0;
  let missingEndingSoundCount = 0;

  const words = targetWords.map((originalWord) => {
    const cleanWord = originalWord.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
    const targetIpa = wordToIPA(cleanWord);
    
    // Kiểm tra xem từ này có thuộc chunk nào không
    const isPartOfTargetChunk = normalizedChunks.some(c => c.tokens.includes(cleanWord));

    // 1. Khớp chính xác hoàn toàn (Exact Word Match)
    const exactIdx = pool.indexOf(cleanWord);
    if (exactIdx !== -1) {
      pool.splice(exactIdx, 1);
      totalScore += 95;
      return {
        word: originalWord,
        status: 'correct',
        score: 95,
        targetIpa,
        spokenIpa: targetIpa,
        errorType: 'clean',
        feedback: isPartOfTargetChunk ? 'Phát âm chuẩn cụm từ mục tiêu' : 'Phát âm rõ ràng, chuẩn xác',
        tip: null,
      };
    }

    // 2. Kiểm tra lỗi mất âm đuôi hoặc thừa âm đuôi (-s, -es, -ed, -d, -t, -ing)
    let almostMatchIdx = -1;
    let errorType = null;
    let feedback = '';
    let tipKey = null;

    for (let i = 0; i < pool.length; i++) {
      const sp = pool[i];
      if (!sp) continue;

      // Quá khứ -ed
      if (cleanWord.endsWith('ed') && cleanWord.slice(0, -2) === sp) {
        almostMatchIdx = i;
        errorType = 'missing_ed';
        feedback = 'Thiếu âm đuôi quá khứ -ed';
        tipKey = 'ed';
        break;
      }
      if (cleanWord.endsWith('d') && cleanWord.slice(0, -1) === sp) {
        almostMatchIdx = i;
        errorType = 'missing_d';
        feedback = 'Thiếu âm đuôi /d/';
        tipKey = 'd';
        break;
      }
      // Số nhiều / ngôi thứ 3 -s, -es
      if ((cleanWord.endsWith('s') || cleanWord.endsWith('es')) && (cleanWord.replace(/e?s$/, '') === sp)) {
        almostMatchIdx = i;
        errorType = 'missing_s';
        feedback = 'Thiếu âm đuôi xì /s/ hoặc /z/';
        tipKey = 's';
        break;
      }
      // Thừa đuôi -s
      if (sp.endsWith('s') && sp.slice(0, -1) === cleanWord) {
        almostMatchIdx = i;
        errorType = 'extra_s';
        feedback = 'Thừa âm đuôi -s (chú ý không xì tùy tiện)';
        tipKey = 's';
        break;
      }
      // Thiếu đuôi -ing
      if (cleanWord.endsWith('ing') && cleanWord.slice(0, -3) === sp) {
        almostMatchIdx = i;
        errorType = 'missing_ing';
        feedback = 'Thiếu đuôi -ing';
        break;
      }
      // Thiếu đuôi -t
      if (cleanWord.endsWith('t') && cleanWord.slice(0, -1) === sp) {
        almostMatchIdx = i;
        errorType = 'missing_t';
        feedback = 'Thiếu âm bật cuối /t/';
        tipKey = 't';
        break;
      }
    }

    if (almostMatchIdx !== -1) {
      missingEndingSoundCount++;
      pool.splice(almostMatchIdx, 1);
      totalScore += 65;
      return {
        word: originalWord,
        status: 'almost',
        score: 65,
        targetIpa,
        spokenIpa: wordToIPA(pool[almostMatchIdx] || cleanWord),
        errorType,
        feedback,
        tip: getPhoneticTip(tipKey),
      };
    }

    // 3. Từ bị phát âm sai hoặc nuốt từ (Incorrect / Missing)
    totalScore += 20;
    return {
      word: originalWord,
      status: 'incorrect',
      score: 20,
      targetIpa,
      spokenIpa: null,
      errorType: 'mispronounced_or_skipped',
      feedback: 'Chưa phát hiện âm hoặc phát âm lệch nhiều',
      tip: getPhoneticTip(cleanWord.slice(-1)),
    };
  });

  const avgAccuracy = targetWords.length > 0 ? Math.round(totalScore / targetWords.length) : 0;
  const isPassed = avgAccuracy >= 70 && missingEndingSoundCount <= 1;

  let summaryFeedback = '';
  if (avgAccuracy >= 85) {
    summaryFeedback = 'Phát âm rất tự nhiên và chuẩn xác! Ngữ điệu trôi chảy.';
  } else if (missingEndingSoundCount > 0) {
    summaryFeedback = `Bạn đang bị nuốt ${missingEndingSoundCount} âm đuôi (-s, -ed, -t). Hãy bật rõ âm cuối để người bản xứ nghe rõ nghĩa nhé!`;
  } else {
    summaryFeedback = 'Bạn hãy nói chậm lại một chút và mở rộng khẩu hình để âm bật rõ hơn.';
  }

  return {
    words,
    accuracyScore: avgAccuracy,
    isPassed,
    chunksUsed,
    missingEndingSoundCount,
    summaryFeedback,
  };
}
