/**
 * ─── Scenario & Conversational AI Service (Real-World Speaking Partner) ─────
 * 
 * Sử dụng Google Gemini (với fallback kịch bản offline phong phú) để:
 * 1. Tự động sinh tình huống giao tiếp đời thực (Café, Du lịch, Kết bạn, Công sở...)
 *    dựa trên các Chunk người học đã tích lũy.
 * 2. Đóng vai người bạn bản xứ kiên nhẫn, đàm thoại đa lượt (multi-turn),
 *    sửa lỗi diễn đạt tự nhiên và khuyến khích phản xạ.
 */

import { getApiKeys } from '../store/storage';
import { callGemini } from './ai';

// ─── Danh sách 10 Tình huống Đời Thực Phong Phú (Offline Presets) ─────────────
export const REAL_LIFE_PRESETS = [
  {
    id: 'coffee_shop',
    title: '☕ Gọi đồ uống tại Quán Cà phê New York',
    description: 'Bạn vào một quán café đông đúc, muốn gọi một ly latte ít ngọt và hỏi mật khẩu Wi-Fi.',
    aiRole: 'Barista thân thiện',
    userRole: 'Khách hàng',
    defaultChunks: [
      { phrase: 'feel like', meaningVi: 'Cảm thấy muốn (dùng gì)', tip: 'Dùng khi muốn gọi đồ ăn/uống' },
      { phrase: 'to be honest', meaningVi: 'Thành thật mà nói', tip: 'Diễn đạt sở thích/mong muốn thật lòng' },
      { phrase: 'take your time', meaningVi: 'Cứ thong thả chọn nhé', tip: 'Dùng khi người đối diện đang chọn lựa' }
    ],
    openingMessage: "Hey there! Welcome to Central Brew. What can I get started for you today?",
    openingMessageVi: "Chào bạn! Chào mừng đến với Central Brew. Hôm nay bạn muốn dùng gì nào?",
    suggestedReply: "Hi! I feel like having an iced latte, but to be honest, not too sweet please.",
    suggestedReplyVi: "Chào bạn! Tôi muốn uống một ly latte đá, nhưng thành thật mà nói thì đừng ngọt quá nhé.",
  },
  {
    id: 'travel_checkin',
    title: '✈️ Nhận phòng Khách sạn & Hỏi địa điểm ăn uống',
    description: 'Bạn vừa đến khách sạn tại London, làm thủ tục check-in và hỏi nhân viên lễ tân quán ăn ngon gần đó.',
    aiRole: 'Nhân viên lễ tân khách sạn',
    userRole: 'Khách du lịch',
    defaultChunks: [
      { phrase: 'make a reservation', meaningVi: 'Đặt phòng / Đặt chỗ trước', tip: 'Dùng khi làm thủ tục check-in' },
      { phrase: 'in charge of', meaningVi: 'Chịu trách nhiệm / Phụ trách', tip: 'Hỏi về người phụ trách dịch vụ' },
      { phrase: 'look forward to', meaningVi: 'Rất mong đợi / Trông chờ', tip: 'Bày tỏ sự hào hứng với kỳ nghỉ' }
    ],
    openingMessage: "Good afternoon! Welcome to the Grand Plaza. Are you checking in today?",
    openingMessageVi: "Xin chào buổi chiều! Chào mừng quý khách đến Grand Plaza. Quý khách muốn làm thủ tục nhận phòng hôm nay phải không ạ?",
    suggestedReply: "Good afternoon! I would like to check in. I made a reservation under the name John, and I really look forward to my stay.",
    suggestedReplyVi: "Chào bạn! Tôi muốn nhận phòng. Tôi đã đặt phòng trước dưới tên John, và tôi rất mong chờ kỳ nghỉ này.",
  },
  {
    id: 'friend_catchup',
    title: '🍻 Hẹn hò tán gẫu cuối tuần với Bạn thân',
    description: 'Bạn gặp lại người bạn thân lâu ngày không gặp để chia sẻ về công việc và kế hoạch du lịch sắp tới.',
    aiRole: 'Người bạn bản xứ Alex',
    userRole: 'Bạn thân',
    defaultChunks: [
      { phrase: 'catch up with', meaningVi: 'Trò chuyện hàn huyên / Bắt kịp tin tức', tip: 'Dùng khi gặp lại bạn bè sau thời gian dài' },
      { phrase: 'at the end of the day', meaningVi: 'Suy cho cùng / Rốt cuộc', tip: 'Tổng kết lại cảm xúc hoặc quan điểm' },
      { phrase: 'run out of', meaningVi: 'Hết / Cạn kiệt (thời gian, tiền)', tip: 'Nói về việc thiếu hụt thời gian/nguồn lực' }
    ],
    openingMessage: "Long time no see! It feels like forever. How have things been going with you lately?",
    openingMessageVi: "Lâu lắm không gặp cậu! Cảm giác như cả thế kỷ rồi ấy. Dạo này công việc và cuộc sống của cậu thế nào rồi?",
    suggestedReply: "Hey Alex! I've been super busy, but at the end of the day, I'm so excited to catch up with you!",
    suggestedReplyVi: "Chào Alex! Dạo này mình bận rộn quá, nhưng suy cho cùng thì mình rất hào hứng được gặp lại và tán gẫu với cậu!",
  },
  {
    id: 'shopping_return',
    title: '🛍️ Đổi kích cỡ áo tại Cửa hàng Thời trang',
    description: 'Bạn mua một chiếc áo khoác ngày hôm qua nhưng bị chật và muốn đổi sang cỡ lớn hơn.',
    aiRole: 'Nhân viên bán hàng',
    userRole: 'Khách mua sắm',
    defaultChunks: [
      { phrase: 'deal with', meaningVi: 'Giải quyết / Xử lý việc gì', tip: 'Dùng khi gặp vấn đề cần đổi trả' },
      { phrase: 'take care of', meaningVi: 'Hỗ trợ chu đáo / Chăm sóc', tip: 'Nhờ nhân viên xử lý yêu cầu' },
      { phrase: 'come up with', meaningVi: 'Nghĩ ra / Đưa ra giải pháp', tip: 'Đề xuất cách giải quyết hợp lý' }
    ],
    openingMessage: "Hi! How can I help you today? Looking for anything special or need assistance?",
    openingMessageVi: "Chào bạn! Tôi có thể giúp gì cho bạn hôm nay? Bạn đang tìm món đồ nào hay cần hỗ trợ gì không?",
    suggestedReply: "Hi! I need to deal with a small issue. I bought this jacket yesterday, could you please take care of exchanging it for a larger size?",
    suggestedReplyVi: "Chào bạn! Tôi cần xử lý một vấn đề nhỏ. Tôi mua chiếc áo này hôm qua, bạn có thể giúp tôi đổi sang cỡ lớn hơn được không?",
  },
  {
    id: 'work_catchup',
    title: '💼 Trao đổi nhanh bên máy pha nước ở công ty',
    description: 'Gặp đồng nghiệp người nước ngoài tại khu vực nghỉ ngơi, trao đổi về dự án và dời lịch họp chiều nay.',
    aiRole: 'Đồng nghiệp thân thiện David',
    userRole: 'Thành viên nhóm dự án',
    defaultChunks: [
      { phrase: 'in charge of', meaningVi: 'Phụ trách / Chịu trách nhiệm', tip: 'Nói về phần việc mình đang đảm nhiệm' },
      { phrase: 'reschedule the meeting', meaningVi: 'Dời lại lịch họp', tip: 'Đề xuất đổi giờ hẹn họp' },
      { phrase: 'run out of time', meaningVi: 'Thiếu / Hết thời gian', tip: 'Nêu lý do cần dời lịch hoặc gấp gáp' }
    ],
    openingMessage: "Hey! You got a minute? Just wanted to check in about our progress before the afternoon session.",
    openingMessageVi: "Này! Cậu có rảnh một phút không? Mình chỉ muốn trao đổi nhanh về tiến độ công việc trước buổi chiều thôi.",
    suggestedReply: "Sure! I'm in charge of the presentation slides, but we might run out of time. Should we reschedule the meeting?",
    suggestedReplyVi: "Được chứ! Mình đang phụ trách phần tài liệu trình chiếu, nhưng có thể chúng ta sẽ thiếu thời gian. Chúng ta có nên dời lịch họp không?",
  },
  {
    id: 'restaurant_dinner',
    title: '🍽️ Gọi món & Hỏi gợi ý đặc sản tại Nhà hàng',
    description: 'Bạn đang dùng bữa tại một nhà hàng Âu, muốn hỏi nhân viên về món đặc sản hôm nay và yêu cầu không cay.',
    aiRole: 'Bồi bàn thân thiện Marco',
    userRole: 'Thực khách',
    defaultChunks: [
      { phrase: 'would like to', meaningVi: 'Tôi rất muốn (dùng món/làm gì)', tip: 'Cách diễn đạt lịch sự khi gọi món' },
      { phrase: 'recommend something', meaningVi: 'Gợi ý món nào đó', tip: 'Hỏi ý kiến tư vấn từ bồi bàn' },
      { phrase: 'keep an eye on', meaningVi: 'Để ý / Lưu ý giúp', tip: 'Nhờ bồi bàn chú ý đến dị ứng/yêu cầu' }
    ],
    openingMessage: "Good evening! Welcome to Bella Cucina. Are you ready to order, or would you like a few more minutes with the menu?",
    openingMessageVi: "Chào buổi tối! Chào mừng quý khách đến Bella Cucina. Quý khách đã sẵn sàng gọi món hay muốn xem thêm thực đơn ít phút nữa ạ?",
    suggestedReply: "Good evening! I would like to order dinner. Could you please recommend something popular from your chef's specials?",
    suggestedReplyVi: "Chào buổi tối! Tôi muốn gọi món ăn tối. Bạn có thể gợi ý món nào được ưa chuộng từ thực đơn đặc biệt của bếp trưởng không?",
  },
  {
    id: 'job_interview',
    title: '🎯 Phỏng vấn xin việc: Giới thiệu bản thân & Điểm mạnh',
    description: 'Tham gia buổi phỏng vấn bằng tiếng Anh, chia sẻ về kinh nghiệm làm việc và cách xử lý áp lực trong công việc.',
    aiRole: 'Nhà tuyển dụng Sarah',
    userRole: 'Ứng viên',
    defaultChunks: [
      { phrase: 'in terms of', meaningVi: 'Xét về mặt / Về phương diện', tip: 'Dùng khi chuyển ý phân tích điểm mạnh' },
      { phrase: 'take responsibility for', meaningVi: 'Chịu trách nhiệm cho', tip: 'Thể hiện tinh thần trách nhiệm cao' },
      { phrase: 'come up with', meaningVi: 'Đưa ra ý tưởng / giải pháp', tip: 'Minh họa khả năng giải quyết vấn đề' }
    ],
    openingMessage: "Hi there, thank you for joining us today. To start off, could you briefly tell me about yourself and your background?",
    openingMessageVi: "Chào bạn, cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Để bắt đầu, bạn có thể giới thiệu đôi nét về bản thân và kinh nghiệm của mình được không?",
    suggestedReply: "Thank you. In terms of my experience, I have worked in this field for three years, and I always take responsibility for my projects.",
    suggestedReplyVi: "Cảm ơn bạn. Xét về mặt kinh nghiệm, tôi đã làm việc trong ngành được 3 năm và luôn chủ động chịu trách nhiệm với các dự án của mình.",
  },
  {
    id: 'taxi_ride',
    title: '🚕 Bắt Taxi / Uber & Chỉ đường đến điểm tham quan',
    description: 'Bạn bắt xe taxi đến viện bảo tàng trung tâm thành phố, hỏi thời gian di chuyển và nhờ tài xế bật điều hòa.',
    aiRole: 'Tài xế lái xe Jack',
    userRole: 'Hành khách',
    defaultChunks: [
      { phrase: 'heading towards', meaningVi: 'Đang đi về hướng', tip: 'Chỉ điểm đến cho tài xế' },
      { phrase: 'how long does it take', meaningVi: 'Mất bao lâu thời gian', tip: 'Hỏi ước lượng thời gian đi đường' },
      { phrase: 'drop me off', meaningVi: 'Thả tôi xuống tại...', tip: 'Chỉ điểm dừng chân cụ thể' }
    ],
    openingMessage: "Hello! Hop in! Where are we heading today, and do you have a preferred route to avoid traffic?",
    openingMessageVi: "Xin chào! Lên xe đi bạn! Hôm nay chúng ta đi đâu thế, bạn có muốn đi tuyến đường nào để tránh kẹt xe không?",
    suggestedReply: "Hello! I'm heading towards the City Museum. How long does it take to get there in this traffic?",
    suggestedReplyVi: "Xin chào! Tôi đang hướng về phía Bảo tàng Thành phố. Đi trong khung giờ kẹt xe này thì mất bao lâu ạ?",
  },
  {
    id: 'pharmacy_visit',
    title: '🏥 Ghé Nhà thuốc & Miêu tả triệu chứng cảm sốt',
    description: 'Bạn bị đau họng và nhức đầu sau chuyến bay dài, đến tiệm thuốc nhờ dược sĩ tư vấn loại thuốc phù hợp.',
    aiRole: 'Dược sĩ Emily',
    userRole: 'Khách mua thuốc',
    defaultChunks: [
      { phrase: 'come down with', meaningVi: 'Bị mắc bệnh / cảm cúm', tip: 'Nói về việc vừa chớm nhiễm bệnh' },
      { phrase: 'suffer from', meaningVi: 'Chịu đựng cơn đau / triệu chứng', tip: 'Miêu tả cảm giác đau nhức cụ thể' },
      { phrase: 'how often should I take', meaningVi: 'Tôi nên uống bao lâu một lần', tip: 'Hỏi liều lượng dùng thuốc' }
    ],
    openingMessage: "Hi, welcome to City Care Pharmacy. How are you feeling today, and what symptoms can I help you with?",
    openingMessageVi: "Chào bạn, chào mừng đến nhà thuốc City Care. Hôm nay bạn cảm thấy thế nào, và bạn đang có những triệu chứng gì cần tôi hỗ trợ?",
    suggestedReply: "Hi. I think I've come down with a bad cold and I suffer from a sore throat. How often should I take this medicine?",
    suggestedReplyVi: "Chào dược sĩ. Tôi nghĩ mình bị cảm lạnh và đang chịu đựng cơn đau họng. Tôi nên dùng loại thuốc này bao lâu một lần?",
  },
  {
    id: 'gym_membership',
    title: '🏋️ Đăng ký Thẻ tập Gym & Hỏi gói Huấn luyện viên',
    description: 'Bạn muốn đăng ký tập luyện tại phòng gym mới, hỏi về các lớp rèn luyện thể lực và lịch tập cùng PT cá nhân.',
    aiRole: 'Tư vấn viên phòng gym Leo',
    userRole: 'Hội viên mới',
    defaultChunks: [
      { phrase: 'sign up for', meaningVi: 'Đăng ký tham gia', tip: 'Dùng khi muốn ghi danh lớp hoặc gói tập' },
      { phrase: 'work out', meaningVi: 'Tập luyện thể thao / thể hình', tip: 'Nói về thói quen rèn luyện sức khỏe' },
      { phrase: 'get in shape', meaningVi: 'Lấy lại vóc dáng cân đối', tip: 'Diễn đạt mục tiêu tập luyện' }
    ],
    openingMessage: "Welcome to Apex Fitness! Are you looking for a gym membership or interested in our personal coaching sessions?",
    openingMessageVi: "Chào mừng bạn đến Apex Fitness! Bạn đang muốn tìm gói tập gym thông thường hay quan tâm đến các buổi tập cùng huấn luyện viên cá nhân ạ?",
    suggestedReply: "Hi! I would love to sign up for a membership. I want to work out regularly and get in shape.",
    suggestedReplyVi: "Chào bạn! Tôi muốn đăng ký thẻ tập. Tôi muốn tập luyện đều đặn và lấy lại vóc dáng cân đối.",
  },
];

