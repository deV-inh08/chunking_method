import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function viteEdgeTtsPlugin() {
  const handler = async (req, res, next) => {
    if (!req.url.startsWith('/api/tts')) {
      return next();
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      // Dynamic import so Vite's client bundler never resolves this Node.js-only package
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
      const parsedUrl = new URL(req.url, 'http://localhost');
      const text = parsedUrl.searchParams.get('text');
      const voice = parsedUrl.searchParams.get('voice') || 'en-US-JennyNeural';

      if (!text || !text.trim()) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing text parameter' }));
        return;
      }

      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text.trim());

      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      audioStream.pipe(res);

      audioStream.on('error', (err) => {
        console.error('[TTS Plugin] Stream error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'TTS stream error' }));
        }
      });
    } catch (err) {
      console.error('[TTS Plugin] Handler error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  };

  return {
    name: 'vite-edge-tts-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function viteGeminiProxyPlugin() {
  const handler = async (req, res, next) => {
    if (!req.url.startsWith('/api/gemini')) {
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', chunk => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        // Đọc key từ process.env (Vite tự nạp .env)
        const serverApiKey =
          process.env.GEMINI_API_KEY ||
          process.env.GEMINI_API_KEY_2 ||
          process.env.VITE_API_KEY ||
          body.apiKey;

        if (!serverApiKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: { message: 'Chưa cấu hình GEMINI_API_KEY trong file .env hoặc cài đặt.' }
          }));
          return;
        }

        const cleanModel = String(body.model || 'gemini-3.6-flash').trim();
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;

        const requestPayload = {
          contents: body.contents || [],
        };
        if (body.systemInstruction) requestPayload.systemInstruction = body.systemInstruction;
        if (body.generationConfig) requestPayload.generationConfig = body.generationConfig;

        const response = await fetch(googleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': serverApiKey.trim(),
          },
          body: JSON.stringify(requestPayload),
        });

        const data = await response.json();
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('[Vite Gemini Proxy Error]:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
  };

  return {
    name: 'vite-gemini-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteEdgeTtsPlugin(), viteGeminiProxyPlugin()],
});
