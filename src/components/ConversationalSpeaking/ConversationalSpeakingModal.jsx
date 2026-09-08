import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, Sparkles, X, Check, ArrowRight,
  RotateCcw, MessageSquare, AlertCircle, Info, Radio,
  ChevronDown, HelpCircle, Layers, CheckCircle2, Award
} from 'lucide-react';
import { playTextWithTts, stopAudio, checkVoiceStudioStatus } from '../../services/ttsService';
import { evaluatePronunciationGOP } from '../../services/sherpaOnnxService';
import {
  generateSpeakingScenario,
  continueConversation,
  REAL_LIFE_PRESETS
} from '../../services/scenarioAi';
import { formatIPA, getPhoneticTip } from '../../services/phonetics';
import './ConversationalSpeaking.css';

export default function ConversationalSpeakingModal({
  isOpen,
  onClose,
  initialChunks = [],
  onChunkMastered = null,
}) {
  // ─── States ───────────────────────────────────────────────────
  const [scenario, setScenario] = useState(null);
  const [isLoadingScenario, setIsLoadingScenario] = useState(true);
  const [history, setHistory] = useState([]); // [{ sender: 'ai'|'user', text, textVi, words: [], score: 0, audioBlob }]
  const [targetChunks, setTargetChunks] = useState([]);
  const [usedChunkPhrases, setUsedChunkPhrases] = useState(new Set());
  
  // Audio & Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [voiceStudioActive, setVoiceStudioActive] = useState(false);

  // Inspector states
  const [inspectingWord, setInspectingWord] = useState(null); // { word, status, score, targetIpa, spokenIpa, errorType, feedback, tip }
  const [showTranslations, setShowTranslations] = useState(true);
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');

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
    scrollToBottom();
  }, [history, isProcessing, isAiSpeaking]);

  // Kiểm tra trạng thái VoiceStudio khi mở modal
  useEffect(() => {
    if (isOpen) {
      checkVoiceStudioStatus().then(active => setVoiceStudioActive(active));
    }
  }, [isOpen]);

  // Khởi tạo tình huống ban đầu
  const initScenario = useCallback(async (selectedPreset = null, customTopic = '') => {
    setIsLoadingScenario(true);
    stopAudio();
    setHistory([]);
    setUsedChunkPhrases(new Set());
    setInspectingWord(null);

    let chosenScenario;
    if (selectedPreset) {
      chosenScenario = {
        ...selectedPreset,
        targetChunks: initialChunks.length > 0
          ? initialChunks.map(c => typeof c === 'string' ? { phrase: c, meaningVi: '' } : c)
          : selectedPreset.defaultChunks.map(p => ({ phrase: p, meaningVi: 'Cụm từ tự nhiên' })),
      };
    } else {
      chosenScenario = await generateSpeakingScenario({
        targetChunks: initialChunks,
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
      timestamp: Date.now(),
    };
    setHistory([openingMsg]);

    // Phát âm thanh câu mở đầu
    setIsAiSpeaking(true);
    playTextWithTts(chosenScenario.openingMessage, 'en-US-JennyNeural')
      .finally(() => setIsAiSpeaking(false));
  }, [initialChunks]);

  useEffect(() => {
    if (isOpen && !scenario) {
      initScenario();
    }
  }, [isOpen, scenario, initScenario]);

  // Dọn dẹp âm thanh khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen]);

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
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVolumeMonitor(stream);

      // 1. MediaRecorder để lưu Audio Buffer cho Sherpa GOP
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
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
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const combined = (finalTranscript + interim).trim();
          if (combined) {
            transcriptBufferRef.current = combined;
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

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    stopVolumeMonitor();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const spokenText = transcriptBufferRef.current.trim();
        handleUserSpeechTurn(spokenText, audioBlob);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
  };

  // ─── Xử lý sau khi người học nói xong một câu ───────────────────
  const handleUserSpeechTurn = async (spokenText, audioBlob) => {
    if (!spokenText) {
      // Người dùng không nói gì hoặc mic không bắt được
      return;
    }

    setIsProcessing(true);

    // 1. Chấm điểm âm học & IPA với Sherpa-ONNX GOP Client (< 100ms)
    const evaluation = await evaluatePronunciationGOP({
      targetSentence: spokenText,
      spokenText: spokenText,
      targetChunks: targetChunks.map(c => c.phrase || c),
      audioBlob,
    });

    // 2. Cập nhật các Chunk đã kích hoạt thành công
    const newlyUsed = evaluation.chunksUsed || [];
    if (newlyUsed.length > 0) {
      setUsedChunkPhrases(prev => {
        const nextSet = new Set(prev);
        newlyUsed.forEach(p => {
          nextSet.add(p);
          onChunkMastered?.(p);
        });
        return nextSet;
      });
    }

    // 3. Thêm tin nhắn của User vào Timeline
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: spokenText,
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
    const chunksRemaining = targetChunks.filter(c => !usedChunkPhrases.has(c.phrase || c));
    const aiNext = await continueConversation({
      history: updatedHistory,
      userTranscript: spokenText,
      scenario,
      chunksRemaining,
    });

    setIsProcessing(false);

    // 5. Thêm tin nhắn của AI vào Timeline và phát giọng đọc
    const aiMsg = {
      id: 'msg_ai_' + Date.now(),
      sender: 'ai',
      text: aiNext.aiReply,
      textVi: aiNext.aiReplyVi,
      encouragement: aiNext.encouragement,
      timestamp: Date.now(),
    };

    setHistory(prev => [...prev, aiMsg]);

    // Phát âm thanh AI
    setIsAiSpeaking(true);
    playTextWithTts(aiNext.aiReply, 'en-US-JennyNeural')
      .finally(() => setIsAiSpeaking(false));
  };

  if (!isOpen) return null;

  return (
    <div
      className="csm-overlay animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'rgba(4, 7, 14, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="csm-dialog"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 860,
          height: '92vh',
          maxHeight: 880,
          display: 'flex',
          flexDirection: 'column',
          background: '#0d121f',
          color: '#f1f5f9',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        }}
      >
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
              onClick={() => setShowScenarioPicker(!showScenarioPicker)}
              className="csm-btn-action"
              title="Đổi tình huống giao tiếp"
            >
              <Layers size={14} />
              <span>Đổi bối cảnh</span>
              <ChevronDown size={13} />
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

        {/* ─── Scenario Picker Dropdown ───────────────────────── */}
        {showScenarioPicker && (
          <div className="csm-scenario-picker">
            <div className="csm-picker-label">Chọn tình huống đàm thoại thực tế:</div>
            <div className="csm-preset-grid">
              {REAL_LIFE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    initScenario(p);
                    setShowScenarioPicker(false);
                  }}
                  className={`csm-preset-card ${scenario?.id === p.id ? 'active' : ''}`}
                >
                  <div className="csm-preset-title">{p.title}</div>
                  <div className="csm-preset-desc">{p.description}</div>
                </button>
              ))}
            </div>

            {/* Tự gõ chủ đề bất kỳ */}
            <div className="csm-custom-input-row">
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                placeholder="Hoặc tự gõ bối cảnh (ví dụ: Đi phỏng vấn, Hỏi thăm sức khỏe...)"
                className="csm-custom-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customTopicInput.trim()) {
                    initScenario(null, customTopicInput.trim());
                    setCustomTopicInput('');
                    setShowScenarioPicker(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (customTopicInput.trim()) {
                    initScenario(null, customTopicInput.trim());
                    setCustomTopicInput('');
                    setShowScenarioPicker(false);
                  }
                }}
                className="csm-btn-create-topic"
              >
                Tạo
              </button>
            </div>
          </div>
        )}

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
                  {isUsed ? <CheckCircle2 size={12} color="#34d399" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b' }} />}
                  <span>{phrase}</span>
                </div>
              );
            })}
          </div>

          {targetChunks.length > 0 && (
            <div className="csm-chunk-count">
              Đã dùng: <span style={{ color: '#34d399' }}>{usedChunkPhrases.size}</span>/{targetChunks.length}
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
                        <button
                          onClick={() => {
                            setIsAiSpeaking(true);
                            playTextWithTts(msg.text, 'en-US-JennyNeural')
                              .finally(() => setIsAiSpeaking(false));
                          }}
                          className="csm-btn-replay"
                        >
                          <Volume2 size={13} />
                          <span>Nghe lại</span>
                        </button>
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
              <span>Sherpa-ONNX đang phân tích âm học và chuyển tiếp cho bạn bản xứ...</span>
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

        {/* ─── Footer Controls & Microphone ───────────────────── */}
        <div className="csm-footer">
          {/* Live Wave Bars khi đang ghi âm */}
          {isRecording && (
            <div className="csm-wave-bars">
              {[...Array(12)].map((_, i) => {
                const barH = Math.min(20, Math.max(4, Math.round((volumeLevel / 15) * (1 + Math.sin(i * 0.8)) * 10)));
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

          {/* Main Action Button */}
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
                Đang lắng nghe... Nói tự nhiên và bấm lại Mic khi xong câu
              </span>
            ) : isAiSpeaking ? (
              <span style={{ color: '#38bdf8' }}>AI đang nói... Hãy lắng nghe ngữ điệu</span>
            ) : isProcessing ? (
              <span style={{ color: '#fbbf24' }}>Đang đối soát âm vị IPA và gửi cho AI...</span>
            ) : (
              <span>Chạm vào Mic để trả lời phản xạ bằng tiếng Anh</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
