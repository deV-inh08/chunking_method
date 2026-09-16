import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, Sparkles, X, Check, ArrowRight,
  RotateCcw, MessageSquare, AlertCircle, Info, Radio,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, HelpCircle, Layers, CheckCircle2, Award, Plus, Lightbulb,
  Coffee, Plane, Users, ShoppingBag, Briefcase, Utensils, Target, Car, HeartPulse, Dumbbell, Search
} from 'lucide-react';
import { playTextWithTts, stopAudio, checkVoiceStudioStatus } from '../../services/ttsService';
import { evaluatePronunciationGOP } from '../../services/sherpaOnnxService';
import {
  generateSpeakingScenario,
  continueConversation,
  REAL_LIFE_PRESETS
} from '../../services/scenarioAi';
import { transcribeAudioWithGemini } from '../../services/ai';
import { formatIPA, getPhoneticTip } from '../../services/phonetics';
import { saveMasteredChunksFromConversation } from '../../store/storage';
import './ConversationalSpeaking.css';

const PRESET_CONFIG = {
  coffee_shop: {
    category: 'lifestyle',
    categoryName: 'Đời sống',
    Icon: Coffee,
    accentColor: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.12)',
  },
  travel_checkin: {
    category: 'travel',
    categoryName: 'Du lịch',
    Icon: Plane,
    accentColor: '#0284c7',
    accentBg: 'rgba(2, 132, 199, 0.12)',
  },
  friend_catchup: {
    category: 'lifestyle',
    categoryName: 'Đời sống',
    Icon: Users,
    accentColor: '#8b5cf6',
    accentBg: 'rgba(139, 92, 246, 0.12)',
  },
  shopping_return: {
    category: 'travel',
    categoryName: 'Dịch vụ & Mua sắm',
    Icon: ShoppingBag,
    accentColor: '#ec4899',
    accentBg: 'rgba(236, 72, 153, 0.12)',
  },
  work_catchup: {
    category: 'work',
    categoryName: 'Công sở',
    Icon: Briefcase,
    accentColor: '#6366f1',
    accentBg: 'rgba(99, 102, 241, 0.12)',
  },
  restaurant_dinner: {
    category: 'travel',
    categoryName: 'Ẩm thực & Du lịch',
    Icon: Utensils,
    accentColor: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.12)',
  },
  job_interview: {
    category: 'work',
    categoryName: 'Công sở & Phỏng vấn',
    Icon: Target,
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.12)',
  },
  taxi_ride: {
    category: 'travel',
    categoryName: 'Đi lại & Du lịch',
    Icon: Car,
    accentColor: '#eab308',
    accentBg: 'rgba(234, 179, 8, 0.12)',
  },
  pharmacy_visit: {
    category: 'lifestyle',
    categoryName: 'Đời sống & Y tế',
    Icon: HeartPulse,
    accentColor: '#14b8a6',
    accentBg: 'rgba(20, 184, 166, 0.12)',
  },
  gym_membership: {
    category: 'lifestyle',
    categoryName: 'Đời sống & Thể thao',
    Icon: Dumbbell,
    accentColor: '#f97316',
    accentBg: 'rgba(249, 115, 22, 0.12)',
  },
};

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', count: 10 },
  { id: 'work', label: 'Công sở & Phỏng vấn', count: 2 },
  { id: 'lifestyle', label: 'Đời sống & Bạn bè', count: 4 },
  { id: 'travel', label: 'Du lịch & Dịch vụ', count: 4 },
];

const QUICK_PROMPTS = [
  'Phỏng vấn xin Visa du học tại Đại sứ quán Mỹ',
  'Thương lượng tăng lương và thăng chức với Giám đốc',
  'Hỏi đường khi bị lạc và đổi vé tàu tại ga Tokyo',
  'Khiếu nại về hành lý thất lạc tại sân bay quốc tế',
  'Hẹn gặp đối tác nước ngoài ăn tối ký hợp đồng',
  'Nhờ đồng nghiệp hỗ trợ sửa lỗi dự án gấp trước deadline'
];

function stripEmoji(str = '') {
  return str.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '').trim();
}

/**
 * Helper tách chuỗi văn bản và tô sáng (green highlight) các cụm chunk mục tiêu
 */
