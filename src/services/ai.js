import { getApiKeys } from '../store/storage';

// Priority list — tries each in order until one works
// Lite models first: RPD 500/day (vs 20/day for standard Flash)
const MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',  // RPM 15, RPD 500 ← best free tier
  'gemini-3.1-flash-lite',  // RPM 15, RPD 500 ← second best
  'gemini-3.7-flash',       // RPM  5, RPD  20
  'gemini-3.5-flash',       // RPM  5, RPD  20
  'gemini-3.6-flash',       // RPM  5, RPD  20 (previously hit limit)
  'gemini-3-flash',         // RPM  5, RPD  20
  'gemini-2.5-flash',       // RPM  5, RPD  20
  'gemini-2.5-flash-lite',  // RPM 10, RPD  20
  'gemini-2.0-flash-lite',  // older stable fallback
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Rate-limit blacklist (resets on page reload) ─────────────
const _rateLimitedModels = new Set();

// ─── Throttle: delay giữa các lần gọi API ────────────────────
// Gemini free tier: 5 RPM → tối thiểu 12s/request
// Dùng 2.5s delay nhẹ nhàng + backoff khi 429 để không spam
const _minDelayMs = 2500; // 2.5s giữa mỗi request (an toàn với 15 RPM Lite)
let _lastCallTime = 0;

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - _lastCallTime;
  if (elapsed < _minDelayMs) {
    await new Promise(r => setTimeout(r, _minDelayMs - elapsed));
  }
  _lastCallTime = Date.now();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function resolveModel(apiKey) {
  // Try each candidate; skip rate-limited ones; return first that the API accepts
  for (const model of MODEL_CANDIDATES) {
    if (_rateLimitedModels.has(model)) continue;
    const testRes = await fetch(
      `${BASE_URL}/models/${model}?key=${apiKey}`
    );
    if (testRes.ok) return model;
  }
  // Last resort: ask the API which models exist
  const listRes = await fetch(`${BASE_URL}/models?key=${apiKey}`);
  if (listRes.ok) {
    const { models = [] } = await listRes.json();
    const flash = models
      .map(m => m.name.replace('models/', ''))
      .filter(n => n.includes('flash') && !n.includes('preview') && !_rateLimitedModels.has(n))
      .sort()
      .reverse()[0]; // highest version first
    if (flash) return flash;
  }
  throw new Error('Không tìm được model Gemini khả dụng. Vui lòng kiểm tra API key.');
}

let _cachedModel = null;
async function getModel(apiKey) {
  if (!_cachedModel) _cachedModel = await resolveModel(apiKey);
  return _cachedModel;
}

const GEMINI_URL = (model, apiKey) =>
  `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

// Rate-limit blacklist (model & key combined)
const _rateLimitedKeys = new Set();

async function callGemini(passedApiKey, systemPrompt, userMessage, opts = {}) {
  // Lấy danh sách tất cả API key khả dụng (Key 1, Key 2...)
  let allKeys = getApiKeys();
  if (passedApiKey && !allKeys.includes(passedApiKey)) {
    allKeys = [passedApiKey, ...allKeys];
  }
  if (allKeys.length === 0) {
    throw new Error('Chưa có API key. Vào Settings để nhập.');
  }

  let lastError = null;

  // Thử lần lượt từng API Key (Account 1 → Account 2)
  for (let kIdx = 0; kIdx < allKeys.length; kIdx++) {
    const currentApiKey = allKeys[kIdx];

    // Với mỗi Key, thử các model candidates
    for (let attempt = 0; attempt < MODEL_CANDIDATES.length; attempt++) {
      const model = await getModel(currentApiKey);
      const keyModelId = `${currentApiKey.slice(-6)}_${model}`;

      if (_rateLimitedKeys.has(keyModelId) || _rateLimitedModels.has(model)) continue;

      try {
        await waitForRateLimit();

        const res = await fetch(GEMINI_URL(model, currentApiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
              maxOutputTokens: opts.maxOutputTokens || 4096,
              temperature: opts.temperature ?? 0.7,
            },
          }),
        });

        // Xử lý 429 Rate Limit
        if (res.status === 429) {
          console.warn(`[AI] Key ${kIdx + 1} (${currentApiKey.slice(0, 8)}…) hit 429 on ${model}.`);
          _rateLimitedKeys.add(keyModelId);
          _rateLimitedModels.add(model);
          _cachedModel = null;

          // Nếu có Key dự phòng (Account 2), chuyển sang Key 2 ngay lập tức!
          if (kIdx < allKeys.length - 1) {
            console.warn(`[AI] 🔄 Tự động chuyển sang API Key dự phòng (Account ${kIdx + 2})…`);
            break; // Thử key tiếp theo
          }

          const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
          const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 15000 + attempt * 5000;
          await sleep(backoffMs);
          _lastCallTime = Date.now();
          continue;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error?.message || `Gemini API error ${res.status}`;
          throw new Error(msg);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
        if (!jsonMatch) throw new Error('Gemini response không chứa JSON hợp lệ');

        return JSON.parse(jsonMatch[1]);
      } catch (err) {
        lastError = err;
        // Nếu lỗi rate limit/quota từ response error message
        if (err.message?.includes('429') || err.message?.includes('QUOTA') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          if (kIdx < allKeys.length - 1) {
            console.warn(`[AI] 🔄 Quota hết ở Key ${kIdx + 1}. Chuyển sang API Key dự phòng (Account ${kIdx + 2})…`);
            break;
          }
        }
      }
    }
  }

  throw lastError || new Error('Tất cả API Key và Model đều bị rate limit. Vui lòng thử lại sau ít phút.');
}




// ─── Analyze transcript → extract chunks ──────────────────────
export async function analyzeTranscript(text, part, apiKey) {
  const systemPrompt = `Bạn là chuyên gia giảng dạy tiếng Anh TOEIC, chuyên phân tích ngôn ngữ theo phương pháp chunking.
