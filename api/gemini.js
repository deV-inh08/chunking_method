/**
 * Vercel Serverless Function — /api/gemini
 * Proxy an toàn chuyển tiếp request tới Google Gemini API
 * Giúp giấu kín API Key hoàn toàn khỏi Network Tab của trình duyệt
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { model = 'gemini-3.6-flash', systemInstruction, contents, generationConfig } = body;

    // Ưu tiên lấy API key từ biến môi trường Server-side bí mật trên Vercel
    // Nếu client có truyền key riêng (BYOK từ Settings) thì fallback dùng key đó
    const serverApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY_2 ||
      process.env.VITE_API_KEY ||
      body.apiKey;

    if (!serverApiKey || !String(serverApiKey).trim()) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ hoặc ứng dụng.',
          status: 'MISSING_API_KEY',
        },
      });
    }

    const apiKey = String(serverApiKey).trim();
    const cleanModel = String(model).trim() || 'gemini-3.6-flash';
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;

    const requestPayload = {
      contents: contents || [],
    };
    if (systemInstruction) requestPayload.systemInstruction = systemInstruction;
    if (generationConfig) requestPayload.generationConfig = generationConfig;

    // Gọi Google Gemini API từ máy chủ Vercel (bảo mật tuyệt đối, client không thấy)
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[Gemini Proxy Error]:', err);
    return res.status(500).json({
      error: {
        code: 500,
        message: err.message || 'Lỗi xử lý yêu cầu tại server proxy.',
      },
    });
  }
}
