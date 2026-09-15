import { callGemini } from './ai';

/**
 * 12+ Chủ đề TOEIC Part 3 & 4 phổ biến nhất trong đề thi ETS & Hacker TOEIC
 */
export const PRESET_LISTENING_TOPICS = [
  {
    id: 'office_project',
    title: 'Họp dự án & Tiến độ công việc',
    titleEn: 'Office & Project Progress',
    emoji: '💼',
    desc: 'Bàn giao task, dời deadline, họp khẩn với đối tác',
  },
  {
    id: 'flight_travel',
    title: 'Sân bay & Đổi vé máy bay',
    titleEn: 'Travel & Flight Rescheduling',
    emoji: '✈️',
    desc: 'Delay chuyến bay, đổi hành trình, thất lạc hành lý',
  },
  {
    id: 'customer_service',
    title: 'Xử lý khiếu nại khách hàng',
    titleEn: 'Customer Support & Refunds',
    emoji: '🛍️',
    desc: 'Sản phẩm lỗi, yêu cầu hoàn tiền, đổi trả hàng',
  },
  {
    id: 'logistics_order',
    title: 'Đặt hàng & Giao nhận kho vận',
    titleEn: 'Order Placement & Logistics',
    emoji: '📦',
    desc: 'Thiếu hàng, chậm trễ vận chuyển, ký nhận đơn hàng',
  },
  {
    id: 'budget_finance',
    title: 'Ngân sách & Chi phí dự án',
    titleEn: 'Budget & Financial Planning',
    emoji: '📊',
    desc: 'Vượt ngân sách, xin duyệt kinh phí, cắt giảm chi tiêu',
  },
  {
    id: 'recruitment_hr',
    title: 'Tuyển dụng & Phỏng vấn nhân sự',
    titleEn: 'Recruitment & Job Interview',
    emoji: '🤝',
    desc: 'Phỏng vấn ứng viên, thư mời nhận việc, phúc lợi',
  },
  {
    id: 'hotel_hospitality',
    title: 'Khách sạn & Đặt chỗ sự kiện',
    titleEn: 'Hotel & Event Reservations',
    emoji: '🏨',
    desc: 'Đặt phòng hội nghị, nâng hạng phòng, dịch vụ tiệc',
  },
  {
    id: 'tech_support',
    title: 'Sự cố công nghệ & Hỗ trợ kỹ thuật',
    titleEn: 'IT & Technical Assistance',
    emoji: '💻',
    desc: 'Máy in hỏng, lỗi phần mềm, gián đoạn mạng nội bộ',
  },
  {
    id: 'marketing_campaign',
    title: 'Chiến dịch tiếp thị & Khuyến mãi',
    titleEn: 'Marketing & Sales Promotion',
    emoji: '📈',
    desc: 'Khảo sát thị trường, ra mắt sản phẩm mới, giảm giá',
  },
  {
    id: 'restaurant_catering',
    title: 'Nhà hàng & Tiệc công ty',
    titleEn: 'Dining & Corporate Catering',
    emoji: '🍽️',
    desc: 'Đặt bàn tiếp khách VIP, chọn thực đơn ăn trưa',
  },
  {
    id: 'facility_maintenance',
    title: 'Bảo trì tòa nhà & Văn phòng',
    titleEn: 'Facilities & Building Maintenance',
    emoji: '🔧',
    desc: 'Sửa điều hòa, sửa chữa thang máy, an toàn lao động',
  },
  {
    id: 'workshop_training',
    title: 'Đào tạo nhân viên & Hội thảo',
    titleEn: 'Staff Training & Seminar',
    emoji: '🎓',
    desc: 'Đăng ký khóa học kỹ năng, hướng dẫn quy trình mới',
  },
];

/**
 * Sinh kịch bản luyện nghe TOEIC Part 3/4 theo yêu cầu bằng Gemini
 */