Nhiệm vụ: Phân tích transcript TOEIC ${part}, trích xuất các chunk có giá trị giao tiếp cao và trình bày theo nhóm tình huống thực tế.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Phân tích transcript ${part} sau:

TRANSCRIPT:
${text}

Trả về JSON theo đúng format sau:
\`\`\`json
{
  "theme": "Tên chủ đề tiếng Anh (Meeting Catch-up & Internal Software Updates)",
  "themeVi": "Tên chủ đề tiếng Việt (Cập nhật nội dung cuộc họp & Thay đổi phần mềm nội bộ)",
  "themeDescription": "Mô tả ngắn bằng tiếng Việt về bối cảnh/tình huống của đoạn hội thoại này (1-2 câu)",
  "groups": [
    {
      "name": "Tên nhóm tình huống tiếng Việt (Hỏi thăm & Bắt kịp nội dung cuộc họp)",
      "chunks": [
        {
          "phrase": "cụm từ tiếng Anh chính xác như trong transcript",
          "ipa": "phiên âm IPA chuẩn quốc tế của cụm từ (ví dụ: /ˈɡɪv ʌp/)",
          "meaningVi": "Nghĩa tiếng Việt đầy đủ, tự nhiên",
          "usageNote": "Giải thích ngắn bằng tiếng Việt: cách dùng, ngữ pháp, ngữ cảnh điển hình của cụm từ này (1-2 câu)",
          "originalSentence": "Câu gốc hoàn chỉnh trong transcript chứa chunk",
          "anotherExample": "Một câu ví dụ KHÁC (không có trong transcript) dùng đúng chunk này",
          "type": "collocation",
          "formality": "neutral"
        }
      ]
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- Chia 2-4 nhóm theo tình huống giao tiếp thực tế trong đoạn hội thoại
- Mỗi nhóm có 2-4 chunk; tổng cộng 6-12 chunk
- type: "collocation" | "functional" | "connector"
  - collocation: cụm danh từ/động từ hay đi cùng nhau (track orders, place an order)
  - functional: cụm giao tiếp có chức năng cụ thể (Could you tell me..., I wish I had...)
  - connector: cụm liên kết/chuyển ý (as far as I know, in terms of)
- formality: "formal" | "informal" | "neutral"
- phrase phải xuất hiện chính xác trong transcript
- usageNote: giải thích thực dụng, nhấn mạnh điểm đặc biệt về ngữ pháp hoặc ngữ dụng
- anotherExample: câu hoàn chỉnh, tự nhiên, KHÁC bối cảnh transcript`;

  return callGemini(apiKey, systemPrompt, userMessage);
}

