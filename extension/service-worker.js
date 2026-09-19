import { CONFIG } from './lib/config.js';
import {
  supabaseGetUserSettings,
  supabaseSaveWord,
  supabaseGetSavedWordsCount,
} from './lib/supabase-api.js';

// ─── Lấy API key đã đồng bộ hoặc fetch từ Supabase ──────────
async function resolveApiKey() {
  try {
    const store = await chrome.storage.local.get(['gemini_api_key', 'auth_session']);
    if (store.gemini_api_key && store.gemini_api_key.trim()) {
      return store.gemini_api_key.trim();
    }

    const session = store.auth_session;
    if (session?.access_token && session?.user?.id) {
      try {
        const settings = await supabaseGetUserSettings(session.access_token, session.user.id);
        if (settings?.api_key && settings.api_key.trim()) {
          const key = settings.api_key.trim();
          await chrome.storage.local.set({ gemini_api_key: key });
          return key;
        }
      } catch (e) {
        console.warn('Cannot fetch user_settings:', e);
      }
    }
  } catch (err) {
    console.error('resolveApiKey error:', err);
  }

  return null;
}

// Cache lưu tạm các kết quả dịch để trả về tức thì 0ms khi tra lại
const translationCache = new Map();

// ─── Gọi Gemini AI dịch theo ngữ cảnh (Siêu tốc với Flash-Lite & Fallback) ──
async function callGeminiContextTranslation(word, sentence, apiKey) {
  const cacheKey = `${word.trim().toLowerCase()}_${(sentence || '').slice(0, 50).toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const systemPrompt = `Bạn là từ điển AI ngữ cảnh chuyên nghiệp. Dịch nghĩa của TỪ/CỤM TỪ được chọn dựa trên ĐÚNG CÂU NGỮ CẢNH.
Trả về JSON thuần:
{
  "word": "từ",
  "meaningVi": "nghĩa tiếng Việt chính xác và ngắn gọn (tối đa 6 từ)",
  "partOfSpeech": "loại từ (noun/verb/adj/phrasal verb/idiom)",
  "ipa": "/phiên âm/",
  "briefNote": "ghi chú ngắn gọn (tối đa 10 từ tiếng Việt)"
}`;

  const userMessage = `Từ được chọn: "${word}"
Câu ngữ cảnh: "${sentence || word}"`;

  const modelsToTry = CONFIG.GEMINI_MODELS || ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const url = `${CONFIG.GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 200,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Model ${model} trả về HTTP ${response.status}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Lưu vào cache
      translationCache.set(cacheKey, parsed);
      return parsed;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`Thử model ${model} thất bại:`, err.message);
      lastError = err;
      // Thử tiếp model kế tiếp
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ Gemini AI.');
}

// ─── Lắng nghe Message từ Content Script và Popup ─────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRANSLATE_CONTEXT') {
    (async () => {
      try {
        const { word, sentence } = request.data || {};
        if (!word) {
          return sendResponse({ success: false, error: 'Không tìm thấy từ cần dịch' });
        }

        const apiKey = await resolveApiKey();
        if (!apiKey) {
          return sendResponse({
            success: false,
            needAuth: true,
            error: 'Chưa có Gemini API Key. Hãy mở icon Extension để đăng nhập hoặc nhập API Key.',
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
            error: 'Vui lòng đăng nhập trên Extension để lưu từ vào Giỏ từ!',
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
          try {
            count = await supabaseGetSavedWordsCount(session.access_token, session.user.id);
          } catch {
            count = 0;
          }
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

  // Fallback nếu action không xác định
  return false;
});
