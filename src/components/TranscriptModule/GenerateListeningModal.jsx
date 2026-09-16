import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, Shuffle, Users, Volume2, BookOpen,
  Briefcase, Plane, ShoppingBag, Package, BarChart2, Building2,
  Laptop, TrendingUp, Utensils, Wrench, GraduationCap, Mic, Check,
  PenLine, X, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { PRESET_LISTENING_TOPICS, generateListeningScenario } from '../../services/listeningAi';
import { getApiKey, getAllChunks } from '../../store/storage';

const TOPIC_ICONS = {
  office_project: Briefcase,
  flight_travel: Plane,
  customer_service: ShoppingBag,
  logistics_order: Package,
  budget_finance: BarChart2,
  recruitment_hr: Users,
  hotel_hospitality: Building2,
  tech_support: Laptop,
  marketing_campaign: TrendingUp,
  restaurant_catering: Utensils,
  facility_maintenance: Wrench,
  workshop_training: GraduationCap,
};

const ACCENTS = [
  { lang: 'en-US', aSuffix: 'Am', label: 'Mỹ (US)' },
  { lang: 'en-GB', aSuffix: 'Br', label: 'Anh (UK)' },
  { lang: 'en-AU', aSuffix: 'Au', label: 'Úc (AU)' },
  { lang: 'en-CA', aSuffix: 'Ca', label: 'Canada (CA)' },
];

/**
 * Tự động chọn nhân vật và accent bản xứ ngẫu nhiên theo chuẩn khảo thí ETS
 */
function generateAutoSpeakers(partType) {
  if (partType === 'Part 3') {
    // 2 nhân vật khác giới tính và khác giọng đọc (ví dụ: Nữ Mỹ + Nam Úc)
    const g1 = Math.random() > 0.5 ? 'female' : 'male';
    const g2 = g1 === 'female' ? 'male' : 'female';

    const usAccent = ACCENTS[0];
    const nonUsAccents = ACCENTS.slice(1);
    const otherAccent = nonUsAccents[Math.floor(Math.random() * nonUsAccents.length)];

    const [acc1, acc2] = Math.random() > 0.5 ? [usAccent, otherAccent] : [otherAccent, usAccent];

    return [
      {
        tag: `${g1 === 'female' ? 'W' : 'M'}-${acc1.aSuffix}`,
        gender: g1,
        lang: acc1.lang,
        label: `Người 1 (${g1 === 'female' ? 'Nữ' : 'Nam'} ${acc1.label})`,
      },
      {
        tag: `${g2 === 'female' ? 'W' : 'M'}-${acc2.aSuffix}`,
        gender: g2,
        lang: acc2.lang,
        label: `Người 2 (${g2 === 'female' ? 'Nữ' : 'Nam'} ${acc2.label})`,
      },
    ];
  } else {
    // Part 4: 1 người đọc ngẫu nhiên
    const g = Math.random() > 0.5 ? 'female' : 'male';
    const acc = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
    return [
      {
        tag: `${g === 'female' ? 'W' : 'M'}-${acc.aSuffix}`,
        gender: g,
        lang: acc.lang,
        label: `Người đọc (${g === 'female' ? 'Nữ' : 'Nam'} ${acc.label})`,
      },
    ];
  }
}

