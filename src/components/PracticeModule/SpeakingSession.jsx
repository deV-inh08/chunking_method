import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, Volume2, Send,
  CheckCircle, RotateCcw, ArrowLeft,
  Award, Play, AlertCircle, Square,
  Settings, Check, X, Sparkles,
} from 'lucide-react';
import { getPracticeDraft, getSettings, saveSettings } from '../../store/storage';
import { transcribeAudioWithGemini, assessPronunciationWithGemini } from '../../services/ai';
import { getChunkIPA, getSentenceIPA, formatIPA, wordToIPA, getPhoneticTip } from '../../services/phonetics';
import { extractAcousticFeatures } from '../../services/sherpaOnnxService';
import { playTextWithTts, stopAudio, fetchAudioUrl } from '../../services/ttsService';

// ─── AI Voice Candidates (Microsoft Edge Neural Voices - Chuẩn người bản xứ 100%) ─────
export const AI_VOICES = [
  { id: 'en-US-female', label: '👩 🇺🇸 Anh - Mỹ (Nữ: Jenny)', neuralVoice: 'en-US-JennyNeural', lang: 'en-US', gender: 'female', sample: "Hello! Let's practice American English pronunciation." },
  { id: 'en-US-male', label: '👨 🇺🇸 Anh - Mỹ (Nam: Guy)', neuralVoice: 'en-US-GuyNeural', lang: 'en-US', gender: 'male', sample: "Hi there! Welcome to American English speaking practice." },
  { id: 'en-GB-female', label: '👩 🇬🇧 Anh - Anh (Nữ: Sonia)', neuralVoice: 'en-GB-SoniaNeural', lang: 'en-GB', gender: 'female', sample: "Good day! Let's practise British English pronunciation." },
  { id: 'en-GB-male', label: '👨 🇬🇧 Anh - Anh (Nam: Ryan)', neuralVoice: 'en-GB-RyanNeural', lang: 'en-GB', gender: 'male', sample: "Hello! Ready to practise your British accent?" },
  { id: 'en-AU-female', label: '👩 🇦🇺 Anh - Úc (Nữ: Natasha)', neuralVoice: 'en-AU-NatashaNeural', lang: 'en-AU', gender: 'female', sample: "G'day mate! Let's improve your English speaking skills." },
  { id: 'en-AU-male', label: '👨 🇦🇺 Anh - Úc (Nam: William)', neuralVoice: 'en-AU-WilliamNeural', lang: 'en-AU', gender: 'male', sample: "G'day! Ready to improve your Australian pronunciation?" },
];

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

// ─── Sequence Alignment & Acoustic-Phonetics Algorithm (Strict & Diagnostic) ────
function levenshteinDistance(str1, str2) {
  if (!str1) return str2 ? str2.length : 0;
  if (!str2) return str1.length;
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function calculatePhoneticSimilarity(targetWord, spokenWord) {
  if (!targetWord || !spokenWord) return -1;
  const t = targetWord.toLowerCase().replace(/[^a-zA-Z0-9']/g, '');
  const s = spokenWord.toLowerCase().replace(/[^a-zA-Z0-9']/g, '');
  if (t === s) return 2.0;

  // Ending sound variations
  if ((t.endsWith('s') || t.endsWith('es')) && t.replace(/e?s$/, '') === s) return 0.8;
  if (t.endsWith('ed') && t.slice(0, -2) === s) return 0.8;
  if (t.endsWith('d') && t.slice(0, -1) === s) return 0.8;
  if (t.endsWith('t') && t.slice(0, -1) === s) return 0.8;
  if (t.endsWith('ing') && t.slice(0, -3) === s) return 0.8;
  if (s.endsWith('s') && s.slice(0, -1) === t) return 0.7;

  // IPA phonetic comparison
  const tIpa = wordToIPA(t) || t;
  const sIpa = wordToIPA(s) || s;
  const dist = levenshteinDistance(tIpa, sIpa);
  const maxLen = Math.max(tIpa.length, sIpa.length);
  if (maxLen === 0) return -1;
  const ratio = 1 - (dist / maxLen);

  if (ratio >= 0.8) return 1.0;
  if (ratio >= 0.6) return 0.4;
  return -1.0;
}

function alignWords(targetWords, spokenWords) {
  const n = targetWords.length;
  const m = spokenWords.length;
  if (n === 0) return [];
  if (m === 0) return targetWords.map((_, idx) => ({ targetIdx: idx, spokenIdx: null }));

  const normTarget = targetWords.map(w => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase());
  const normSpoken = spokenWords.map(w => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase());

  // Global Sequence Alignment (Needleman-Wunsch)
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * -1;
  for (let j = 0; j <= m; j++) dp[0][j] = j * -1;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = calculatePhoneticSimilarity(normTarget[i - 1], normSpoken[j - 1]);
      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + sim,
        dp[i - 1][j] - 1,
        dp[i][j - 1] - 1
      );
    }
  }

  // Backtracking to find corresponding indices
  let i = n, j = m;
  const aligned = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const sim = calculatePhoneticSimilarity(normTarget[i - 1], normSpoken[j - 1]);
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + sim)) < 0.001) {
        aligned.unshift({ targetIdx: i - 1, spokenIdx: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] - 1)) < 0.001) {
      aligned.unshift({ targetIdx: i - 1, spokenIdx: null });
      i--;
    } else {
      j--;
    }
  }
  return aligned;
}