// ─── Generate writing exercises for a chunk ──────────────────
//
// options.mode:
//   'level'     — 3 bài theo 3 độ khó (Cơ bản / Trung cấp / Nâng cao) [default]
//   'situation' — 2-3 bài theo tình huống thực tế khác nhau (dùng cho vocab chunks)
export async function generateWritingExercises(chunk, apiKey, options = {}) {
  const mode = options.mode || 'level';

  // ── MODE: level (luồng transcript gốc — không thay đổi) ──────
  if (mode === 'level') {
    const systemPrompt = `Bạn là chuyên gia thiết kế bài luyện dịch tiếng Anh cho người học TOEIC.
Nhiệm vụ: Tạo 3 bài luyện dịch Việt → Anh với 3 độ khó khác nhau, giúp người học sử dụng thành thạo chunk và hiểu rõ ngữ pháp thì (tense) trong giao tiếp thực tế.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

    const userMessage = `Tạo 3 bài luyện dịch theo 3 độ khó cho chunk sau:

CHUNK: "${chunk.phrase}"
NGHĨA TIẾNG VIỆT: ${chunk.meaningVi}
CÂU GỐC TRONG TRANSCRIPT: "${chunk.originalSentence}"

Trả về JSON:
\`\`\`json
{
  "exercises": [
    {
      "id": "ex_1",
      "level": 1,
      "levelLabel": "Cơ bản",
      "vietnameseSentence": "Câu TIẾNG VIỆT NGẮN (≤ 10 từ). 1 mệnh đề. Ngữ cảnh quen thuộc (mua sắm / ăn uống / hỏi thăm). Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh ngắn, đơn giản, có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation (ví dụ: /aɪ wɑnt tu.../)",
      "tenseUsed": "Present Simple",
      "tenseExplanation": "Dùng thì này vì … (1 câu tiếng Việt, giải thích tình huống thực tế)",
      "vocabHints": [],
      "sentenceBreakdown": [
        {
          "phrase": "cụm từ trong sampleTranslation",
          "vi": "nghĩa tiếng Việt của cụm đó",
          "note": "Giải thích ngắn tại sao dùng từ/cấu trúc này (ngữ pháp, collocation, thành ngữ)"
        }
      ]
    },
    {
      "id": "ex_2",
      "level": 2,
      "levelLabel": "Trung cấp",
      "vietnameseSentence": "Câu TIẾNG VIỆT TRUNG BÌNH (10-15 từ). Có trạng ngữ thời gian / địa điểm. Bối cảnh thực tế (công việc / du lịch / học tập). Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh trung bình, tự nhiên, có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation",
      "tenseUsed": "Past Simple",
      "tenseExplanation": "Dùng thì này vì … (1 câu tiếng Việt, giải thích logic thì)",
      "vocabHints": [
        { "vi": "từ khó", "en": "English" },
        { "vi": "từ khó 2", "en": "English 2" }
      ],
      "sentenceBreakdown": [
        {
          "phrase": "cụm từ trong sampleTranslation",
          "vi": "nghĩa tiếng Việt",
          "note": "Giải thích tại sao dùng từ/cấu trúc này"
        }
      ]
    },
    {
      "id": "ex_3",
      "level": 3,
      "levelLabel": "Nâng cao",
      "vietnameseSentence": "Câu TIẾNG VIỆT KHÓ (15-20 từ). Câu ghép hoặc có mệnh đề phụ (vì / mặc dù / sau khi). Ngữ cảnh phức tạp. Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh phức tạp, tự nhiên, có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation",
      "tenseUsed": "Present Perfect",
      "tenseExplanation": "Dùng thì này vì … (1 câu tiếng Việt, giải thích logic trong câu ghép)",
      "vocabHints": [
        { "vi": "từ khó", "en": "English" },
        { "vi": "từ khó 2", "en": "English 2" },
        { "vi": "từ khó 3", "en": "English 3" },
        { "vi": "từ khó 4", "en": "English 4" }
      ],
      "sentenceBreakdown": [
        {
          "phrase": "cụm từ trong sampleTranslation",
          "vi": "nghĩa tiếng Việt",
          "note": "Giải thích tại sao dùng từ/cấu trúc này"
        }
      ]
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- vietnameseSentence: câu TIẾNG VIỆT có dấu đầy đủ, tự nhiên, bối cảnh KHÁC transcript gốc
- sampleTranslation: BẮT BUỘC chứa chunk "${chunk.phrase}"
- 3 câu có 3 bối cảnh KHÁC NHAU (du lịch, y tế, nhà hàng, mua sắm, học tập, gia đình…)
- tenseUsed: tên thì tiếng Anh (Present Simple, Past Perfect, Present Continuous…)
- tenseExplanation: 1 câu tiếng Việt, giải thích TẠI SAO dùng thì đó (không phải định nghĩa thì)
- vocabHints: chỉ các từ THỰC SỰ khó dịch, KHÔNG hint chunk mục tiêu
  - Câu 1 (dễ): 0–2 hints
  - Câu 2 (trung): 2–3 hints
  - Câu 3 (khó): 4–5 hints
- sentenceBreakdown: phân tích 3–5 cụm quan trọng trong sampleTranslation
  - phrase: cụm từ TIẾNG ANH đúng như trong sampleTranslation, KHÔNG là chunk mục tiêu, KHÔNG là toàn bộ câu
  - vi: nghĩa tiếng Việt của cụm đó
  - note: 1 câu tiếng Việt giải thích TẠI SAO dùng từ này (sở hữu từ, giới từ, mạo từ, collocation…). Nhấn mạnh điểm người Việt hay nhầm.
  - Ví dụ tốt: {"phrase": "our vacation", "vi": "kỳ nghỉ của chúng tôi", "note": "Tiếng Anh bắt buộc dùng 'our' trước danh từ khi chỉ về đối tượng của nhóm người nói — tiếng Việt thường bỏ qua đại từ sở hữu này."}
- Độ khó phải THỰC SỰ khác nhau về độ dài và cấu trúc ngữ pháp`;

    return callGemini(apiKey, systemPrompt, userMessage);
  }

  // ── MODE: situation (vocab chunks — 2-3 tình huống thực tế) ──
  const systemPrompt = `Bạn là chuyên gia thiết kế bài luyện dịch tiếng Anh cho người học.
Nhiệm vụ: Tạo 2-3 bài luyện dịch Việt → Anh theo các TÌNH HUỐNG THỰC TẾ KHÁC NHAU (không phải theo độ khó), giúp người học dùng chunk tự nhiên trong cuộc sống.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Tạo 2-3 bài luyện dịch theo tình huống thực tế cho chunk sau:

CHUNK: "${chunk.phrase}"
NGHĨA TIẾNG VIỆT: ${chunk.meaningVi}

Trả về JSON:
\`\`\`json
{
  "exercises": [
    {
      "id": "ex_1",
      "level": 1,
      "levelLabel": "Tại văn phòng",
      "vietnameseSentence": "Câu tiếng Việt có dấu đầy đủ, tự nhiên, bối cảnh văn phòng / công việc. Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation",
      "tenseUsed": "Present Simple",
      "tenseExplanation": "Dùng thì này vì … (1 câu tiếng Việt)",
      "vocabHints": [],
      "sentenceBreakdown": [
        {
          "phrase": "cụm từ trong sampleTranslation",
          "vi": "nghĩa tiếng Việt của cụm đó",
          "note": "Giải thích ngắn tại sao dùng từ/cấu trúc này"
        }
      ]
    },
    {
      "id": "ex_2",
      "level": 2,
      "levelLabel": "Khi đi du lịch",
      "vietnameseSentence": "Câu tiếng Việt bối cảnh du lịch / cuộc sống hàng ngày. Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation",
      "tenseUsed": "Past Simple",
      "tenseExplanation": "Dùng thì này vì …",
      "vocabHints": [{ "vi": "từ khó", "en": "English" }],
      "sentenceBreakdown": []
    },
    {
      "id": "ex_3",
      "level": 3,
      "levelLabel": "Trong cuộc trò chuyện",
      "vietnameseSentence": "Câu tiếng Việt bối cảnh xã hội / học tập / gia đình. Bắt buộc dùng chunk.",
      "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
      "ipa": "phiên âm IPA chuẩn của sampleTranslation",
      "tenseUsed": "Present Perfect",
      "tenseExplanation": "Dùng thì này vì …",
      "vocabHints": [],
      "sentenceBreakdown": []
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- levelLabel: tên TÌNH HUỐNG thực tế (Tại văn phòng / Khi đi du lịch / Tại nhà hàng / Khi mua sắm / Trong lớp học / Khi đi khám bệnh / Trong cuộc trò chuyện...) — KHÔNG phải tên độ khó
- sampleTranslation: BẮT BUỘC chứa chunk "${chunk.phrase}" (có thể chia động từ phù hợp thì)
- 2-3 câu với 2-3 tình huống HOÀN TOÀN KHÁC NHAU
- vietnameseSentence: câu TIẾNG VIỆT có dấu đầy đủ, tự nhiên
- tenseUsed: tên thì tiếng Anh
- tenseExplanation: 1 câu tiếng Việt, giải thích TẠI SAO dùng thì đó
- sentenceBreakdown: phân tích 2-4 cụm quan trọng, KHÔNG phân tích bản thân chunk mục tiêu
  - note: nhấn mạnh điểm ngữ pháp người Việt hay nhầm`;

  return callGemini(apiKey, systemPrompt, userMessage);
}


