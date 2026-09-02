// ─── Gemini Live API WebSocket & Web Audio Service ───────────────────────

export const LIVE_MODELS = [
  'models/gemini-2.5-flash-native-audio-dialog',
  'models/gemini-2.0-flash-exp',
  'models/gemini-2.0-flash',
];

export const SPEAKING_CONFIG = {
  MIN_TURNS: 3,           // Tối thiểu số lượt user nói trước khi có thể kết thúc
  MAX_TURNS: 5,           // Tối đa số lượt, tự động chuyển WRAP_UP nếu chạm mốc
  NUDGE_AT_TURN: 4,       // Nếu đến lượt này mà chưa dùng chunk → AI chủ động dẫn dắt
  SESSION_TIMEOUT_MS: 3 * 60 * 1000,
  MODEL: LIVE_MODELS[0],
  GRADING_MODEL: 'gemini-2.5-flash-lite',
};

// ─── Audio Helpers (PCM 16kHz Mono Encoding & 24kHz Playback) ────────────

function floatTo16BitPCM(input) {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToFloat32Array(base64) {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const samples = len / 2;
  const floatArray = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    floatArray[i] = int16 / 32768;
  }
  return floatArray;
}

/**
 * Quản lý phát âm thanh mượt mà qua Web Audio Context
 */
class AudioPlayer {
  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioCtx = null;
    this.nextPlayTime = 0;
    this.activeSources = [];
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: this.sampleRate });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.nextPlayTime = this.audioCtx.currentTime;
  }

  playChunk(float32Array) {
    if (!this.audioCtx) this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!float32Array || float32Array.length === 0) return;

    const buffer = this.audioCtx.createBuffer(1, float32Array.length, this.sampleRate);
    buffer.getChannelData(0).set(float32Array);

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);

    const startTime = Math.max(this.audioCtx.currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
    };
  }

  stop() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch {}
    });
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  close() {
    this.stop();
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }
}

// ─── GeminiLiveSession Class ──────────────────────────────────────────────

export class GeminiLiveSession {
  constructor({
    apiKey,
    systemInstruction,
    model = SPEAKING_CONFIG.MODEL,
    onStateChange,
    onTranscript,
    onAiSpeaking,
    onVolume,
    onError,
  }) {
    this.apiKey = apiKey;
    this.systemInstruction = systemInstruction;
    this.model = model;
    this.onStateChange = onStateChange || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onAiSpeaking = onAiSpeaking || (() => {});
    this.onVolume = onVolume || (() => {});
    this.onError = onError || (() => {});

    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.player = new AudioPlayer(24000);
    this.transcriptHistory = [];
    this.state = 'IDLE';
    this.turnCount = 0;
    this.isConnected = false;
    this.isAiSpeaking = false;
    this.isMuted = false;
  }

  setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  /**
   * Bắt đầu kết nối WebSocket và thu âm
   */
  async start() {
    try {
      this.setState('CONNECTING');
      this.player.init();

      // 1. Yêu cầu quyền Micro
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Mở kết nối WebSocket tới Gemini Live API
      const host = 'generativelanguage.googleapis.com';
      const path = '/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
      const url = `wss://${host}${path}?key=${encodeURIComponent(this.apiKey)}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Bước 1: Gửi setup handshake
        this.sendSetupMessage();
        // Bước 2: Bắt đầu thu âm gửi audio
        this.startAudioRecording();
      };

      this.ws.onmessage = async (event) => {
        let data = event.data;
        if (data instanceof Blob) {
          data = await data.text();
        }
        try {
          const msg = JSON.parse(data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Error parsing live WS message:', err, data);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Gemini Live WebSocket error:', err);
        this.onError(new Error('Không thể kết nối máy chủ Gemini Live API. Vui lòng kiểm tra API key.'));
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        console.log('Gemini Live WebSocket closed:', event.code, event.reason);
      };

    } catch (err) {
      console.error('Failed to start speaking session:', err);
      this.onError(err);
      this.stop();
    }
  }

  /**
   * Gửi setup configuration
   */
  sendSetupMessage() {
    const setupMsg = {
      setup: {
        model: this.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede', // Giọng nữ tự nhiên
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: this.systemInstruction }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMsg));
  }

  /**
   * Gửi trigger yêu cầu AI bắt đầu nói câu chào Warm-up
   */
  sendInitialGreetingTrigger() {
    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) return;
    const triggerMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'Hello! I am ready to practice speaking. Please greet me warmly and invite me to read the warm-up sentence out loud.',
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };
    try {
      this.ws.send(JSON.stringify(triggerMsg));
      this.setState('WARMUP');
    } catch (e) {
      console.error('Failed to send greeting trigger:', e);
    }
  }

  /**
   * Gửi text do user nhập hoặc nói
   */
  sendUserTextMessage(text) {
    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN || !text.trim()) return;
    this.appendTranscript('user', text);
    const msg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text.trim() }],
          },
        ],
        turnComplete: true,
      },
    };
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (e) {
      console.error('Failed to send text message:', e);
    }
  }

  /**
   * Bắt đầu thu âm 16kHz PCM và stream đều đặn
   */
  startAudioRecording() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN || this.isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Tính volume (RMS)
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const volume = Math.min(100, Math.round(rms * 280));
      this.onVolume(volume);

      // Ngắt lời AI nếu user nói to
      if (volume > 22 && this.isAiSpeaking) {
        this.player.stop();
        this.isAiSpeaking = false;
        this.onAiSpeaking(false);
      }

      // Convert Float32 -> 16-bit PCM -> Base64
      const pcmBuffer = floatTo16BitPCM(inputData);
      const base64Data = arrayBufferToBase64(pcmBuffer);

      const clientChunk = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data,
            },
          ],
        },
      };

      try {
        this.ws.send(JSON.stringify(clientChunk));
      } catch {}
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Xử lý gói tin phản hồi từ Gemini Live
   */
  handleServerMessage(msg) {
    // 0. Setup hoàn tất -> Kích hoạt AI chào mở màn ngay
    if (msg.setupComplete) {
      console.log('Gemini Live Setup complete, sending initial greeting trigger...');
      this.sendInitialGreetingTrigger();
      return;
    }

    // 1. Nhận các mẩu âm thanh & text từ AI
    if (msg.serverContent?.modelTurn?.parts) {
      const parts = msg.serverContent.modelTurn.parts;
      for (const part of parts) {
        // Nhận audio PCM 24kHz từ AI
        if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
          this.isAiSpeaking = true;
          this.onAiSpeaking(true);
          const float32Samples = base64ToFloat32Array(part.inlineData.data);
          this.player.playChunk(float32Samples);
        }

        // Nhận text transcript nếu model gửi kèm
        if (part.text) {
          this.appendTranscript('ai', part.text);
        }
      }
    }

    // 2. Khi AI nói xong 1 lượt
    if (msg.serverContent?.turnComplete) {
      this.isAiSpeaking = false;
      this.onAiSpeaking(false);
      this.turnCount += 1;

      if (this.turnCount === 1 && this.state === 'WARMUP') {
        this.setState('SITUATION_INTRO');
      } else if (this.turnCount >= 2 && this.state !== 'WRAP_UP' && this.state !== 'GRADING') {
        this.setState('CONVERSATION');
      }

      if (this.turnCount >= SPEAKING_CONFIG.MAX_TURNS && this.state !== 'WRAP_UP') {
        this.setState('WRAP_UP');
      }
    }

    // 3. User interrupted
    if (msg.serverContent?.interrupted) {
      this.player.stop();
      this.isAiSpeaking = false;
      this.onAiSpeaking(false);
    }
  }

  appendTranscript(role, text) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const lastItem = this.transcriptHistory[this.transcriptHistory.length - 1];

    if (lastItem && lastItem.role === role) {
      lastItem.text += ' ' + cleanText;
    } else {
      this.transcriptHistory.push({
        role,
        text: cleanText,
        timestamp: Date.now(),
      });
    }

    this.onTranscript([...this.transcriptHistory]);
  }

  stop() {
    this.isConnected = false;

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }

    if (this.player) {
      this.player.stop();
    }
  }

  getFormattedTranscript() {
    if (this.transcriptHistory.length === 0) return 'User and AI conversation';
    return this.transcriptHistory
      .map(item => `${item.role === 'ai' ? 'AI Partner' : 'User'}: "${item.text}"`)
      .join('\n\n');
  }
}
