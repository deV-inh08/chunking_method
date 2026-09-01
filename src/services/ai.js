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

// ─── Core call (với delay + exponential backoff khi rate limit) ─
async function callGemini(apiKey, systemPrompt, userMessage, opts = {}) {
  // Chờ đủ thời gian giữa các request để không vượt RPM
  await waitForRateLimit();

  // Thử tối đa MODEL_CANDIDATES.length lần (mỗi lần có thể đổi model)
  for (let attempt = 0; attempt < MODEL_CANDIDATES.length; attempt++) {
    const model = await getModel(apiKey);
    const res = await fetch(GEMINI_URL(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          maxOutputTokens: opts.maxOutputTokens || 4096,
          temperature: opts.temperature ?? 0.7,
        },
      }),
    });

    // Rate limit → backoff rồi thử model tiếp theo
    if (res.status === 429) {
      // Đọc Retry-After header nếu có, mặc định 20s
      const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
      const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 20000 + attempt * 5000;
      console.warn(`[AI] 429 rate limit on ${model}. Chờ ${backoffMs / 1000}s rồi đổi model…`);
      _rateLimitedModels.add(model);
      _cachedModel = null; // force re-resolve on next call
      const remaining = MODEL_CANDIDATES.filter(m => !_rateLimitedModels.has(m));
      if (remaining.length === 0) {
        throw new Error('Đã vượt giới hạn tất cả model. Vui lòng thử lại sau vài phút.');
      }
      // Chờ backoff trước khi thử model mới
      await sleep(backoffMs);
      _lastCallTime = Date.now(); // reset timer sau khi chờ
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `Gemini API error ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON block from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error('Gemini response không chứa JSON hợp lệ');

    return JSON.parse(jsonMatch[1]);
  }

  throw new Error('Không thể gọi Gemini API sau nhiều lần thử. Vui lòng thử lại sau.');
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
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

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
          "tenseUsed": "Present Simple",
          "vocabHints": []
        },
        {
          "id": "ex_2",
          "level": 2,
          "levelLabel": "Khi đi du lịch",
          "vietnameseSentence": "Câu tiếng Việt bối cảnh du lịch / cuộc sống hàng ngày. Bắt buộc dùng chunk.",
          "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
          "tenseUsed": "Past Simple",
          "vocabHints": [{ "vi": "từ khó", "en": "English" }]
        },
        {
          "id": "ex_3",
          "level": 3,
          "levelLabel": "Trong cuộc trò chuyện",
          "vietnameseSentence": "Câu tiếng Việt bối cảnh xã hội / học tập. Bắt buộc dùng chunk.",
          "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
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