function renderHighlightedChunks(text, targetChunks = []) {
  if (!text) return null;
  if (!targetChunks || targetChunks.length === 0) return text;

  // Thu thập danh sách các cụm từ cần highlight kèm biến thể thì quá khứ thông dụng
  const rawPhrases = [];
  targetChunks.forEach(c => {
    const p = (typeof c === 'string' ? c : c.phrase || '').trim();
    if (p) {
      rawPhrases.push(p);
      if (p.includes('make a reservation')) rawPhrases.push(p.replace('make a reservation', 'made a reservation'));
      if (p.includes('feel like')) rawPhrases.push(p.replace('feel like', 'felt like'));
      if (p.includes('come down with')) rawPhrases.push(p.replace('come down with', 'came down with'));
      if (p.includes('run out of')) rawPhrases.push(p.replace('run out of', 'ran out of'));
    }
  });

  const phrases = Array.from(new Set(rawPhrases)).sort((a, b) => b.length - a.length);
  if (phrases.length === 0) return text;

  const escaped = phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const phraseSet = new Set(phrases.map(p => p.toLowerCase()));

  return parts.map((part, idx) => {
    if (phraseSet.has(part.toLowerCase())) {
      return (
        <span key={idx} className="csm-chunk-highlight">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function ConversationalSpeakingModal({
  isOpen,
  onClose,
  initialChunks = [],
  onChunkMastered = null,
  onNavigateToProgress = null,
}) {
  // ─── Modes & Navigation ────────────────────────────────────────
  // 'select_topic': màn hình chọn chủ đề trước khi vào nói
  // 'chat': màn hình đàm thoại luyện nói thực chiến với AI
  const [viewMode, setViewMode] = useState('select_topic');
  const [activeTab, setActiveTab] = useState('curated'); // 'curated' | 'custom'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'work' | 'lifestyle' | 'travel'
  const [searchQuery, setSearchQuery] = useState('');
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [expandedHintId, setExpandedHintId] = useState(null); // ID tin nhắn đang mở gợi ý trả lời

  // ─── States ───────────────────────────────────────────────────
  const [scenario, setScenario] = useState(null);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [history, setHistory] = useState([]); // [{ sender: 'ai'|'user', text, textVi, suggestedReply, words: [], score: 0, audioBlob }]
  const [targetChunks, setTargetChunks] = useState([]);
  const [usedChunkPhrases, setUsedChunkPhrases] = useState(new Set());
  const [isConversationCompleted, setIsConversationCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Audio & Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [liveSpokenText, setLiveSpokenText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [voiceStudioActive, setVoiceStudioActive] = useState(false);

  // Inspector states
  const [inspectingWord, setInspectingWord] = useState(null); // { word, status, score, targetIpa, spokenIpa, errorType, feedback, tip }
  const [showTranslations, setShowTranslations] = useState(true);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const messagesEndRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode === 'chat') {
      scrollToBottom();
    }
  }, [history, isProcessing, isAiSpeaking, viewMode]);

  // Kiểm tra trạng thái VoiceStudio khi mở modal và reset về màn hình chọn chủ đề
  useEffect(() => {
    if (isOpen) {
      checkVoiceStudioStatus().then(active => setVoiceStudioActive(active));
      setViewMode('select_topic');
      setActiveTab('curated');
      setSelectedCategory('all');
      setSearchQuery('');
      setCustomTopicInput('');
      setScenario(null);
      setHistory([]);
      setUsedChunkPhrases(new Set());
      setIsConversationCompleted(false);
      setShowCompletionModal(false);
      setInspectingWord(null);
      stopAudio();
    } else {
      stopAudio();
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen]);

  // Khởi tạo tình huống ban đầu
  const initScenario = useCallback(async (selectedPreset = null, customTopic = '') => {
    setIsLoadingScenario(true);
    stopAudio();
    setHistory([]);
    setUsedChunkPhrases(new Set());
    setIsConversationCompleted(false);
    setShowCompletionModal(false);
    setInspectingWord(null);

    let chosenScenario;
    if (selectedPreset) {
      chosenScenario = {
        ...selectedPreset,
        targetChunks: (selectedPreset.defaultChunks || []).map(p =>
          typeof p === 'string' ? { phrase: p, meaningVi: 'Cụm từ tự nhiên', tip: '' } : p
        ),
      };
    } else {
      chosenScenario = await generateSpeakingScenario({
        targetChunks: customTopic ? [] : initialChunks,
        customTopic,
      });
    }

    setScenario(chosenScenario);
    const chunks = chosenScenario.targetChunks || [];
    setTargetChunks(chunks);
    setIsLoadingScenario(false);

    // AI phát câu mở đầu
    const openingMsg = {
      id: 'msg_0',
      sender: 'ai',
      text: chosenScenario.openingMessage,
      textVi: chosenScenario.openingMessageVi,
      suggestedReply: chosenScenario.suggestedReply || chosenScenario.suggestedOpeningReply || '',
      suggestedReplyVi: chosenScenario.suggestedReplyVi || chosenScenario.suggestedOpeningReplyVi || '',
      timestamp: Date.now(),
    };
    setHistory([openingMsg]);

    // Phát âm thanh câu mở đầu
    setIsAiSpeaking(true);
    playTextWithTts(chosenScenario.openingMessage, 'en-US-JennyNeural')
      .finally(() => setIsAiSpeaking(false));
  }, [initialChunks]);

  // Khi chọn một preset từ danh sách
  const handleSelectPreset = (preset) => {
    setViewMode('chat');
    initScenario(preset);
  };

  // Khi người dùng gõ chủ đề tùy chọn
  const handleSelectCustomTopic = () => {
    if (!customTopicInput.trim()) return;
    const topic = customTopicInput.trim();
    setCustomTopicInput('');
    setViewMode('chat');
    initScenario(null, topic);
  };

  // Lọc danh sách chủ đề theo Category và Search
  const filteredPresets = useMemo(() => {
    return REAL_LIFE_PRESETS.filter((preset) => {
      const config = PRESET_CONFIG[preset.id] || {};
      const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleClean = stripEmoji(preset.title).toLowerCase();
      const descMatch = (preset.description || '').toLowerCase().includes(q);
      const roleMatch = (preset.userRole || '').toLowerCase().includes(q) || (preset.aiRole || '').toLowerCase().includes(q);
      const chunkMatch = (preset.defaultChunks || []).some((c) => {
        const p = typeof c === 'string' ? c : c.phrase || '';
        return p.toLowerCase().includes(q);
      });

      return titleClean.includes(q) || descMatch || roleMatch || chunkMatch;
    });
  }, [selectedCategory, searchQuery]);

  // ─── Web Audio API Volume Monitor ─────────────────────────────
  const startVolumeMonitor = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setVolumeLevel(avg);
        animFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch {
      // Bỏ qua lỗi volume monitor
    }
  };

  const stopVolumeMonitor = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolumeLevel(0);
  };

  // ─── Recording & STT / Acoustic Analysis ──────────────────────
  const startRecording = async () => {
    if (isRecording || isAiSpeaking || isProcessing) return;
    stopAudio();
    transcriptBufferRef.current = '';
    setLiveSpokenText('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      startVolumeMonitor(stream);

      // 1. MediaRecorder để lưu Audio Buffer cho Sherpa GOP & Gemini Multimodal
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);

      // 2. SpeechRecognition cho realtime text streaming
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interim = '';
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interim += transcript;
            }
          }
          const combined = (finalTranscript + interim).trim();
          if (combined) {
            transcriptBufferRef.current = combined;
            setLiveSpokenText(combined);
          }
        };

        recognition.onerror = (e) => {
          console.warn('[SpeechRecognition] error:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Vui lòng cấp quyền truy cập Microphone trong trình duyệt để luyện nói phản xạ!');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    stopVolumeMonitor();

    // Cho Web Speech API 250ms để flush nốt kết quả cuối cùng
    await new Promise(r => setTimeout(r, 250));

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const spokenText = transcriptBufferRef.current.trim() || liveSpokenText.trim();
        handleUserSpeechTurn(spokenText, audioBlob);
      };
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const spokenText = transcriptBufferRef.current.trim() || liveSpokenText.trim();
        handleUserSpeechTurn(spokenText, audioBlob);
      }
      mediaRecorderRef.current.stream?.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
    }
  };

  // ─── Xử lý sau khi người học nói xong một câu hoặc gõ text ───────
  const handleUserSpeechTurn = async (spokenText, audioBlob) => {
    let textToProcess = (spokenText || '').trim();

    // Nếu SpeechRecognition của trình duyệt bị lỗi Network hoặc không bắt được chữ,
    // sử dụng Gemini Multimodal STT để chuyển đổi trực tiếp audioBlob sang văn bản!
    if (!textToProcess && audioBlob && audioBlob.size > 1000) {
      setIsProcessing(true);
      setProcessingStatus('Đang nhận diện âm thanh qua AI Multimodal...');
      try {
        textToProcess = (await transcribeAudioWithGemini(audioBlob) || '').trim();
      } catch (err) {
        console.warn('Gemini audio STT fallback error:', err);
      }
    }

    if (!textToProcess) {
      setIsProcessing(false);
      setProcessingStatus('');
      setFeedbackNotice('Chưa nhận diện được giọng nói. Bạn hãy kiểm tra micro và thử nói to, rõ ràng hơn một chút nhé!');
      setTimeout(() => setFeedbackNotice(''), 7000);
      return;
    }

    setFeedbackNotice('');
    setIsProcessing(true);
    setProcessingStatus('Sherpa-ONNX đang phân tích âm học và chuyển tiếp cho bạn bản xứ...');

    // 1. Chấm điểm âm học & IPA với Sherpa-ONNX GOP Client (< 100ms)
    let evaluation;
    try {
      evaluation = await evaluatePronunciationGOP({
        targetSentence: textToProcess,
        spokenText: textToProcess,
        targetChunks: targetChunks.map(c => c.phrase || c),
        audioBlob,
      });
    } catch (evalErr) {
      console.warn('GOP evaluation error:', evalErr);
      evaluation = {
        words: textToProcess.split(/\s+/).map(w => ({ word: w, status: 'correct', score: 85 })),
        accuracyScore: 85,
        missingEndingSoundCount: 0,
        chunksUsed: [],
      };
    }

    // 2. Cập nhật các Chunk đã kích hoạt thành công
    const newlyUsed = [...(evaluation.chunksUsed || [])];
    const textLower = textToProcess.toLowerCase();
    targetChunks.forEach(c => {
      const phrase = (typeof c === 'string' ? c : c.phrase || '').trim().toLowerCase();
      if (phrase && textLower.includes(phrase) && !newlyUsed.some(u => u.toLowerCase() === phrase)) {
        newlyUsed.push(typeof c === 'string' ? c : c.phrase);
      }
    });

    // 2. Cập nhật các Chunk đã kích hoạt thành công (Tính toán đồng bộ)
    const updatedUsedSet = new Set(usedChunkPhrases);
    if (newlyUsed.length > 0) {
      newlyUsed.forEach(p => {
        updatedUsedSet.add(p);
        onChunkMastered?.(p);
      });
      setUsedChunkPhrases(updatedUsedSet);
    }

    // Kiểm tra xem người học đã dùng hết toàn bộ chunks mục tiêu (ví dụ 3/3) chưa
    const chunksRemaining = targetChunks.filter(c => !updatedUsedSet.has(c.phrase || c));
    const isGoalReached = targetChunks.length > 0 && chunksRemaining.length === 0;

    if (isGoalReached && !isConversationCompleted) {
      setIsConversationCompleted(true);
      // Tự động lưu toàn bộ các chunks đã thành thạo vào SRS & Tiến trình học tập
      try {
        saveMasteredChunksFromConversation(targetChunks, scenario?.title);
      } catch (saveErr) {
        console.warn('saveMasteredChunksFromConversation error:', saveErr);
      }
    }

    // 3. Thêm tin nhắn của User vào Timeline
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: textToProcess,
      words: evaluation.words,
      score: evaluation.accuracyScore,
      missingEndingSoundCount: evaluation.missingEndingSoundCount,
      summaryFeedback: evaluation.summaryFeedback,
      chunksUsed: newlyUsed,
      timestamp: Date.now(),
    };

    const updatedHistory = [...history, userMsg];
    setHistory(updatedHistory);

    // 4. Gọi Gemini để bạn bản xứ đáp lại câu tiếp theo
    let aiNext;
    try {
      aiNext = await continueConversation({
        history: updatedHistory,
        userTranscript: textToProcess,
        scenario,
        chunksRemaining,
        isAllChunksUsed: isGoalReached,
      });
    } catch (aiErr) {
      console.warn('continueConversation error:', aiErr);
      aiNext = isGoalReached
        ? {
            aiReply: "Awesome! Everything you requested is all set for you. It was truly a pleasure chatting with you, and have a wonderful day ahead!",
            aiReplyVi: "Tuyệt vời! Mọi thứ bạn yêu cầu đã được chuẩn bị xong. Rất vui được trò chuyện cùng bạn, chúc bạn một ngày thật tuyệt vời nhé!",
            encouragement: "Xuất sắc! Bạn đã vận dụng thành thạo toàn bộ các cụm từ mục tiêu vào phản xạ giao tiếp tự nhiên!",
            suggestedReply: "",
            suggestedReplyVi: "",
            isFinished: true,
          }
        : {
            aiReply: "That's wonderful! Could you tell me a little more about that?",
            aiReplyVi: "Tuyệt quá! Cậu có thể chia sẻ thêm một chút về điều đó không?",
            encouragement: "Phản xạ rất tự nhiên!",
            suggestedReply: chunksRemaining[0]?.phrase ? `To be honest, I want to say that ${chunksRemaining[0].phrase}.` : '',
            suggestedReplyVi: "Thành thật mà nói, tôi muốn chia sẻ thêm.",
            isFinished: false,
          };
    }

    setIsProcessing(false);
    setProcessingStatus('');

    // 5. Thêm tin nhắn của AI vào Timeline và phát giọng đọc
    const aiMsg = {
      id: 'msg_ai_' + Date.now(),
      sender: 'ai',
      text: aiNext.aiReply,
      textVi: aiNext.aiReplyVi,
      encouragement: aiNext.encouragement,
      suggestedReply: aiNext.suggestedReply || '',
      suggestedReplyVi: aiNext.suggestedReplyVi || '',
      isFinished: Boolean(aiNext.isFinished || isGoalReached),
      timestamp: Date.now(),
    };

    setHistory(prev => [...prev, aiMsg]);

    // Phát âm thanh AI và sau khi nói xong câu kết thì hiển thị popup Hoàn thành
    setIsAiSpeaking(true);
    playTextWithTts(aiNext.aiReply, 'en-US-JennyNeural')
      .finally(() => {
        setIsAiSpeaking(false);
        if (isGoalReached || aiNext.isFinished) {
          setTimeout(() => {
            setShowCompletionModal(true);
          }, 350);
        }
      });
  };

  if (!isOpen) return null;

  return (
    <div className="csm-overlay animate-fade-in">
      <div className="csm-dialog">
        {viewMode === 'select_topic' ? (
          // ══════════════════════════════════════════════════════════
          // CHẾ ĐỘ 1: MÀN HÌNH CHỌN CHỦ ĐỀ LUYỆN NÓI (CLEAN ENTERPRISE)
          // ══════════════════════════════════════════════════════════
          <>
            <div className="csm-header">
              <div className="csm-header-left">
                <div className="csm-header-icon">
                  <Sparkles size={18} />
                </div>
                <div className="csm-header-titles">
                  <span className="csm-header-title">Luyện Nói Giao Tiếp AI</span>
                  <p className="csm-header-subtitle">
                    Phản xạ 1-1 trong ngữ cảnh đời thực với trợ lý bản xứ
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="csm-header-tabs">
                <button
                  type="button"
                  className={`csm-header-tab ${activeTab === 'curated' ? 'active' : ''}`}
                  onClick={() => setActiveTab('curated')}
                >
                  <Layers size={13} />
                  <span>Tình huống mẫu ({REAL_LIFE_PRESETS.length})</span>
                </button>
                <button
                  type="button"
                  className={`csm-header-tab ${activeTab === 'custom' ? 'active' : ''}`}
                  onClick={() => setActiveTab('custom')}
                >
                  <Plus size={13} />
                  <span>Tự tạo tình huống</span>
                </button>
              </div>

              <div className="csm-header-right">
                <button
                  onClick={onClose}
                  className="csm-btn-close"
                  title="Đóng (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="csm-topic-body">
              {activeTab === 'curated' ? (
                <>
                  {/* Nếu có initialChunks được chọn: Cho phép tạo tình huống theo bài học */}
                  {initialChunks.length > 0 && (
                    <div
                      className="csm-custom-chunks-banner"
                      onClick={() => handleSelectPreset(null)}
                      title="Bấm để luyện nói ngay với các cụm từ này"
                    >
                      <div className="csm-banner-content">
                        <div className="csm-banner-badge">
                          <Sparkles size={11} />
                          <span>Theo bài học của bạn</span>
                        </div>
                        <div className="csm-banner-title">
                          Luyện phản xạ với {initialChunks.length} cụm từ bạn đang chọn
                        </div>
                        <div className="csm-banner-chunks">
                          {initialChunks.slice(0, 4).map((c, i) => (
                            <span key={i} className="csm-banner-chunk-pill">
                              {typeof c === 'string' ? c : c.phrase}
                            </span>
                          ))}
                          {initialChunks.length > 4 && (
                            <span className="csm-banner-chunk-more">+{initialChunks.length - 4}</span>
                          )}
                        </div>
                      </div>
                      <button className="csm-banner-btn" type="button">
                        <span>Bắt đầu</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="csm-filter-bar">
                    <div className="csm-filter-pills">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`csm-filter-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(cat.id)}
                        >
                          <span>{cat.label}</span>
                          <span className="csm-filter-count">{cat.count}</span>
                        </button>
                      ))}
                    </div>

                    <div className="csm-search-box">
                      <Search size={13} className="csm-search-icon" />
                      <input
                        type="text"
                        className="csm-search-input"
                        placeholder="Tìm tình huống, cụm từ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="csm-search-clear"
                          onClick={() => setSearchQuery('')}
                          title="Xóa tìm kiếm"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Curated Grid */}
                  <div className="csm-curated-grid">
                    {filteredPresets.map((preset) => {
                      const config = PRESET_CONFIG[preset.id] || {
                        Icon: MessageSquare,
                        accentColor: '#3b82f6',
                        accentBg: 'rgba(59, 130, 246, 0.12)',
                        categoryName: 'Thực tế',
                      };
                      const IconComp = config.Icon;
                      const title = stripEmoji(preset.title);

                      return (
                        <article
                          key={preset.id}
                          className="csm-card"
                          onClick={() => handleSelectPreset(preset)}
                        >
                          {/* Top: Icon + Category Badge */}
                          <div className="csm-card-header">
                            <div
                              className="csm-card-icon"
                              style={{ background: config.accentBg, color: config.accentColor }}
                            >
                              <IconComp size={18} strokeWidth={2} />
                            </div>
                            <span className="csm-card-badge">{config.categoryName}</span>
                          </div>

                          {/* Title & Desc */}
                          <h3 className="csm-card-title">{title}</h3>
                          <p className="csm-card-desc">{preset.description}</p>

                          {/* Roles line */}
                          <div className="csm-card-meta-line">
                            <span className="csm-card-role-item">
                              <span className="csm-card-role-label">Bạn:</span> {preset.userRole}
                            </span>
                            <span className="csm-card-role-sep">•</span>
                            <span className="csm-card-role-item">
                              <span className="csm-card-role-label">AI:</span> {preset.aiRole}
                            </span>
                          </div>

                          {/* Chunks preview */}
                          <div className="csm-card-chunks-row">
                            {preset.defaultChunks?.slice(0, 3).map((chunk, ci) => {
                              const phrase = typeof chunk === 'string' ? chunk : chunk.phrase;
                              return (
                                <span key={ci} className="csm-card-chunk-tag">
                                  {phrase}
                                </span>
                              );
                            })}
                          </div>

                          {/* Action CTA */}
                          <div className="csm-card-action">
                            <span className="csm-card-action-label">Phản xạ 1-1</span>
                            <button type="button" className="csm-card-btn">
                              <Mic size={13} />
                              <span>Bắt đầu</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {filteredPresets.length === 0 && (
                      <div className="csm-empty-state">
                        <Search size={32} className="csm-empty-icon" />
                        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                          Không tìm thấy tình huống nào với từ khóa "{searchQuery}"
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('all');
                          }}
                        >
                          Xem tất cả tình huống
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ─── Tự tạo tình huống AI (Custom Creator Panel) ─── */
                <div className="csm-custom-panel animate-fade-in">
                  <div className="csm-custom-hero">
                    <div className="csm-custom-hero-icon">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h3 className="csm-custom-hero-title">Tự do tạo kịch bản giao tiếp theo ý bạn</h3>
                      <p className="csm-custom-hero-subtitle">
                        Mô tả bất kỳ ngữ cảnh nào bạn muốn thực hành (công việc, du lịch, phỏng vấn, giao dịch...). AI sẽ tự động nhập vai đối ứng và phân bổ các cụm từ đắt giá cho bạn.
                      </p>
                    </div>
                  </div>

                  <div className="csm-custom-input-box">
                    <label className="csm-custom-input-label">
                      Ngữ cảnh đàm thoại bạn muốn luyện tập:
                    </label>
                    <textarea
                      rows={3}
                      className="csm-custom-textarea"
                      placeholder="Ví dụ: Phỏng vấn xin visa du học Mỹ, người phỏng vấn nghiêm khắc hỏi về kế hoạch học tập và chứng minh tài chính..."
                      value={customTopicInput}
                      onChange={(e) => setCustomTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          handleSelectCustomTopic();
                        }
                      }}
                    />
                    <div className="csm-custom-input-footer">
                      <span className="csm-custom-hint">Mẹo: Nhấn Ctrl + Enter để bắt đầu ngay</span>
                      <button
                        type="button"
                        className="csm-custom-submit-btn"
                        disabled={!customTopicInput.trim() || isLoadingScenario}
                        onClick={handleSelectCustomTopic}
                      >
                        <Sparkles size={14} />
                        <span>Bắt đầu luyện nói ngay</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="csm-custom-suggestions">
                    <span className="csm-custom-sug-title">Gợi ý tình huống hay (Click để chọn nhanh):</span>
                    <div className="csm-custom-sug-grid">
                      {QUICK_PROMPTS.map((prompt, pi) => (
                        <button
                          key={pi}
                          type="button"
                          className="csm-custom-sug-pill"
                          onClick={() => setCustomTopicInput(prompt)}
                        >
                          <Lightbulb size={13} className="csm-sug-icon" />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // ══════════════════════════════════════════════════════════
          // CHẾ ĐỘ 2: PHÒNG LUYỆN NÓI GIAO TIẾP VỚI AI (VOICE-ONLY)
          // ══════════════════════════════════════════════════════════
          <>
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="csm-header">
              <div className="csm-header-left">
                <div className="csm-header-icon">
                  <MessageSquare size={18} />
                </div>
                <div className="csm-header-titles">
                  <div className="csm-header-title-row">
                    <span className="csm-header-title">
                      {scenario?.title || 'Phòng Luyện Nói Giao Tiếp AI'}
                    </span>
                    {voiceStudioActive && (
                      <span className="csm-header-badge" title="Đang kết nối VoiceStudio Local API (Giọng Studio chân thực 100%)">
                        <Radio size={9} className="animate-pulse" /> VoiceStudio
                      </span>
                    )}
                  </div>
                  <p className="csm-header-subtitle">
                    Vai của bạn: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{scenario?.userRole || 'Người học'}</span> • Đối tác: <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{scenario?.aiRole || 'Bạn bản xứ'}</span>
                  </p>
                </div>
              </div>

              <div className="csm-header-right">
                <button
                  onClick={() => {
                    stopAudio();
                    if (isRecording) stopRecording();
                    setViewMode('select_topic');
                  }}
                  className="csm-btn-action"
                  title="Đổi chủ đề luyện nói"
                >
                  <Layers size={14} />
                  <span>Đổi chủ đề</span>
                </button>
                <button
                  onClick={onClose}
                  className="csm-btn-close"
                  title="Đóng (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ─── Target Chunks Bar ──────────────────────────────── */}
            <div className="csm-chunks-bar">
              <div className="csm-chunks-label">
                <Sparkles size={13} color="#f59e0b" />
                <span>Cụm từ cần dùng:</span>
              </div>

              <div className="csm-chunks-list">
                {targetChunks.map((c, i) => {
                  const phrase = c.phrase || c;
                  const isUsed = usedChunkPhrases.has(phrase);
                  return (
                    <div
                      key={i}
                      className={`csm-chunk-tag ${isUsed ? 'used' : ''}`}
                      title={c.meaningVi || 'Hãy sử dụng cụm từ này trong câu nói của bạn'}
                    >
                      {isUsed ? <CheckCircle2 size={12} color="#34d399" /> : <div className="csm-chunk-dot" />}
                      <span>{phrase}</span>
                    </div>
                  );
                })}
              </div>

              {targetChunks.length > 0 && (
                <div className="csm-chunk-count">
                  {isConversationCompleted ? (
                    <button
                      type="button"
                      className="csm-btn-completed-badge animate-fade-in"
                      onClick={() => setShowCompletionModal(true)}
                      title="Bấm để xem tổng kết hoàn thành và lịch ôn tập"
                    >
                      <Award size={13} color="#fbbf24" />
                      <span>🎉 Hoàn thành ({usedChunkPhrases.size}/{targetChunks.length})</span>
                    </button>
                  ) : (
                    <>Đã dùng: <span style={{ color: '#34d399' }}>{usedChunkPhrases.size}</span>/{targetChunks.length}</>
                  )}
                </div>
              )}
            </div>

            {/* ─── Main Conversation Stream ───────────────────────── */}
            <div className="csm-stream">
              {isLoadingScenario ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%' }} className="animate-spin" />
                  <p style={{ fontSize: 13 }}>Đang khởi tạo bối cảnh giao tiếp tự nhiên...</p>
                </div>
              ) : (
                history.map((msg) => {
                  const isAi = msg.sender === 'ai';
                  return (
                    <div
                      key={msg.id}
                      className={`csm-msg-row ${isAi ? 'ai' : 'user'}`}
                    >
                      {/* Avatar */}
                      <div className={`csm-avatar ${isAi ? 'ai' : 'user'}`}>
                        {isAi ? 'AI' : 'BẠN'}
                      </div>

                      {/* Message Body */}
                      <div className="csm-msg-body">
                        <div className={`csm-bubble ${isAi ? 'ai' : 'user'}`}>
                          {/* Nếu là câu nói của người dùng: hiển thị từng từ được tô màu */}
                          {!isAi && msg.words && msg.words.length > 0 ? (
                            <div className="csm-words-wrapper">
                              {msg.words.map((w, wIdx) => {
                                const isCorrect = w.status === 'correct';
                                const isAlmost = w.status === 'almost';
                                const chipClass = isCorrect ? 'correct' : isAlmost ? 'almost' : 'incorrect';

                                return (
                                  <button
                                    key={wIdx}
                                    onClick={() => setInspectingWord(w)}
                                    className={`csm-word-chip ${chipClass}`}
                                    title={w.feedback || 'Nhấp để xem phân tích âm vị IPA'}
                                  >
                                    <span>{w.word}</span>
                                    {w.errorType && w.errorType !== 'clean' && (
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p style={{ margin: 0 }}>{msg.text}</p>
                          )}

                          {/* Bản dịch nghĩa tiếng Việt */}
                          {isAi && showTranslations && msg.textVi && (
                            <p className="csm-vi-translation">
                              {msg.textVi}
                            </p>
                          )}
                        </div>

                        {/* Metadata & Actions */}
                        <div className={`csm-msg-meta ${isAi ? 'ai' : 'user'}`}>
                          {isAi ? (
                            <div className="csm-ai-actions-row">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAiSpeaking(true);
                                  playTextWithTts(msg.text, 'en-US-JennyNeural')
                                    .finally(() => setIsAiSpeaking(false));
                                }}
                                className="csm-btn-replay"
                                title="Nghe lại câu nói của AI"
                              >
                                <Volume2 size={13} />
                                <span>Nghe lại</span>
                              </button>

                              {msg.suggestedReply && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedHintId(prev => prev === msg.id ? null : msg.id)}
                                  className={`csm-btn-hint ${expandedHintId === msg.id ? 'active' : ''}`}
                                  title="Gợi ý câu trả lời phù hợp với tình huống"
                                >
                                  <Lightbulb size={13} />
                                  <span>Gợi ý trả lời</span>
                                  {expandedHintId === msg.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                className="csm-score-text"
                                style={{
                                  color: msg.score >= 80 ? '#34d399' : msg.score >= 60 ? '#fbbf24' : '#f87171'
                                }}
                              >
                                Độ chuẩn âm: {msg.score}%
                              </span>
                              {msg.missingEndingSoundCount > 0 && (
                                <span className="csm-ending-tag">
                                  Nuốt {msg.missingEndingSoundCount} âm đuôi
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hint Box: Gợi ý cách trả lời với Chunk được Highlight màu xanh */}
                        {isAi && expandedHintId === msg.id && msg.suggestedReply && (
                          <div className="csm-hint-card animate-fade-in">
                            <div className="csm-hint-top-bar">
                              <div className="csm-hint-title">
                                <Lightbulb size={13} color="#f59e0b" />
                                <span>Gợi ý cách trả lời</span>
                              </div>
                              <button
                                type="button"
                                className="csm-hint-listen-btn"
                                onClick={() => {
                                  setIsAiSpeaking(true);
                                  playTextWithTts(msg.suggestedReply, 'en-US-JennyNeural')
                                    .finally(() => setIsAiSpeaking(false));
                                }}
                                title="Nghe phát âm câu mẫu"
                              >
                                <Volume2 size={12} />
                                <span>Nghe câu mẫu</span>
                              </button>
                            </div>

                            <div className="csm-hint-en-text">
                              {renderHighlightedChunks(msg.suggestedReply, targetChunks)}
                            </div>

                            {msg.suggestedReplyVi && (
                              <div className="csm-hint-vi-text">
                                {msg.suggestedReplyVi}
                              </div>
                            )}

                            <div className="csm-hint-footer-tip">
                              <Sparkles size={11} color="#34d399" />
                              <span>Cụm màu xanh là chunk giúp phản xạ tự nhiên. Hãy bấm Mic và nói câu này!</span>
                            </div>
                          </div>
                        )}

                        {/* Lời khen hoặc mẹo ngắn của AI */}
                        {isAi && msg.encouragement && (
                          <div className="csm-encouragement-card">
                            <Award size={14} style={{ flexShrink: 0 }} />
                            <span>{msg.encouragement}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Indicator khi AI đang phản hồi hoặc đang chấm điểm */}
              {isProcessing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', padding: '4px 8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} className="animate-pulse" />
                  <span>{processingStatus || 'Sherpa-ONNX đang phân tích âm học và chuyển tiếp cho bạn bản xứ...'}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Word Inspector Drawer / Popup ──────────────────── */}
            {inspectingWord && (
              <div className="csm-inspector">
                <div className="csm-inspector-content">
                  <div className="csm-inspector-row1">
                    <span className="csm-inspector-word">{inspectingWord.word}</span>
                    <span className="csm-inspector-ipa">
                      {formatIPA(inspectingWord.targetIpa)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                        color: inspectingWord.status === 'correct' ? '#34d399' : inspectingWord.status === 'almost' ? '#fbbf24' : '#f87171',
                        background: inspectingWord.status === 'correct' ? 'rgba(16,185,129,0.15)' : inspectingWord.status === 'almost' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      }}
                    >
                      {inspectingWord.score}%
                    </span>
                  </div>

                  <div className="csm-inspector-feedback">
                    <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span>{inspectingWord.feedback}</span>
                  </div>

                  {inspectingWord.tip && (
                    <div className="csm-inspector-tip">
                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{inspectingWord.tip.title}: </span>
                      {inspectingWord.tip.tip}
                    </div>
                  )}
                </div>

                <div className="csm-inspector-actions">
                  <button
                    onClick={() => playTextWithTts(inspectingWord.word, 'en-US-JennyNeural')}
                    className="csm-btn-action"
                  >
                    <Volume2 size={14} />
                    <span>Nghe mẫu</span>
                  </button>
                  <button
                    onClick={() => setInspectingWord(null)}
                    className="csm-btn-close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Footer Controls & Microphone (Voice-Only) ───────── */}
            <div className="csm-footer">
              {/* Thông báo nếu SpeechRecognition bị lỗi mạng hoặc không nhận được tiếng */}
              {feedbackNotice && (
                <div className="csm-notice-box">
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  <span>{feedbackNotice}</span>
                </div>
              )}

              {/* Live Wave Bars khi đang ghi âm */}
              {isRecording && (
                <div className="csm-wave-bars">
                  {[...Array(12)].map((_, i) => {
                    const barH = Math.min(22, Math.max(4, Math.round((volumeLevel / 15) * (1 + Math.sin(i * 0.8)) * 10)));
                    return (
                      <div
                        key={i}
                        style={{ height: `${barH}px` }}
                        className="csm-wave-bar"
                      />
                    );
                  })}
                </div>
              )}

              {/* Live Spoken Subtitle */}
              {isRecording && liveSpokenText && (
                <div className="csm-live-spoken-pill animate-fade-in">
                  <span className="csm-live-dot" />
                  <span>"{liveSpokenText}"</span>
                </div>
              )}

              {/* Main Action Button (Mic) */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAiSpeaking || isProcessing}
                className={`csm-mic-btn ${isRecording ? 'recording' : isAiSpeaking || isProcessing ? 'disabled' : 'idle'}`}
                title={isRecording ? 'Bấm để hoàn tất câu nói' : 'Bấm để bắt đầu nói phản xạ'}
              >
                {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
              </button>

              <div className="csm-footer-status">
                {isRecording ? (
                  <span style={{ color: '#f87171', fontWeight: 600 }} className="animate-pulse">
                    Đang lắng nghe... Nói tự nhiên và bấm lại Mic khi nói xong câu
                  </span>
                ) : isAiSpeaking ? (
                  <span style={{ color: '#38bdf8' }}>AI đang nói... Hãy lắng nghe phản xạ</span>
                ) : isProcessing ? (
                  <span style={{ color: '#fbbf24' }}>{processingStatus || 'Đang đối soát âm vị IPA và gửi cho AI...'}</span>
                ) : isConversationCompleted ? (
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    🎉 Đã hoàn thành 3/3 cụm từ! Cuộc trò chuyện đã kết thúc thành công.
                  </span>
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            POPUP HOÀN THÀNH CUỘC HỘI THOẠI & LƯU TIẾN TRÌNH SRS
            ══════════════════════════════════════════════════════════ */}
        {showCompletionModal && (
          <div className="csm-completion-overlay animate-fade-in">
            <div className="csm-completion-card animate-slide-up">
              <button
                type="button"
                className="csm-completion-close-btn"
                onClick={() => setShowCompletionModal(false)}
                title="Đóng popup (Xem lại đoạn hội thoại)"
              >
                <X size={18} />
              </button>

              <div className="csm-completion-badge-icon">
                <Award size={36} color="#fbbf24" />
              </div>

              <h3 className="csm-completion-title">
                🎉 Hoàn thành xuất sắc!
              </h3>
              <p className="csm-completion-subtitle">
                Bạn đã vận dụng thành thạo và tự nhiên cả <strong style={{ color: '#38bdf8' }}>{targetChunks.length}/{targetChunks.length} cụm từ mục tiêu</strong> vào tình huống thực tế cùng AI.
              </p>

              {/* Danh sách các cụm từ vừa thành thạo */}
              <div className="csm-completion-chunks-box">
                <div className="csm-completion-chunks-header">
                  <Sparkles size={14} color="#34d399" />
                  <span>Cụm từ bạn đã chinh phục:</span>
                </div>
                <div className="csm-completion-chunks-list">
                  {targetChunks.map((c, i) => {
                    const phrase = typeof c === 'string' ? c : c.phrase;
                    const meaning = typeof c === 'object' && c.meaningVi ? c.meaningVi : 'Cụm từ giao tiếp tự nhiên';
                    return (
                      <div key={i} className="csm-completion-chunk-item">
                        <div className="csm-completion-chunk-left">
                          <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
                          <div>
                            <div className="csm-completion-chunk-phrase">{phrase}</div>
                            <div className="csm-completion-chunk-meaning">{meaning}</div>
                          </div>
                        </div>
                        <span className="csm-completion-srs-tag">
                          ✓ Đã lưu SRS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Thông số tổng kết */}
              <div className="csm-completion-stat-banner">
                <div className="csm-stat-pill">
                  <span className="csm-stat-num">{history.filter(h => h.sender === 'user').length}</span>
                  <span className="csm-stat-lbl">Lượt đối thoại</span>
                </div>
                <div className="csm-stat-divider" />
                <div className="csm-stat-pill">
                  <span className="csm-stat-num" style={{ color: '#38bdf8' }}>+{targetChunks.length} Chunks</span>
                  <span className="csm-stat-lbl">Tiến trình đã lưu</span>
                </div>
                <div className="csm-stat-divider" />
                <div className="csm-stat-pill">
                  <span className="csm-stat-num" style={{ color: '#34d399' }}>Spaced Repetition</span>
                  <span className="csm-stat-lbl">Tự động lên lịch ôn</span>
                </div>
              </div>

              {/* Nhóm nút hành động */}
              <div className="csm-completion-actions">
                <button
                  type="button"
                  className="csm-btn-primary-action"
                  onClick={() => {
                    stopAudio();
                    setShowCompletionModal(false);
                    setViewMode('select_topic');
                  }}
                >
                  <Layers size={15} />
                  <span>Luyện tình huống khác</span>
                </button>

                {onNavigateToProgress ? (
                  <button
                    type="button"
                    className="csm-btn-secondary-action"
                    onClick={() => {
                      stopAudio();
                      setShowCompletionModal(false);
                      onNavigateToProgress();
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Xem tiến trình & Ôn tập</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="csm-btn-secondary-action"
                    onClick={() => {
                      stopAudio();
                      setShowCompletionModal(false);
                      initScenario(scenario);
                    }}
                  >
                    <RotateCcw size={15} />
                    <span>Luyện lại tình huống này</span>
                  </button>
                )}

                <button
                  type="button"
                  className="csm-btn-outline-action"
                  onClick={() => setShowCompletionModal(false)}
                >
                  <span>Xem lại đoạn hội thoại</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
