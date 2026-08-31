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

// ─── Core call (with auto-fallback on rate limit) ─────────────
async function callGemini(apiKey, systemPrompt, userMessage) {
  // Try up to all candidate models in case of rate limits
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
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      }),
    });

    // Rate limit → blacklist this model and try next
    if (res.status === 429) {
      console.warn(`[AI] Rate limit hit for ${model}, switching to next model…`);
      _rateLimitedModels.add(model);
      _cachedModel = null; // force re-resolve on next call
      const remaining = MODEL_CANDIDATES.filter(m => !_rateLimitedModels.has(m));
      if (remaining.length === 0) {
        throw new Error('Đã vượt giới hạn tất cả model. Vui lòng thử lại sau hoặc nâng cấp API key.');
      }
      continue; // retry with next model
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
export async function generateWritingExercises(chunk, apiKey) {
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