// ─── Generate chunks from a single vocabulary word ─────────────
// Dùng cho fallback trong app khi từ chưa được batch-generate sẵn.
// Không có originalSentence (không có transcript gốc).
export async function generateChunksFromWord(word, meaningVi, topic, partOfSpeech, apiKey) {
  const systemPrompt = `Bạn là chuyên gia giảng dạy tiếng Anh, chuyên tạo chunk (cụm từ) có giá trị giao tiếp cao.
Nhiệm vụ: Với từ vựng được cung cấp, sinh 2-3 chunk (cụm từ/cấu trúc) thực tế dùng từ đó.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Sinh 2-3 chunk thực tế cho từ vựng sau:

TỪ: "${word}"
NGHĨA TIẾNG VIỆT: ${meaningVi}
LOẠI TỪ: ${partOfSpeech || 'không rõ'}
CHỦ ĐỀ: ${topic}

Trả về JSON:
\`\`\`json
{
  "chunks": [
    {
      "phrase": "cụm từ tiếng Anh thực tế (ví dụ: nếu word là 'run' thì 'run a meeting')",
      "ipa": "phiên âm IPA chuẩn quốc tế của cụm từ này (ví dụ: /ˈrʌn ə ˈmitɪŋ/)",
      "meaningVi": "Nghĩa tiếng Việt đầy đủ của CỤM TỪ này (không phải của từ đơn)",
      "usageNote": "Giải thích ngắn bằng tiếng Việt: cách dùng, ngữ cảnh điển hình, điểm đặc biệt (1-2 câu)",
      "anotherExample": "Câu ví dụ hoàn chỉnh, tự nhiên, dùng chunk này trong 1 tình huống thực tế",
      "type": "collocation",
      "formality": "neutral"
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- 2-3 chunk (không ít hơn 2, không nhiều hơn 3)
- phrase: CỤM TỪ thực tế hay dùng, KHÔNG chỉ là từ đơn lẻ, phải chứa từ "${word}" hoặc dạng biến thể
- KHÔNG có field "originalSentence"
- type: "collocation" | "functional" | "connector"
- formality: "formal" | "informal" | "neutral"
- anotherExample: câu đầy đủ, tự nhiên, bối cảnh thực tế phù hợp chủ đề ${topic}`;

  return callGemini(apiKey, systemPrompt, userMessage);
}