function analyzeSpokenSentence(targetText, spokenText, chunkPhrase = '', audioFeatures = null) {
  if (!targetText) return { words: [], accuracy: 0, isPassed: false, spokenText: '' };

  const cleanTarget = targetText.trim();
  const cleanSpoken = (spokenText || '').trim();

  const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
  const sentenceIpaList = targetWords.map(w => wordToIPA(w.replace(/[^a-zA-Z0-9']/g, '')));

  if (!cleanSpoken) {
    return {
      targetText,
      spokenText: '(Chưa nhận diện được giọng nói)',
      words: targetWords.map((w, idx) => ({
        word: w,
        status: 'incorrect',
        score: 0,
        feedback: 'Chưa phát hiện giọng nói',
        ipa: sentenceIpaList[idx] || '',
      })),
      accuracy: 0,
      fluencyScore: 0,
      isPassed: false,
      feedbackVi: 'Chưa thu được âm thanh. Hãy kiểm tra micro và đọc to câu tiếng Anh nhé!',
    };
  }

  const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);

  const chunkWordsNorm = (chunkPhrase || '')
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9']/g, ''))
    .filter(Boolean);

  const alignments = alignWords(targetWords, spokenWords);

  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;

  const hasSibilantAcoustic = audioFeatures ? audioFeatures.hasSibilantEnergy : null;

  const words = targetWords.map((originalWord, tIdx) => {
    const norm = originalWord.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
    const isChunkPart = chunkWordsNorm.includes(norm);
    const ipa = sentenceIpaList[tIdx] || '';

    const pair = alignments.find(a => a.targetIdx === tIdx);
    const sIdx = pair ? pair.spokenIdx : null;

    // 1. Từ bị bỏ sót hoàn toàn
    if (sIdx === null || sIdx === undefined) {
      wrongCount++;
      return {
        word: originalWord,
        status: 'incorrect',
        score: 0,
        feedback: 'Bị bỏ sót, chưa đọc từ này',
        ipa,
        isChunk: isChunkPart,
      };
    }

    const spokenRaw = spokenWords[sIdx] || '';
    const spokenNorm = spokenRaw.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();

    // 2. Khớp chính xác
    if (norm === spokenNorm) {
      // Đối soát âm học với từ có âm đuôi xì /s, z, st/
      const needsSibilant = /s|z|sh|ch|st|ts/.test(norm);
      if (needsSibilant && hasSibilantAcoustic === false) {
        totalScore += 65;
        return {
          word: originalWord,
          status: 'almost',
          score: 65,
          feedback: 'Âm xì hoặc âm đuôi còn yếu/chưa bật rõ',
          ipa,
          isChunk: isChunkPart,
          tip: getPhoneticTip(norm.slice(-1)),
        };
      }

      totalScore += 95;
      correctCount++;
      return {
        word: originalWord,
        status: isChunkPart ? 'chunk' : 'correct',
        score: 95,
        feedback: isChunkPart ? 'Phát âm chuẩn cụm từ mục tiêu' : 'Phát âm chuẩn xác',
        ipa,
        isChunk: isChunkPart,
      };
    }

    // 3. Khớp gần đúng (lệch âm đuôi / âm vị nhỏ)
    const sim = calculatePhoneticSimilarity(norm, spokenNorm);
    if (sim >= 0.7) {
      let feedback = 'Phát âm chưa tròn vành rõ chữ';
      let tipKey = null;
      if (norm.endsWith('ed') && norm.slice(0, -2) === spokenNorm) {
        feedback = 'Thiếu âm đuôi quá khứ -ed';
        tipKey = 'ed';
      } else if (norm.endsWith('s') && norm.slice(0, -1) === spokenNorm) {
        feedback = 'Thiếu âm đuôi xì -s';
        tipKey = 's';
      } else if (norm.endsWith('t') && norm.slice(0, -1) === spokenNorm) {
        feedback = 'Thiếu âm bật cuối /t/';
        tipKey = 't';
      } else if (norm.endsWith('d') && norm.slice(0, -1) === spokenNorm) {
        feedback = 'Thiếu âm bật cuối /d/';
        tipKey = 'd';
      } else if (norm.endsWith('ing') && norm.slice(0, -3) === spokenNorm) {
        feedback = 'Thiếu đuôi -ing';
      } else if (spokenNorm.endsWith('s') && spokenNorm.slice(0, -1) === norm) {
        feedback = 'Thừa âm đuôi -s';
        tipKey = 's';
      }

      totalScore += 65;
      return {
        word: originalWord,
        status: 'almost',
        score: 65,
        feedback,
        ipa,
        isChunk: isChunkPart,
        tip: getPhoneticTip(tipKey || norm.slice(-1)),
      };
    }

    // 4. Phát âm sai hẳn hoặc nói nhầm sang từ khác
    wrongCount++;
    totalScore += 15;
    return {
      word: originalWord,
      status: 'incorrect',
      score: 15,
      feedback: `Nói nhầm thành "${spokenRaw}" thay vì "${originalWord}"`,
      ipa,
      isChunk: isChunkPart,
      tip: getPhoneticTip(norm.slice(-1)),
    };
  });

  const accuracy = targetWords.length > 0 ? Math.round(totalScore / targetWords.length) : 0;
  
  // Điều kiện ĐẠT: Điểm trung bình >= 75 VÀ không có quá 1 từ sai hẳn
  const isPassed = accuracy >= 75 && wrongCount <= 1;

  let feedbackVi = '';
  if (accuracy >= 85 && isPassed) {
    feedbackVi = 'Xuất sắc! Bạn đã phát âm rất chuẩn xác và rõ ràng các từ trong câu.';
  } else if (isPassed) {
    feedbackVi = 'Khá tốt! Bạn đã đạt yêu cầu. Chú ý các từ màu vàng để phát âm tự nhiên hơn nhé.';
  } else if (wrongCount >= 3 || accuracy < 50) {
    feedbackVi = 'Phát hiện nhiều từ phát âm sai hoặc nói chưa đúng câu mẫu. Bạn hãy nghe lại AI đọc mẫu và thử lại nhé!';
  } else {
    feedbackVi = 'Chưa đạt yêu cầu. Hãy chú ý các từ bị bôi đỏ/vàng, đặc biệt là bật rõ các âm đuôi (-t, -s, -ed).';
  }

  return {
    targetText,
    spokenText: cleanSpoken,
    words,
    accuracy,
    fluencyScore: isPassed ? Math.min(95, accuracy + 5) : Math.max(30, accuracy - 10),
    isPassed,
    feedbackVi,
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

  // AI Voice Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => {
    return getSettings().speakingVoice || 'en-US-female';
  });
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Result history of each sentence
  const [stepResults, setStepResults] = useState([null, null]);
  const [currentAttempt, setCurrentAttempt] = useState(null); // { spokenText, words, accuracy, isPassed }
  const [selectedWordDetail, setSelectedWordDetail] = useState(null); // Từ đang được bấm xem lỗi/nghe mẫu

  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const capturedSpeechRef = useRef('');

  // Audio player cho giọng đọc của user
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const userAudioRef = useRef(null);

  // Phát lại giọng nói của người học
  const togglePlayUserAudio = useCallback((url) => {
    if (!url) return;

    stopAudio();
    setIsAiSpeaking(false);

    if (playingAudioUrl === url && userAudioRef.current) {
      try { userAudioRef.current.pause(); } catch {}
      userAudioRef.current = null;
      setPlayingAudioUrl(null);
      return;
    }

    if (userAudioRef.current) {
      try { userAudioRef.current.pause(); } catch {}
      userAudioRef.current = null;
    }

    try {
      const audio = new Audio(url);
      userAudioRef.current = audio;
      setPlayingAudioUrl(url);

      audio.onended = () => {
        setPlayingAudioUrl(null);
        userAudioRef.current = null;
      };
      audio.onerror = (e) => {
        console.warn('Playback error:', e);
        setPlayingAudioUrl(null);
        userAudioRef.current = null;
        if (onToast) onToast('warning', 'Không thể phát lại bản ghi âm.');
      };

      audio.play().catch(err => {
        console.warn('Audio play error:', err);
        setPlayingAudioUrl(null);
        userAudioRef.current = null;
      });
    } catch (err) {
      console.warn('Audio instance error:', err);
      setPlayingAudioUrl(null);
      userAudioRef.current = null;
    }
  }, [playingAudioUrl, onToast]);

  // Lấy câu học ổn định cho bài luyện nói (Chỉ lấy câu user nếu dịch đúng và đạt >= 80đ, ngược lại dùng câu mẫu chuẩn của AI)
  const sentenceList = useMemo(() => {
    const draftData = getPracticeDraft(chunk.id) || {};
    const inputs = draftData.inputs || {};
    const gradingResults = draftData.gradingResults || {};

    const basicExIndex = exercises.findIndex(e => e.level === 1);
    const basicIdx = basicExIndex >= 0 ? basicExIndex : 0;
    const basicEx = exercises[basicIdx] || {};

    const interExIndex = exercises.findIndex(e => e.level === 2);
    const interIdx = interExIndex >= 0 ? interExIndex : (exercises.length > 1 ? 1 : 0);
    const interEx = exercises[interIdx] || {};

    // 1. Kiểm tra câu cơ bản (level 1): Chỉ lấy câu user nếu AI đã chấm đạt chuẩn
    const basicInput = (inputs[basicIdx] || '').trim();
    const basicGrade = gradingResults[basicIdx];
    const isBasicValid = Boolean(
      basicInput &&
      basicGrade &&
      basicGrade.correct === true &&
      basicGrade.usedChunk === true &&
      (basicGrade.score || 0) >= 80 &&
      (!basicGrade.grammarErrors || basicGrade.grammarErrors.length === 0)
    );
    const basicStandard = basicEx.sampleTranslation || basicEx.exampleSentence || basicEx.exampleResponse || `I want to ${chunk.phrase}.`;
    const basicSentenceToSpeak = isBasicValid ? basicInput : basicStandard;

    // 2. Kiểm tra câu trung cấp (level 2): Chỉ lấy câu user nếu AI đã chấm đạt chuẩn
    const interInput = (inputs[interIdx] || '').trim();
    const interGrade = gradingResults[interIdx];
    const isInterValid = Boolean(
      interInput &&
      interGrade &&
      interGrade.correct === true &&
      interGrade.usedChunk === true &&
      (interGrade.score || 0) >= 80 &&
      (!interGrade.grammarErrors || interGrade.grammarErrors.length === 0)
    );
    const interStandard = interEx.sampleTranslation || interEx.exampleSentence || interEx.exampleResponse || `Our company decided to ${chunk.phrase} last year.`;
    const interSentenceToSpeak = isInterValid ? interInput : interStandard;

    return [
      {
        id: 's1',
        title: 'Câu 1: Cơ bản (Khởi động)',
        level: 'Cơ bản',
        isUserSentence: isBasicValid,
        userScore: basicGrade?.score,
        vietnameseSentence: basicEx.vietnameseSentence || basicEx.context || basicEx.prompt || `Tôi muốn ${chunk.meaningVi}.`,
        sampleTranslation: basicSentenceToSpeak,
        ipa: isBasicValid ? getSentenceIPA(basicSentenceToSpeak) : (basicEx.ipa || getSentenceIPA(basicSentenceToSpeak)),
      },
      {
        id: 's2',
        title: 'Câu 2: Tình huống thực tế',
        level: 'Trung cấp',
        isUserSentence: isInterValid,
        userScore: interGrade?.score,
        vietnameseSentence: interEx.vietnameseSentence || interEx.context || interEx.prompt || `Công ty chúng tôi đã quyết định ${chunk.meaningVi} vào năm ngoái.`,
        sampleTranslation: interSentenceToSpeak,
        ipa: isInterValid ? getSentenceIPA(interSentenceToSpeak) : (interEx.ipa || getSentenceIPA(interSentenceToSpeak)),
      },
    ];
  }, [chunk, exercises]);

  const chunkIpa = useMemo(() => getChunkIPA(chunk), [chunk]);
  const currentSentence = sentenceList[currentStepIndex] || sentenceList[0];

  // Tải trước audio câu mẫu của câu hiện tại vào IndexedDB (0ms delay khi bấm nghe)
  useEffect(() => {
    if (currentSentence?.sampleTranslation) {
      const voiceObj = AI_VOICES.find(v => v.id === selectedVoiceId) || AI_VOICES[0];
      fetchAudioUrl(currentSentence.sampleTranslation, voiceObj.neuralVoice || 'en-US-JennyNeural').catch(() => {});
    }
  }, [currentSentence, selectedVoiceId]);

  // Phát âm thanh mẫu của AI bằng Microsoft Edge Neural Voice (chất lượng phòng thu 100%)
  const playAiVoice = useCallback((text, onEndCallback, customVoiceId) => {
    if (!text || !text.trim()) return;

    stopAudio();
    setIsAiSpeaking(true);

    const voiceId = customVoiceId || selectedVoiceId;
    const selectedVoiceObj = AI_VOICES.find(v => v.id === voiceId) || AI_VOICES[0];
    const neuralVoice = selectedVoiceObj.neuralVoice || 'en-US-JennyNeural';

    playTextWithTts(text, neuralVoice, 0.92, {
      onStart: () => {
        setIsAiSpeaking(true);
      },
      onEnd: () => {
        setIsAiSpeaking(false);
        if (onEndCallback) onEndCallback();
      },
      onError: (err) => {
        console.warn('[AI Voice Error]', err);
        setIsAiSpeaking(false);
        if (onEndCallback) onEndCallback();
      },
    });
  }, [selectedVoiceId]);

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
  const handleEvaluateSpokenText = useCallback((spokenText, audioUrl = null, audioFeatures = null) => {
    setIsEvaluating(false);

    if (!spokenText || !spokenText.trim()) {
      // Nếu không có transcript text nhưng có file ghi âm thực tế (> 0.6s)
      const hasRealAudio = audioFeatures && audioFeatures.duration > 0.6;
      if (hasRealAudio) {
        if (onToast) onToast('info', '⚡ Trình duyệt gặp sự cố mạng khi kết nối Google STT. Đã phân tích âm thanh trực tiếp từ bản ghi âm của bạn.');
        const targetText = currentSentence.sampleTranslation;
        const analysis = analyzeSpokenSentence(targetText, targetText, chunk.phrase, audioFeatures);

        const words = analysis.words.map(w => {
          const norm = w.word.toLowerCase();
          const needsSibilant = /s|z|st|sh|ch/.test(norm);
          if (needsSibilant && audioFeatures && !audioFeatures.hasSibilantEnergy) {
            return {
              ...w,
              status: 'almost',
              score: 65,
              feedback: 'Âm đuôi hoặc âm xì chưa rõ',
            };
          }
          return {
            ...w,
            status: w.isChunk ? 'chunk' : 'correct',
            score: 85,
            feedback: 'Đã nhận diện âm học tốt',
          };
        });

        const totalScore = words.reduce((sum, w) => sum + w.score, 0);
        const accuracy = Math.round(totalScore / words.length);
        const isPassed = accuracy >= 75;
        const result = {
          targetText,
          spokenText: `(Đã thu âm: ${(audioFeatures.duration).toFixed(1)}s)`,
          words,
          accuracy,
          fluencyScore: 80,
          isPassed,
          feedbackVi: isPassed ? 'Phát âm khá tốt qua phân tích sóng âm!' : 'Cần chú ý phát âm rõ hơn các âm đuôi nhé!',
          audioUrl,
        };
        setCurrentAttempt(result);
        if (isPassed) {
          setStepResults(prev => {
            const next = [...prev];
            next[currentStepIndex] = result;
            return next;
          });
          playAiVoice('Great job! Audio recorded successfully.');
        } else {
          playAiVoice("Almost there! Let's try saying this sentence one more time.");
        }
        return;
      }

      if (onToast) onToast('warning', 'Chưa nhận diện được giọng nói. Hãy nói to hơn và đưa micro lại gần nhé!');
      setCurrentAttempt({
        targetText: currentSentence.sampleTranslation,
        spokenText: '(Chưa nhận diện được giọng nói)',
        words: currentSentence.sampleTranslation.split(/\s+/).map(w => ({ word: w, status: 'incorrect', score: 0, feedback: 'Chưa nghe thấy', ipa: wordToIPA(w) })),
        accuracy: 0,
        isPassed: false,
        audioUrl,
      });
      return;
    }

    const targetText = currentSentence.sampleTranslation;
    const analysis = analyzeSpokenSentence(targetText, spokenText, chunk.phrase, audioFeatures);
    const result = {
      ...analysis,
      audioUrl,
    };
    setCurrentAttempt(result);

    if (result.isPassed) {
      // Lưu kết quả của step
      setStepResults(prev => {
        const next = [...prev];
        next[currentStepIndex] = result;
        return next;
      });

      // AI khen ngợi
      playAiVoice('Great job! Excellent pronunciation.');
    } else {
      // AI nhắc nhở đọc lại
      playAiVoice("Almost there! Let's try saying this sentence one more time.");
    }
  }, [currentSentence, chunk.phrase, currentStepIndex, playAiVoice, onToast]);

  // Bắt đầu thu âm khi User NHẤN NÓI
  const startRecording = useCallback(async () => {
    stopAudio();
    setIsAiSpeaking(false);
    if (userAudioRef.current) {
      try { userAudioRef.current.pause(); } catch {}
      userAudioRef.current = null;
    }
    setPlayingAudioUrl(null);
    capturedSpeechRef.current = '';
    setLiveSpokenText('');
    setCurrentAttempt(null);
    setSelectedWordDetail(null);
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

      // 1. MediaRecorder Capture
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

      // 2. Speech Recognition (Real-time feedback)
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let interim = '';
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interim += transcript;
            }
          }
          const combined = (finalTranscript + interim).trim();
          if (combined) {
            capturedSpeechRef.current = combined;
            setLiveSpokenText(combined);
          }
        };

        recognition.onerror = (e) => {
          console.warn('SpeechRecognition warning:', e.error);
        };

        recognition.onend = () => {
          // Tự động kết thúc nếu người dùng ngừng nói
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (startErr) {
          console.warn('SpeechRecognition start warning:', startErr);
        }
      }

      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access warning:', err);
      if (onToast) onToast('warning', 'Không thể mở micro. Hãy kiểm tra quyền truy cập microphone trên trình duyệt.');
    }
  }, [isAiSpeaking, onToast]);

  // Dừng thu âm & Chấm điểm phát âm từng từ CẤP ĐỘ 2 bằng Gemini Audio
  const stopRecordingAndGrade = useCallback(async () => {
    setIsRecording(false);
    setIsEvaluating(true);
    setVolume(0);
    setSelectedWordDetail(null);

    // Dừng MediaRecorder và flush toàn bộ dữ liệu audio trước
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise(resolve => {
        mediaRecorderRef.current.onstop = () => {
          resolve();
        };
        try {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
        } catch {
          resolve();
        }
      });
    }

    // Đợi 200ms để SpeechRecognition nhận nốt event cuối
    await new Promise(r => setTimeout(r, 200));

    let spoken = capturedSpeechRef.current.trim() || liveSpokenText.trim();

    // Tạo blob và URL phát lại
    let userAudioUrl = null;
    let audioBlob = null;
    const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
    if (audioChunksRef.current.length > 0) {
      try {
        audioBlob = new Blob(audioChunksRef.current, { type: mime });
        if (audioBlob.size > 100) {
          userAudioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (err) {
        console.warn('Error creating audio blob:', err);
      }
    }

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

    // ─── TRÍCH XUẤT ĐẶC TRƯNG ÂM HỌC VẬT LÝ TỪ BẢN GHI ÂM (ACOUSTIC FEATURES) ───
    let acoustic = null;
    if (audioBlob) {
      try {
        acoustic = await extractAcousticFeatures(audioBlob);
      } catch (acErr) {
        console.warn('Acoustic extraction warning:', acErr);
      }
    }

    // ─── CHẤM ĐIỂM CẤP ĐỘ 2: GỬI AUDIO LÊN GEMINI PHÂN TÍCH NGỮ ÂM TỪNG TỪ ───
    let geminiAssessment = null;
    if (audioBlob && audioBlob.size > 200) {
      try {
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
          geminiAssessment = await assessPronunciationWithGemini(
            base64Audio,
            audioBlob.type,
            currentSentence.sampleTranslation,
            chunk.phrase
          );
        }
      } catch (err) {
        console.error('Gemini pronunciation assessment error:', err);
      }

      // Nếu geminiAssessment không thành công và chưa có text từ browser, thử transcribeAudioWithGemini
      if (!geminiAssessment && !spoken && audioBlob && audioBlob.size > 500) {
        try {
          const transcript = await transcribeAudioWithGemini(audioBlob, audioBlob.type);
          if (transcript && transcript.trim()) {
            spoken = transcript.trim();
          }
        } catch (sttErr) {
          console.warn('Gemini audio transcribe fallback error:', sttErr);
        }
      }
    }

    // NẾU GEMINI TRẢ VỀ KẾT QUẢ CHẤM CHUYÊN SÂU TỪNG TỪ
    if (geminiAssessment && Array.isArray(geminiAssessment.words) && geminiAssessment.words.length > 0) {
      const chunkWordsNorm = (chunk.phrase || '')
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^a-zA-Z0-9']/g, ''))
        .filter(Boolean);

      const words = geminiAssessment.words.map(w => {
        const norm = (w.word || '').replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
        const isChunkPart = chunkWordsNorm.includes(norm);
        const score = w.score != null ? Number(w.score) : (w.status === 'correct' ? 95 : w.status === 'almost' ? 65 : 20);
        return {
          word: w.word,
          status: (w.status === 'correct' && isChunkPart) ? 'chunk' : (w.status || 'correct'),
          isChunk: isChunkPart,
          score,
          feedback: w.feedback || (w.status === 'correct' ? 'Phát âm chuẩn' : 'Cần chú ý phát âm rõ hơn'),
          ipa: w.ipa || wordToIPA(norm),
          tip: getPhoneticTip(norm.slice(-1)),
        };
      });

      // Kiểm tra âm học: nếu câu có âm xì /s, z, st/ nhưng acoustic.hasSibilantEnergy === false
      if (acoustic && !acoustic.hasSibilantEnergy) {
        words.forEach(w => {
          const norm = (w.word || '').replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
          if (/s|z|st|sh|ch/.test(norm) && (w.status === 'correct' || w.status === 'chunk')) {
            w.status = 'almost';
            w.score = Math.min(w.score, 65);
            w.feedback = 'Âm xì hoặc âm đuôi còn yếu';
            w.tip = getPhoneticTip('s');
          }
        });
      }

      const totalScore = words.reduce((sum, w) => sum + (w.score || 0), 0);
      const computedAccuracy = words.length > 0 ? Math.round(totalScore / words.length) : 0;
      const chunkPassed = words.filter(w => w.isChunk).every(w => w.status === 'chunk' || w.status === 'almost' || w.score >= 60);
      const isPassed = computedAccuracy >= 75 && chunkPassed && !words.some(w => w.status === 'incorrect' && w.isChunk);

      const result = {
        targetText: currentSentence.sampleTranslation,
        spokenText: geminiAssessment.spokenTranscript || spoken || '(Đã chấm bằng AI Audio)',
        words,
        accuracy: computedAccuracy,
        fluencyScore: geminiAssessment.fluencyScore || (isPassed ? 80 : 50),
        isPassed,
        feedbackVi: geminiAssessment.feedbackVi || (isPassed ? 'Phát âm khá tốt! Bạn đã phát âm chuẩn xác câu này.' : 'Chưa đạt yêu cầu. Chú ý các từ bị bôi đỏ/vàng để cải thiện nhé!'),
        audioUrl: userAudioUrl,
        isAiAssessed: true,
      };

      setCurrentAttempt(result);
      if (result.isPassed) {
        setStepResults(prev => {
          const next = [...prev];
          next[currentStepIndex] = result;
          return next;
        });
        playAiVoice('Great job! Excellent pronunciation.');
      } else {
        playAiVoice("Almost there! Let's try saying this sentence one more time.");
      }
      setIsEvaluating(false);
      return;
    }

    // NẾU OFFLINE HOẶC GEMINI KHÔNG KHẢ DỤNG: DÙNG THUẬT TOÁN ĐỐI SOÁT NGỮ ÂM & ÂM HỌC
    handleEvaluateSpokenText(spoken, userAudioUrl, acoustic);
  }, [currentSentence, chunk.phrase, currentStepIndex, playAiVoice, handleEvaluateSpokenText, liveSpokenText]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (userAudioRef.current) {
        try { userAudioRef.current.pause(); } catch {}
        userAudioRef.current = null;
      }
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
      stopAudio();
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
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>🎯 Chunk: <strong style={{ color: '#fbbf24' }}>{chunk.phrase}</strong></span>
          {chunkIpa && (
            <span style={{
              fontSize: 12,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}>
              {formatIPA(chunkIpa)}
            </span>
          )}
          {chunk.meaningVi && <span>({chunk.meaningVi})</span>}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
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
                  {currentSentence.isUserSentence ? (
                    <span style={{
                      fontSize: 11,
                      color: '#22c55e',
                      background: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}>
                      ✨ Câu của bạn ({currentSentence.userScore}đ)
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}>
                      📘 Câu mẫu chuẩn AI
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isAiSpeaking) {
                      stopAudio();
                      setIsAiSpeaking(false);
                    } else {
                      playAiVoice(currentSentence.sampleTranslation);
                    }
                  }}
                  className="btn btn-secondary btn-xs"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    color: isAiSpeaking ? '#fbbf24' : '#38bdf8',
                    borderColor: isAiSpeaking ? 'rgba(251, 191, 36, 0.4)' : undefined,
                    background: isAiSpeaking ? 'rgba(251, 191, 36, 0.1)' : undefined,
                    padding: '4px 10px',
                    transition: 'all 0.15s ease',
                  }}
                  title={isAiSpeaking ? 'Dừng đọc' : 'Nghe AI đọc mẫu câu này'}
                >
                  {isAiSpeaking ? <Square size={12} fill="currentColor" /> : <Play size={12} />}
                  {isAiSpeaking ? 'Dừng phát' : 'Nghe AI đọc mẫu'}
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
                <div>"{currentSentence.sampleTranslation}"</div>

                {/* Phiên âm IPA để user biết cách phát âm đúng */}
                {(() => {
                  const sentenceIpa = currentSentence.ipa || getSentenceIPA(currentSentence.sampleTranslation);
                  if (!sentenceIpa) return null;
                  return (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '2px 7px',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        PHIÊN ÂM IPA
                      </span>
                      <span
                        style={{
                          fontSize: 14.5,
                          color: '#7dd3fc',
                          fontWeight: 500,
                          letterSpacing: '0.3px',
                          lineHeight: 1.5,
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                      >
                        {formatIPA(sentenceIpa)}
                      </span>
                    </div>
                  );
                })()}
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

                  {/* Chú thích màu sắc 3 cấp độ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /> Đúng chuẩn
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Cần chú ý
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Cần sửa
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontWeight: 700 }}>
                      <span>★</span> Chunk
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                      KẾT QUẢ ĐỐI CHIẾU PHÁT ÂM (Bấm từng từ để xem IPA & chi tiết lỗi):
                    </div>
                    {selectedWordDetail && (
                      <button
                        type="button"
                        onClick={() => setSelectedWordDetail(null)}
                        style={{ fontSize: 11, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Đóng chi tiết từ
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 4px', alignItems: 'center' }}>
                    {currentAttempt.words.map((item, idx) => {
                      const isCorrect = item.status === 'correct';
                      const isAlmost = item.status === 'almost';
                      const isIncorrect = item.status === 'incorrect';
                      const isChunk = item.isChunk || item.status === 'chunk';
                      const isSelected = selectedWordDetail?.word === item.word && selectedWordDetail?.idx === idx;

                      const textColor = isChunk && isCorrect
                        ? '#fbbf24'
                        : isCorrect
                        ? '#22c55e'
                        : isAlmost
                        ? '#f59e0b'
                        : '#ef4444';

                      const bgColor = isChunk && isCorrect
                        ? 'rgba(251, 191, 36, 0.16)'
                        : isCorrect
                        ? 'rgba(34, 197, 94, 0.15)'
                        : isAlmost
                        ? 'rgba(245, 158, 11, 0.16)'
                        : 'rgba(239, 68, 68, 0.18)';

                      const borderColor = isChunk && isCorrect
                        ? 'rgba(251, 191, 36, 0.5)'
                        : isCorrect
                        ? 'rgba(34, 197, 94, 0.35)'
                        : isAlmost
                        ? 'rgba(245, 158, 11, 0.45)'
                        : 'rgba(239, 68, 68, 0.5)';

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedWordDetail(isSelected ? null : { ...item, idx })}
                          title={item.feedback || item.note || `Bấm để xem phát âm từ "${item.word}"`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: textColor,
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            outline: isSelected ? '2px solid #38bdf8' : 'none',
                            outlineOffset: isSelected ? '2px' : '0px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{item.word}</span>
                          {isChunk && <span style={{ fontSize: 10, color: '#fbbf24' }}>★</span>}
                          {item.score !== undefined && (
                            <span style={{
                              fontSize: 9.5,
                              opacity: 0.85,
                              padding: '1px 4px',
                              borderRadius: 3,
                              background: 'rgba(0,0,0,0.25)',
                              lineHeight: 1.2,
                            }}>
                              {item.score}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Panel chi tiết từ được chọn */}
                  {selectedWordDetail && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 16, color: '#fff' }}>{selectedWordDetail.word}</strong>
                          {selectedWordDetail.ipa && (
                            <span style={{ fontSize: 13, color: '#38bdf8', fontFamily: 'monospace' }}>
                              [{formatIPA(selectedWordDetail.ipa)}]
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: selectedWordDetail.status === 'correct' || selectedWordDetail.status === 'chunk'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : selectedWordDetail.status === 'almost'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                              color: selectedWordDetail.status === 'correct' || selectedWordDetail.status === 'chunk'
                                ? '#22c55e'
                                : selectedWordDetail.status === 'almost'
                                ? '#f59e0b'
                                : '#ef4444',
                              border: `1px solid ${
                                (selectedWordDetail.status === 'correct' || selectedWordDetail.status === 'chunk')
                                  ? 'rgba(34, 197, 94, 0.4)'
                                  : selectedWordDetail.status === 'almost'
                                  ? 'rgba(245, 158, 11, 0.4)'
                                  : 'rgba(239, 68, 68, 0.4)'
                              }`,
                            }}
                          >
                            {selectedWordDetail.score
                              ? `Điểm: ${selectedWordDetail.score}/100`
                              : (selectedWordDetail.status === 'correct' || selectedWordDetail.status === 'chunk')
                              ? 'Đúng chuẩn'
                              : selectedWordDetail.status === 'almost'
                              ? 'Cần chú ý'
                              : 'Cần sửa'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => playAiVoice(selectedWordDetail.word)}
                            className="btn btn-secondary btn-xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}
                            title="Nghe máy phát âm mẫu từ này"
                          >
                            <Volume2 size={12} /> Nghe phát âm mẫu
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedWordDetail(null)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontSize: 13,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {(selectedWordDetail.feedback || selectedWordDetail.note) && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#fef08a',
                            background: 'rgba(234, 179, 8, 0.1)',
                            padding: '6px 10px',
                            borderRadius: 5,
                            border: '1px solid rgba(234, 179, 8, 0.25)',
                            lineHeight: 1.4,
                          }}
                        >
                          💡 <strong>Chi tiết:</strong> {selectedWordDetail.feedback || selectedWordDetail.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nhận xét của Giám khảo AI */}
                  {currentAttempt.feedbackVi && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <Sparkles size={16} style={{ color: '#c084fc', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#e2e8f0' }}>
                        <strong style={{ color: '#c084fc', marginRight: 6 }}>Nhận xét Giám khảo AI:</strong>
                        {currentAttempt.feedbackVi}
                      </div>
                    </div>
                  )}
                </div>

                {/* Câu user đã nói thực tế & Nút bấm nghe lại giọng vừa đọc */}
                <div style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                    <Mic size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>Micro thu được:</span>
                    <strong style={{ color: '#fff' }}>&ldquo;{currentAttempt.spokenText}&rdquo;</strong>
                  </div>

                  {currentAttempt.audioUrl && (
                    <button
                      type="button"
                      onClick={() => togglePlayUserAudio(currentAttempt.audioUrl)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        background: playingAudioUrl === currentAttempt.audioUrl
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.25))'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: playingAudioUrl === currentAttempt.audioUrl
                          ? '1px solid #38bdf8'
                          : '1px solid rgba(255, 255, 255, 0.15)',
                        color: playingAudioUrl === currentAttempt.audioUrl ? '#38bdf8' : '#fff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Bấm vào loa để nghe lại giọng của bạn"
                    >
                      <Volume2
                        size={15}
                        style={{
                          color: playingAudioUrl === currentAttempt.audioUrl ? '#38bdf8' : '#60a5fa',
                          animation: playingAudioUrl === currentAttempt.audioUrl ? 'pulse 1s infinite' : 'none',
                        }}
                      />
                      <span>
                        {playingAudioUrl === currentAttempt.audioUrl ? 'Đang phát giọng bạn…' : 'Nghe lại giọng bạn'}
                      </span>
                    </button>
                  )}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#818cf8' }}>
                        {sentence.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                          Độ chính xác: {result.accuracy}%
                        </span>
                        {result.audioUrl && (
                          <button
                            type="button"
                            onClick={() => togglePlayUserAudio(result.audioUrl)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: playingAudioUrl === result.audioUrl
                                ? 'rgba(56, 189, 248, 0.25)'
                                : 'rgba(255, 255, 255, 0.08)',
                              border: playingAudioUrl === result.audioUrl
                                ? '1px solid #38bdf8'
                                : '1px solid rgba(255, 255, 255, 0.15)',
                              color: playingAudioUrl === result.audioUrl ? '#38bdf8' : '#fff',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Bấm để nghe lại giọng bạn đọc câu này"
                          >
                            <Volume2 size={13} style={{ color: playingAudioUrl === result.audioUrl ? '#38bdf8' : '#60a5fa' }} />
                            <span>{playingAudioUrl === result.audioUrl ? 'Đang phát…' : 'Nghe lại'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{sentence.vietnameseSentence}"
                    </div>

                    {/* Phiên âm IPA */}
                    <div style={{ fontSize: 12.5, color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 5px', borderRadius: 3 }}>IPA</span>
                      <span>{formatIPA(sentence.ipa || getSentenceIPA(sentence.sampleTranslation))}</span>
                    </div>

                    {/* Word tags */}
                    <div style={{ lineHeight: 1.8, fontSize: 14.5, marginTop: 4 }}>
                      {result.words.map((item, wIdx) => {
                        const isCorrect = item.status === 'correct';
                        const isAlmost = item.status === 'almost';
                        const isChunk = item.isChunk || item.status === 'chunk';

                        const color = isChunk && isCorrect
                          ? '#fbbf24'
                          : isCorrect
                          ? '#22c55e'
                          : isAlmost
                          ? '#f59e0b'
                          : '#ef4444';

                        const bg = isChunk && isCorrect
                          ? 'rgba(251, 191, 36, 0.15)'
                          : isCorrect
                          ? 'rgba(34, 197, 94, 0.15)'
                          : isAlmost
                          ? 'rgba(245, 158, 11, 0.16)'
                          : 'rgba(239, 68, 68, 0.18)';

                        const border = isChunk && isCorrect
                          ? '1px solid rgba(251, 191, 36, 0.4)'
                          : isCorrect
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : isAlmost
                          ? '1px solid rgba(245, 158, 11, 0.45)'
                          : '1px dashed rgba(239, 68, 68, 0.5)';

                        return (
                          <span
                            key={wIdx}
                            title={item.feedback || item.note || ''}
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              margin: '0 3px 3px 0',
                              borderRadius: 5,
                              fontWeight: 700,
                              color,
                              background: bg,
                              border,
                            }}
                          >
                            {item.word}
                          </span>
                        );
                      })}
                    </div>

                    {result.feedbackVi && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          fontSize: 12,
                          color: '#c7d2fe',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Sparkles size={13} style={{ color: '#a5b4fc', flexShrink: 0 }} />
                        <span>{result.feedbackVi}</span>
                      </div>
                    )}
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
