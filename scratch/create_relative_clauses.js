import fs from 'fs';

const topic = {
  topicId: "relative_clauses",
  topicName: "Mệnh đề quan hệ",
  topicNameEn: "Relative Clauses & Reductions",
  category: "clauses_syntax",
  description: "Đại từ quan hệ (who, whom, which, that, whose), trạng từ quan hệ (where, when), mệnh đề có giới từ (in which, to whom), lượng từ (all of which/whom), và rút gọn mệnh đề quan hệ (V-ing / V-ed).",
  questions: []
};

// 30 Standard Questions (rel_std_001 -> rel_std_030)
const standardQuestions = [
  {
    id: "rel_std_001",
    level: "standard",
    question: "The marketing specialist ______ designed our new advertising banner received an industry award.",
    options: { A: "who", B: "which", C: "whom", D: "whose" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ người 'The marketing specialist' và làm Chủ ngữ trước động từ 'designed' → dùng 'who'.",
    explanationVi: "'who' là đại từ quan hệ thay thế cho người, đóng vai trò chủ ngữ trong mệnh đề quan hệ.",
    targetChunk: { phrase: "specialist who designed the banner", meaningVi: "chuyên gia người đã thiết kế biểu ngữ" },
    skeleton: { subject: "The marketing specialist who designed the banner", verb: "received", object: "an award" }
  },
  {
    id: "rel_std_002",
    level: "standard",
    question: "We recently installed an inventory management system ______ automatically reorders depleted items.",
    options: { A: "who", B: "which", C: "whom", D: "whose" },
    correctAnswer: "B",
    clue: "Thay thế cho danh từ chỉ vật 'system' và làm Chủ ngữ trước động từ 'reorders' → dùng 'which'.",
    explanationVi: "'which' thay thế cho danh từ chỉ vật hoặc sự việc.",
    targetChunk: { phrase: "system which automatically reorders", meaningVi: "hệ thống tự động đặt lại hàng" },
    skeleton: { subject: "We", verb: "installed", object: "an inventory management system" }
  },
  {
    id: "rel_std_003",
    level: "standard",
    question: "Mr. Alvarez is the architect ______ innovative designs helped secure the municipal construction permit.",
    options: { A: "who", B: "whose", C: "which", D: "whom" },
    correctAnswer: "B",
    clue: "Chỉ sở hữu đứng trước danh từ 'innovative designs' (những thiết kế của kiến trúc sư) → dùng 'whose'.",
    explanationVi: "'whose + Noun' thể hiện quan hệ sở hữu giữa người/vật và danh từ đi liền kề.",
    targetChunk: { phrase: "architect whose innovative designs", meaningVi: "vị kiến trúc sư mà các thiết kế sáng tạo của ông" },
    skeleton: { subject: "Mr. Alvarez", verb: "is", object: "the architect" }
  },
  {
    id: "rel_std_004",
    level: "standard",
    question: "The international airport, ______ opened its second runway last week, can now accommodate jumbo jets.",
    options: { A: "which", B: "that", C: "who", D: "where" },
    correctAnswer: "A",
    clue: "MỆNH ĐỀ CÓ DẤU PHẨY: Trong mệnh đề quan hệ không xác định (có dấu phẩy), TUYỆT ĐỐI KHÔNG dùng 'that'. Chọn 'which'.",
    explanationVi: "Danh từ chỉ vật 'The international airport' đứng trước dấu phẩy bắt buộc dùng 'which', không dùng 'that'.",
    targetChunk: { phrase: "airport, which opened its second runway", meaningVi: "sân bay, nơi vừa mở đường băng thứ hai" },
    skeleton: { subject: "The international airport", verb: "can accommodate", object: "jumbo jets" }
  },
  {
    id: "rel_std_005",
    level: "standard",
    question: "The job applicant ______ we interviewed yesterday possessed impressive multilingual capabilities.",
    options: { A: "whom", B: "which", C: "whose", D: "where" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ người 'The job applicant' và làm Tân ngữ cho động từ 'interviewed' → dùng 'whom' (hoặc who).",
    explanationVi: "Phía sau có chủ ngữ 'we' và động từ 'interviewed', nên đại từ quan hệ đóng vai trò tân ngữ là 'whom'.",
    targetChunk: { phrase: "applicant whom we interviewed", meaningVi: "ứng viên mà chúng tôi đã phỏng vấn" },
    skeleton: { subject: "The job applicant whom we interviewed", verb: "possessed", object: "impressive capabilities" }
  },
  {
    id: "rel_std_006",
    level: "standard",
    question: "The newly built conference facility offers rooms ______ can host up to five hundred attendees.",
    options: { A: "that", B: "who", C: "whom", D: "where" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ số nhiều chỉ vật 'rooms' làm chủ ngữ cho 'can host' → dùng 'that' (hoặc which).",
    explanationVi: "'that' có thể thay thế cho 'which' trong mệnh đề xác định.",
    targetChunk: { phrase: "rooms that can host attendees", meaningVi: "các phòng có thể chứa được khách tham dự" },
    skeleton: { subject: "The facility", verb: "offers", object: "rooms that can host up to 500 attendees" }
  },
  {
    id: "rel_std_007",
    level: "standard",
    question: "The executive boardroom is the location ______ the annual shareholder meeting takes place.",
    options: { A: "where", B: "which", C: "that", D: "whose" },
    correctAnswer: "A",
    clue: "Trạng từ quan hệ chỉ nơi chốn: 'the location where...' = in which (nơi mà cuộc họp diễn ra).",
    explanationVi: "Phía sau là một mệnh đề hoàn chỉnh (S-V: meeting takes place), nên dùng trạng từ chỉ nơi chốn 'where'.",
    targetChunk: { phrase: "the location where meeting takes place", meaningVi: "địa điểm nơi cuộc họp diễn ra" },
    skeleton: { subject: "The boardroom", verb: "is", object: "the location where the meeting takes place" }
  },
  {
    id: "rel_std_008",
    level: "standard",
    question: "We still vividly remember the day ______ our company's initial public offering was finalized.",
    options: { A: "when", B: "where", C: "which", D: "whose" },
    correctAnswer: "A",
    clue: "Trạng từ quan hệ chỉ thời gian thay thế cho 'the day': when (= on which).",
    explanationVi: "'when' bổ nghĩa cho danh từ thời gian 'the day'.",
    targetChunk: { phrase: "the day when our offering was finalized", meaningVi: "ngày mà đợt phát hành cổ phiếu được chốt" },
    skeleton: { subject: "We", verb: "remember", object: "the day when offering was finalized" }
  },
  {
    id: "rel_std_009",
    level: "standard",
    question: "The firm selected the candidate ______ credentials and experience matched the job profile perfectly.",
    options: { A: "whose", B: "who", C: "whom", D: "which" },
    correctAnswer: "A",
    clue: "Đứng trước cụm danh từ 'credentials and experience' (bằng cấp và kinh nghiệm của ứng viên) → dùng 'whose'.",
    explanationVi: "'whose' chỉ sở hữu của 'candidate'.",
    targetChunk: { phrase: "candidate whose credentials matched", meaningVi: "ứng viên có bằng cấp phù hợp" },
    skeleton: { subject: "The firm", verb: "selected", object: "the candidate whose credentials matched" }
  },
  {
    id: "rel_std_010",
    level: "standard",
    question: "The seminar ______ focused on artificial intelligence in logistics drew an unprecedented crowd.",
    options: { A: "which", B: "who", C: "whom", D: "whose" },
    correctAnswer: "A",
    clue: "Danh từ chỉ sự vật 'The seminar' làm chủ ngữ cho 'focused on' → dùng 'which'.",
    explanationVi: "'which' thay cho hội thảo.",
    targetChunk: { phrase: "seminar which focused on AI", meaningVi: "hội thảo tập trung vào trí tuệ nhân tạo" },
    skeleton: { subject: "The seminar which focused on AI", verb: "drew", object: "an unprecedented crowd" }
  },
  {
    id: "rel_std_011",
    level: "standard",
    question: "The senior consultant with ______ we negotiated the licensing agreement is traveling abroad.",
    options: { A: "whom", B: "who", C: "which", D: "that" },
    correctAnswer: "A",
    clue: "SAU GIỚI TỪ: Sau giới từ (with) chỉ người bắt buộc phải dùng 'whom', không được dùng 'who' hoặc 'that'.",
    explanationVi: "Giới từ + whom: with whom (với người mà chúng tôi đã đàm phán).",
    targetChunk: { phrase: "consultant with whom we negotiated", meaningVi: "chuyên gia tư vấn mà chúng tôi đã đàm phán cùng" },
    skeleton: { subject: "The consultant with whom we negotiated", verb: "is traveling", object: "abroad" }
  },
  {
    id: "rel_std_012",
    level: "standard",
    question: "The environmental regulations ______ were introduced last year have reduced industrial waste.",
    options: { A: "that", B: "what", C: "who", D: "whom" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ vật 'regulations' làm chủ ngữ cho 'were introduced' → chọn 'that'.",
    explanationVi: "'that' thay cho danh từ chỉ quy định môi trường.",
    targetChunk: { phrase: "regulations that were introduced", meaningVi: "những quy định đã được ban hành" },
    skeleton: { subject: "The regulations that were introduced", verb: "have reduced", object: "industrial waste" }
  },
  {
    id: "rel_std_013",
    level: "standard",
    question: "The industrial warehouse in ______ we store electronic components is climate-controlled.",
    options: { A: "which", B: "where", C: "that", D: "what" },
    correctAnswer: "A",
    clue: "SAU GIỚI TỪ CHỈ VẬT: Giới từ (in) + 'which'. Không dùng 'in that' hoặc 'in where'.",
    explanationVi: "Giới từ đi với danh từ chỉ nơi chốn/vật: in which (= where).",
    targetChunk: { phrase: "warehouse in which we store components", meaningVi: "nhà kho nơi chúng tôi lưu trữ linh kiện" },
    skeleton: { subject: "The warehouse in which we store components", verb: "is", object: "climate-controlled" }
  },
  {
    id: "rel_std_014",
    level: "standard",
    question: "Please identify the reason ______ the shipment was rejected by the customs authorities.",
    options: { A: "why", B: "which", C: "where", D: "whose" },
    correctAnswer: "A",
    clue: "Trạng từ quan hệ chỉ lý do đứng sau danh từ 'the reason': why (= for which).",
    explanationVi: "the reason why + S + V: lý do tại sao mà...",
    targetChunk: { phrase: "the reason why the shipment was rejected", meaningVi: "lý do tại sao lô hàng bị từ chối" },
    skeleton: { subject: "(You)", verb: "identify", object: "the reason why the shipment was rejected" }
  },
  {
    id: "rel_std_015",
    level: "standard",
    question: "The technician ______ repaired the server room cooling unit is certified in commercial HVAC systems.",
    options: { A: "who", B: "which", C: "whose", D: "whom" },
    correctAnswer: "A",
    clue: "Danh từ chỉ người 'The technician' làm chủ ngữ trước động từ 'repaired' → dùng 'who'.",
    explanationVi: "'who' thay cho kỹ thuật viên.",
    targetChunk: { phrase: "technician who repaired the unit", meaningVi: "kỹ thuật viên người đã sửa cụm làm mát" },
    skeleton: { subject: "The technician who repaired the unit", verb: "is certified", object: null }
  },
  {
    id: "rel_std_016",
    level: "standard",
    question: "All passengers ______ flights were canceled due to the blizzard received complimentary hotel vouchers.",
    options: { A: "whose", B: "who", C: "whom", D: "which" },
    correctAnswer: "A",
    clue: "Đứng trước danh từ 'flights' chỉ chuyến bay thuộc sở hữu của hành khách → dùng 'whose'.",
    explanationVi: "'whose flights' = những hành khách có chuyến bay bị hủy.",
    targetChunk: { phrase: "passengers whose flights were canceled", meaningVi: "những hành khách có chuyến bay bị hủy" },
    skeleton: { subject: "All passengers whose flights were canceled", verb: "received", object: "vouchers" }
  },
  {
    id: "rel_std_017",
    level: "standard",
    question: "The software patch, ______ was deployed late Friday evening, resolved the login vulnerability.",
    options: { A: "which", B: "that", C: "who", D: "where" },
    correctAnswer: "A",
    clue: "Đứng sau dấu phẩy bổ nghĩa cho danh từ chỉ vật 'The software patch' bắt buộc dùng 'which'.",
    explanationVi: "Mệnh đề không xác định có dấu phẩy cấm kỵ dùng 'that'.",
    targetChunk: { phrase: "patch, which was deployed Friday", meaningVi: "bản vá, vốn được triển khai vào tối thứ Sáu" },
    skeleton: { subject: "The software patch", verb: "resolved", object: "the login vulnerability" }
  },
  {
    id: "rel_std_018",
    level: "standard",
    question: "The training seminar is intended for staff members ______ daily duties involve international client relations.",
    options: { A: "whose", B: "who", C: "which", D: "whom" },
    correctAnswer: "A",
    clue: "Chỉ sở hữu đứng trước cụm danh từ 'daily duties' (nhiệm vụ hàng ngày của nhân viên) → dùng 'whose'.",
    explanationVi: "'whose daily duties' = người mà nhiệm vụ hàng ngày của họ liên quan đến...",
    targetChunk: { phrase: "staff members whose daily duties involve", meaningVi: "các nhân viên mà nhiệm vụ hàng ngày liên quan" },
    skeleton: { subject: "The seminar", verb: "is intended for", object: "staff members" }
  },
  {
    id: "rel_std_019",
    level: "standard",
    question: "The corporate policy manual outlines the procedures ______ must be adhered to during an emergency.",
    options: { A: "that", B: "what", C: "who", D: "where" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ vật 'the procedures' làm chủ ngữ cho 'must be adhered to' → dùng 'that'.",
    explanationVi: "'that' làm đại từ quan hệ chủ ngữ thay thế cho quy trình.",
    targetChunk: { phrase: "procedures that must be adhered to", meaningVi: "các quy trình bắt buộc phải tuân thủ" },
    skeleton: { subject: "The manual", verb: "outlines", object: "the procedures that must be adhered to" }
  },
  {
    id: "rel_std_020",
    level: "standard",
    question: "The keynote speaker ______ gave the opening address at the expo is a world-renowned economist.",
    options: { A: "who", B: "which", C: "whom", D: "whose" },
    correctAnswer: "A",
    clue: "Chủ ngữ chỉ người 'The keynote speaker' đi trước động từ 'gave' → dùng 'who'.",
    explanationVi: "'who' thay thế cho diễn giả chính.",
    targetChunk: { phrase: "speaker who gave the opening address", meaningVi: "diễn giả người đã phát biểu khai mạc" },
    skeleton: { subject: "The keynote speaker who gave the address", verb: "is", object: "an economist" }
  },
  {
    id: "rel_std_021",
    level: "standard",
    question: "The project proposal ______ we submitted to the municipal council has been officially approved.",
    options: { A: "that", B: "what", C: "who", D: "whose" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ vật 'The project proposal' làm tân ngữ cho 'we submitted' → dùng 'that'.",
    explanationVi: "'that' thay cho đề án dự án.",
    targetChunk: { phrase: "proposal that we submitted", meaningVi: "đề án mà chúng tôi đã nộp" },
    skeleton: { subject: "The project proposal that we submitted", verb: "has been approved", object: null }
  },
  {
    id: "rel_std_022",
    level: "standard",
    question: "The research laboratory has modern facilities, one of ______ is a specialized cleanroom.",
    options: { A: "which", B: "whom", C: "that", D: "what" },
    correctAnswer: "A",
    clue: "Cụm lượng từ sau giới từ 'one of which' thay cho 'facilities' (chỉ vật). Cấm dùng 'one of that'.",
    explanationVi: "One of which: một trong số các cơ sở vật chất đó.",
    targetChunk: { phrase: "one of which is a cleanroom", meaningVi: "một trong số đó là phòng sạch chuyên dụng" },
    skeleton: { subject: "The laboratory", verb: "has", object: "modern facilities" }
  },
  {
    id: "rel_std_023",
    level: "standard",
    question: "The town ______ the automotive manufacturing plant is headquartered offers generous tax credits.",
    options: { A: "where", B: "which", C: "that", D: "whom" },
    correctAnswer: "A",
    clue: "Trạng từ quan hệ chỉ nơi chốn thay thế cho 'The town' với mệnh đề phụ có đủ S-V phía sau → dùng 'where'.",
    explanationVi: "'where' = in which (thị trấn nơi mà nhà máy đặt trụ sở).",
    targetChunk: { phrase: "town where the plant is headquartered", meaningVi: "thị trấn nơi nhà máy đặt trụ sở" },
    skeleton: { subject: "The town where the plant is headquartered", verb: "offers", object: "tax credits" }
  },
  {
    id: "rel_std_024",
    level: "standard",
    question: "The chief technology officer met with the software developers, all of ______ supported the transition.",
    options: { A: "whom", B: "who", C: "which", D: "that" },
    correctAnswer: "A",
    clue: "Lượng từ sau giới từ chỉ người: 'all of whom' (tất cả những người đó).",
    explanationVi: "Sau 'all of' chỉ người bắt buộc phải dùng đại từ tân ngữ 'whom'.",
    targetChunk: { phrase: "all of whom supported the transition", meaningVi: "tất cả họ đều ủng hộ quá trình chuyển đổi" },
    skeleton: { subject: "The CTO", verb: "met", object: "with the software developers" }
  },
  {
    id: "rel_std_025",
    level: "standard",
    question: "The warranty policy covers only those damages ______ occurred under standard operating conditions.",
    options: { A: "that", B: "what", C: "whose", D: "whom" },
    correctAnswer: "A",
    clue: "Thay thế cho danh từ chỉ vật 'damages' làm chủ ngữ cho động từ 'occurred' → dùng 'that'.",
    explanationVi: "'that' thay cho những hư hại.",
    targetChunk: { phrase: "damages that occurred under standard conditions", meaningVi: "những hư hại xảy ra trong điều kiện vận hành chuẩn" },
    skeleton: { subject: "The policy", verb: "covers", object: "only those damages" }
  },
  {
    id: "rel_std_026",
    level: "standard",
    question: "The logistics manager ______ oversees warehouse operations will conduct the facility walkthrough.",
    options: { A: "who", B: "whom", C: "which", D: "whose" },
    correctAnswer: "A",
    clue: "Thay cho người 'The logistics manager' làm chủ ngữ cho 'oversees' → dùng 'who'.",
    explanationVi: "'who' là đại từ quan hệ chủ ngữ.",
    targetChunk: { phrase: "manager who oversees warehouse operations", meaningVi: "người quản lý giám sát hoạt động nhà kho" },
    skeleton: { subject: "The logistics manager who oversees operations", verb: "will conduct", object: "the walkthrough" }
  },
  {
    id: "rel_std_027",
    level: "standard",
    question: "The historical period during ______ the industrial revolution took place saw massive urban migration.",
    options: { A: "which", B: "where", C: "that", D: "what" },
    correctAnswer: "A",
    clue: "Sau giới từ chỉ thời gian 'during' đi với đại từ quan hệ 'which': during which (= when).",
    explanationVi: "Trong mệnh đề quan hệ trang trọng, 'during which' thay cho thời kỳ lịch sử.",
    targetChunk: { phrase: "period during which the revolution took place", meaningVi: "thời kỳ mà cuộc cách mạng diễn ra" },
    skeleton: { subject: "The period during which the revolution took place", verb: "saw", object: "urban migration" }
  },
  {
    id: "rel_std_028",
    level: "standard",
    question: "The director commended the employees ______ proactive contributions resolved the production bottleneck.",
    options: { A: "whose", B: "who", C: "which", D: "whom" },
    correctAnswer: "A",
    clue: "Đứng trước cụm danh từ 'proactive contributions' (những đóng góp chủ động của nhân viên) → dùng 'whose'.",
    explanationVi: "'whose' chỉ sự sở hữu đóng góp của nhân viên.",
    targetChunk: { phrase: "employees whose proactive contributions resolved", meaningVi: "các nhân viên mà sự đóng góp chủ động của họ đã giải quyết" },
    skeleton: { subject: "The director", verb: "commended", object: "the employees" }
  },
  {
    id: "rel_std_029",
    level: "standard",
    question: "The company selected the regional venue ______ had the lowest logistical operational overhead.",
    options: { A: "which", B: "where", C: "who", D: "whose" },
    correctAnswer: "A",
    clue: "Địa điểm 'the regional venue' đóng vai trò Chủ ngữ cho động từ 'had', do đó dùng 'which' (hoặc that), KHÔNG dùng 'where'.",
    explanationVi: "'where' không thể làm chủ ngữ cho động từ. Phía sau có V 'had' nên phải dùng đại từ quan hệ chủ ngữ 'which'.",
    targetChunk: { phrase: "venue which had the lowest overhead", meaningVi: "địa điểm có chi phí vận hành thấp nhất" },
    skeleton: { subject: "The company", verb: "selected", object: "the venue which had the lowest overhead" }
  },
  {
    id: "rel_std_030",
    level: "standard",
    question: "The freelance copywriter ______ the agency hired for the rebranding campaign completed all deliverables.",
    options: { A: "whom", B: "which", C: "whose", D: "where" },
    correctAnswer: "A",
    clue: "Thay thế cho người 'copywriter' làm tân ngữ cho 'the agency hired' → dùng 'whom'.",
    explanationVi: "'whom' làm tân ngữ chỉ người.",
    targetChunk: { phrase: "copywriter whom the agency hired", meaningVi: "người viết quảng cáo mà đại lý đã thuê" },
    skeleton: { subject: "The copywriter whom the agency hired", verb: "completed", object: "all deliverables" }
  }
];

// 30 Advanced Questions (rel_adv_001 -> rel_adv_030)
const advancedQuestions = [
  {
    id: "rel_adv_001",
    level: "advanced",
    question: "The architectural blueprint ______ by the engineering consortium was officially sanctioned yesterday.",
    options: { A: "submitted", B: "submitting", C: "submits", D: "submit" },
    correctAnswer: "A",
    clue: "BẪY RÚT GỌN MỆNH ĐỀ QUAN HỆ BỊ ĐỘNG: blueprint (which was) submitted by... → rút gọn còn V-ed/V3 'submitted'.",
    explanationVi: "Bản vẽ 'được nộp' bởi liên danh kỹ sư (bị động), mệnh đề quan hệ rút gọn lược bỏ 'which was', giữ lại phân từ 'submitted'.",
    targetChunk: { phrase: "blueprint submitted by the consortium", meaningVi: "bản thiết kế được nộp bởi liên danh" },
    skeleton: { subject: "The blueprint submitted by the consortium", verb: "was sanctioned", object: null }
  },
  {
    id: "rel_adv_002",
    level: "advanced",
    question: "Delegates ______ from international hubs must present their vaccination passports at the gate.",
    options: { A: "arrive", B: "arrived", C: "arriving", D: "arrival" },
    correctAnswer: "C",
    clue: "BẪY RÚT GỌN CHỦ ĐỘNG: Delegates (who arrive) from... → rút gọn thành V-ing 'arriving'.",
    explanationVi: "Đại biểu tự mình đến (chủ động), khi rút gọn mệnh đề quan hệ biến động từ thành Hiện tại phân từ 'arriving'.",
    targetChunk: { phrase: "Delegates arriving from international hubs", meaningVi: "Các đại biểu đến từ các trạm trung chuyển quốc tế" },
    skeleton: { subject: "Delegates arriving from hubs", verb: "must present", object: "their passports" }
  },
  {
    id: "rel_adv_003",
    level: "advanced",
    question: "The senior committee reviewed six restructuring proposals, the most ambitious of ______ was approved.",
    options: { A: "which", B: "whom", C: "that", D: "them" },
    correctAnswer: "A",
    clue: "BẪY SO SÁNH NHẤT TRONG MỆNH ĐỀ QUAN HỆ: 'the most ambitious of which' (đề án tham vọng nhất trong số đó).",
    explanationVi: "Sau giới từ 'of' trong mệnh đề quan hệ chỉ vật bắt buộc dùng 'which'. Không dùng 'of that' hoặc 'of them'.",
    targetChunk: { phrase: "the most ambitious of which was approved", meaningVi: "đề xuất tham vọng nhất trong số đó đã được phê duyệt" },
    skeleton: { subject: "The committee", verb: "reviewed", object: "six proposals" }
  },
  {
    id: "rel_adv_004",
    level: "advanced",
    question: "______ demonstrates exceptional leadership qualities will be considered for the overseas posting.",
    options: { A: "Whoever", B: "Whomever", C: "Anyone", D: "Those who" },
    correctAnswer: "A",
    clue: "ĐẠI TỪ QUAN HỆ GHÉP: 'Whoever' = Anyone who (Bất kỳ ai mà). Đóng vai trò chủ ngữ đứng trước động từ số ít 'demonstrates'.",
    explanationVi: "'Whoever' vừa là chủ ngữ của mệnh đề danh ngữ, vừa hòa hợp với động từ số ít 'demonstrates'. 'Anyone' thiếu đại từ quan hệ 'who'.",
    targetChunk: { phrase: "Whoever demonstrates leadership", meaningVi: "Bất kỳ ai thể hiện năng lực lãnh đạo" },
    skeleton: { subject: "Whoever demonstrates leadership qualities", verb: "will be considered", object: "for the posting" }
  },
  {
    id: "rel_adv_005",
    level: "advanced",
    question: "The director will award the promotion to ______ the search committee recommends unanimously.",
    options: { A: "whomever", B: "whoever", C: "whichever", D: "anyone" },
    correctAnswer: "A",
    clue: "TÂN NGỮ CỦA 'RECOMMENDS': 'whomever' = anyone whom (bất kỳ ai mà ủy ban đề cử).",
    explanationVi: "'whomever' làm tân ngữ cho động từ 'recommends' trong mệnh đề phụ.",
    targetChunk: { phrase: "to whomever the committee recommends", meaningVi: "tới bất kỳ ai mà ủy ban đề xuất" },
    skeleton: { subject: "The director", verb: "will award", object: "the promotion" }
  },
  {
    id: "rel_adv_006",
    level: "advanced",
    question: "Dr. Aris was the only scientist in the laboratory ______ successfully synthesize the rare compound.",
    options: { A: "to", B: "who", C: "whom", D: "which" },
    correctAnswer: "A",
    clue: "RÚT GỌN MỆNH ĐỀ QUAN HỆ VỚI TO-V SAU 'THE ONLY': the only scientist to synthesize (= who synthesized).",
    explanationVi: "Sau các từ chỉ thứ tự (the first, the second, the last, the only, the next), mệnh đề quan hệ rút gọn thành To-Infinitive.",
    targetChunk: { phrase: "the only scientist to synthesize the compound", meaningVi: "nhà khoa học duy nhất tổng hợp thành công hợp chất" },
    skeleton: { subject: "Dr. Aris", verb: "was", object: "the only scientist to synthesize the compound" }
  },
  {
    id: "rel_adv_007",
    level: "advanced",
    question: "The corporate restructuring plan, the primary objective ______ is cost containment, will commence next month.",
    options: { A: "of which", B: "of whom", C: "whose", D: "where" },
    correctAnswer: "A",
    clue: "SỞ HỮU TRANG TRỌNG CỦA VẬT: 'the primary objective of which' (= whose primary objective).",
    explanationVi: "'of which' thay cho 'the plan', diễn đạt 'mục tiêu chính của kế hoạch đó'.",
    targetChunk: { phrase: "the primary objective of which is containment", meaningVi: "mục tiêu chính của nó là kiểm soát chi phí" },
    skeleton: { subject: "The plan", verb: "will commence", object: null }
  },
  {
    id: "rel_adv_008",
    level: "advanced",
    question: "All passengers ______ in emergency exit rows must be physically capable of assisting flight crew.",
    options: { A: "seated", B: "seating", C: "seat", D: "are seated" },
    correctAnswer: "A",
    clue: "BẪY RÚT GỌN BỊ ĐỘNG 'BE SEATED': All passengers (who are seated) in... → rút gọn thành 'seated'.",
    explanationVi: "Trong tiếng Anh, 'be seated' mang nghĩa ngồi. Mệnh đề quan hệ rút gọn dạng bị động giữ lại phân từ 'seated'.",
    targetChunk: { phrase: "passengers seated in emergency exit rows", meaningVi: "những hành khách ngồi ở hàng ghế thoát hiểm" },
    skeleton: { subject: "All passengers seated in exit rows", verb: "must be", object: "capable of assisting" }
  },
  {
    id: "rel_adv_009",
    level: "advanced",
    question: "The factory's daily production output fell short of projections, ______ deeply concerned the investors.",
    options: { A: "which", B: "that", C: "what", D: "where" },
    correctAnswer: "A",
    clue: "WHICH THAY THẾ CHO CẢ MỆNH ĐỀ ĐỨNG TRƯỚC: ', which deeply concerned...' (điều này làm các nhà đầu tư lo lắng).",
    explanationVi: "Đại từ quan hệ 'which' đứng sau dấu phẩy có thể thay thế cho toàn bộ sự việc ở vế trước. Cấm dùng 'that'.",
    targetChunk: { phrase: ", which deeply concerned the investors", meaningVi: ", điều này đã làm các nhà đầu tư hết sức lo lắng" },
    skeleton: { subject: "output fell short", verb: "which deeply concerned", object: "the investors" }
  },
  {
    id: "rel_adv_010",
    level: "advanced",
    question: "The firm interviewed fifteen candidates, neither of ______ possessed the requisite logistics experience.",
    options: { A: "whom", B: "who", C: "which", D: "them" },
    correctAnswer: "A",
    clue: "LƯỢNG TỪ CHỈ NGƯỜI SAU GIỚI TỪ: 'neither of whom' (không ai trong số họ).",
    explanationVi: "Sau 'neither of' bổ nghĩa cho danh từ người 'candidates' phải dùng đại từ tân ngữ 'whom'. Không dùng 'them' vì câu cần từ nối.",
    targetChunk: { phrase: "neither of whom possessed experience", meaningVi: "không ai trong số họ có đủ kinh nghiệm" },
    skeleton: { subject: "The firm", verb: "interviewed", object: "fifteen candidates" }
  },
  {
    id: "rel_adv_011",
    level: "advanced",
    question: "The revised compliance manual, ______ copies will be distributed tomorrow, outlines safety standards.",
    options: { A: "whose", B: "which", C: "where", D: "of which" },
    correctAnswer: "A",
    clue: "SỞ HỮU CỦA DANH TỪ ĐỨNG SAU: whose + Noun (whose copies = những bản sao của cuốn sổ tay đó).",
    explanationVi: "'whose' có thể dùng cho cả người và vật để chỉ sự sở hữu.",
    targetChunk: { phrase: "manual, whose copies will be distributed", meaningVi: "cuốn sổ tay, mà các bản sao của nó sẽ được phát" },
    skeleton: { subject: "The revised compliance manual", verb: "outlines", object: "safety standards" }
  },
  {
    id: "rel_adv_012",
    level: "advanced",
    question: "The innovative solar battery technology, ______ extensive clinical trials, will enter commercial production.",
    options: { A: "having passed", B: "passed", C: "pass", D: "is passing" },
    correctAnswer: "A",
    clue: "RÚT GỌN HOÀN THÀNH (Perfect Participle): 'having passed' nhấn mạnh hành động thử nghiệm ĐÃ HOÀN TẤT trước khi đưa vào sản xuất.",
    explanationVi: "Having + V3/ed dùng để rút gọn mệnh đề quan hệ khi hành động xảy ra và hoàn tất trước hành động của mệnh đề chính.",
    targetChunk: { phrase: "having passed extensive trials", meaningVi: "sau khi đã vượt qua các đợt thử nghiệm quy mô lớn" },
    skeleton: { subject: "The technology", verb: "will enter", object: "commercial production" }
  },
  {
    id: "rel_adv_013",
    level: "advanced",
    question: "The research and development director approved ______ proposal offered the greatest cost efficiencies.",
    options: { A: "whichever", B: "whatever", C: "whoever", D: "wherever" },
    correctAnswer: "A",
    clue: "ĐẠI TỪ QUAN HỆ BẤT ĐỊNH 'WHICHEVER + NOUN': Whichever proposal = bất kỳ đề xuất nào trong số các lựa chọn.",
    explanationVi: "'whichever + Noun' dùng khi có một số lượng phương án giới hạn để chọn lựa.",
    targetChunk: { phrase: "whichever proposal offered efficiencies", meaningVi: "bất kỳ đề xuất nào mang lại hiệu quả chi phí cao nhất" },
    skeleton: { subject: "The director", verb: "approved", object: "whichever proposal offered efficiencies" }
  },
  {
    id: "rel_adv_014",
    level: "advanced",
    question: "The executive suite on the fortieth floor, ______ panoramic city views, is reserved for the chairman.",
    options: { A: "offering", B: "offered", C: "offers", D: "is offering" },
    correctAnswer: "A",
    clue: "RÚT GỌN MỆNH ĐỀ CHỦ ĐỘNG: suite (which offers) views → rút gọn thành 'offering'.",
    explanationVi: "Căn phòng mang lại tầm nhìn (chủ động), rút gọn mệnh đề quan hệ thành hiện tại phân từ 'offering'.",
    targetChunk: { phrase: "suite offering panoramic city views", meaningVi: "phòng điều hành có tầm nhìn toàn cảnh thành phố" },
    skeleton: { subject: "The executive suite", verb: "is reserved", object: "for the chairman" }
  },
  {
    id: "rel_adv_015",
    level: "advanced",
    question: "Mr. Lin met with foreign delegates, many ______ spoke fluent business Mandarin.",
    options: { A: "of whom", B: "of who", C: "of which", D: "of them" },
    correctAnswer: "A",
    clue: "Cụm định lượng: 'many of whom' (nhiều người trong số họ).",
    explanationVi: "Phía trước có dấu phẩy nối 2 mệnh đề, bổ nghĩa cho người 'delegates' nên bắt buộc dùng 'many of whom'.",
    targetChunk: { phrase: "many of whom spoke fluent Mandarin", meaningVi: "nhiều người trong số họ nói tiếng Quan Thoại lưu loát" },
    skeleton: { subject: "Mr. Lin", verb: "met", object: "with foreign delegates" }
  },
  {
    id: "rel_adv_016",
    level: "advanced",
    question: "The contractor ______ with constructing the regional hospital has requested a two-month extension.",
    options: { A: "tasked", B: "tasking", C: "tasks", D: "is tasked" },
    correctAnswer: "A",
    clue: "RÚT GỌN BỊ ĐỘNG: contractor (who was) tasked with... → rút gọn còn 'tasked'.",
    explanationVi: "Nhà thầu 'được giao trọng trách' (bị động), mệnh đề quan hệ rút gọn lược bỏ đại từ và to be, chỉ giữ lại V3/ed 'tasked'.",
    targetChunk: { phrase: "contractor tasked with constructing", meaningVi: "nhà thầu được giao nhiệm vụ xây dựng" },
    skeleton: { subject: "The contractor tasked with constructing", verb: "has requested", object: "an extension" }
  },
  {
    id: "rel_adv_017",
    level: "advanced",
    question: "The environmental study investigated the degree ______ industrial discharge contaminates local rivers.",
    options: { A: "to which", B: "in which", C: "for which", D: "by which" },
    correctAnswer: "A",
    clue: "CỤM CỐ ĐỊNH TOEIC 990: 'to the degree that...' → trong mệnh đề quan hệ là 'the degree TO WHICH' (mức độ mà...).",
    explanationVi: "'to which' đi kèm với 'the degree / the extent' biểu thị mức độ ảnh hưởng.",
    targetChunk: { phrase: "the degree to which discharge contaminates", meaningVi: "mức độ mà nước thải gây ô nhiễm" },
    skeleton: { subject: "The study", verb: "investigated", object: "the degree to which discharge contaminates rivers" }
  },
  {
    id: "rel_adv_018",
    level: "advanced",
    question: "The conference attendees ______ by the bus breakdown were accommodated on a later shuttle.",
    options: { A: "delayed", B: "delaying", C: "delays", D: "were delayed" },
    correctAnswer: "A",
    clue: "Rút gọn bị động: attendees (who were) delayed by the breakdown → 'delayed'.",
    explanationVi: "Người tham dự 'bị chậm trễ' do sự cố xe buýt (có tác nhân 'by').",
    targetChunk: { phrase: "attendees delayed by the breakdown", meaningVi: "các khách tham dự bị trễ do hỏng xe" },
    skeleton: { subject: "The conference attendees delayed by breakdown", verb: "were accommodated", object: null }
  },
  {
    id: "rel_adv_019",
    level: "advanced",
    question: "The medical device, the efficacy ______ has been validated by several clinical trials, is now available.",
    options: { A: "of which", B: "of whom", C: "whose", D: "that" },
    correctAnswer: "A",
    clue: "Cụm danh từ + of which: 'the efficacy of which' (= whose efficacy) chỉ hiệu lực của thiết bị y tế.",
    explanationVi: "Cấu trúc sở hữu trang trọng cho vật: the + Noun + of which.",
    targetChunk: { phrase: "the efficacy of which has been validated", meaningVi: "hiệu quả của nó đã được chứng minh" },
    skeleton: { subject: "The medical device", verb: "is", object: "available" }
  },
  {
    id: "rel_adv_020",
    level: "advanced",
    question: "The candidate was the second applicant ______ an offer of employment from the executive committee.",
    options: { A: "to receive", B: "receiving", C: "received", D: "receives" },
    correctAnswer: "A",
    clue: "Rút gọn sau số thứ tự: 'the second applicant to receive' (= who received).",
    explanationVi: "Sau số thứ tự (the first/second/third...), rút gọn mệnh đề quan hệ dùng To-Infinitive.",
    targetChunk: { phrase: "the second applicant to receive an offer", meaningVi: "ứng viên thứ hai nhận được lời mời làm việc" },
    skeleton: { subject: "The candidate", verb: "was", object: "the second applicant to receive an offer" }
  },
  {
    id: "rel_adv_021",
    level: "advanced",
    question: "The executive team outlined the manner ______ client feedback will be incorporated into the redesign.",
    options: { A: "in which", B: "at which", C: "to which", D: "on which" },
    correctAnswer: "A",
    clue: "Collocation: 'the manner IN WHICH' (= the way in which / how: cái cách thức mà việc gì được thực hiện).",
    explanationVi: "Manner đi với giới từ 'in', tạo thành cụm 'the manner in which' (cách thức mà...).",
    targetChunk: { phrase: "the manner in which feedback will be incorporated", meaningVi: "cách thức mà phản hồi sẽ được đưa vào" },
    skeleton: { subject: "The team", verb: "outlined", object: "the manner in which feedback will be incorporated" }
  },
  {
    id: "rel_adv_022",
    level: "advanced",
    question: "Anyone ______ to participate in the mentoring initiative should submit an expression of interest.",
    options: { A: "wishing", B: "wishes", C: "wished", D: "is wishing" },
    correctAnswer: "A",
    clue: "RÚT GỌN CHỦ ĐỘNG: Anyone (who wishes) to participate → 'wishing'.",
    explanationVi: "Mệnh đề quan hệ chủ động rút gọn thành Hiện tại phân từ V-ing.",
    targetChunk: { phrase: "Anyone wishing to participate", meaningVi: "Bất kỳ ai có nguyện vọng tham gia" },
    skeleton: { subject: "Anyone wishing to participate", verb: "should submit", object: "an expression of interest" }
  },
  {
    id: "rel_adv_023",
    level: "advanced",
    question: "The firm acquired three regional distributorships, none ______ had reported positive cash flow.",
    options: { A: "of which", B: "of whom", C: "of that", D: "of them" },
    correctAnswer: "A",
    clue: "Lượng từ sau giới từ chỉ vật: 'none of which' (không nhà phân phối nào trong số đó).",
    explanationVi: "Thay thế cho danh từ chỉ vật 'distributorships' sau dấu phẩy bắt buộc dùng 'none of which'.",
    targetChunk: { phrase: "none of which had reported positive cash flow", meaningVi: "không đơn vị nào trong số đó có dòng tiền dương" },
    skeleton: { subject: "The firm", verb: "acquired", object: "three regional distributorships" }
  },
  {
    id: "rel_adv_024",
    level: "advanced",
    question: "The legal department cautioned that ______ signs the agreement will be personally liable for breaches.",
    options: { A: "whoever", B: "whomever", C: "anyone", D: "those" },
    correctAnswer: "A",
    clue: "Whoever = Anyone who. Đóng vai trò chủ ngữ cho động từ số ít 'signs'.",
    explanationVi: "'Whoever' đứng đầu mệnh đề danh ngữ làm chủ ngữ cho 'signs'.",
    targetChunk: { phrase: "whoever signs the agreement", meaningVi: "bất kỳ ai đặt bút ký thỏa thuận" },
    skeleton: { subject: "whoever signs the agreement", verb: "will be", object: "personally liable" }
  },
  {
    id: "rel_adv_025",
    level: "advanced",
    question: "The new automated packaging machinery, ______ operated by skilled technicians, increases daily throughput.",
    options: { A: "when", B: "where", C: "which", D: "that" },
    correctAnswer: "A",
    clue: "Rút gọn mệnh đề trạng ngữ thời gian dạng bị động: 'when (it is) operated by...'.",
    explanationVi: "When + V-ed: khi được vận hành bởi...",
    targetChunk: { phrase: "when operated by skilled technicians", meaningVi: "khi được vận hành bởi các kỹ thuật viên lành nghề" },
    skeleton: { subject: "The machinery", verb: "increases", object: "throughput" }
  },
  {
    id: "rel_adv_026",
    level: "advanced",
    question: "The terms of settlement ______ during yesterday's arbitration hearing remain strictly confidential.",
    options: { A: "reached", B: "reaching", C: "reach", D: "were reached" },
    correctAnswer: "A",
    clue: "RÚT GỌN BỊ ĐỘNG: terms (which were) reached during... → 'reached'.",
    explanationVi: "Điều khoản thỏa thuận 'được đạt được' trong phiên hòa giải (bị động). Động từ chính của câu là 'remain'.",
    targetChunk: { phrase: "terms reached during arbitration", meaningVi: "các điều khoản đạt được trong buổi hòa giải" },
    skeleton: { subject: "The terms reached during arbitration", verb: "remain", object: "confidential" }
  },
  {
    id: "rel_adv_027",
    level: "advanced",
    question: "The financial scandal resulted in several senior directors resigning, one ______ was the founder.",
    options: { A: "of whom", B: "of which", C: "of who", D: "of them" },
    correctAnswer: "A",
    clue: "Lượng từ chỉ người sau giới từ: 'one of whom' (một người trong số họ).",
    explanationVi: "Bổ nghĩa cho 'directors' (người) dùng 'one of whom'.",
    targetChunk: { phrase: "one of whom was the founder", meaningVi: "một trong số họ chính là người sáng lập" },
    skeleton: { subject: "The scandal", verb: "resulted in", object: "directors resigning" }
  },
  {
    id: "rel_adv_028",
    level: "advanced",
    question: "The newly drafted bylaws, ______ approval is pending before the board, mandate quarterly audits.",
    options: { A: "whose", B: "which", C: "that", D: "where" },
    correctAnswer: "A",
    clue: "whose approval = sự phê chuẩn điều lệ (chỉ quan hệ sở hữu giữa bylaws và approval).",
    explanationVi: "'whose' đứng trước danh từ 'approval' làm chủ ngữ trong mệnh đề quan hệ.",
    targetChunk: { phrase: "bylaws, whose approval is pending", meaningVi: "điều lệ, mà việc phê chuẩn nó đang chờ xử lý" },
    skeleton: { subject: "The bylaws", verb: "mandate", object: "quarterly audits" }
  },
  {
    id: "rel_adv_029",
    level: "advanced",
    question: "The senior executive demonstrated the exact process ______ the proprietary alloy is forged.",
    options: { A: "by which", B: "to which", C: "for which", D: "on which" },
    correctAnswer: "A",
    clue: "Collocation: 'the process BY WHICH sth is done' (quy trình mà nhờ đó việc gì được thực hiện).",
    explanationVi: "'by which' mô tả phương thức hoặc quy trình kỹ thuật để tạo ra sản phẩm.",
    targetChunk: { phrase: "process by which the alloy is forged", meaningVi: "quy trình mà nhờ đó hợp kim được tôi luyện" },
    skeleton: { subject: "The executive", verb: "demonstrated", object: "the process by which alloy is forged" }
  },
  {
    id: "rel_adv_030",
    level: "advanced",
    question: "The research findings ______ in the journal article substantiate our team's initial hypothesis.",
    options: { A: "published", B: "publishing", C: "publish", D: "were published" },
    correctAnswer: "A",
    clue: "RÚT GỌN BỊ ĐỘNG: findings (which were) published in... → 'published'. Động từ chính là 'substantiate'.",
    explanationVi: "Kết quả nghiên cứu 'được xuất bản' trên bài báo khoa học. Rút gọn mệnh đề quan hệ dạng bị động.",
    targetChunk: { phrase: "findings published in the article", meaningVi: "những phát hiện được công bố trên bài báo" },
    skeleton: { subject: "The findings published in the article", verb: "substantiate", object: "our hypothesis" }
  }
];

topic.questions = [...standardQuestions, ...advancedQuestions];

fs.writeFileSync('./data/grammar/relative_clauses.json', JSON.stringify(topic, null, 2), 'utf8');
console.log('relative_clauses.json created successfully! Total questions:', topic.questions.length);
console.log('Standard:', standardQuestions.length, 'Advanced:', advancedQuestions.length);