// ─── Grade a user's translation attempt ───────────────────────
export async function gradeWriting(chunk, vietnameseSentence, userTranslation, apiKey) {
  const systemPrompt = `Bạn là giáo viên tiếng Anh chuyên chấm bài dịch Việt → Anh.
Nhiệm vụ: Chấm bài dịch của học viên một cách chi tiết, khách quan, xây dựng.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Chấm bài dịch sau:

CHUNK MỤC TIÊU: "${chunk.phrase}" (${chunk.meaningVi})
CÂU TIẾNG VIỆT GỐC: "${vietnameseSentence}"
BẢN DỊCH CỦA HỌC VIÊN: "${userTranslation}"

Trả về JSON:
\`\`\`json
{
  "usedChunk": true,
  "correct": true,
  "score": 85,
  "grammarErrors": [
    { "error": "Lỗi ngữ pháp cụ thể", "correction": "Cách sửa đúng", "explanation": "Giải thích ngắn gọn bằng tiếng Việt" }
  ],
  "naturalSuggestion": "Gợi ý cách diễn đạt tự nhiên hơn (nếu có, để null nếu không cần)",
  "overallFeedback": "Nhận xét tổng quan 1-2 câu bằng tiếng Việt, khích lệ và xây dựng"
}
\`\`\`

Quy tắc chấm:
- usedChunk: true nếu bản dịch có chunk "${chunk.phrase}" (có thể biến thể chia động từ, số nhiều)
- correct: true nếu bản dịch truyền đạt đúng nghĩa câu tiếng Việt gốc
- score: 0-100. Gợi ý: dùng chunk đúng +50đ, nghĩa đúng +30đ, ngữ pháp hoàn hảo +20đ
- grammarErrors: mảng rỗng [] nếu không có lỗi
- naturalSuggestion: null nếu bản dịch đã tự nhiên, hoặc câu gợi ý tiếng Anh tốt hơn
- overallFeedback: luôn tích cực, khích lệ dù có lỗi`;

  return callGemini(apiKey, systemPrompt, userMessage);
}

// ─── [BATCH] Grade multiple sentences for a chunk at once ───────
// items: Array<{ index, vietnameseSentence, userTranslation }>
// Returns: { results: [ { index, usedChunk, correct, score, grammarErrors, naturalSuggestion, overallFeedback } ] }
export async function gradeWritingBatch(chunk, items, apiKey) {
  const systemPrompt = `Bạn là giáo viên tiếng Anh chuyên chấm bài dịch Việt → Anh.
Nhiệm vụ: Chấm các bản dịch của học viên cho cùng một chunk mục tiêu.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const itemTexts = items
    .map((item, idx) => `CÂU ${idx + 1} (Index ${item.index}):
- Câu Việt gốc: "${item.vietnameseSentence}"
- Bản dịch của học viên: "${item.userTranslation}"`)
    .join('\n\n');

  const userMessage = `Chấm các bài dịch sau cho CHUNK MỤC TIÊU: "${chunk.phrase}" (${chunk.meaningVi})

${itemTexts}

Trả về JSON:
\`\`\`json
{
  "results": [
    {
      "index": 0,
      "usedChunk": true,
      "correct": true,
      "score": 85,
      "grammarErrors": [
        { "error": "Lỗi ngữ pháp cụ thể", "correction": "Cách sửa đúng", "explanation": "Giải thích ngắn gọn bằng tiếng Việt" }
      ],
      "naturalSuggestion": "Gợi ý cách diễn đạt tự nhiên hơn (để null nếu không cần)",
      "overallFeedback": "Nhận xét 1-2 câu cho câu dịch này"
    }
  ]
}
\`\`\`

Quy tắc chấm:
- Trả về ĐÚNG ${items.length} phần tử trong results tương ứng với các câu được gửi lên
- usedChunk: true nếu bản dịch có dùng chunk "${chunk.phrase}" (có thể biến thể chia động từ, số nhiều)
- correct: true nếu bản dịch truyền đạt đúng nghĩa câu tiếng Việt gốc
- score: 0-100 (dùng chunk đúng +50đ, nghĩa đúng +30đ, ngữ pháp hoàn hảo +20đ)
- grammarErrors: [] nếu không có lỗi
- naturalSuggestion: null nếu bản dịch đã tự nhiên`;

  return callGemini(apiKey, systemPrompt, userMessage, { maxOutputTokens: 4096 });
}


// ─── Validate API key ──────────────────────────────────────────
export async function testApiKey(apiKey) {
  try {
    _cachedModel = null; // reset cache so we re-probe models
    const model = await resolveModel(apiKey);
    _cachedModel = model;
    return !!model;
  } catch {
    return false;
  }
}


