import { CONFIG } from '../lib/config.js';
import {
  supabaseGetUserSettings,
  supabaseSaveWord,
  supabaseGetSavedWordsCount,
} from '../lib/supabase-api.js';

// ─── Lấy API key đã đồng bộ hoặc fetch từ Supabase ──────────
async function resolveApiKey() {
  const store = await chrome.storage.local.get(['gemini_api_key', 'auth_session']);
  if (store.gemini_api_key) return store.gemini_api_key;

  const session = store.auth_session;
  if (session?.access_token && session?.user?.id) {
    try {
      const settings = await supabaseGetUserSettings(session.access_token, session.user.id);
      if (settings?.api_key) {
        await chrome.storage.local.set({ gemini_api_key: settings.api_key });
        return settings.api_key;
      }
    } catch (e) {
      console.warn('Cannot fetch user_settings:', e);
    }
  }

  return null;
}

// ─── Gọi Gemini AI dịch theo ngữ cảnh ─────────────────────────
async function callGeminiContextTranslation(word, sentence, apiKey) {
  const systemPrompt = `Bạn là từ điển AI ngữ cảnh chuyên nghiệp cho người học tiếng Anh.
Nhiệm vụ: Dịch nghĩa của TỪ/CỤM TỪ được chọn dựa trên ĐÚNG CÂU NGỮ CẢNH được cung cấp.
Bắt buộc trả về đúng cấu trúc JSON, không kèm bất kỳ giải thích nào khác.
Format:
{
  "word": "từ hoặc cụm từ nguyên văn",
  "meaningVi": "nghĩa tiếng Việt chính xác và tự nhiên nhất trong câu này (ngắn gọn, tối đa 8 từ)",
  "partOfSpeech": "loại từ (noun / verb / adjective / adverb / phrasal verb / idiom / phrase)",
  "ipa": "phiên âm IPA chuẩn của từ/cụm từ",
  "briefNote": "giải thích ngắn gọn sắc thái dùng trong câu (tối đa 12 từ tiếng Việt)"
}`;

  const userMessage = `Từ được chọn: "${word}"
Câu ngữ cảnh: "${sentence || word}"`;

  const url = `${CONFIG.GEMINI_BASE_URL}/models/${CONFIG.GEMINI_DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Lỗi Gemini API (${response.status})`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Trích xuất JSON từ phản hồi
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

// ─── Lắng nghe Message từ Content Script và Popup ─────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRANSLATE_CONTEXT') {
    (async () => {
      try {
        const { word, sentence, pageUrl, pageTitle } = request.data;
        const apiKey = await resolveApiKey();

        if (!apiKey) {
          return sendResponse({
            success: false,
            needAuth: true,
            error: 'Chưa có Gemini API Key. Hãy đăng nhập tài khoản trên Extension và cấu hình API Key trên Web App.',
          });
        }

        const translation = await callGeminiContextTranslation(word, sentence, apiKey);
        sendResponse({ success: true, data: translation });
      } catch (err) {
        console.error('Translation error:', err);
        sendResponse({ success: false, error: err.message || 'Lỗi khi dịch AI' });
      }
    })();
    return true; // Giữ channel mở cho async sendResponse
  }

  if (request.action === 'SAVE_WORD') {
    (async () => {
      try {
        const store = await chrome.storage.local.get(['auth_session']);
        const session = store.auth_session;

        if (!session?.access_token || !session?.user?.id) {
          return sendResponse({
            success: false,
            needAuth: true,
            error: 'Vui lòng đăng nhập Extension để lưu từ vào Giỏ từ!',
          });
        }

        const saved = await supabaseSaveWord(session.access_token, session.user.id, request.data);
        sendResponse({ success: true, data: saved });
      } catch (err) {
        console.error('Save word error:', err);
        sendResponse({ success: false, error: err.message || 'Không thể lưu từ' });
      }
    })();
    return true;
  }

  if (request.action === 'GET_STATUS') {
    (async () => {
      try {
        const store = await chrome.storage.local.get(['auth_session', 'gemini_api_key']);
        const session = store.auth_session;
        let count = 0;
        let hasApiKey = Boolean(store.gemini_api_key);

        if (session?.access_token && session?.user?.id) {
          if (!hasApiKey) {
            const apiKey = await resolveApiKey();
            hasApiKey = Boolean(apiKey);
          }
          count = await supabaseGetSavedWordsCount(session.access_token, session.user.id);
        }

        sendResponse({
          success: true,
          isLoggedIn: Boolean(session?.access_token),
          user: session?.user || null,
          hasApiKey,
          savedCount: count,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
