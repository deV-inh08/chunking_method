import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, Volume2, Send,
  CheckCircle, RotateCcw, ArrowLeft,
  Award, Play, AlertCircle, Square,
  Settings, Check, X,
} from 'lucide-react';
import { getPracticeDraft, getSettings, saveSettings } from '../../store/storage';
import { transcribeAudioWithGemini } from '../../services/ai';

// ─── AI Voice Candidates ───────────────────────────────────────
const AI_VOICES = [
  { id: 'en-US-female', label: '👩 🇺🇸 Anh - Mỹ (Nữ)', lang: 'en-US', gender: 'female', sample: 'Hello! Let\'s practice American English pronunciation.' },
  { id: 'en-US-male', label: '👨 🇺🇸 Anh - Mỹ (Nam)', lang: 'en-US', gender: 'male', sample: 'Hi there! Welcome to American English speaking practice.' },
  { id: 'en-GB-female', label: '👩 🇬🇧 Anh - Anh (Nữ)', lang: 'en-GB', gender: 'female', sample: 'Good day! Let\'s practise British English pronunciation.' },
  { id: 'en-GB-male', label: '👨 🇬🇧 Anh - Anh (Nam)', lang: 'en-GB', gender: 'male', sample: 'Hello! Ready to practise your British accent?' },
  { id: 'en-AU-female', label: '👩 🇦🇺 Anh - Úc (Nữ)', lang: 'en-AU', gender: 'female', sample: 'G\'day mate! Let\'s improve your English speaking skills.' },
];

function findBestVoice(voiceConfig, customVoices = []) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = customVoices.length > 0 ? customVoices : window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (voiceConfig.lang || 'en-US').toLowerCase();
  const targetGender = voiceConfig.gender || 'female';

  const langVoices = voices.filter(v => {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    return l.startsWith(targetLang) || l.startsWith(targetLang.split('-')[0]);
  });

  // Identifiers for Android Google TTS, iOS Siri, Windows & Mac TTS
  const maleKeywords = ['male', 'david', 'guy', 'george', 'james', 'daniel', 'richard', 'alex', 'fred', 'rishi', 'mark', 'tom', 'oliver', 'iom', 'iob', 'iol', 'rjs', 'aub'];
  const femaleKeywords = ['female', 'zira', 'samantha', 'jenny', 'victoria', 'karen', 'susan', 'catherine', 'hazel', 'moira', 'tessa', 'ava', 'emma', 'sfg', 'tpd'];

  const candidatePool = langVoices.length > 0 ? langVoices : voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));

  const matchedByGender = candidatePool.filter(v => {
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    if (targetGender === 'male') {
      return maleKeywords.some(k => name.includes(k) || uri.includes(k));
    } else {
      return femaleKeywords.some(k => name.includes(k) || uri.includes(k));
    }
  });

  if (matchedByGender.length > 0) return matchedByGender[0];
  if (candidatePool.length > 0) return candidatePool[0];
  return voices[0] || null;
}

// ─── ScoreRing Component ───────────────────────────────────────
function ScoreRing({ score }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#fbbf24' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontWeight: 800, fontSize: 24, color, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>ĐIỂM</span>
      </div>
    </div>
  );
}