// ─── [BATCH] Sinh chunk cho nhiều từ cùng lúc – 1 request ──────
// words: Array<{ word, meaningVi, topic, partOfSpeech }>
// Returns: { results: [ { word, chunks: [...] } ] }
export async function generateChunksBatch(words, apiKey) {
  const wordList = words
    .map((w, i) => `${i + 1}. "${w.word}" (${w.partOfSpeech || 'n/a'}) — ${w.meaningVi} [${w.topic}]`)
    .join('\n');

  const systemPrompt = `Bạn là chuyên gia giảng dạy tiếng Anh, chuyên tạo chunk (cụm từ) có giá trị giao tiếp cao.
Nhiệm vụ: Với danh sách từ vựng, sinh đúng 2 chunk thực tế cho MỖI TỪ trong danh sách (không bỏ sót từ nào).
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Sinh 2 chunk thực tế cho MỖI TỪ trong danh sách ${words.length} từ sau:

${wordList}

Trả về JSON:
\`\`\`json
{
  "results": [
    {
      "word": "từ như trong danh sách",
      "chunks": [
        {
          "phrase": "cụm từ tiếng Anh thực tế (ví dụ: nếu word là 'run' thì 'run a meeting')",
          "ipa": "phiên âm IPA chuẩn của cụm từ này",
          "meaningVi": "Nghĩa tiếng Việt của CỤM TỪ này (không phải của từ đơn)",
          "usageNote": "Cách dùng ngắn gọn (tối đa 15 từ tiếng Việt)",
          "anotherExample": "Câu ví dụ hoàn chỉnh tiếng Anh dùng chunk này",
          "type": "collocation",
          "formality": "neutral"
        }
      ]
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- Trả về ĐÚNG ${words.length} phần tử trong results, đúng thứ tự danh sách gốc
- Mỗi từ có đúng 2 chunk (không ít hơn, không nhiều hơn)
- phrase: CỤM TỪ thực tế hay dùng, PHẢI chứa từ gốc hoặc dạng biến thể
- type: "collocation" | "functional" | "connector"
- formality: "formal" | "informal" | "neutral"
- usageNote: ngắn gọn (không quá 15 từ tiếng Việt)
- anotherExample: câu đầy đủ, tự nhiên, phù hợp chủ đề ${words[0]?.topic || ''}`;

  // Tăng output tokens vì có nhiều từ cần sinh
  return callGemini(apiKey, systemPrompt, userMessage, { maxOutputTokens: 24000 });
}


// ─── [BATCH] Sinh bài luyện cho tất cả chunk của 1 từ – 1 request ─
// chunks: Array<{ id, phrase, meaningVi, ... }> (2 chunk của cùng 1 từ gốc)
// Returns: { results: [ { phrase, exercises: [...] } ] }
export async function generateExercisesForChunks(chunks, apiKey) {
  const chunkList = chunks
    .map((c, i) => `${i + 1}. "${c.phrase}" — ${c.meaningVi}`)
    .join('\n');

  const systemPrompt = `Bạn là chuyên gia thiết kế bài luyện dịch tiếng Anh cho người học.
Nhiệm vụ: Với mỗi chunk, tạo 3 bài luyện dịch Việt → Anh theo 3 tình huống thực tế khác nhau.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.
TUYỆT ĐỐI KHÔNG SUY NGHĨ THÀNH TIẾNG (Do NOT output reasoning, internal thinking, planning steps, or meta comments).`;

  const userMessage = `Tạo 3 bài luyện dịch cho MỖI chunk sau (${chunks.length} chunk):

${chunkList}

Trả về JSON:
\`\`\`json
{
  "results": [
    {
      "phrase": "cụm từ chunk (copy y chang)",
      "exercises": [
        {
          "id": "ex_1",
          "level": 1,
          "levelLabel": "Tại văn phòng",
          "vietnameseSentence": "Câu tiếng Việt có dấu, tự nhiên, bắt buộc dùng chunk.",
          "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
          "ipa": "phiên âm IPA chuẩn của sampleTranslation",
          "tenseUsed": "Present Simple",
          "vocabHints": []
        },
        {
          "id": "ex_2",
          "level": 2,
          "levelLabel": "Khi đi du lịch",
          "vietnameseSentence": "Câu tiếng Việt bối cảnh du lịch / cuộc sống hàng ngày. Bắt buộc dùng chunk.",
          "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
          "ipa": "phiên âm IPA chuẩn của sampleTranslation",
          "tenseUsed": "Past Simple",
          "vocabHints": [{ "vi": "từ khó", "en": "English" }]
        },
        {
          "id": "ex_3",
          "level": 3,
          "levelLabel": "Trong cuộc trò chuyện",
          "vietnameseSentence": "Câu tiếng Việt bối cảnh xã hội / học tập. Bắt buộc dùng chunk.",
          "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
          "ipa": "phiên âm IPA chuẩn của sampleTranslation",
          "tenseUsed": "Present Perfect",
          "vocabHints": []
        }
      ]
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- Trả về ĐÚNG ${chunks.length} phần tử trong results
- Mỗi chunk có đúng 3 bài, 3 tình huống HOÀN TOÀN KHÁC NHAU
- sampleTranslation: BẮT BUỘC chứa chunk mục tiêu (có thể chia động từ phù hợp thì)
- levelLabel: tên tình huống thực tế (KHÔNG phải tên độ khó)
- vietnameseSentence: câu tiếng Việt có dấu đầy đủ, tự nhiên`;

  return callGemini(apiKey, systemPrompt, userMessage, { maxOutputTokens: 8192 });
}


// ─── Speaking Practice (Gemini Live API & Final Grading) ──────────

