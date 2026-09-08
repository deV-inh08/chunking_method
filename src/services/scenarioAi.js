/**
 * ─── Scenario & Conversational AI Service (Real-World Speaking Partner) ─────
 * 
 * Sử dụng Google Gemini (với fallback kịch bản offline phong phú) để:
 * 1. Tự động sinh tình huống giao tiếp đời thực (Café, Du lịch, Kết bạn, Công sở...)
 *    dựa trên các Chunk người học đã tích lũy.
 * 2. Đóng vai người bạn bản xứ kiên nhẫn, đàm thoại đa lượt (multi-turn),
 *    sửa lỗi diễn đạt tự nhiên và khuyến khích phản xạ.
 */

import { getApiKeys } from '../store/storage';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Danh sách Tình huống Đời Thực Phong Phú (Offline Presets) ───────────────
export const REAL_LIFE_PRESETS = [
  {
    id: 'coffee_shop',
    title: '☕ Gọi đồ uống tại Quán Cà phê New York',
    description: 'Bạn vào một quán café đông đúc, muốn gọi một ly latte ít ngọt và hỏi mật khẩu Wi-Fi.',
    aiRole: 'Barista thân thiện',
    userRole: 'Khách hàng',
    defaultChunks: ['feel like', 'to be honest', 'take your time'],
    openingMessage: "Hey there! Welcome to Central Brew. What can I get started for you today?",
    openingMessageVi: "Chào bạn! Chào mừng đến với Central Brew. Hôm nay bạn muốn dùng gì nào?",
  },
  {
    id: 'travel_checkin',
    title: '✈️ Nhận phòng Khách sạn & Hỏi địa điểm ăn uống',
    description: 'Bạn vừa đến khách sạn tại London, làm thủ tục check-in và hỏi nhân viên lễ tân quán ăn ngon gần đó.',
    aiRole: 'Nhân viên lễ tân khách sạn',
    userRole: 'Khách du lịch',
    defaultChunks: ['make a reservation', 'in charge of', 'look forward to'],
    openingMessage: "Good afternoon! Welcome to the Grand Plaza. Are you checking in today?",
    openingMessageVi: "Xin chào buổi chiều! Chào mừng quý khách đến Grand Plaza. Quý khách muốn làm thủ tục nhận phòng hôm nay phải không ạ?",
  },
  {
    id: 'friend_catchup',
    title: '🍻 Hẹn hò tán gẫu cuối tuần với Bạn thân',
    description: 'Bạn gặp lại người bạn thân lâu ngày không gặp để chia sẻ về công việc và kế hoạch du lịch sắp tới.',
    aiRole: 'Người bạn bản xứ Alex',
    userRole: 'Bạn thân',
    defaultChunks: ['catch up with', 'at the end of the day', 'run out of'],
    openingMessage: "Long time no see! It feels like forever. How have things been going with you lately?",
    openingMessageVi: "Lâu lắm không gặp cậu! Cảm giác như cả thế kỷ rồi ấy. Dạo này công việc và cuộc sống của cậu thế nào rồi?",
  },
  {
    id: 'shopping_return',
    title: '🛍️ Đổi kích cỡ áo tại Cửa hàng Thời trang',
    description: 'Bạn mua một chiếc áo khoác ngày hôm qua nhưng bị chật và muốn đổi sang cỡ lớn hơn.',
    aiRole: 'Nhân viên bán hàng',
    userRole: 'Khách mua sắm',
    defaultChunks: ['deal with', 'come up with', 'take care of'],
    openingMessage: "Hi! How can I help you today? Looking for anything special or need assistance?",
    openingMessageVi: "Chào bạn! Tôi có thể giúp gì cho bạn hôm nay? Bạn đang tìm món đồ nào hay cần hỗ trợ gì không?",
  },
  {
    id: 'work_catchup',
    title: '💼 Trao đổi nhanh bên máy pha nước ở công ty',
    description: 'Gặp đồng nghiệp người nước ngoài tại khu vực nghỉ ngơi, trao đổi về dự án và dời lịch họp chiều nay.',
    aiRole: 'Đồng nghiệp thân thiện David',
    userRole: 'Thành viên nhóm dự án',
    defaultChunks: ['reschedule the meeting', 'in charge of', 'run out of time'],
    openingMessage: "Hey! You got a minute? Just wanted to check in about our progress before the afternoon session.",
    openingMessageVi: "Này! Cậu có rảnh một phút không? Mình chỉ muốn trao đổi nhanh về tiến độ công việc trước buổi chiều thôi.",
  },
];

/**
 * Sinh tình huống đời thực dựa trên danh sách Chunk đã học hoặc chủ đề tự chọn
 */
