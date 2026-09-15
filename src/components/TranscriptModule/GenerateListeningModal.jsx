import React, { useState, useMemo } from 'react';
import {
  Sparkles, X, Shuffle, Users, User, Volume2,
  CheckCircle2, ArrowRight, Layers, Flame, BookOpen, AlertCircle
} from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { PRESET_LISTENING_TOPICS, generateListeningScenario } from '../../services/listeningAi';
import { getApiKey, getAllChunks } from '../../store/storage';

const ACCENT_OPTIONS = [
  { lang: 'en-US', label: 'Mỹ (US)', flag: '🇺🇸', desc: 'Chuẩn phát thanh viên' },
  { lang: 'en-GB', label: 'Anh (UK)', flag: '🇬🇧', desc: 'Ngữ điệu đĩnh đạc' },
  { lang: 'en-AU', label: 'Úc (AU)', flag: '🇦🇺', desc: 'Nuốt âm r, bè âm' },
  { lang: 'en-CA', label: 'Canada (CA)', flag: '🇨🇦', desc: 'Chuẩn Bắc Mỹ' },
];

function getSpeakerTag(gender, lang, index = 0) {
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
  if (!isOpen) return null;

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
        // Đảm bảo tag không bị trùng
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
          // Shuffle và lấy 3-4 chunks
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
    setLoadingStep('Đang biên soạn kịch bản hội thoại TOEIC...');

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

      // Callback gửi scenario cho parent component xử lý
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
    <Modal title="✨ Tạo Bài Luyện Nghe TOEIC Bằng AI" onClose={isLoading ? null : onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* 1. Chọn Part 3 vs Part 4 */}
        <div>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={15} color="var(--accent-400)" />
            Dạng bài thi TOEIC
          </label>
          <div className="toggle-group" style={{ maxWidth: 360, marginTop: 4 }}>
            <div
              className={`toggle-option ${part === 'Part 3' ? 'active' : ''}`}
              onClick={() => setPart('Part 3')}
            >
              <Users size={14} style={{ marginRight: 6 }} /> Part 3 (Hội thoại)
            </div>
            <div
              className={`toggle-option ${part === 'Part 4' ? 'active' : ''}`}
              onClick={() => setPart('Part 4')}
            >
              <User size={14} style={{ marginRight: 6 }} /> Part 4 (Độc thoại)
            </div>
          </div>
        </div>

        {/* 2. Chọn chủ đề */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="label" style={{ margin: 0 }}>Chủ đề hội thoại</label>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleRandomTopic}
              title="Chọn ngẫu nhiên một chủ đề để đổi gió"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Shuffle size={12} /> Đổi chủ đề ngẫu nhiên
            </button>
          </div>

          {/* Quick chips */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 8,
            maxHeight: 180,
            overflowY: 'auto',
            padding: 4,
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0,0,0,0.15)',
          }}>
            {PRESET_LISTENING_TOPICS.map((t) => {
              const isSelected = selectedTopicId === t.id && !customTopic.trim();
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTopicId(t.id);
                    setCustomTopic('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'var(--accent-500)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.emoji}</span>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom topic input */}
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Hoặc gõ chủ đề cụ thể (Ví dụ: Xin nghỉ phép gấp, Thương lượng giá thuê văn phòng...)"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        {/* 3. Cấu hình nhân vật & Accent */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
        }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Volume2 size={15} color="var(--accent-400)" />
            Cấu hình nhân vật & Giọng đọc bản xứ
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Speaker 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70, color: 'var(--text-muted)' }}>
                {part === 'Part 3' ? 'Người 1:' : 'Người đọc:'}
              </span>
              <select
                className="input-field"
                style={{ width: 110, padding: '5px 8px', fontSize: 12 }}
                value={speaker1.gender}
                onChange={(e) => setSpeaker1({ ...speaker1, gender: e.target.value })}
              >
                <option value="female">👩 Nữ</option>
                <option value="male">👨 Nam</option>
              </select>

              <select
                className="input-field"
                style={{ width: 180, padding: '5px 8px', fontSize: 12 }}
                value={speaker1.lang}
                onChange={(e) => setSpeaker1({ ...speaker1, lang: e.target.value })}
              >
                {ACCENT_OPTIONS.map(a => (
                  <option key={a.lang} value={a.lang}>
                    {a.flag} {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker 2 (chỉ cho Part 3) */}
            {part === 'Part 3' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70, color: 'var(--text-muted)' }}>
                  Người 2:
                </span>
                <select
                  className="input-field"
                  style={{ width: 110, padding: '5px 8px', fontSize: 12 }}
                  value={speaker2.gender}
                  onChange={(e) => setSpeaker2({ ...speaker2, gender: e.target.value })}
                >
                  <option value="male">👨 Nam</option>
                  <option value="female">👩 Nữ</option>
                </select>

                <select
                  className="input-field"
                  style={{ width: 180, padding: '5px 8px', fontSize: 12 }}
                  value={speaker2.lang}
                  onChange={(e) => setSpeaker2({ ...speaker2, lang: e.target.value })}
                >
                  {ACCENT_OPTIONS.map(a => (
                    <option key={a.lang} value={a.lang}>
                      {a.flag} {a.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speaker 3 (tùy chọn mở rộng cho Part 3) */}
            {part === 'Part 3' && (
              <div>
                {!speaker3Enabled ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setSpeaker3Enabled(true)}
                    style={{ marginTop: 4 }}
                  >
                    + Thêm người thứ 3 (Hội thoại 3 người chuẩn đề khó)
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70, color: '#f59e0b' }}>
                      Người 3:
                    </span>
                    <select
                      className="input-field"
                      style={{ width: 110, padding: '5px 8px', fontSize: 12 }}
                      value={speaker3.gender}
                      onChange={(e) => setSpeaker3({ ...speaker3, gender: e.target.value })}
                    >
                      <option value="male">👨 Nam</option>
                      <option value="female">👩 Nữ</option>
                    </select>

                    <select
                      className="input-field"
                      style={{ width: 180, padding: '5px 8px', fontSize: 12 }}
                      value={speaker3.lang}
                      onChange={(e) => setSpeaker3({ ...speaker3, lang: e.target.value })}
                    >
                      {ACCENT_OPTIONS.map(a => (
                        <option key={a.lang} value={a.lang}>
                          {a.flag} {a.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setSpeaker3Enabled(false)}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ✕ Bỏ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Trình độ & Lồng ghép Chunks */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <label className="label" style={{ marginBottom: 4 }}>Cấp độ thử thách</label>
            <div className="toggle-group" style={{ maxWidth: 260 }}>
              <div
                className={`toggle-option ${level === 'standard' ? 'active' : ''}`}
                onClick={() => setLevel('standard')}
              >
                Tiêu chuẩn (550-700)
              </div>
              <div
                className={`toggle-option ${level === 'advanced' ? 'active' : ''}`}
                onClick={() => setLevel('advanced')}
              >
                Nâng cao (750+)
              </div>
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginTop: 18,
          }}>
            <input
              type="checkbox"
              checked={embedChunksEnabled}
              onChange={(e) => setEmbedChunksEnabled(e.target.checked)}
              style={{ accentColor: 'var(--accent-500)' }}
            />
            <span>Lồng ghép 2-3 Chunks từ kho ôn tập</span>
          </label>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Spinner size={20} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Đang tạo bài nghe bằng Gemini AI...
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {loadingStep || 'Vui lòng chờ khoảng 2 giây...'}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
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
              background: 'linear-gradient(135deg, var(--accent-600), #7c3aed)',
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLoading ? (
              <>
                <Spinner size={14} /> Đang tạo...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Tạo bài luyện nghe ngay
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