export const SPEAKING_SYSTEM_PROMPT_TEMPLATE = `Bạn là một người bạn luyện nói tiếng Anh thân thiện, đang trò chuyện với một người Việt đang học tiếng Anh giao tiếp cho mục tiêu TOEIC Speaking. Vai trò của bạn KHÔNG PHẢI là giáo viên chấm điểm nghiêm khắc — bạn là bạn đồng hành luyện tập.

## THÔNG TIN BUỔI HỌC

- Chunk mục tiêu: "{{TARGET_CHUNK}}" (nghĩa: "{{CHUNK_MEANING_VI}}")
- Chủ đề: {{CHUNK_TOPIC}} (ví dụ: công việc, tài chính, kinh doanh...)
- 2 câu người học vừa viết và được chấm đúng:
  1. "{{SENTENCE_BASIC}}"
  2. "{{SENTENCE_INTERMEDIATE}}"

## QUY TẮC BẮT BUỘC

1. LUÔN nói bằng tiếng Anh, tốc độ vừa phải, rõ ràng, KHÔNG dùng từ vựng/ngữ pháp quá phức tạp so với trình độ TOEIC trung cấp.
2. KHÔNG chấm điểm, KHÔNG liệt kê lỗi sai giữa lúc đang trò chuyện. Nếu người học nói sai nhẹ nhưng vẫn hiểu được ý, HÃY TIẾP TỤC hội thoại tự nhiên như một người bản xứ sẽ làm (không ngắt lời để sửa lỗi ngữ pháp nhỏ).
3. CHỈ can thiệp nếu câu nói khiến bạn HOÀN TOÀN không hiểu ý — khi đó, hỏi lại một cách tự nhiên như "Sorry, could you say that again?" thay vì chỉ ra lỗi cụ thể.
4. Giữ mỗi lượt trả lời của bạn NGẮN GỌN (1-2 câu), giống hội thoại đời thường, không giảng giải dài dòng.
5. TUYỆT ĐỐI KHÔNG SUY NGHĨ THÀNH TIẾNG (Do NOT output internal thoughts, chain of thought, reasoning, or meta-comments like 'My next thought...'). CHỈ phát ra câu nói trực tiếp dành cho người học nghe.

## LUỒNG BUỔI HỌC (theo đúng thứ tự)

BƯỚC 1 — Khởi động (chỉ 1 lượt):
Chào người học thân thiện, yêu cầu họ đọc lại to 1 trong 2 câu đã viết ở trên (chọn câu số {{WARMUP_SENTENCE_INDEX}}). Sau khi họ đọc, xác nhận ngắn gọn kiểu "Great, I heard you clearly!" rồi chuyển ngay sang bước 2.

BƯỚC 2 — Tình huống giao tiếp:
Đưa ra MỘT tình huống ngắn (1-2 câu), CÙNG CHỦ ĐỀ nhưng KHÁC bối cảnh cụ thể so với 2 câu ở trên, để tự nhiên dẫn dắt người học dùng chunk "{{TARGET_CHUNK}}" trong câu trả lời của họ. Ví dụ nếu chunk là "do a good job" và 2 câu mẫu nói về nhân viên mới và đội marketing, hãy hỏi về một tình huống khác như đánh giá hiệu suất của một đồng nghiệp, một dự án, hoặc một đội nhóm khác — không lặp lại nguyên context cũ.

BƯỚC 3 — Hội thoại tự do (tối đa {{MAX_TURNS}} lượt, tối thiểu {{MIN_TURNS}} lượt):
Trò chuyện tiếp nối tự nhiên dựa trên câu trả lời của người học. Đặt câu hỏi follow-up ngắn để duy trì hội thoại.

NẾU đến lượt thứ {{NUDGE_AT_TURN}} mà người học VẪN CHƯA dùng chunk "{{TARGET_CHUNK}}" (hoặc biến thể chia thì/số của nó) trong bất kỳ câu trả lời nào: hãy đặt một câu hỏi TRỰC TIẾP HƠN, gần như ép câu trả lời tự nhiên phải chứa chunk đó.

BƯỚC 4 — Kết thúc:
Khi đã đạt {{MAX_TURNS}} lượt, HOẶC người học đã dùng đúng chunk và đã qua ít nhất {{MIN_TURNS}} lượt, hãy nói lời kết thân thiện, ngắn gọn (VD: "Thanks for chatting with me! Let's see how you did.") và DỪNG hội thoại — không hỏi thêm câu nào nữa.

## LƯU Ý VỀ MỨC ĐỘ CHẤM (để bạn điều chỉnh giọng điệu, không phải để nói ra)

Mục tiêu của người học là GIAO TIẾP HIỂU ĐƯỢC, không phải phát âm chuẩn như người bản xứ. Đừng tỏ ra khó chịu hay yêu cầu lặp lại nếu chỉ là lỗi phát âm nhẹ nhưng vẫn hiểu được ý.`;

export function buildSpeakingSystemPrompt(chunk, sentences = {}, config = {}) {
  const basicText = sentences.basic?.userAnswer || sentences.basic?.sampleTranslation || chunk.phrase;
  const intermediateText = sentences.intermediate?.userAnswer || sentences.intermediate?.sampleTranslation || chunk.anotherExample || chunk.phrase;
  const warmupIndex = (sentences.intermediate?.score || 0) < (sentences.basic?.score || 0) ? 2 : 1;

  return SPEAKING_SYSTEM_PROMPT_TEMPLATE
    .replace(/{{TARGET_CHUNK}}/g, chunk.phrase)
    .replace(/{{CHUNK_MEANING_VI}}/g, chunk.meaningVi || '')
    .replace(/{{CHUNK_TOPIC}}/g, chunk.groupName || chunk.type || 'công việc & giao tiếp')
    .replace(/{{SENTENCE_BASIC}}/g, basicText)
    .replace(/{{SENTENCE_INTERMEDIATE}}/g, intermediateText)
    .replace(/{{WARMUP_SENTENCE_INDEX}}/g, warmupIndex)
    .replace(/{{MAX_TURNS}}/g, config.MAX_TURNS || 5)
    .replace(/{{MIN_TURNS}}/g, config.MIN_TURNS || 3)
    .replace(/{{NUDGE_AT_TURN}}/g, config.NUDGE_AT_TURN || 4);
}