export async function generateListeningScenario({
  topic = 'Office & Project Progress',
  customTopic = '',
  part = 'Part 3', // 'Part 3' | 'Part 4'
  level = 'standard', // 'standard' (550-700) | 'advanced' (750+)
  speakers = [
    { tag: 'W-Am', gender: 'female', lang: 'en-US', label: 'Nữ Mỹ' },
    { tag: 'M-Au', gender: 'male', lang: 'en-AU', label: 'Nam Úc' },
  ],
  embedChunks = [],
  apiKey = null,
}) {
  const chosenTopic = (customTopic || topic || 'Business & Workplace').trim();
  const isPart3 = part === 'Part 3';

  // Format danh sách speaker tag
  const speakerListText = speakers
    .map(s => `- Tag "${s.tag}": ${s.label || s.tag} (${s.gender === 'female' ? 'Woman' : 'Man'}, accent ${s.lang})`)
    .join('\n');

  // Format danh sách chunk cần lồng ghép
  let chunkInstruction = '';
  if (embedChunks && embedChunks.length > 0) {
    const chunkListStr = embedChunks
      .slice(0, 3)
      .map(c => `• "${c.phrase || c}" (${c.meaningVi || ''})`)
      .join('\n');
    chunkInstruction = `\nBẮT BUỘC: Bạn HÃY LỒNG GHÉP TỰ NHIÊN ít nhất 2 trong các cụm từ (Chunks) sau đây vào lời thoại:\n${chunkListStr}\n`;
  }

  const levelGuide = level === 'advanced'
    ? 'Mức độ nâng cao (TOEIC 750-900+): Tốc độ đàm thoại tự nhiên, có nối âm, sử dụng nhiều cụm collocations và thành ngữ công sở chuyên nghiệp, câu hỏi suy luận (inference question) có tính bẫy tinh tế.'
    : 'Mức độ tiêu chuẩn (TOEIC 550-700): Diễn đạt rõ ràng, từ vựng công sở thông dụng, logic mạch lạc, câu hỏi chi tiết và hành động tiếp theo.';

  const systemPrompt = `Bạn là chuyên gia biên soạn đề thi TOEIC Listening chính thức của ETS và tác giả giáo trình Hacker TOEIC.
Nhiệm vụ của bạn: Tạo một bài luyện nghe ${part} CHUẨN ĐỀ THI TOEIC MỚI NHẤT, chuẩn format từng lượt thoại, bóc tách Chunks quan trọng và thiết kế 3 câu hỏi trắc nghiệm kiểm tra độ hiểu bài.
Trả về DUY NHẤT một khối JSON hợp lệ, không kèm bất kỳ văn bản chào hỏi nào ngoài JSON.`;

  const userMessage = `Hãy tạo một bài luyện nghe TOEIC ${part} theo các thông số sau:

1. CHỦ ĐỀ: ${chosenTopic}
2. CẤP ĐỘ: ${levelGuide}
3. CẤU HÌNH NHÂN VẬT & ACCENT:
${speakerListText}
${chunkInstruction}

QUY TẮC BẮT BUỘC:
${isPart3 ? `
- Đây là HỘI THOẠI PART 3: Gồm ${speakers.length} người trao đổi qua lại (khoảng 6 đến 9 lượt thoại).
- Mỗi dòng thoại BẮT BUỘC bắt đầu bằng tiền tố tag speaker chính xác (ví dụ "${speakers[0]?.tag || 'W-Am'}: ...").
- Tổng độ dài hội thoại: từ 130 đến 180 từ (khoảng 45 giây đến 1 phút khi đọc chuẩn tốc độ TOEIC).
` : `
- Đây là ĐỘC THOẠI PART 4: 1 người nói (thông báo sân bay, tin nhắn thoại văn phòng, tour hướng dẫn, hoặc thông báo công ty).
- Bắt đầu bằng tag "${speakers[0]?.tag || 'W-Am'}: ...".
- Tổng độ dài độc thoại: từ 120 đến 160 từ.
`}
- 3 CÂU HỎI TRẮC NGHIỆM: Chuẩn dạng thức TOEIC (Câu 1: Ý chính/Nơi chốn; Câu 2: Vấn đề/Chi tiết cụ thể; Câu 3: Hành động tiếp theo).
- Mỗi câu hỏi gồm 4 phương án [A, B, C, D] với 1 đáp án đúng duy nhất, kèm giải thích ngắn gọn bằng tiếng Việt chỉ ra dẫn chứng trong bài.

HÃY XUẤT RA THEO ĐÚNG ĐỊNH DẠNG JSON SAU:
\`\`\`json
{
  "title": "Tên bài ngắn gọn (ví dụ: Rescheduling the Sydney Flight)",
  "theme": "Tên chủ đề tiếng Anh",
  "themeVi": "Tên chủ đề tiếng Việt tự nhiên",
  "dialogue": [
    {
      "speaker": "${speakers[0]?.tag || 'W-Am'}",
      "text": "Câu thoại đầu tiên..."
    },
    {
      "speaker": "${speakers[1]?.tag || 'M-Au'}",
      "text": "Câu thoại đáp lại..."
    }
  ],
  "targetChunks": [
    {
      "phrase": "cụm từ tiếng Anh thực tế trong bài",
      "meaningVi": "nghĩa tiếng Việt đầy đủ",
      "type": "collocation"
    }
  ],
  "questions": [
    {
      "id": 1,
      "question": "What are the speakers mainly discussing?",
      "options": [
        "A. Canceling an order",
        "B. Changing travel arrangements",
        "C. Preparing a budget report",
        "D. Applying for a new job"
      ],
      "correctAnswer": 1,
      "explanationVi": "Người phụ nữ mở đầu bằng việc yêu cầu dời lịch bay tới Sydney, do đó đáp án đúng là B."
    },
    {
      "id": 2,
      "question": "What problem does the man mention?",
      "options": [
        "A. The flight is fully booked",
        "B. The system is down",
        "C. There is an additional fee",
        "D. His passport is expired"
      ],
      "correctAnswer": 2,
      "explanationVi": "Người đàn ông cho biết sẽ phát sinh một khoản phí đổi vé nếu thay đổi trong 24 giờ."
    },
    {
      "id": 3,
      "question": "What will the woman most likely do next?",
      "options": [
        "A. Provide her confirmation number",
        "B. Call her supervisor",
        "C. Visit the ticketing counter",
        "D. Write a formal complaint"
      ],
      "correctAnswer": 0,
      "explanationVi": "Người đàn ông hỏi mã đặt chỗ và người phụ nữ đồng ý đọc mã để kiểm tra."
    }
  ]
}
\`\`\``;

  const result = await callGemini(apiKey, systemPrompt, userMessage, {
    maxOutputTokens: 4096,
    temperature: 0.7,
  });

  // Tạo raw text script từ dialogue để tương thích 100% với TranscriptListeningModal
  const rawTextLines = (result.dialogue || []).map(d => {
    const spk = d.speaker || 'Speaker';
    return `${spk}: ${d.text}`;
  });

  const fullRawText = rawTextLines.join('\n\n');

  return {
    ...result,
    text: fullRawText,
    part,
    rawText: fullRawText,
    createdAt: Date.now(),
  };
}
