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
