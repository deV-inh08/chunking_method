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

// ─── Generate practice situations for a chunk ─────────────────
export async function generateSituations(chunk, apiKey) {
  const systemPrompt = `Bạn là chuyên gia thiết kế bài luyện nói tiếng Anh.
Nhiệm vụ: Tạo tình huống luyện nói cho người học TOEIC để luyện dùng chunk mục tiêu.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

  const userMessage = `Tạo 3 tình huống luyện nói mới (KHÁC bối cảnh gốc) cho chunk sau:

CHUNK: "${chunk.phrase}"
NGHĨA: ${chunk.meaningVi}
CÂU GỐC: "${chunk.originalSentence}"

Trả về JSON:
\`\`\`json
{
  "situations": [
    {
      "id": "sit_1",
      "prompt": "Mô tả tình huống bằng tiếng Anh (2-3 câu, rõ ràng, thực tế)",
      "hint": "Gợi ý nhẹ bằng tiếng Việt về cách dùng chunk",
      "exampleResponse": "Câu ví dụ có dùng chunk '${chunk.phrase}' tự nhiên"
    }
  ]
}
\`\`\`

Yêu cầu:
- 3 tình huống với 3 bối cảnh KHÁC NHAU, không giống câu gốc
- prompt bằng tiếng Anh, mô tả tình huống giao tiếp thực tế
- hint bằng tiếng Việt, ngắn gọn (max 1 câu)
- exampleResponse phải dùng đúng chunk "${chunk.phrase}"
- id: sit_1, sit_2, sit_3`;

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