/**
 * Tạo scenario offline thông minh khi người dùng tự gõ chủ đề (Custom Topic)
 * Đảm bảo 100% giữ đúng chủ đề, vai trò, câu chào và cụm từ cần dùng phù hợp.
 */
export function buildOfflineCustomScenario(customTopic) {
  const trimmed = (customTopic || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Phỏng vấn xin việc / Tuyển dụng
  if (lower.includes('phỏng vấn') || lower.includes('xin việc') || lower.includes('interview') || lower.includes('cv') || lower.includes('tuyển dụng')) {
    return {
      id: 'custom_interview_' + Date.now(),
      title: `🎯 ${trimmed}`,
      description: `Buổi phỏng vấn bằng tiếng Anh: Bạn đối thoại cùng nhà tuyển dụng về kinh nghiệm và định hướng công việc.`,
      aiRole: 'Nhà tuyển dụng chuyên nghiệp',
      userRole: 'Ứng viên phỏng vấn',
      openingMessage: `Hello! Thank you for joining our interview today. To start off, could you briefly introduce yourself and share your key strengths?`,
      openingMessageVi: `Xin chào! Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Để bắt đầu, bạn có thể giới thiệu ngắn gọn về bản thân và điểm mạnh của mình được không?`,
      suggestedReply: `Thank you. In terms of my experience, I have solid skills in this field and I always take responsibility for my work.`,
      suggestedReplyVi: `Cảm ơn anh/chị. Về kinh nghiệm làm việc, tôi có chuyên môn vững vàng trong ngành và luôn chịu trách nhiệm với công việc của mình.`,
      defaultChunks: [
        { phrase: 'in terms of', meaningVi: 'Xét về mặt / Về phương diện', tip: 'Dùng khi chuyển ý phân tích điểm mạnh' },
        { phrase: 'take responsibility for', meaningVi: 'Chịu trách nhiệm cho', tip: 'Thể hiện tính chủ động và trách nhiệm' },
        { phrase: 'come up with', meaningVi: 'Đưa ra ý tưởng / giải pháp', tip: 'Kể về cách bạn giải quyết vấn đề' },
        { phrase: 'look forward to', meaningVi: 'Rất mong đợi cơ hội', tip: 'Bày tỏ mong muốn hợp tác' },
      ],
    };
  }

  // 2. Visa / Đại sứ quán / Hải quan / Sân bay
  if (lower.includes('visa') || lower.includes('đại sứ quán') || lower.includes('embassy') || lower.includes('sân bay') || lower.includes('airport') || lower.includes('hải quan') || lower.includes('customs') || lower.includes('vé máy bay') || lower.includes('flight')) {
    return {
      id: 'custom_visa_' + Date.now(),
      title: `🛂 ${trimmed}`,
      description: `Thủ tục xuất nhập cảnh & phỏng vấn visa: Bạn trả lời các câu hỏi về mục đích chuyến đi và kế hoạch lưu trú.`,
      aiRole: 'Cán bộ lãnh sự / Nhân viên sân bay',
      userRole: 'Người xin visa / Hành khách',
      openingMessage: `Good morning! I have your documents right here. Could you explain the main purpose of your trip and how long you plan to stay?`,
      openingMessageVi: `Chào bạn! Tôi đã có hồ sơ của bạn ở đây. Bạn có thể giải thích mục đích chính của chuyến đi và bạn dự định ở lại bao lâu không?`,
      suggestedReply: `Good morning. To be honest, I would like to visit for two weeks for travel, and I look forward to returning home on schedule.`,
      suggestedReplyVi: `Chào cán bộ. Thành thật mà nói, tôi muốn đi du lịch trong hai tuần, và tôi rất mong sẽ trở về nước đúng lịch trình.`,
      defaultChunks: [
        { phrase: 'to be honest', meaningVi: 'Thành thật mà nói', tip: 'Dùng khi trả lời chân thành và trực tiếp' },
        { phrase: 'would like to', meaningVi: 'Rất muốn / Có ý định', tip: 'Cách diễn đạt lịch sự về mục đích' },
        { phrase: 'look forward to', meaningVi: 'Rất mong đợi', tip: 'Bày tỏ sự kỳ vọng tích cực' },
        { phrase: 'as soon as possible', meaningVi: 'Càng sớm càng tốt', tip: 'Nói về thời gian dự kiến' },
      ],
    };
  }

  // 3. Khách sạn / Check-in / Du lịch
  if (lower.includes('khách sạn') || lower.includes('hotel') || lower.includes('check in') || lower.includes('check-in') || lower.includes('resort') || lower.includes('du lịch') || lower.includes('travel')) {
    return {
      id: 'custom_hotel_' + Date.now(),
      title: `🏨 ${trimmed}`,
      description: `Nhận phòng khách sạn & hỏi đáp dịch vụ du lịch tại điểm đến mới.`,
      aiRole: 'Lễ tân khách sạn',
      userRole: 'Khách du lịch',
      openingMessage: `Good afternoon! Welcome to our hotel. Are you checking in today, or do you have a reservation with us?`,
      openingMessageVi: `Xin chào buổi chiều! Chào mừng quý khách đến khách sạn. Quý khách muốn nhận phòng hôm nay hay đã có mã đặt phòng trước rồi ạ?`,
      suggestedReply: `Hi! I would like to check in. I made a reservation online, and I really look forward to my stay here.`,
      suggestedReplyVi: `Chào bạn! Tôi muốn nhận phòng. Tôi đã đặt phòng trước qua mạng, và tôi rất mong chờ kỳ nghỉ ở đây.`,
      defaultChunks: [
        { phrase: 'make a reservation', meaningVi: 'Đặt phòng / Đặt chỗ trước', tip: 'Dùng khi làm thủ tục nhận phòng' },
        { phrase: 'would like to', meaningVi: 'Tôi muốn...', tip: 'Cách diễn đạt yêu cầu lịch sự' },
        { phrase: 'look forward to', meaningVi: 'Rất mong đợi', tip: 'Bày tỏ sự hào hứng với kỳ nghỉ' },
        { phrase: 'take care of', meaningVi: 'Chăm sóc / Hỗ trợ', tip: 'Nhờ nhân viên kiểm tra dịch vụ' },
      ],
    };
  }

  // 4. Mua sắm / Cửa hàng / Đổi trả / Siêu thị
  if (lower.includes('mua sắm') || lower.includes('shopping') || lower.includes('cửa hàng') || lower.includes('store') || lower.includes('siêu thị') || lower.includes('đổi trả') || lower.includes('refund') || lower.includes('return')) {
    return {
      id: 'custom_shop_' + Date.now(),
      title: `🛍️ ${trimmed}`,
      description: `Giao tiếp tại cửa hàng mua sắm: Tìm kiếm sản phẩm hoặc yêu cầu hỗ trợ đổi trả hàng.`,
      aiRole: 'Nhân viên bán hàng',
      userRole: 'Khách mua sắm',
      openingMessage: `Hi there! Welcome to our shop. Are you looking for anything specific today, or can I help you find something?`,
      openingMessageVi: `Chào bạn! Chào mừng đến cửa hàng. Hôm nay bạn đang tìm kiếm món đồ nào hay cần tôi giúp tìm gì không?`,
      suggestedReply: `Hi! To be honest, I would like to deal with an exchange because this item is a bit small for me.`,
      suggestedReplyVi: `Chào bạn! Thành thật mà nói, tôi muốn giải quyết việc đổi hàng vì món đồ này hơi nhỏ so với tôi.`,
      defaultChunks: [
        { phrase: 'deal with', meaningVi: 'Giải quyết / Xử lý việc gì', tip: 'Dùng khi cần đổi size hoặc khiếu nại' },
        { phrase: 'would like to', meaningVi: 'Tôi muốn...', tip: 'Bày tỏ nhu cầu mua sắm lịch sự' },
        { phrase: 'to be honest', meaningVi: 'Thành thật mà nói', tip: 'Giải thích lý do chưa vừa ý' },
        { phrase: 'take care of', meaningVi: 'Hỗ trợ chu đáo', tip: 'Nhờ nhân viên xử lý hóa đơn' },
      ],
    };
  }

  // 5. Bệnh viện / Phòng khám / Bác sĩ / Nhà thuốc
  if (lower.includes('bác sĩ') || lower.includes('doctor') || lower.includes('bệnh viện') || lower.includes('hospital') || lower.includes('thuốc') || lower.includes('pharmacy') || lower.includes('đau') || lower.includes('ốm') || lower.includes('khám')) {
    return {
      id: 'custom_med_' + Date.now(),
      title: `🏥 ${trimmed}`,
      description: `Khám chữa bệnh & miêu tả triệu chứng sức khỏe cùng bác sĩ hoặc dược sĩ.`,
      aiRole: 'Bác sĩ / Dược sĩ tư vấn',
      userRole: 'Bệnh nhân',
      openingMessage: `Hello. How are you feeling today, and what symptoms can I help you with?`,
      openingMessageVi: `Xin chào bạn. Hôm nay bạn cảm thấy thế nào, và bạn đang có triệu chứng gì cần tôi hỗ trợ?`,
      suggestedReply: `Hello doctor. I've come down with a fever and I suffer from a painful sore throat since yesterday.`,
      suggestedReplyVi: `Chào bác sĩ. Tôi bị cảm sốt và bị đau họng từ hôm qua đến giờ.`,
      defaultChunks: [
        { phrase: 'come down with', meaningVi: 'Bị mắc bệnh / cảm cúm', tip: 'Nói về việc vừa chớm bị ốm' },
        { phrase: 'suffer from', meaningVi: 'Chịu đựng cơn đau / bệnh', tip: 'Miêu tả triệu chứng kéo dài' },
        { phrase: 'how often should I', meaningVi: 'Tôi nên dùng bao lâu một lần', tip: 'Hỏi hướng dẫn uống thuốc' },
        { phrase: 'take care of', meaningVi: 'Chăm sóc sức khỏe', tip: 'Tĩnh dưỡng phục hồi' },
      ],
    };
  }

  // 6. Hỏi đường / Giao thông / Taxi
  if (lower.includes('hỏi đường') || lower.includes('chỉ đường') || lower.includes('directions') || lower.includes('taxi') || lower.includes('bản đồ') || lower.includes('map') || lower.includes('bus') || lower.includes('xe buýt')) {
    return {
      id: 'custom_direction_' + Date.now(),
      title: `🗺️ ${trimmed}`,
      description: `Hỏi đường và phương tiện di chuyển tại thành phố với người bản địa.`,
      aiRole: 'Người dân địa phương thân thiện',
      userRole: 'Người hỏi đường',
      openingMessage: `Excuse me! You look like you might need some directions. Where are you trying to go?`,
      openingMessageVi: `Xin lỗi bạn! Trông bạn có vẻ đang cần tìm đường. Bạn đang muốn đi đến đâu thế?`,
      suggestedReply: `Thank you so much! I'm heading towards the central square. How long does it take on foot?`,
      suggestedReplyVi: `Cảm ơn bạn nhiều lắm! Tôi đang hướng về phía quảng trường trung tâm. Đi bộ đến đó mất bao lâu vậy?`,
      defaultChunks: [
        { phrase: 'heading towards', meaningVi: 'Đang đi về hướng', tip: 'Chỉ hướng đi dự kiến' },
        { phrase: 'how long does it take', meaningVi: 'Mất bao lâu thời gian', tip: 'Hỏi khoảng thời gian di chuyển' },
        { phrase: 'drop me off', meaningVi: 'Thả tôi xuống tại...', tip: 'Dùng khi đi xe' },
        { phrase: 'as far as I know', meaningVi: 'Theo như tôi biết', tip: 'Xác nhận thông tin lộ trình' },
      ],
    };
  }

  // 7. Universal Fallback: Bất kỳ chủ đề tự do nào khác
  return {
    id: 'custom_gen_' + Date.now(),
    title: `💬 ${trimmed}`,
    description: `Tình huống đàm thoại thực tế: "${trimmed}". Hãy cùng AI trao đổi và phản xạ tự nhiên.`,
    aiRole: 'Người đối thoại bản xứ',
    userRole: 'Bạn',
    openingMessage: `Hello! I'm glad we can talk about "${trimmed}". How can I help you with this, or what would you like to start with?`,
    openingMessageVi: `Xin chào! Rất vui được trao đổi với bạn về "${trimmed}". Tôi có thể hỗ trợ gì cho bạn, hoặc bạn muốn bắt đầu từ đâu?`,
    suggestedReply: `Hi! To be honest, I would like to learn more about this. Could you share your thoughts first?`,
    suggestedReplyVi: `Chào bạn! Thành thật mà nói, tôi muốn tìm hiểu thêm về việc này. Bạn có thể chia sẻ góc nhìn trước được không?`,
    defaultChunks: [
      { phrase: 'to be honest', meaningVi: 'Thành thật mà nói', tip: 'Dùng để bày tỏ ý kiến chân thành' },
      { phrase: 'would like to', meaningVi: 'Tôi rất muốn (làm gì)', tip: 'Cách nói lịch sự thay cho want to' },
      { phrase: 'as far as I know', meaningVi: 'Theo như tôi được biết', tip: 'Dẫn dắt thông tin hiểu biết của bạn' },
      { phrase: 'look forward to', meaningVi: 'Rất mong đợi...', tip: 'Bày tỏ sự tích cực trong đàm thoại' },
    ],
  };
}

/**
 * Sinh tình huống đời thực dựa trên chủ đề tự chọn (Custom Topic) hoặc danh sách Chunk đã học
 */
export async function generateSpeakingScenario({ targetChunks = [], customTopic = '' }) {
  const allKeys = getApiKeys();
  const trimmedTopic = (customTopic || '').trim();

  // ── TRƯỜNG HỢP 1: Người dùng tự nhập Tình huống (Custom Topic) ──
  if (trimmedTopic) {
    if (allKeys.length > 0) {
      const prompt = `You are an expert English Language Coach specializing in Task-Based Conversational Learning.
Create an engaging, realistic roleplay scenario strictly based on this topic: "${trimmedTopic}".
Provide 3-4 natural conversational chunks that are most useful in this exact situation.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Short catchy title in Vietnamese (e.g. 🎯 ${trimmedTopic})",
  "description": "1-2 sentences in Vietnamese setting up the scene and the learner's goal",
  "aiRole": "Your character (e.g. Visa Interview Officer / Local Doctor / Friendly Colleague)",
  "userRole": "The learner's role (e.g. Applicant / Patient / Traveler)",
  "openingMessage": "Your first spoken opening line in natural conversational English (1-2 sentences, friendly, ends with an engaging question)",
  "openingMessageVi": "Vietnamese translation of your opening message",
  "suggestedReply": "A natural conversational reply in English for the learner that explicitly uses at least one of the targetChunks",
  "suggestedReplyVi": "Vietnamese translation of the suggested reply",
  "targetChunks": [
    { "phrase": "exact chunk phrase", "meaningVi": "nghĩa tiếng Việt súc tích", "tip": "mẹo dùng tự nhiên trong câu" }
  ]
}`;
      try {
        const parsed = await callGemini(null, prompt, 'Generate custom roleplay scenario in JSON format.', { temperature: 0.7 });
        if (parsed && parsed.openingMessage) {
          const formattedChunks = (parsed.targetChunks || []).map(c => 
            typeof c === 'string' ? { phrase: c, meaningVi: 'Cụm từ giao tiếp', tip: '' } : c
          );
          return {
            id: 'dynamic_' + Date.now(),
            title: parsed.title || `🎯 ${trimmedTopic}`,
            description: parsed.description || `Thực hành tình huống: ${trimmedTopic}`,
            aiRole: parsed.aiRole || 'Đối tác bản xứ',
            userRole: parsed.userRole || 'Bạn',
            openingMessage: parsed.openingMessage,
            openingMessageVi: parsed.openingMessageVi || '',
            suggestedReply: parsed.suggestedReply || '',
            suggestedReplyVi: parsed.suggestedReplyVi || '',
            targetChunks: formattedChunks,
            defaultChunks: formattedChunks,
          };
        }
      } catch (e) {
        console.warn('[Scenario AI] Gemini error generating custom topic, using offline fallback:', e);
      }
    }

    // Fallback offline cho custom topic - TUYỆT ĐỐI KHÔNG quay về Quán Cà phê!
    const offlineCustom = buildOfflineCustomScenario(trimmedTopic);
    return {
      ...offlineCustom,
      targetChunks: offlineCustom.defaultChunks,
    };
  }

  // ── TRƯỜNG HỢP 2: Người dùng chọn Luyện Chunks bài học (targetChunks có sẵn) ──
  if (targetChunks.length > 0) {
    const chunksListStr = targetChunks
      .map(c => typeof c === 'string' ? c : c.phrase)
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');

    if (allKeys.length > 0) {
      const prompt = `You are an expert English Language Coach specializing in Task-Based Conversational Learning.
Create an engaging daily-life roleplay scenario specifically designed for the learner to practice these chunks: [${chunksListStr}].

Return ONLY a valid JSON object matching this schema:
{
  "title": "Short catchy title in Vietnamese",
  "description": "1-2 sentences in Vietnamese setting up the scene",
  "aiRole": "Your character",
  "userRole": "The learner's role",
  "openingMessage": "Your first spoken opening line in natural conversational English (1-2 sentences)",
  "openingMessageVi": "Vietnamese translation of opening message",
  "suggestedReply": "A natural response the user can say in English, including at least one chunk from [${chunksListStr}]",
  "suggestedReplyVi": "Vietnamese translation of the suggested reply",
  "targetChunks": [
    { "phrase": "exact chunk phrase", "meaningVi": "nghĩa tiếng Việt súc tích", "tip": "cách dùng" }
  ]
}`;
      try {
        const parsed = await callGemini(null, prompt, 'Generate scenario from chunks in JSON format.', { temperature: 0.7 });
        if (parsed && parsed.openingMessage) {
          return {
            id: 'dynamic_' + Date.now(),
            ...parsed,
            targetChunks: targetChunks.map(c => typeof c === 'string' ? { phrase: c, meaningVi: 'Cụm từ đang học', tip: '' } : c),
          };
        }
      } catch (e) {
        console.warn('[Scenario AI] Gemini error from chunks, using preset fallback:', e);
      }
    }

    // Fallback khi luyện targetChunks mà không có Gemini:
    const randomPreset = REAL_LIFE_PRESETS[Math.floor(Math.random() * REAL_LIFE_PRESETS.length)];
    return {
      ...randomPreset,
      title: `🗣️ Luyện tập ${targetChunks.length} cụm từ đang chọn`,
      targetChunks: targetChunks.map(c => typeof c === 'string' ? { phrase: c, meaningVi: 'Cụm từ đang học', tip: '' } : c),
    };
  }

  // ── TRƯỜNG HỢP 3: Mặc định chọn ngẫu nhiên một preset có sẵn ──
  const randomPreset = REAL_LIFE_PRESETS[Math.floor(Math.random() * REAL_LIFE_PRESETS.length)];
  return {
    ...randomPreset,
    targetChunks: randomPreset.defaultChunks.map(p => typeof p === 'string' ? { phrase: p, meaningVi: 'Cụm từ tự nhiên', tip: '' } : p),
  };
}

/**
 * Đóng vai bạn bản xứ phản hồi câu nói của người học trong cuộc trò chuyện đa lượt (Multi-turn)
 */
export async function continueConversation({
  history = [],
  userTranscript = '',
  scenario = {},
  chunksRemaining = [],
}) {
  const allKeys = getApiKeys();
  const chunksRemainingStr = chunksRemaining
    .map(c => (typeof c === 'string' ? c : c.phrase || '')).filter(Boolean).join(', ');

  const prompt = `You are roleplaying as "${scenario.aiRole || 'a friendly native English speaker'}" talking to "${scenario.userRole || 'a friend'}" in this scenario: "${scenario.title || 'Casual Chat'}".
Context: "${scenario.description || ''}"
Goal: Keep the conversation flowing naturally, friendly, and supportive. Use natural spoken conversational English with warmth.

Current conversation history:
${history.map(h => `${h.sender === 'ai' ? 'AI' : 'User'}: ${h.text}`).join('\n')}
User just said: "${userTranscript}"
Remaining chunks the user is encouraged to practice: [${chunksRemainingStr || 'feel like, to be honest, would like to'}]

Return ONLY a valid JSON object matching this schema:
{
  "aiReply": "Your natural in-character reply (1-2 conversational sentences, ending with an engaging question to keep the chat going)",
  "aiReplyVi": "Bản dịch tiếng Việt của câu trả lời",
  "encouragement": "1 concise sentence in Vietnamese praising what the user expressed well or gently noting a smoother way to phrase it",
  "suggestedReply": "A natural conversational reply in English that the learner can say next to answer your aiReply. If applicable, naturally include at least one remaining chunk from [${chunksRemainingStr}]",
  "suggestedReplyVi": "Bản dịch tiếng Việt của câu gợi ý trả lời",
  "isFinished": boolean (true if conversation has reached a natural conclusion after 4-6 turns, otherwise false)
}`;

  if (allKeys.length > 0) {
    try {
      const parsed = await callGemini(null, prompt, 'Respond to the user in JSON format.', { temperature: 0.65 });
      if (parsed && parsed.aiReply) {
        return parsed;
      }
    } catch (e) {
      console.warn('[Conversation AI] Gemini error, using contextual fallback:', e);
    }
  }

  // Fallback phong phú ngữ cảnh khi offline hoặc Gemini gặp lỗi
  const targetRemaining = chunksRemaining[0] 
    ? (typeof chunksRemaining[0] === 'string' ? chunksRemaining[0] : chunksRemaining[0].phrase)
    : 'would like to';

  return {
    aiReply: `I see what you mean! Regarding our conversation about ${scenario.title || 'this'}, could you tell me a little more about what you have in mind?`,
    aiReplyVi: `Tôi hiểu ý bạn rồi! Liên quan đến chủ đề này, bạn có thể chia sẻ thêm một chút về dự định của bạn không?`,
    encouragement: "Phản xạ giao tiếp rất tốt và câu trả lời rất tự nhiên!",
    suggestedReply: `To be honest, I would like to mention that ${targetRemaining ? `we should focus on ${targetRemaining}` : 'everything is going smoothly'}.`,
    suggestedReplyVi: `Thành thật mà nói, tôi muốn chia sẻ rằng mọi việc đang tiến triển rất thuận lợi.`,
    isFinished: history.length >= 6,
  };
}
