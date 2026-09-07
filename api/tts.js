import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

/**
 * Vercel Serverless Function — /api/tts
 * Buffer approach (more reliable than streaming on Vercel)
 */
export default async function handler(req, res) {
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

  console.log(`[TTS] voice=${safeVoice} text="${safeText.slice(0, 60)}"`);

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(safeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(safeText);

    // Buffer all chunks then send — more reliable on Vercel than pipe/streaming
    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);
    console.log(`[TTS] Generated ${audioBuffer.length} bytes`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).end(audioBuffer);
  } catch (err) {
    console.error('[TTS] Error:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'TTS synthesis failed' });
    }
  }
}