export default function GenerateListeningModal({
  isOpen,
  onClose,
  onGenerated,
  onToast,
  initialTopicId = null,
  initialPart = 'Part 3',
}) {
  const [step, setStep] = useState(1); // 1: Chọn Part -> 2: Chọn Chủ đề
  const [part, setPart] = useState(initialPart || 'Part 3'); // 'Part 3' | 'Part 4'
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId || PRESET_LISTENING_TOPICS[0].id);
  const [customTopic, setCustomTopic] = useState('');
  const [level, setLevel] = useState('standard'); // 'standard' | 'advanced'
  const [embedChunksEnabled, setEmbedChunksEnabled] = useState(true);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Reset về Bước 1 khi mở modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (initialPart) setPart(initialPart);
      if (initialTopicId) setSelectedTopicId(initialTopicId);
    }
  }, [isOpen, initialPart, initialTopicId]);

  // Selected topic details
  const activePreset = useMemo(() => {
    return PRESET_LISTENING_TOPICS.find(t => t.id === selectedTopicId) || PRESET_LISTENING_TOPICS[0];
  }, [selectedTopicId]);

  if (!isOpen) return null;

  // Ngẫu nhiên chọn 1 chủ đề
  const handleRandomTopic = () => {
    const randomIdx = Math.floor(Math.random() * PRESET_LISTENING_TOPICS.length);
    setSelectedTopicId(PRESET_LISTENING_TOPICS[randomIdx].id);
    setCustomTopic('');
  };

  // Submit & Gọi AI sinh bài
  const handleGenerate = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      onToast?.('error', 'Chưa có Gemini API key. Vui lòng vào Cài đặt để nhập key.');
      return;
    }

    // AI tự động phối hợp nhân vật và giọng đọc
    const speakersList = generateAutoSpeakers(part);

    // Lấy chunks từ kho lưu trữ để AI lồng ghép (nếu bật)
    let chunksToEmbed = [];
    if (embedChunksEnabled) {
      try {
        const allUserChunks = getAllChunks() || [];
        if (allUserChunks.length > 0) {
          const shuffled = [...allUserChunks].sort(() => 0.5 - Math.random());
          chunksToEmbed = shuffled.slice(0, 3).map(c => ({
            phrase: c.phrase,
            meaningVi: c.meaningVi,
          }));
        }
      } catch (e) {
        console.warn('Lỗi lấy chunks để lồng ghép:', e);
      }
    }

    setIsLoading(true);
    setLoadingStep('Đang biên soạn kịch bản đàm thoại TOEIC...');

    try {
      const scenario = await generateListeningScenario({
        topic: activePreset.titleEn,
        customTopic,
        part,
        level,
        speakers: speakersList,
        embedChunks: chunksToEmbed,
        apiKey,
      });

      setLoadingStep('Hoàn tất kịch bản, đang mở phòng nghe...');
      onToast?.('success', `Đã tạo bài luyện nghe: "${scenario.title}"!`);

      onGenerated?.({
        ...scenario,
        generatedByAi: true,
        sourceTopic: customTopic || activePreset.title,
      });

      onClose();
    } catch (err) {
      console.error('Lỗi khi sinh bài nghe:', err);
      onToast?.('error', `Lỗi AI: ${err.message || 'Không thể sinh bài nghe'}`);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <Modal
      title="Tạo bài luyện nghe TOEIC bằng AI"
      description={
        step === 1
          ? "Bước 1/2: Chọn dạng bài thi TOEIC (Part 3 Hội thoại hoặc Part 4 Độc thoại)"
          : `Bước 2/2: Chọn chủ đề tình huống cho ${part}`
      }
      onClose={isLoading ? null : onClose}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {step === 1 ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setStep(2)}
                style={{
                  padding: '8px 20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                }}
              >
                <span>Tiếp tục</span>
                <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStep(1)}
                disabled={isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleGenerate}
                disabled={isLoading}
                style={{
                  padding: '8px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                }}
              >
                {isLoading ? (
                  <>
                    <Spinner size={14} />
                    <span>Đang tạo bài nghe...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} strokeWidth={1.75} />
                    <span>Tạo bài luyện nghe</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '2px 2px 10px' }}>

        {/* ── Stepper Wizard Navigation ───────────────────────── */}
        <div className="ai-modal-stepper">
          <div
            className={`ai-modal-step-pill ${step === 1 ? 'active' : 'completed'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => !isLoading && setStep(1)}
          >
            <span className="step-num">{step > 1 ? '✓' : '1'}</span>
            <span>Dạng bài: {part}</span>
          </div>

          <div className="ai-modal-step-line" />

          <div
            className={`ai-modal-step-pill ${step === 2 ? 'active' : ''}`}
            style={{ cursor: step === 2 ? 'default' : 'pointer' }}
            onClick={() => !isLoading && setStep(2)}
          >
            <span className="step-num">2</span>
            <span>Chủ đề bài nghe</span>
          </div>
        </div>

        {/* ── BƯỚC 1: CHỌN PART ───────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                className={`ai-modal-part-card ${part === 'Part 3' ? 'active' : ''}`}
                onClick={() => setPart('Part 3')}
                style={{ padding: '16px 18px' }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    placeItems: 'center',
                    background: part === 'Part 3' ? 'var(--accent-500)' : 'rgba(255,255,255,0.06)',
                    color: part === 'Part 3' ? '#fff' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <Users size={18} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Part 3 (Hội thoại)</span>
                    {part === 'Part 3' && <Check size={16} style={{ color: 'var(--accent-400)' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
                    2 người đối thoại qua lại về công việc, công sở, thương mại
                  </div>
                </div>
              </div>

              <div
                className={`ai-modal-part-card ${part === 'Part 4' ? 'active' : ''}`}
                onClick={() => setPart('Part 4')}
                style={{ padding: '16px 18px' }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    placeItems: 'center',
                    background: part === 'Part 4' ? 'var(--accent-500)' : 'rgba(255,255,255,0.06)',
                    color: part === 'Part 4' ? '#fff' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <Mic size={18} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Part 4 (Độc thoại)</span>
                    {part === 'Part 4' && <Check size={16} style={{ color: 'var(--accent-400)' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
                    1 người phát biểu, thông báo sân bay, tin nhắn thoại, bản tin
                  </div>
                </div>
              </div>
            </div>

            {/* Giọng đọc thông minh AI tự động */}
            <div className="ai-modal-voice-banner">
              <div className="ai-modal-voice-banner-icon">
                <Volume2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Giọng đọc bản xứ tự động (AI Auto-Pilot)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  AI sẽ tự động phân bổ kết hợp các ngữ điệu chuẩn ETS (Mỹ, Anh, Úc, Canada) với giọng nam/nữ đan xen tự nhiên để bạn luyện phản xạ nghe tối đa.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: CHỌN CHỦ ĐỀ ─────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Chọn chủ đề bài nghe ({part})
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleRandomTopic}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px' }}
                  title="Chọn ngẫu nhiên một chủ đề để thay đổi ngữ cảnh"
                >
                  <Shuffle size={12} strokeWidth={1.75} />
                  <span>Đổi ngẫu nhiên</span>
                </button>
              </div>

              {/* 2-Column Responsive Topic Grid */}
              <div className="ai-modal-topic-container" style={{ maxHeight: 260 }}>
                {PRESET_LISTENING_TOPICS.map((t) => {
                  const IconComp = TOPIC_ICONS[t.id] || Briefcase;
                  const isSelected = selectedTopicId === t.id && !customTopic.trim();

                  return (
                    <div
                      key={t.id}
                      className={`ai-modal-topic-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTopicId(t.id);
                        setCustomTopic('');
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          display: 'grid',
                          placeItems: 'center',
                          background: isSelected ? 'var(--accent-500)' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={14} strokeWidth={1.75} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {t.title}
                        </div>
                      </div>
                      {isSelected && <Check size={14} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>

              {/* Custom topic input with icon & clear button */}
              <div className="ai-modal-input-wrapper">
                <PenLine size={15} className="ai-modal-input-icon" />
                <input
                  type="text"
                  className="ai-modal-input"
                  placeholder="Hoặc nhập chủ đề cụ thể (Ví dụ: Xin nghỉ phép gấp, Thương lượng giá thuê văn phòng...)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
                {customTopic.trim() && (
                  <button
                    type="button"
                    className="ai-modal-input-clear"
                    onClick={() => setCustomTopic('')}
                    title="Xóa chủ đề đã nhập"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Độ khó & Lồng ghép Chunks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                  Độ khó kịch bản
                </label>
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', gap: 3 }}>
                  <button
                    type="button"
                    onClick={() => setLevel('standard')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 'calc(var(--radius-md) - 3px)',
                      fontSize: 11.5,
                      fontWeight: level === 'standard' ? 700 : 500,
                      background: level === 'standard' ? 'var(--accent-500)' : 'transparent',
                      color: level === 'standard' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Tiêu chuẩn (550-700)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevel('advanced')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 'calc(var(--radius-md) - 3px)',
                      fontSize: 11.5,
                      fontWeight: level === 'advanced' ? 700 : 500,
                      background: level === 'advanced' ? 'var(--accent-500)' : 'transparent',
                      color: level === 'advanced' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Nâng cao (750+)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                  Tích hợp ôn tập
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 10px',
                    height: 38,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={embedChunksEnabled}
                    onChange={(e) => setEmbedChunksEnabled(e.target.checked)}
                    style={{ accentColor: 'var(--accent-500)' }}
                  />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Lồng ghép Chunks đã học
                  </span>
                </label>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(53, 106, 230, 0.1)',
                  border: '1px solid rgba(53, 106, 230, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Spinner size={20} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Đang biên soạn bài nghe TOEIC bằng AI...
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {loadingStep || 'Vui lòng chờ giây lát...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