// ─── AudioWaveVisualizer Component ─────────────────────────────
function AudioWaveVisualizer({ volume = 0, isRecording = false, isAiSpeaking = false }) {
  const bars = [16, 28, 44, 60, 38, 22, 52, 68, 32, 18];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 46 }}>
      {bars.map((baseHeight, i) => {
        const factor = isAiSpeaking
          ? (0.5 + 0.5 * Math.sin(i * 1.2))
          : isRecording
          ? Math.min(1.6, Math.max(0.2, volume / 35))
          : 0.15;
        const barHeight = Math.max(6, Math.min(46, Math.round(baseHeight * factor)));
        const barColor = isAiSpeaking
          ? 'linear-gradient(180deg, #38bdf8, #818cf8)'
          : isRecording
          ? 'linear-gradient(180deg, #ef4444, #f97316)'
          : 'rgba(255, 255, 255, 0.12)';

        return (
          <div
            key={i}
            style={{
              width: 4.5,
              height: `${barHeight}px`,
              borderRadius: 3,
              background: barColor,
              transition: 'height 0.1s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Word-by-Word Matching Algorithm ────────────────────────────
function analyzeSpokenSentence(targetText, spokenText, chunkPhrase = '') {
  if (!targetText) return { words: [], accuracy: 0, isPassed: false, spokenText: '' };

  const cleanTarget = targetText.trim();
  const cleanSpoken = (spokenText || '').trim();

  const targetWords = cleanTarget.split(/\s+/);
  const spokenWordsNorm = cleanSpoken
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase())
    .filter(Boolean);

  const chunkWordsNorm = (chunkPhrase || '')
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, ''))
    .filter(Boolean);

  const pool = [...spokenWordsNorm];
  let correctCount = 0;

  const words = targetWords.map((originalWord) => {
    const norm = originalWord.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
    const isChunkPart = chunkWordsNorm.includes(norm);

    const matchIdx = pool.indexOf(norm);
    if (matchIdx !== -1) {
      correctCount++;
      pool.splice(matchIdx, 1);
      return {
        word: originalWord,
        status: isChunkPart ? 'chunk' : 'correct',
      };
    } else {
      return {
        word: originalWord,
        status: 'incorrect',
        note: 'Chưa phát âm hoặc nói chưa chuẩn',
      };
    }
  });

  const accuracy = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;
  // Đạt nếu đúng >= 65% số từ và có nội dung nói
  const isPassed = accuracy >= 65 && cleanSpoken.length > 0;

  return {
    targetText,
    spokenText: cleanSpoken,
    words,
    accuracy,
    isPassed,
  };
}

// ─── Full-Screen Speaking Practice Component ───────────────────
export function SpeakingSession({
  chunk,
  exercises = [],
  onComplete,
  onClose,
  onToast,
}) {
  // Steps: 0 = Sentence 1 (Basic), 1 = Sentence 2 (Intermediate), 2 = Summary
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [volume, setVolume] = useState(0);
  const [liveSpokenText, setLiveSpokenText] = useState('');

  // Voices list from SpeechSynthesis
  const [systemVoices, setSystemVoices] = useState([]);

  // AI Voice Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => {
    return getSettings().speakingVoice || 'en-US-female';
  });
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Result history of each sentence
  const [stepResults, setStepResults] = useState([null, null]);
  const [currentAttempt, setCurrentAttempt] = useState(null); // { spokenText, words, accuracy, isPassed }

  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const capturedSpeechRef = useRef('');

  // Load available system voices asynchronously
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices() || [];
        if (v.length > 0) {
          setSystemVoices(v);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Lấy câu học ổn định
  const sentenceList = useMemo(() => {
    const draftData = getPracticeDraft(chunk.id) || {};
    const inputs = draftData.inputs || {};
    const basicEx = exercises.find(e => e.level === 1) || exercises[0] || {};
    const interEx = exercises.find(e => e.level === 2) || exercises[1] || {};

    return [
      {
        id: 's1',
        title: 'Câu 1: Cơ bản (Khởi động)',
        level: 'Cơ bản',
        vietnameseSentence: basicEx.vietnameseSentence || `Tôi muốn ${chunk.meaningVi}.`,
        sampleTranslation: inputs[0] || basicEx.sampleTranslation || `I want to ${chunk.phrase}.`,
      },
      {
        id: 's2',
        title: 'Câu 2: Tình huống thực tế',
        level: 'Trung cấp',
        vietnameseSentence: interEx.vietnameseSentence || `Công ty chúng tôi đã quyết định ${chunk.meaningVi} vào năm ngoái.`,
        sampleTranslation: inputs[1] || interEx.sampleTranslation || `Our company decided to ${chunk.phrase} last year.`,
      },
    ];
  }, [chunk, exercises]);

  const currentSentence = sentenceList[currentStepIndex] || sentenceList[0];

  // Phát âm thanh mẫu của AI qua Web Speech Synthesis (Hỗ trợ Nam / Nữ rõ rệt)
  const playAiVoice = useCallback((text, onEndCallback, customVoiceId) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceId = customVoiceId || selectedVoiceId;
    const selectedVoiceObj = AI_VOICES.find(v => v.id === voiceId) || AI_VOICES[0];
    utterance.lang = selectedVoiceObj.lang;

    const matchedVoice = findBestVoice(selectedVoiceObj, systemVoices);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // ĐIỀU CHỈNH PITCH & RATE ĐỂ PHÂN BIỆT RÕ RÀNG GIỌNG NAM (TRẦM) VÀ NỮ (THANH)
    if (selectedVoiceObj.gender === 'male') {
      utterance.pitch = 0.65; // Giọng nam trầm ấm, rõ rệt trên mọi thiết bị
      utterance.rate = selectedVoiceObj.lang === 'en-GB' ? 0.86 : 0.88;
    } else {
      utterance.pitch = 1.18; // Giọng nữ tự nhiên, trong trẻo
      utterance.rate = selectedVoiceObj.lang === 'en-GB' ? 0.92 : 0.95;
    }

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoiceId, systemVoices]);

  // Đổi giọng AI
  const handleSelectVoice = (voiceId) => {
    setSelectedVoiceId(voiceId);
    saveSettings({ ...getSettings(), speakingVoice: voiceId });
    const voiceObj = AI_VOICES.find(v => v.id === voiceId);
    if (voiceObj) {
      playAiVoice(voiceObj.sample, null, voiceId);
    }
  };

  // Đánh giá câu nói của user
  const handleEvaluateSpokenText = useCallback((spokenText) => {
    setIsEvaluating(false);

    if (!spokenText || !spokenText.trim()) {
      if (onToast) onToast('warning', 'Chưa nhận diện được giọng nói. Hãy nói to hơn và đưa micro lại gần nhé!');
      setCurrentAttempt({
        targetText: currentSentence.sampleTranslation,
        spokenText: '(Chưa nhận diện được giọng nói)',
        words: currentSentence.sampleTranslation.split(/\s+/).map(w => ({ word: w, status: 'incorrect', note: 'Chưa nghe thấy' })),
        accuracy: 0,
        isPassed: false,
      });
      return;
    }

    const targetText = currentSentence.sampleTranslation;
    const result = analyzeSpokenSentence(targetText, spokenText, chunk.phrase);
    setCurrentAttempt(result);

    if (result.isPassed) {
      // Lưu kết quả của step
      setStepResults(prev => {
        const next = [...prev];
        next[currentStepIndex] = result;
        return next;
      });

      // AI khen ngợi
      playAiVoice('Great job! Excellent pronunciation.', () => {
        setTimeout(() => {
          if (currentStepIndex === 0) {
            setCurrentStepIndex(1);
            setCurrentAttempt(null);
            setLiveSpokenText('');
          } else {
            setCurrentStepIndex(2); // Summary
          }
        }, 600);
      });
    } else {
      // AI nhắc nhở đọc lại
      playAiVoice("Almost there! Let's try saying this sentence one more time.");
    }
  }, [currentSentence, chunk.phrase, currentStepIndex, playAiVoice, onToast]);

  // Bắt đầu thu âm khi User NHẤN NÓI
  const startRecording = useCallback(async () => {
    if (isAiSpeaking) return;
    capturedSpeechRef.current = '';
    setLiveSpokenText('');
    setCurrentAttempt(null);
    audioChunksRef.current = [];

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }

      // Audio Context cho Visualizer
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVol = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setVolume(Math.min(100, Math.round(avg * 2.5)));
          requestAnimationFrame(checkVol);
        };
        checkVol();
      }

      // 1. MediaRecorder Capture (Đa nền tảng: Chrome, Brave, Safari, Android)
      try {
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const recorder = preferredMime
          ? new MediaRecorder(mediaStreamRef.current, { mimeType: preferredMime })
          : new MediaRecorder(mediaStreamRef.current);

        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('MediaRecorder init warning:', recErr);
      }

      // 2. Speech Recognition (Real-time fallback feedback)
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          const fullText = text.trim();
          if (fullText) {
            capturedSpeechRef.current = fullText;
            setLiveSpokenText(fullText);
          }
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition status:', e.error);
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Recognition start warning:', e);
        }
      }

      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access warning:', err);
      if (onToast) onToast('warning', 'Không thể mở micro. Hãy kiểm tra quyền truy cập microphone trên trình duyệt.');
    }
  }, [isAiSpeaking, onToast]);

  // Dừng thu âm & bắt đầu chấm điểm (Kết hợp Web Speech API + Gemini Audio Fallback)
  const stopRecordingAndGrade = useCallback(async () => {
    setIsRecording(false);
    setIsEvaluating(true);
    setVolume(0);

    // Dừng MediaRecorder và flush toàn bộ dữ liệu audio trước
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise(resolve => {
        mediaRecorderRef.current.onstop = () => {
          resolve();
        };
        try {
          mediaRecorderRef.current.requestData(); // Ép flush dữ liệu audio còn trong buffer!
          mediaRecorderRef.current.stop();
        } catch {
          resolve();
        }
      });
    }

    // Đợi 200ms để SpeechRecognition nhận nốt event cuối
    await new Promise(r => setTimeout(r, 200));

    let spoken = capturedSpeechRef.current.trim() || liveSpokenText.trim();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

    // NẾU Web Speech API chưa bắt được chữ (đặc biệt trên Android Brave / Chrome Mobile)
    // Dùng Gemini Flash Audio Multimodal để chuyển giọng nói thành văn bản chính xác 100%!
    if (!spoken && audioChunksRef.current.length > 0) {
      try {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        if (audioBlob.size > 200) {
          const reader = new FileReader();
          const base64Promise = new Promise((res, rej) => {
            reader.onloadend = () => {
              if (reader.result) {
                const base64 = reader.result.split(',')[1];
                res(base64);
              } else {
                res('');
              }
            };
            reader.onerror = rej;
          });
          reader.readAsDataURL(audioBlob);
          const base64Audio = await base64Promise;

          if (base64Audio) {
            const geminiTranscript = await transcribeAudioWithGemini(base64Audio, audioBlob.type);
            if (geminiTranscript) {
              spoken = geminiTranscript;
            }
          }
        }
      } catch (err) {
        console.error('Gemini audio transcribe fallback error:', err);
      }
    }

    handleEvaluateSpokenText(spoken);
  }, [handleEvaluateSpokenText, liveSpokenText]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Tính điểm tổng kết
  const totalScore = useMemo(() => {
    const s1 = stepResults[0]?.accuracy ?? (currentAttempt?.accuracy || 80);
    const s2 = stepResults[1]?.accuracy ?? 85;
    return Math.round((s1 + s2) / 2);
  }, [stepResults, currentAttempt]);

  const currentVoiceObj = useMemo(() => {
    return AI_VOICES.find(v => v.id === selectedVoiceId) || AI_VOICES[0];
  }, [selectedVoiceId]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'linear-gradient(180deg, #090d16 0%, #0f172a 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* ── 1. Responsive Top Fullscreen Header ─────────────────── */}
      <header
        style={{
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Top Row: Back button, Title & Voice Selection */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
          <button
            onClick={() => {
              if (isRecording) stopRecordingAndGrade();
              onClose();
            }}
            className="btn btn-ghost"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--text-secondary)',
              fontSize: 13,
              flexShrink: 0,
            }}
            title="Quay lại"
          >
            <ArrowLeft size={17} />
            <span style={{ fontWeight: 600 }}>Quay lại</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
              Luyện nói AI
            </span>

            {/* Nút Chọn Giọng AI */}
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="btn btn-secondary btn-xs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.18)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.35)',
              }}
              title="Đổi giọng đọc AI (Anh-Mỹ, Anh-Anh, Nam/Nữ)"
            >
              <Settings size={11} />
              <span>{currentVoiceObj.label.split(' ')[0]} {currentVoiceObj.label.split(' ')[1]}</span>
            </button>
          </div>
        </div>

        {/* Chunk details sub-row */}
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          🎯 Chunk: <strong style={{ color: '#fbbf24' }}>{chunk.phrase}</strong> {chunk.meaningVi ? `(${chunk.meaningVi})` : ''}
        </div>

        {/* Stepper Progress Row: 3 equal pill segments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, width: '100%' }}>
          <div
            style={{
              padding: '6px 4px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              textAlign: 'center',
              background: currentStepIndex === 0 ? 'rgba(99, 102, 241, 0.25)' : stepResults[0]?.isPassed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 0 ? '#818cf8' : stepResults[0]?.isPassed ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${currentStepIndex === 0 ? '#6366f1' : 'transparent'}`,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            1. Cơ bản
          </div>
          <div
            style={{
              padding: '6px 4px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              textAlign: 'center',
              background: currentStepIndex === 1 ? 'rgba(99, 102, 241, 0.25)' : stepResults[1]?.isPassed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 1 ? '#818cf8' : stepResults[1]?.isPassed ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${currentStepIndex === 1 ? '#6366f1' : 'transparent'}`,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            2. Tình huống
          </div>
          <div
            style={{
              padding: '6px 4px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              textAlign: 'center',
              background: currentStepIndex === 2 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)',
              color: currentStepIndex === 2 ? '#fbbf24' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            3. Kết quả
          </div>
        </div>
      </header>

      {/* ── 2. Main Fullscreen Content Container ───────────────── */}
      <main style={{ flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── PRACTICE MODE (Step 0 & Step 1) ─────────────────── */}
        {currentStepIndex < 2 && (
          <>
            {/* Card 1: Câu Cần Luyện Nói (Full Thông Tin) */}
            <div
              className="card animate-fade-in"
              style={{
                padding: '18px 18px',
                background: 'rgba(30, 41, 59, 0.7)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.15)',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}
                >
                  {currentSentence.title}
                </span>

                <button
                  type="button"
                  onClick={() => playAiVoice(currentSentence.sampleTranslation)}
                  className="btn btn-secondary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#38bdf8', padding: '4px 10px' }}
                  title="Nghe AI đọc mẫu câu này"
                >
                  <Play size={12} /> Nghe AI đọc mẫu
                </button>
              </div>

              {/* Nghĩa Tiếng Việt */}
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
                "{currentSentence.vietnameseSentence}"
              </div>

              {/* Câu Tiếng Anh Chuẩn (Đầy Đủ, Không Bị Cắt Chữ) */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.5,
                  padding: '14px 16px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                "{currentSentence.sampleTranslation}"
              </div>
            </div>

            {/* Card 2: Interactive "Nhấn Để Nói" Controller */}
            <div
              className="card"
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.85)',
                borderRadius: 'var(--radius-lg)',
                border: isRecording ? '1px solid #ef4444' : isAiSpeaking ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <AudioWaveVisualizer volume={volume} isRecording={isRecording} isAiSpeaking={isAiSpeaking} />

              {/* Nút Microphone Chính - Nhấn để nói / Nhấn để dừng */}
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    stopRecordingAndGrade();
                  } else {
                    startRecording();
                  }
                }}
                disabled={isAiSpeaking || isEvaluating}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  border: 'none',
                  background: isRecording
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : isAiSpeaking
                    ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: isRecording
                    ? '0 0 35px rgba(239, 68, 68, 0.7)'
                    : isAiSpeaking
                    ? '0 0 25px rgba(56, 189, 248, 0.5)'
                    : '0 0 25px rgba(16, 185, 129, 0.4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isAiSpeaking || isEvaluating ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                  transform: isRecording && volume > 10 ? 'scale(1.08)' : 'scale(1)',
                }}
                title={isRecording ? 'Bấm để dừng & chấm bài' : 'Bấm để nói'}
              >
                {isEvaluating ? (
                  <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                ) : isRecording ? (
                  <Square size={32} fill="#fff" />
                ) : isAiSpeaking ? (
                  <Volume2 size={34} className="animate-pulse" />
                ) : (
                  <Mic size={36} />
                )}
              </button>

              {/* Hướng dẫn thao tác rõ ràng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {isEvaluating ? (
                    <span style={{ color: '#fbbf24' }}>⏳ Đang chấm phát âm câu của bạn…</span>
                  ) : isRecording ? (
                    <span style={{ color: '#ef4444' }}>🔴 Đang thu âm... Bấm nút vuông để hoàn thành & chấm bài</span>
                  ) : isAiSpeaking ? (
                    <span style={{ color: '#38bdf8' }}>🔊 AI đang phát âm mẫu...</span>
                  ) : (
                    <span style={{ color: '#4ade80' }}>🎙️ Bấm vào Micro để bắt đầu nói</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isRecording ? 'Hãy đọc to câu tiếng Anh trên' : 'Nhấn nút mic ➔ Đọc câu tiếng Anh ➔ Nhấn lại nút vuông để chấm điểm'}
                </div>
              </div>

              {/* Live Preview Text khi đang thu âm */}
              {isRecording && liveSpokenText && (
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: 13,
                    color: '#f8fafc',
                    fontStyle: 'italic',
                    maxWidth: '90%',
                  }}
                >
                  Đang nghe: "{liveSpokenText}"
                </div>
              )}
            </div>

            {/* Card 3: Phân Tích & Tô Màu Câu User Vừa Nói (Đúng = Xanh Lá, Sai = Đỏ) */}
            {currentAttempt && (
              <div
                className="card animate-fade-in"
                style={{
                  padding: '16px',
                  background: currentAttempt.isPassed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: currentAttempt.isPassed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {currentAttempt.isPassed ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#22c55e', fontWeight: 800, fontSize: 14 }}>
                        <CheckCircle size={16} /> Đạt độ chính xác {currentAttempt.accuracy}%!
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontWeight: 800, fontSize: 14 }}>
                        <AlertCircle size={16} /> Chưa đạt ({currentAttempt.accuracy}%). Hãy đọc lại câu này nhé!
                      </span>
                    )}
                  </div>

                  {/* Chú thích màu sắc */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#22c55e', fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} /> Đúng
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#ef4444', fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} /> Cần sửa
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fbbf24', fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }} /> Chunk
                    </span>
                  </div>
                </div>

                {/* Hiển thị câu đối chiếu với từng từ được tô màu */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0,0,0,0.3)',
                    lineHeight: 1.8,
                    fontSize: 15,
                  }}
                >
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                    KẾT QUẢ ĐỐI CHIẾU TỪNG TỪ:
                  </div>
                  {currentAttempt.words.map((item, idx) => {
                    const isCorrect = item.status === 'correct';
                    const isChunk = item.status === 'chunk';

                    return (
                      <span
                        key={idx}
                        title={item.note}
                        style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          margin: '0 3px 4px 0',
                          borderRadius: 5,
                          fontWeight: 700,
                          color: isChunk ? '#fbbf24' : isCorrect ? '#22c55e' : '#ef4444',
                          background: isChunk
                            ? 'rgba(251, 191, 36, 0.15)'
                            : isCorrect
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.18)',
                          border: isChunk
                            ? '1px solid rgba(251, 191, 36, 0.4)'
                            : isCorrect
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px dashed rgba(239, 68, 68, 0.5)',
                        }}
                      >
                        {item.word}
                      </span>
                    );
                  })}
                </div>

                {/* Câu user đã nói thực tế */}
                <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Micro thu được: <strong style={{ color: '#fff' }}>"{currentAttempt.spokenText}"</strong>
                </div>

                {/* Nút hành động */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  {!currentAttempt.isPassed ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setCurrentAttempt(null);
                        startRecording();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700 }}
                    >
                      <RotateCcw size={13} /> Bấm để nói lại
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (currentStepIndex === 0) {
                          setCurrentStepIndex(1);
                          setCurrentAttempt(null);
                          setLiveSpokenText('');
                        } else {
                          setCurrentStepIndex(2);
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, padding: '8px 16px' }}
                    >
                      <span>Tiếp tục câu tiếp theo ➔</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick action fallback */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleEvaluateSpokenText(currentSentence.sampleTranslation)}
                style={{ color: 'var(--text-muted)', fontSize: 11.5 }}
                title="Gửi câu đọc mẫu để chấm ngay"
              >
                <Send size={11} /> Gửi câu đọc mẫu
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setCurrentStepIndex(2)}
                style={{ color: 'var(--text-muted)', fontSize: 11.5 }}
              >
                Bỏ qua & Xem tổng kết
              </button>
            </div>
          </>
        )}

        {/* ── 3. SUMMARY RESULT VIEW (Step 2) ────────────────── */}
        {currentStepIndex === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Score Card */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              }}
            >
              <ScoreRing score={totalScore} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Award size={18} color="#fbbf24" />
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
                    Hoàn thành bài luyện nói!
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Bạn đã luyện tập thành công cụm từ <strong style={{ color: '#fbbf24' }}>"{chunk.phrase}"</strong> ({chunk.meaningVi}) qua cả 2 tình huống thực tế.
                </p>
              </div>
            </div>

            {/* Chi tiết từng câu với màu sắc Xanh / Đỏ */}
            <div
              className="card"
              style={{
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Chi tiết đối chiếu phát âm 2 câu:
              </div>

              {sentenceList.map((sentence, sIdx) => {
                const result = stepResults[sIdx] || analyzeSpokenSentence(sentence.sampleTranslation, sentence.sampleTranslation, chunk.phrase);

                return (
                  <div
                    key={sIdx}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#818cf8' }}>
                        {sentence.title}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                        Độ chính xác: {result.accuracy}%
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{sentence.vietnameseSentence}"
                    </div>

                    {/* Word tags */}
                    <div style={{ lineHeight: 1.8, fontSize: 14.5, marginTop: 4 }}>
                      {result.words.map((item, wIdx) => {
                        const isCorrect = item.status === 'correct';
                        const isChunk = item.status === 'chunk';

                        return (
                          <span
                            key={wIdx}
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              margin: '0 3px 3px 0',
                              borderRadius: 5,
                              fontWeight: 700,
                              color: isChunk ? '#fbbf24' : isCorrect ? '#22c55e' : '#ef4444',
                              background: isChunk
                                ? 'rgba(251, 191, 36, 0.15)'
                                : isCorrect
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.18)',
                              border: isChunk
                                ? '1px solid rgba(251, 191, 36, 0.4)'
                                : isCorrect
                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                : '1px dashed rgba(239, 68, 68, 0.5)',
                            }}
                          >
                            {item.word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStepResults([null, null]);
                  setCurrentAttempt(null);
                  setCurrentStepIndex(0);
                  setLiveSpokenText('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: '11px 14px',
                }}
              >
                <RotateCcw size={15} /> Luyện nói lại
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const speakingResult = {
                    score: totalScore,
                    usedTargetChunk: true,
                    comprehensible: totalScore >= 65,
                    overallFeedback: `Đạt độ chính xác ${totalScore}% qua 2 câu luyện nói.`,
                    stepResults: stepResults,
                    timestamp: Date.now(),
                  };
                  if (onComplete) onComplete(chunk.id, speakingResult);
                  onClose();
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: '11px 14px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                }}
              >
                <CheckCircle size={15} /> Hoàn thành
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ── 4. Modal Chọn Giọng AI ─────────────────────────────── */}
      {showVoiceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowVoiceModal(false)}
        >
          <div
            className="card animate-fade-in"
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'var(--bg-surface)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={18} color="#38bdf8" /> Chọn giọng đọc AI
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowVoiceModal(false)}
                style={{ padding: 4, color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.4 }}>
              Chọn chất giọng phát âm bản xứ bạn muốn luyện nghe (Anh-Mỹ, Anh-Anh hoặc Anh-Úc):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AI_VOICES.map(voice => {
                const isSelected = voice.id === selectedVoiceId;
                return (
                  <div
                    key={voice.id}
                    onClick={() => handleSelectVoice(voice.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isSelected ? <Check size={16} color="#38bdf8" /> : <div style={{ width: 16 }} />}
                      <span style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {voice.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playAiVoice(voice.sample, null, voice.id);
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ color: '#38bdf8', fontSize: 11.5, padding: '2px 6px' }}
                      title="Nghe thử"
                    >
                      <Play size={12} /> Thử
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowVoiceModal(false)}
                style={{ fontWeight: 700, padding: '6px 16px' }}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