export async function gradeSpeakingSession(transcriptText, chunk, apiKey) {
  // Loại bỏ các đoạn suy nghĩ ngầm bị rò rỉ nếu có
  const cleanTranscript = (transcriptText || '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/\*\*.*?\*\*/g, '')
    .replace(/(Crafting the Opening|Developing the Situation|My next thought|I will prompt)[\s\S]*?(?=\nAI:|\nLearner:|\nUser:|$)/gi, '')
    .trim();

  const systemPrompt = `Bạn là chuyên gia thẩm định và phân tích phát âm tiếng Anh giao tiếp.
Nhiệm vụ: Phân tích buổi hội thoại luyện nói tiếng Anh giữa AI và người học, đánh giá độ chính xác của từng từ trong câu nói của người học (tô màu xanh cho từ đúng, tô màu đỏ cho từ phát âm/dùng sai).
Trả về JSON hợp lệ duy nhất, không có markdown text ngoài JSON.`;

  const userMessage = `Phân tích và chấm điểm buổi hội thoại luyện nói:

CHUNK MỤC TIÊU: "${chunk.phrase}" (Nghĩa: "${chunk.meaningVi}")

TRANSCRIPT BUỔI HỘI THOẠI:
${cleanTranscript || 'Learner: ' + chunk.phrase}

Trả về JSON theo format sau:
\`\`\`json
{
  "score": 85,
  "usedTargetChunk": true,
  "comprehensible": true,
  "feedbackSummary": "Bạn phản xạ nhanh và phát âm rõ ràng, đã lồng ghép chunk chính xác!",
  "naturalSuggestion": "Thay vì 'I want apply for a loan', bạn có thể nói 'I would like to apply for a loan'.",
  "dialogueTurns": [
    {
      "ai": "Hello! Welcome to speaking practice. Please read the sentence out loud!",
      "user": "I want to apply for a loan at this bank.",
      "wordAnalysis": [
        { "word": "I", "status": "correct" },
        { "word": "want", "status": "correct" },
        { "word": "to", "status": "correct" },
        { "word": "apply", "status": "chunk" },
        { "word": "for", "status": "chunk" },
        { "word": "a", "status": "chunk" },
        { "word": "loan", "status": "chunk" },
        { "word": "at", "status": "correct" },
        { "word": "this", "status": "correct" },
        { "word": "bank", "status": "correct" }
      ],
      "feedback": "Phát âm chuẩn xác và ngắt nhịp tự nhiên."
    }
  ]
}
\`\`\`

NGUYÊN TẮC PHÂN TÍCH:
- score: số nguyên 0-100.
- usedTargetChunk: true nếu người học có dùng chunk "${chunk.phrase}".
- dialogueTurns: Mảng từng lượt đối thoại giữa AI và người học:
  + ai: Lời thoại ngắn gọn của AI (bỏ sạch các meta text).
  + user: Câu người học đã nói.
  + wordAnalysis: Mảng từng từ trong câu của người học, với status:
    * "correct": từ phát âm đúng, chuẩn (tô xanh lá).
    * "incorrect": từ phát âm sai, nói nhầm, nuốt âm hoặc lỗi ngữ pháp (tô đỏ). Kèm theo note ghi rõ lỗi (ví dụ: 'Thiếu âm đuôi /t/', 'Phát âm sai nguyên âm', 'Sai thì').
    * "chunk": từ thuộc chunk mục tiêu "${chunk.phrase}".
- feedbackSummary: 1-2 câu nhận xét tổng kết ngắn gọn, thân thiện.`;

  return callGemini(apiKey, systemPrompt, userMessage, {
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.2,
    },
  });
}

/**
 * Transcribe recorded audio with Gemini Flash Audio Multimodal
 * Dùng làm fallback cực kỳ chuẩn xác nếu trình duyệt không hỗ trợ Web Speech API
 */
export async function transcribeAudioWithGemini(audioBase64, mimeType = 'audio/webm', customApiKey = null) {
  if (!audioBase64) return '';

  let allKeys = getApiKeys();
  if (customApiKey && !allKeys.includes(customApiKey)) {
    allKeys = [customApiKey, ...allKeys];
  }
  if (allKeys.length === 0) return '';

  const cleanMime = mimeType ? mimeType.split(';')[0] : 'audio/webm';

  for (const apiKey of allKeys) {
    try {
      const model = await getModel(apiKey);
      const url = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Transcribe this spoken English audio recording. Return ONLY the English words spoken, with no commentary, no markdown, and no quotation marks.' },
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[Gemini Audio] ${model} status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (transcript) {
        return transcript.replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch (err) {
      console.warn(`[Gemini Audio] Error with ${apiKey}:`, err);
    }
  }

  return '';
}
