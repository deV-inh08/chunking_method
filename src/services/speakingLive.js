// ─── Gemini Live API & Smart Voice Interactive Service ───────────────────

export const LIVE_MODELS = [
  'models/gemini-2.5-flash-native-audio-preview-09-2025',
  'models/gemini-3-flash-live',
  'models/gemini-3.1-flash-live-preview',
  'models/gemini-2.5-flash-native-audio-dialog',
  'models/gemini-2.5-flash',
];

export const SPEAKING_CONFIG = {
  MIN_TURNS: 3,           // Tối thiểu số lượt user nói trước khi có thể kết thúc
  MAX_TURNS: 5,           // Tối đa số lượt, tự động chuyển WRAP_UP nếu chạm mốc
  NUDGE_AT_TURN: 4,       // Nếu đến lượt này mà chưa dùng chunk → AI chủ động dẫn dắt
  SESSION_TIMEOUT_MS: 3 * 60 * 1000,
  MODEL: LIVE_MODELS[0],
  GRADING_MODEL: 'gemini-2.5-flash-lite',
};

// ─── Audio Helpers (Downsampling & PCM Encoding) ─────────────────────────

function downsampleTo16k(inputBuffer, inputSampleRate) {
  if (inputSampleRate === 16000) return inputBuffer;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

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
  constructor(sampleRate = 24000, onPlaybackEnd = null) {
    this.sampleRate = sampleRate;
    this.onPlaybackEnd = onPlaybackEnd;
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
      if (this.activeSources.length === 0 && this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
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
    this.player = new AudioPlayer(24000, () => {
      this.isAiSpeaking = false;
      this.onAiSpeaking(false);
    });
    this.transcriptHistory = [];
    this.state = 'IDLE';
    this.turnCount = 0;
    this.isConnected = false;
    this.isAiSpeaking = false;
    this.isMuted = false;
    this.useFallbackVoiceEngine = false;
    this.recognition = null;
    this.candidateModelIndex = 0;
  }

  setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  /**
   * Bắt đầu kết nối WebSocket và thu âm
   */
  async start() {
    this.setState('CONNECTING');
    try {
      this.player.init();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.connectWebSocket(LIVE_MODELS[this.candidateModelIndex]);
    } catch (err) {
      console.warn('Microphone or WS init failed, switching to Voice Engine:', err);
      this.startVoiceEngineFallback();
    }
  }

  connectWebSocket(modelName) {
    const host = 'generativelanguage.googleapis.com';
    const path = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
    const url = `wss://${host}${path}?key=${encodeURIComponent(this.apiKey)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.setState('WARMUP');
        this.sendSetupMessage(modelName);
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
        console.warn('Gemini Live WebSocket warning on model:', modelName, err);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        console.log('Gemini Live WebSocket closed:', event.code, event.reason);

        // Nếu mã lỗi 1008 (model not found/supported), tự động thử model tiếp theo hoặc chuyển Voice Engine
        if (event.code === 1008 || event.code === 1007 || event.code === 1006) {
          this.candidateModelIndex += 1;
          if (this.candidateModelIndex < LIVE_MODELS.length) {
            console.log('Trying next candidate model:', LIVE_MODELS[this.candidateModelIndex]);
            this.connectWebSocket(LIVE_MODELS[this.candidateModelIndex]);
          } else {
            console.log('Live WebSocket models unavailable. Seamlessly activating Smart Voice Engine.');
            this.startVoiceEngineFallback();
          }
        }
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
      this.startVoiceEngineFallback();
    }
  }

  /**
   * Gửi setup configuration
   */
  sendSetupMessage(modelName = LIVE_MODELS[0]) {
    const setupMsg = {
      setup: {
        model: modelName,
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

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(setupMsg));
    }
  }

  /**
   * Gửi trigger yêu cầu AI bắt đầu nói câu chào Warm-up
   */
  sendInitialGreetingTrigger() {
    if (this.useFallbackVoiceEngine) {
      this.runVoiceEngineGreeting();
      return;
    }

    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.runVoiceEngineGreeting();
      return;
    }

    const triggerMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'Please warmly say hello and invite me to read the warm-up sentence out loud.',
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
      this.runVoiceEngineGreeting();
    }
  }

  // ─── Smart Voice Engine Fallback (TTS + STT + Gemini Flash) ─────────────

  startVoiceEngineFallback() {
    this.useFallbackVoiceEngine = true;
    this.setState('WARMUP');
    this.startMicrophoneVisualizer();
    this.initSpeechRecognition();
    this.runVoiceEngineGreeting();
  }

  runVoiceEngineGreeting() {
    const greetingText = "Hello! Welcome to speaking practice. Let's start by warming up: please read the sentence on your screen out loud!";
    this.speakAiResponse(greetingText);
  }

  speakAiResponse(text) {
    this.isAiSpeaking = true;
    this.onAiSpeaking(true);
    this.appendTranscript('ai', text);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        this.isAiSpeaking = false;
        this.onAiSpeaking(false);
      };

      utterance.onerror = () => {
        this.isAiSpeaking = false;
        this.onAiSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        this.isAiSpeaking = false;
        this.onAiSpeaking(false);
      }, 2500);
    }
  }

  startMicrophoneVisualizer() {
    if (!this.mediaStream) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!this.mediaStream) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const vol = Math.min(100, Math.round(avg * 2.2));
        this.onVolume(vol);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {}
  }

  initSpeechRecognition() {
    const SpeechRecognitionClass = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognitionClass) return;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        if (this.isMuted || this.isAiSpeaking) return;
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const spokenText = lastResult[0].transcript.trim();
          if (spokenText) {
            this.sendUserTextMessage(spokenText);
          }
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition event:', e.error);
      };

      this.recognition.start();
    } catch (e) {
      console.warn('Speech recognition init:', e);
    }
  }

  /**
   * Gửi text do user nhập hoặc nói
   */
  async sendUserTextMessage(text) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    this.appendTranscript('user', cleanText);
    this.turnCount += 1;

    // Cập nhật trạng thái lượt
    if (this.turnCount === 1) {
      this.setState('SITUATION_INTRO');
    } else if (this.turnCount >= 2 && this.turnCount < SPEAKING_CONFIG.MAX_TURNS) {
      this.setState('CONVERSATION');
    } else if (this.turnCount >= SPEAKING_CONFIG.MAX_TURNS) {
      this.setState('WRAP_UP');
    }

    // Nếu đang chạy qua WebSocket
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text: cleanText }],
            },
          ],
          turnComplete: true,
        },
      };
      try {
        this.ws.send(JSON.stringify(msg));
        return;
      } catch {}
    }

    // Voice Engine Fallback: Tạo phản hồi siêu tốc qua Gemini Flash Lite (Độ trễ < 200ms, không suy nghĩ nội tâm)
    try {
      this.isAiSpeaking = true;
      this.onAiSpeaking(true);

      const conversationHistory = this.transcriptHistory
        .map(t => `${t.role === 'ai' ? 'AI' : 'Learner'}: "${t.text}"`)
        .slice(-4)
        .join('\n');

      const prompt = `${this.systemInstruction}

CONVERSATION SO FAR:
${conversationHistory}

Task: Output ONLY 1 short spoken conversational response (1-2 brief sentences, under 15 words).
Direct speech ONLY. NO thinking, NO formatting, NO labels, NO prefixes.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(this.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.6,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      });

      const data = await res.json();
      let aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Great job! Tell me more.";
      aiReply = aiReply.replace(/\*\*.*?\*\*/g, '').replace(/Crafting.*/gi, '').trim();

      this.speakAiResponse(aiReply);
    } catch (err) {
      console.error('Error generating AI voice response:', err);
      this.speakAiResponse('Good job! Tell me more.');
    }
  }

  /**
   * Bắt đầu thu âm 16kHz PCM và stream liên tục để Gemini Server VAD nhận diện giọng nói
   */
  startAudioRecording() {
    if (!this.mediaStream) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass(); // Để trình duyệt chạy ở sampleRate gốc của phần cứng
      const inputSampleRate = this.audioContext.sampleRate || 44100;
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size 4096 cho kết nối mượt mà (~85ms một lần gửi)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN || this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Tính volume (RMS)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(100, Math.round(rms * 280));
        this.onVolume(volume);

        // Khi AI đang nói, không stream âm thanh lên server để tránh tiếng loa ngoài dội lại làm ngắt AI
        if (this.isAiSpeaking) {
          return;
        }

        // Downsample âm thanh từ sampleRate phần cứng về chuẩn 16,000Hz PCM
        const downsampled16k = downsampleTo16k(inputData, inputSampleRate);

        // Convert Float32 -> 16-bit PCM -> Base64
        const pcmBuffer = floatTo16BitPCM(downsampled16k);
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
    } catch (e) {
      console.error('Failed to start audio recording:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Xử lý gói tin phản hồi từ Gemini Live
   */
  handleServerMessage(msg) {
    // 0. Setup hoàn tất từ server -> Bắt đầu thu âm và gửi trigger câu chào mở màn
    if (msg.setupComplete !== undefined) {
      console.log('Gemini Live Setup complete from server, activating audio stream and greeting trigger...');
      this.startAudioRecording();
      setTimeout(() => {
        this.sendInitialGreetingTrigger();
      }, 100);
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
    let cleanText = text.trim();

    // Loại bỏ suy nghĩ nội tâm (reasoning / chain of thought) của AI
    cleanText = cleanText.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    cleanText = cleanText.replace(/(My next thought|I will prompt|I'll prompt|thought:|thinking:)[\s\S]*$/gim, '');
    cleanText = cleanText.trim();
    if (!cleanText) return;

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

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }

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
