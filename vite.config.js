import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteEdgeTtsPlugin()],
});
