// ─── TOEIC Neural Voice Mapping ──────────────────────────────
// Các giọng đọc Azure Neural cao cấp nhất của Microsoft
export const TOEIC_NEURAL_VOICES = {
  // US (Mỹ) - Chuẩn phát thanh viên & đàm thoại chuyên nghiệp
  'US_FEMALE': 'en-US-JennyNeural',
  'US_MALE': 'en-US-GuyNeural',

  // UK (Anh - Anh) - Đĩnh đạc, tự nhiên
  'UK_FEMALE': 'en-GB-SoniaNeural',
  'UK_MALE': 'en-GB-RyanNeural',

  // AU (Úc) - Chất giọng Úc tự nhiên chuẩn bài thi TOEIC
  'AU_FEMALE': 'en-AU-NatashaNeural',
  'AU_MALE': 'en-AU-WilliamNeural',

  // CA (Canada) - Ngữ điệu tự nhiên vùng Bắc Mỹ
  'CA_FEMALE': 'en-CA-ClaraNeural',
  'CA_MALE': 'en-CA-LiamNeural',
};

/**
 * Phân tích cấu hình speaker và trả về Voice Neural phù hợp nhất
 * @param {Object} speakerConfig - { gender: 'female'|'male', lang: 'en-US'|'en-GB'|'en-AU'|'en-CA', speaker: string }
 * @returns {string} Voice short name (ví dụ: 'en-US-JennyNeural')
 */
export function getNeuralVoiceForSpeaker(speakerConfig = {}) {
  const gender = (speakerConfig.gender || 'female').toLowerCase();
  const lang = (speakerConfig.lang || 'en-US').toLowerCase();
  const speaker = (speakerConfig.speaker || '').toLowerCase();

  const isMale = gender === 'male' || speaker.includes('man') || speaker.startsWith('m-') || speaker.startsWith('m:');
  const isFemale = !isMale;

  if (lang.includes('au') || speaker.includes('au') || speaker.includes('australia')) {
    return isMale ? TOEIC_NEURAL_VOICES.AU_MALE : TOEIC_NEURAL_VOICES.AU_FEMALE;
  }
  if (lang.includes('gb') || lang.includes('uk') || speaker.includes('br') || speaker.includes('uk') || speaker.includes('british')) {
    return isMale ? TOEIC_NEURAL_VOICES.UK_MALE : TOEIC_NEURAL_VOICES.UK_FEMALE;
  }
  if (lang.includes('ca') || speaker.includes('ca') || speaker.includes('canada')) {
    return isMale ? TOEIC_NEURAL_VOICES.CA_MALE : TOEIC_NEURAL_VOICES.CA_FEMALE;
  }

  // Mặc định là giọng Mỹ (US)
  return isFemale ? TOEIC_NEURAL_VOICES.US_FEMALE : TOEIC_NEURAL_VOICES.US_MALE;
}

/**
 * Trả về thông tin hiển thị thân thiện cho người dùng
 */
export function getVoiceDisplayInfo(voiceName) {
  switch (voiceName) {
    case 'en-US-JennyNeural':
      return { name: 'Jenny', accent: 'Mỹ (US)', gender: 'Nữ', flag: '🇺🇸' };
    case 'en-US-GuyNeural':
      return { name: 'Guy', accent: 'Mỹ (US)', gender: 'Nam', flag: '🇺🇸' };
    case 'en-GB-SoniaNeural':
      return { name: 'Sonia', accent: 'Anh (UK)', gender: 'Nữ', flag: '🇬🇧' };
    case 'en-GB-RyanNeural':
      return { name: 'Ryan', accent: 'Anh (UK)', gender: 'Nam', flag: '🇬🇧' };
    case 'en-AU-NatashaNeural':
      return { name: 'Natasha', accent: 'Úc (AU)', gender: 'Nữ', flag: '🇦🇺' };
    case 'en-AU-WilliamNeural':
      return { name: 'William', accent: 'Úc (AU)', gender: 'Nam', flag: '🇦🇺' };
    case 'en-CA-ClaraNeural':
      return { name: 'Clara', accent: 'Canada (CA)', gender: 'Nữ', flag: '🇨🇦' };
    case 'en-CA-LiamNeural':
      return { name: 'Liam', accent: 'Canada (CA)', gender: 'Nam', flag: '🇨🇦' };
    default:
      return { name: 'Jenny', accent: 'Mỹ (US)', gender: 'Nữ', flag: '🇺🇸' };
  }
}
