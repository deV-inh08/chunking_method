// Priority list — tries each in order until one works
const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-3.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function resolveModel(apiKey) {
  // Try each candidate; return first that the API accepts
  for (const model of MODEL_CANDIDATES) {
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
      .filter(n => n.includes('flash') && !n.includes('preview'))
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

// ─── Core call ────────────────────────────────────────────────
async function callGemini(apiKey, systemPrompt, userMessage) {
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
      "id": "group_1",
      "name": "Tên nhóm tình huống tiếng Việt (Hỏi thăm & Bắt kịp nội dung cuộc họp)",
      "chunks": [
        {
          "id": "chunk_1",
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
Nhiệm vụ: Tạo bài luyện dịch Việt → Anh, giúp người học sử dụng thành thạo một chunk tiếng Anh cụ thể.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Tạo 3 bài luyện dịch cho chunk sau:

CHUNK: "${chunk.phrase}"
NGHĨA TIẾNG VIỆT: ${chunk.meaningVi}
CÂU GỐC TRONG TRANSCRIPT: "${chunk.originalSentence}"

Trả về JSON:
\`\`\`json
{
  "exercises": [
    {
      "id": "ex_1",
      "vietnameseSentence": "Câu tiếng Việt hoàn chỉnh, TỰ NHIÊN, tình huống HOÀN TOÀN KHÁC bài gốc, khi dịch sang Anh PHẢI dùng chunk '${chunk.phrase}'",
      "sampleTranslation": "Câu dịch mẫu tiếng Anh tham khảo có dùng đúng chunk '${chunk.phrase}'"
    }
  ]
}
\`\`\`

Quy tắc bắt buộc:
- vietnameseSentence: câu tiếng Việt hoàn chỉnh, tự nhiên, bối cảnh KHÁC transcript gốc (không phải văn phòng/họp hành nếu gốc là vậy). Ví dụ: du lịch, mua sắm, y tế, nhà hàng, học tập...
- sampleTranslation: câu tiếng Anh chuẩn, tự nhiên, BẮT BUỘC có chunk "${chunk.phrase}"
- 3 bài có 3 bối cảnh khác nhau và khác câu gốc
- id: ex_1, ex_2, ex_3`;

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
