import React, { useState, useMemo } from 'react';
import {
  Sparkles, Shuffle, Users, Volume2, BookOpen,
  Briefcase, Plane, ShoppingBag, Package, BarChart2, Building2,
  Laptop, TrendingUp, Utensils, Wrench, GraduationCap, Mic, Check,
  PenLine, X
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

const ACCENT_OPTIONS = [
  { lang: 'en-US', label: 'Mỹ (US)', code: 'US', desc: 'Chuẩn phát thanh viên ETS' },
  { lang: 'en-GB', label: 'Anh (UK)', code: 'UK', desc: 'Ngữ điệu đĩnh đạc Luân Đôn' },
  { lang: 'en-AU', label: 'Úc (AU)', code: 'AU', desc: 'Nuốt âm r, bè âm tự nhiên' },
  { lang: 'en-CA', label: 'Canada (CA)', code: 'CA', desc: 'Chuẩn giọng Bắc Mỹ' },
];

function getSpeakerTag(gender, lang, _index = 0) {
  const gPrefix = gender === 'female' ? 'W' : 'M';
  let aSuffix = 'Am';
  if (lang.includes('au')) aSuffix = 'Au';
  else if (lang.includes('gb') || lang.includes('uk')) aSuffix = 'Br';
  else if (lang.includes('ca')) aSuffix = 'Ca';
  else aSuffix = 'Am';

  return `${gPrefix}-${aSuffix}`;
}

export default function GenerateListeningModal({
  isOpen,
  onClose,
  onGenerated,
  onToast,
  initialTopicId = null,
  initialPart = 'Part 3',
}) {
  const [part, setPart] = useState(initialPart || 'Part 3'); // 'Part 3' | 'Part 4'
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId || PRESET_LISTENING_TOPICS[0].id);
  const [customTopic, setCustomTopic] = useState('');
  const [level, setLevel] = useState('standard'); // 'standard' | 'advanced'
  const [embedChunksEnabled, setEmbedChunksEnabled] = useState(true);

  // Speaker configurations
  const [speaker1, setSpeaker1] = useState({ gender: 'female', lang: 'en-US' });
  const [speaker2, setSpeaker2] = useState({ gender: 'male', lang: 'en-AU' });
  const [speaker3Enabled, setSpeaker3Enabled] = useState(false);
  const [speaker3, setSpeaker3] = useState({ gender: 'male', lang: 'en-GB' });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

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

    // Chuẩn bị danh sách nhân vật
    const speakersList = [];
    if (part === 'Part 3') {
      speakersList.push({
        tag: getSpeakerTag(speaker1.gender, speaker1.lang, 1),
        gender: speaker1.gender,
        lang: speaker1.lang,
        label: `Người 1 (${speaker1.gender === 'female' ? 'Nữ' : 'Nam'} ${speaker1.lang.slice(3)})`,
      });
      speakersList.push({
        tag: getSpeakerTag(speaker2.gender, speaker2.lang, 2),
        gender: speaker2.gender,
        lang: speaker2.lang,
        label: `Người 2 (${speaker2.gender === 'female' ? 'Nữ' : 'Nam'} ${speaker2.lang.slice(3)})`,
      });
      if (speaker3Enabled) {
        let tag3 = getSpeakerTag(speaker3.gender, speaker3.lang, 3);
        if (tag3 === speakersList[0].tag || tag3 === speakersList[1].tag) {
          tag3 += '2';
        }
        speakersList.push({
          tag: tag3,
          gender: speaker3.gender,
          lang: speaker3.lang,
          label: `Người 3 (${speaker3.gender === 'female' ? 'Nữ' : 'Nam'} ${speaker3.lang.slice(3)})`,
        });
      }
    } else {
      // Part 4 (1 người nói)
      speakersList.push({
        tag: getSpeakerTag(speaker1.gender, speaker1.lang, 1),
        gender: speaker1.gender,
        lang: speaker1.lang,
        label: `Người đọc (${speaker1.gender === 'female' ? 'Nữ' : 'Nam'} ${speaker1.lang.slice(3)})`,
      });
    }

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
      description="Biên soạn kịch bản đàm thoại Part 3 & 4 với ngữ cảnh bản xứ theo chuẩn khảo thí ETS."
      onClose={isLoading ? null : onClose}
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, width: '100%' }}>
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
            onClick={handleGenerate}
            disabled={isLoading}
            style={{
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
            }}
          >
            {isLoading ? (
              <>
                <Spinner size={14} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} strokeWidth={1.75} />
                <span>Tạo bài luyện nghe</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 2px 14px' }}>

        {/* ── 1. Dạng bài thi TOEIC (Part 3 vs Part 4) ─────────── */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} style={{ color: 'var(--accent-400)' }} />
            Dạng bài thi TOEIC
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div
              className={`ai-modal-part-card ${part === 'Part 3' ? 'active' : ''}`}
              onClick={() => setPart('Part 3')}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  background: part === 'Part 3' ? 'var(--accent-500)' : 'var(--bg-elevated)',
                  color: part === 'Part 3' ? '#fff' : 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                <Users size={16} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Part 3 (Hội thoại)</span>
                  {part === 'Part 3' && <Check size={14} style={{ color: 'var(--accent-400)' }} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  2–3 người đàm thoại trao đổi công việc, công sở
                </div>
              </div>
            </div>

            <div
              className={`ai-modal-part-card ${part === 'Part 4' ? 'active' : ''}`}
              onClick={() => setPart('Part 4')}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  placeItems: 'center',
                  background: part === 'Part 4' ? 'var(--accent-500)' : 'var(--bg-elevated)',
                  color: part === 'Part 4' ? '#fff' : 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                <Mic size={16} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Part 4 (Độc thoại)</span>
                  {part === 'Part 4' && <Check size={14} style={{ color: 'var(--accent-400)' }} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  1 người phát biểu, thông báo sân bay, tin nhắn thoại
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Chọn chủ đề hội thoại (Không bao giờ bị tràn/cắt chữ) ─ */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Chủ đề bài nghe
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleRandomTopic}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 8px' }}
              title="Chọn ngẫu nhiên một chủ đề để thay đổi ngữ cảnh"
            >
              <Shuffle size={12} strokeWidth={1.75} />
              <span>Đổi ngẫu nhiên</span>
            </button>
          </div>

          {/* 2-Column Responsive Topic Grid (Không bị cắt chữ, padding chuẩn) */}
          <div className="ai-modal-topic-container">
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

        {/* ── 3. Cấu hình nhân vật & Giọng đọc bản xứ ──────────── */}
        <div className="ai-modal-speaker-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Volume2 size={15} style={{ color: 'var(--accent-400)' }} />
              {part === 'Part 3' ? 'Cấu hình nhân vật hội thoại' : 'Cấu hình giọng đọc độc thoại'}
            </label>

            {part === 'Part 3' && !speaker3Enabled && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setSpeaker3Enabled(true)}
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                + Thêm người thứ 3 (Đề khó)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Speaker 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 72, color: 'var(--text-muted)' }}>
                {part === 'Part 3' ? 'Người 1:' : 'Người đọc:'}
              </span>
              <select
                className="ai-modal-select"
                style={{ width: 130 }}
                value={speaker1.gender}
                onChange={(e) => setSpeaker1({ ...speaker1, gender: e.target.value })}
              >
                <option value="female">Nữ (Female)</option>
                <option value="male">Nam (Male)</option>
              </select>

              <select
                className="ai-modal-select"
                style={{ flex: '1 1 240px', minWidth: 220 }}
                value={speaker1.lang}
                onChange={(e) => setSpeaker1({ ...speaker1, lang: e.target.value })}
              >
                {ACCENT_OPTIONS.map(a => (
                  <option key={a.lang} value={a.lang}>
                    {a.label} — {a.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker 2 (chỉ cho Part 3) */}
            {part === 'Part 3' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 72, color: 'var(--text-muted)' }}>
                  Người 2:
                </span>
                <select
                  className="ai-modal-select"
                  style={{ width: 130 }}
                  value={speaker2.gender}
                  onChange={(e) => setSpeaker2({ ...speaker2, gender: e.target.value })}
                >
                  <option value="male">Nam (Male)</option>
                  <option value="female">Nữ (Female)</option>
                </select>

                <select
                  className="ai-modal-select"
                  style={{ flex: '1 1 240px', minWidth: 220 }}
                  value={speaker2.lang}
                  onChange={(e) => setSpeaker2({ ...speaker2, lang: e.target.value })}
                >
                  {ACCENT_OPTIONS.map(a => (
                    <option key={a.lang} value={a.lang}>
                      {a.label} — {a.desc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speaker 3 (khi bật tùy chọn 3 người) */}
            {part === 'Part 3' && speaker3Enabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 72, color: '#f59e0b' }}>
                  Người 3:
                </span>
                <select
                  className="ai-modal-select"
                  style={{ width: 130 }}
                  value={speaker3.gender}
                  onChange={(e) => setSpeaker3({ ...speaker3, gender: e.target.value })}
                >
                  <option value="male">Nam (Male)</option>
                  <option value="female">Nữ (Female)</option>
                </select>

                <select
                  className="ai-modal-select"
                  style={{ flex: '1 1 240px', minWidth: 220 }}
                  value={speaker3.lang}
                  onChange={(e) => setSpeaker3({ ...speaker3, lang: e.target.value })}
                >
                  {ACCENT_OPTIONS.map(a => (
                    <option key={a.lang} value={a.lang}>
                      {a.label} — {a.desc}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setSpeaker3Enabled(false)}
                  style={{ color: 'var(--text-muted)', padding: '4px 6px' }}
                  title="Hủy người thứ 3"
                >
                  ✕ Bỏ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Cấp độ & Lồng ghép Chunks (Không bị che khuất) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
              Độ khó kịch bản
            </label>
            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', gap: 3 }}>
              <button
                type="button"
                onClick={() => setLevel('standard')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'calc(var(--radius-md) - 3px)',
                  fontSize: 12,
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
                  padding: '6px 8px',
                  borderRadius: 'calc(var(--radius-md) - 3px)',
                  fontSize: 12,
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
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
              Tích hợp học tập
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
              }}
            >
              <input
                type="checkbox"
                checked={embedChunksEnabled}
                onChange={(e) => setEmbedChunksEnabled(e.target.checked)}
                style={{ accentColor: 'var(--accent-500)', marginTop: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Lồng ghép Chunks từ kho ôn tập
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  Tự động đưa 2–3 cụm từ đang học vào ngữ cảnh hội thoại
                </div>
              </div>
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
    </Modal>
  );
}
