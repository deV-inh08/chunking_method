import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

/**
 * Vercel Serverless Function — /api/tts
 * Proxies text → Microsoft Edge Neural TTS → MP3 audio stream
 *
 * Query params:
 *   text  — the sentence/phrase to synthesize (URL-encoded)
 *   voice — Azure Neural voice name (default: en-US-JennyNeural)
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voice = 'en-US-JennyNeural' } = req.query;

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Missing required parameter: text' });
  }

  const safeText = String(text).trim().slice(0, 2000);
  const safeVoice = String(voice).trim();

  console.log(`[TTS] "${safeText.slice(0, 60)}" voice=${safeVoice}`);

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(safeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(safeText);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200);

    audioStream.pipe(res);

    audioStream.on('error', (err) => {
      console.error('[TTS] Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'TTS stream failed' });
      }
    });
  } catch (err) {
    console.error('[TTS] Handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'TTS synthesis failed' });
    }
  }
}