export async function generateSpeakingScenario({ targetChunks = [], customTopic = '' }) {
  const allKeys = getApiKeys();
  const chunksListStr = targetChunks.map(c => typeof c === 'string' ? c : c.phrase).filter(Boolean).slice(0, 4).join(', ');

  // Nếu không có API Key, chọn ngay một preset phù hợp
  if (allKeys.length === 0 || (!customTopic && targetChunks.length === 0)) {
    const randomPreset = REAL_LIFE_PRESETS[Math.floor(Math.random() * REAL_LIFE_PRESETS.length)];
    return {
      ...randomPreset,
      targetChunks: targetChunks.length > 0 
        ? targetChunks.map(c => typeof c === 'string' ? { phrase: c, meaningVi: '' } : c)
        : randomPreset.defaultChunks.map(p => ({ phrase: p, meaningVi: 'Cụm từ giao tiếp tự nhiên' })),
    };
  }

  const prompt = `You are an expert English Language Coach specializing in Task-Based Conversational Learning.
Create an engaging, realistic daily-life roleplay scenario for an English learner.
Target conversational chunks to practice: [${chunksListStr || 'to be honest, feel like, catch up with'}]
Custom Topic / Context: "${customTopic || 'Daily life social conversation'}"

Return ONLY a valid JSON object matching this schema:
{
  "title": "Short catchy title in Vietnamese (e.g. ☕ Order cà phê tại New York)",
  "description": "1-2 sentences in Vietnamese setting up the scene and the learner's goal",
  "aiRole": "Your character (e.g. Friendly American Barista / Local Tour Guide)",
  "userRole": "The learner's role (e.g. Customer / Traveler)",
  "openingMessage": "Your first spoken opening line in natural conversational English (1-2 sentences, friendly, ends with an open question)",
  "openingMessageVi": "Vietnamese translation of your opening message",
  "targetChunks": [
    { "phrase": "exact chunk phrase", "meaningVi": "nghĩa tiếng Việt súc tích", "tip": "cách dùng tự nhiên trong câu" }
  ]
}`;

  for (const apiKey of allKeys) {
    try {
      const res = await fetch(`${BASE_URL}/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            id: 'dynamic_' + Date.now(),
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('[Scenario AI] Gemini error, trying next:', e);
    }
  }

  // Fallback preset
  const fallback = REAL_LIFE_PRESETS[0];
  return {
    ...fallback,
    targetChunks: targetChunks.length > 0 
      ? targetChunks.map(c => typeof c === 'string' ? { phrase: c, meaningVi: '' } : c)
      : fallback.defaultChunks.map(p => ({ phrase: p, meaningVi: '' })),
  };
}

/**
 * Đóng vai bạn bản xứ phản hồi câu nói của người học trong cuộc trò chuyện
 */
export async function continueConversation({
  history = [],
  userTranscript = '',
  scenario = {},
  chunksRemaining = [],
}) {
  const allKeys = getApiKeys();

  const fallbackResponses = [
    {
      aiReply: "That sounds great! By the way, could you tell me a bit more about what you have in mind?",
      aiReplyVi: "Nghe tuyệt quá! Tiện thể, cậu có thể kể thêm cho mình nghe cậu đang dự tính thế nào không?",
      encouragement: "Câu trả lời của bạn rất tự nhiên!",
    },
    {
      aiReply: "I completely understand what you mean. What do you think we should do next?",
      aiReplyVi: "Mình hoàn toàn hiểu ý cậu. Cậu nghĩ tiếp theo chúng ta nên làm gì?",
      encouragement: "Phản xạ giao tiếp rất tốt!",
    },
  ];

  if (allKeys.length === 0) {
    const randomPick = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    return {
      ...randomPick,
      isFinished: history.length >= 6,
    };
  }

  const prompt = `You are roleplaying as "${scenario.aiRole || 'a friendly native English speaker'}" talking to "${scenario.userRole || 'a friend'}" in this scenario: "${scenario.title || 'Casual Chat'}".
Goal: Keep the conversation flowing naturally, friendly, and supportive. Use natural spoken conversational English with warmth.

Current conversation history:
${history.map(h => `${h.sender === 'ai' ? 'AI' : 'User'}: ${h.text}`).join('\n')}
User just said: "${userTranscript}"
Remaining chunks the user is encouraged to practice: [${chunksRemaining.map(c => c.phrase || c).join(', ')}]

Return ONLY a valid JSON object matching this schema:
{
  "aiReply": "Your natural in-character reply (1-2 conversational sentences, ending with an engaging question to keep the chat going)",
  "aiReplyVi": "Bản dịch tiếng Việt của câu trả lời",
  "encouragement": "1 concise sentence in Vietnamese praising what the user expressed well or gently noting a smoother way to phrase it",
  "isFinished": boolean (true if conversation has reached a natural conclusion after 4-6 turns, otherwise false)
}`;

  for (const apiKey of allKeys) {
    try {
      const res = await fetch(`${BASE_URL}/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.65,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          return JSON.parse(rawJson);
        }
      }
    } catch (e) {
      console.warn('[Conversation AI] Gemini error:', e);
    }
  }

  return {
    ...fallbackResponses[0],
    isFinished: history.length >= 6,
  };
}
