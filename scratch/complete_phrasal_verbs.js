import fs from 'fs';

const filePath = './data/grammar/phrasal_verbs.json';
const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 27 câu Standard mới (phr_std_004 đến phr_std_030)
const newStandardQuestions = [
  {
    id: "phr_std_004",
    level: "standard",
    question: "Management decided to ______ the annual gala due to unforeseen budget constraints.",
    options: { A: "call off", B: "turn up", C: "look after", D: "give away" },
    correctAnswer: "A",
    clue: "Cụm mang nghĩa 'hủy bỏ hoàn toàn': call off = cancel.",
    explanationVi: "'call off' nghĩa là hủy bỏ một sự kiện (cancel). Khác với 'put off' là hoãn lại.",
    targetChunk: { phrase: "call off the annual gala", meaningVi: "hủy bỏ dạ tiệc thường niên" },
    skeleton: { subject: "Management", verb: "decided to call off", object: "the annual gala" }
  },
  {
    id: "phr_std_005",
    level: "standard",
    question: "Please remember to ______ all mandatory sections of the job application form.",
    options: { A: "fill out", B: "break down", C: "drop off", D: "take after" },
    correctAnswer: "A",
    clue: "Cụm 'điền vào mẫu đơn/tài liệu': fill out = complete a form.",
    explanationVi: "'fill out a form' là cụm từ kinh điển trong môi trường văn phòng và tuyển dụng.",
    targetChunk: { phrase: "fill out all mandatory sections", meaningVi: "điền vào tất cả các phần bắt buộc" },
    skeleton: { subject: "(You)", verb: "remember", object: "to fill out all mandatory sections" }
  },
  {
    id: "phr_std_006",
    level: "standard",
    question: "The human resources committee will ______ the allegations of misconduct thoroughly.",
    options: { A: "look into", B: "look after", C: "look for", D: "look up" },
    correctAnswer: "A",
    clue: "Cụm mang nghĩa 'điều tra / nghiên cứu / xem xét': look into = investigate.",
    explanationVi: "'look into' nghĩa là tiến hành điều tra, xem xét vụ việc kỹ lưỡng.",
    targetChunk: { phrase: "look into the allegations", meaningVi: "điều tra các cáo buộc" },
    skeleton: { subject: "The committee", verb: "will look into", object: "the allegations of misconduct" }
  },
  {
    id: "phr_std_007",
    level: "standard",
    question: "Due to declining revenue, the firm had to ______ travel expenditures by twenty percent.",
    options: { A: "cut down on", B: "come up with", C: "put up with", D: "look forward to" },
    correctAnswer: "A",
    clue: "Cụm 3 từ mang nghĩa 'cắt giảm (chi tiêu, ngân sách)': cut down on = reduce.",
    explanationVi: "'cut down on expenditures' nghĩa là cắt giảm các khoản chi phí.",
    targetChunk: { phrase: "cut down on travel expenditures", meaningVi: "cắt giảm chi phí đi lại" },
    skeleton: { subject: "the firm", verb: "had to cut down on", object: "travel expenditures" }
  },
  {
    id: "phr_std_008",
    level: "standard",
    question: "The research and development team will ______ a survey to assess consumer preferences.",
    options: { A: "carry out", B: "turn out", C: "give out", D: "drop out" },
    correctAnswer: "A",
    clue: "Cụm 'tiến hành (khảo sát, nghiên cứu, kiểm toán)': carry out a survey/study/audit.",
    explanationVi: "'carry out' nghĩa là thực hiện, tiến hành một cuộc khảo sát hoặc dự án.",
    targetChunk: { phrase: "carry out a survey", meaningVi: "tiến hành một cuộc khảo sát" },
    skeleton: { subject: "The team", verb: "will carry out", object: "a survey" }
  },
  {
    id: "phr_std_009",
    level: "standard",
    question: "Mr. Vance had to ______ the lucrative job offer because it required frequent overseas relocation.",
    options: { A: "turn down", B: "turn in", C: "turn on", D: "turn off" },
    correctAnswer: "A",
    clue: "Cụm mang nghĩa 'từ chối (lời đề nghị, đơn xin việc)': turn down = reject.",
    explanationVi: "'turn down an offer' nghĩa là từ chối một lời mời làm việc.",
    targetChunk: { phrase: "turn down the job offer", meaningVi: "từ chối lời mời làm việc" },
    skeleton: { subject: "Mr. Vance", verb: "had to turn down", object: "the lucrative job offer" }
  },
  {
    id: "phr_std_010",
    level: "standard",
    question: "The IT technician advised us to ______ all important files onto an external hard drive weekly.",
    options: { A: "back up", B: "break up", C: "give up", D: "set up" },
    correctAnswer: "A",
    clue: "Cụm tin học 'sao lưu dữ liệu': back up data/files.",
    explanationVi: "'back up' nghĩa là tạo bản sao lưu phòng trường hợp mất dữ liệu.",
    targetChunk: { phrase: "back up all important files", meaningVi: "sao lưu tất cả các tập tin quan trọng" },
    skeleton: { subject: "The IT technician", verb: "advised", object: "us" }
  },
  {
    id: "phr_std_011",
    level: "standard",
    question: "A multinational conglomerate plans to ______ the regional telecommunications provider by autumn.",
    options: { A: "take over", B: "take in", C: "take off", D: "take after" },
    correctAnswer: "A",
    clue: "Cụm kinh doanh 'thâu tóm / tiếp quản (công ty)': take over a company.",
    explanationVi: "'take over' là thuật ngữ M&A phổ biến nhất chỉ việc mua lại, nắm quyền điều hành doanh nghiệp.",
    targetChunk: { phrase: "take over the telecommunications provider", meaningVi: "thâu tóm nhà cung cấp viễn thông" },
    skeleton: { subject: "A multinational conglomerate", verb: "plans to take over", object: "the provider" }
  },
  {
    id: "phr_std_012",
    level: "standard",
    question: "During the staff meeting, the director ______ several concerns regarding warehouse logistics.",
    options: { A: "brought up", B: "brought down", C: "brought in", D: "brought about" },
    correctAnswer: "A",
    clue: "Cụm 'nêu ra / đề cập tới (vấn đề trong cuộc họp)': bring up a topic/concern.",
    explanationVi: "'bring up' nghĩa là đưa ra một chủ đề để thảo luận trong buổi họp.",
    targetChunk: { phrase: "brought up several concerns", meaningVi: "đã nêu ra một số mối lo ngại" },
    skeleton: { subject: "the director", verb: "brought up", object: "several concerns" }
  },
  {
    id: "phr_std_013",
    level: "standard",
    question: "All conference attendees must ______ their name badges at the registration kiosk before entering.",
    options: { A: "pick up", B: "pick out", C: "pick on", D: "pick off" },
    correctAnswer: "A",
    clue: "Cụm 'đến lấy / nhận (thẻ, đồ đạc, tài liệu)': pick up.",
    explanationVi: "'pick up a badge/ticket' nghĩa là đến quầy nhận thẻ đeo hoặc vé.",
    targetChunk: { phrase: "pick up their name badges", meaningVi: "lấy thẻ đeo tên của họ" },
    skeleton: { subject: "All attendees", verb: "must pick up", object: "their name badges" }
  },
  {
    id: "phr_std_014",
    level: "standard",
    question: "The printer in room 302 suddenly ______ right before the executive board meeting.",
    options: { A: "broke down", B: "broke in", C: "broke out", D: "broke off" },
    correctAnswer: "A",
    clue: "Cụm chỉ máy móc 'bị hỏng hóc, ngừng hoạt động': break down.",
    explanationVi: "'break down' dùng cho máy móc, thiết bị kỹ thuật bị trục trặc ngưng vận hành.",
    targetChunk: { phrase: "suddenly broke down before the meeting", meaningVi: "đột ngột bị hỏng ngay trước cuộc họp" },
    skeleton: { subject: "The printer", verb: "broke down", object: null }
  },
  {
    id: "phr_std_015",
    level: "standard",
    question: "The courier will ______ the confidential legal documents at your office by 3:00 PM.",
    options: { A: "drop off", B: "drop in", C: "drop out", D: "drop by" },
    correctAnswer: "A",
    clue: "Cụm 'giao / gửi lại đồ vật ở một địa điểm': drop off sth.",
    explanationVi: "'drop off' là hành động giao bưu kiện hoặc thả khách tại một điểm đến.",
    targetChunk: { phrase: "drop off the confidential documents", meaningVi: "giao các tài liệu mật" },
    skeleton: { subject: "The courier", verb: "will drop off", object: "the confidential legal documents" }
  },
  {
    id: "phr_std_016",
    level: "standard",
    question: "Employees are required to ______ their expense reimbursement forms by Friday afternoon.",
    options: { A: "hand in", B: "hand out", C: "hand over", D: "hand around" },
    correctAnswer: "A",
    clue: "Cụm 'nộp (báo cáo, biểu mẫu)': hand in = submit.",
    explanationVi: "'hand in' đồng nghĩa với 'submit' (nộp bài, nộp đơn). 'hand out' là phát tài liệu.",
    targetChunk: { phrase: "hand in their reimbursement forms", meaningVi: "nộp các biểu mẫu thanh toán chi phí" },
    skeleton: { subject: "Employees", verb: "are required to hand in", object: "their forms" }
  },
  {
    id: "phr_std_017",
    level: "standard",
    question: "The workshop facilitator ______ copies of the presentation slides before the session began.",
    options: { A: "handed out", B: "handed in", C: "handed down", D: "handed over" },
    correctAnswer: "A",
    clue: "Cụm 'phát / phân phát (tài liệu)': hand out = distribute.",
    explanationVi: "'hand out' nghĩa là phân phát tài liệu trực tiếp cho mọi người.",
    targetChunk: { phrase: "handed out copies of slides", meaningVi: "đã phát các bản sao slide thuyết trình" },
    skeleton: { subject: "The workshop facilitator", verb: "handed out", object: "copies of the presentation slides" }
  },
  {
    id: "phr_std_018",
    level: "standard",
    question: "The engineering team worked diligently to ______ with an innovative energy-saving design.",
    options: { A: "come up", B: "keep up", C: "catch up", D: "look up" },
    correctAnswer: "A",
    clue: "Cụm 3 từ quen thuộc 'nghĩ ra / nảy ra (ý tưởng, giải pháp)': come up with an idea/solution.",
    explanationVi: "'come up with' luôn đi kèm 'with' ở phía sau, mang nghĩa sáng kiến ra điều gì mới.",
    targetChunk: { phrase: "come up with an innovative design", meaningVi: "nghĩ ra một mẫu thiết kế tiết kiệm năng lượng" },
    skeleton: { subject: "The engineering team", verb: "worked to come up with", object: "an innovative design" }
  },
  {
    id: "phr_std_019",
    level: "standard",
    question: "The company quickly ______ of stock during the first weekend of the holiday shopping festival.",
    options: { A: "ran out", B: "ran over", C: "ran into", D: "ran away" },
    correctAnswer: "A",
    clue: "Cụm 'hết sạch hàng / cạn kiệt nguồn cung': run out of stock.",
    explanationVi: "'run out of sth' là thành ngữ chỉ việc sử dụng hết không còn lại gì.",
    targetChunk: { phrase: "ran out of stock during the weekend", meaningVi: "hết sạch hàng trong dịp cuối tuần" },
    skeleton: { subject: "The company", verb: "ran out of", object: "stock" }
  },
  {
    id: "phr_std_020",
    level: "standard",
    question: "Our customer support team is always eager to ______ any inquiries you might have.",
    options: { A: "deal with", B: "deal in", C: "deal out", D: "deal for" },
    correctAnswer: "A",
    clue: "Cụm 'giải quyết / xử lý (vấn đề, khách hàng)': deal with = handle / resolve.",
    explanationVi: "'deal with inquiries/complaints' là cụm từ cố định trong chăm sóc khách hàng.",
    targetChunk: { phrase: "deal with any inquiries", meaningVi: "xử lý bất kỳ câu hỏi thắc mắc nào" },
    skeleton: { subject: "Our team", verb: "is eager to deal with", object: "any inquiries" }
  },
  {
    id: "phr_std_021",
    level: "standard",
    question: "The financial auditor ______ several minor discrepancies in the travel expenditure ledger.",
    options: { A: "pointed out", B: "pointed to", C: "pointed at", D: "pointed on" },
    correctAnswer: "A",
    clue: "Cụm 'chỉ ra / lưu ý (sai sót, điểm quan trọng)': point out sth.",
    explanationVi: "'point out' nghĩa là làm cho người khác chú ý đến một thông tin hoặc lỗi sai.",
    targetChunk: { phrase: "pointed out several discrepancies", meaningVi: "đã chỉ ra một vài sự sai lệch" },
    skeleton: { subject: "The financial auditor", verb: "pointed out", object: "several minor discrepancies" }
  },
  {
    id: "phr_std_022",
    level: "standard",
    question: "The audio-visual technician will ______ the microphones and projection screen before 9:00 AM.",
    options: { A: "set up", B: "set in", C: "set off", D: "set down" },
    correctAnswer: "A",
    clue: "Cụm 'lắp đặt / chuẩn bị sẵn sàng (thiết bị, cuộc họp)': set up equipment/meetings.",
    explanationVi: "'set up' là thiết lập, chuẩn bị cơ sở vật chất hoặc thiết bị cho sự kiện.",
    targetChunk: { phrase: "set up the microphones and screen", meaningVi: "lắp đặt micro và màn chiếu" },
    skeleton: { subject: "The technician", verb: "will set up", object: "the microphones and screen" }
  },
  {
    id: "phr_std_023",
    level: "standard",
    question: "You should ______ the words you do not know in a reputable bilingual dictionary.",
    options: { A: "look up", B: "look into", C: "look down", D: "look after" },
    correctAnswer: "A",
    clue: "Cụm 'tra cứu (từ ngữ, danh bạ, dữ liệu)': look up words/information.",
    explanationVi: "'look up' mang nghĩa tra cứu thông tin trong sách báo, từ điển hoặc internet.",
    targetChunk: { phrase: "look up the words", meaningVi: "tra cứu các từ ngữ" },
    skeleton: { subject: "You", verb: "should look up", object: "the words" }
  },
  {
    id: "phr_std_024",
    level: "standard",
    question: "The maintenance crew had to ______ the water supply while repairing the broken pipe.",
    options: { A: "shut off", B: "shut down", C: "shut out", D: "shut in" },
    correctAnswer: "A",
    clue: "Cụm 'ngắt / khóa (van nước, nguồn điện)': shut off / turn off.",
    explanationVi: "'shut off the water/power supply' là ngắt hoàn toàn nguồn cung cấp nước hoặc điện.",
    targetChunk: { phrase: "shut off the water supply", meaningVi: "ngắt nguồn cung cấp nước" },
    skeleton: { subject: "The maintenance crew", verb: "had to shut off", object: "the water supply" }
  },
  {
    id: "phr_std_025",
    level: "standard",
    question: "Due to falling demand, the factory will ______ operations at the end of this month.",
    options: { A: "wind up", B: "wind down", C: "wind off", D: "wind out" },
    correctAnswer: "B",
    clue: "Cụm 'thu hẹp / giảm dần (quy mô hoạt động)': wind down operations.",
    explanationVi: "'wind down' nghĩa là giảm dần mức độ hoạt động trước khi dừng hẳn.",
    targetChunk: { phrase: "wind down operations at the end of this month", meaningVi: "thu hẹp dần hoạt động vào cuối tháng" },
    skeleton: { subject: "the factory", verb: "will wind down", object: "operations" }
  },
  {
    id: "phr_std_026",
    level: "standard",
    question: "Please ______ all electronic devices before the aircraft begins its descent.",
    options: { A: "turn off", B: "turn out", C: "turn on", D: "turn away" },
    correctAnswer: "A",
    clue: "Cụm 'tắt (thiết bị điện tử)': turn off / switch off.",
    explanationVi: "turn off devices: tắt các thiết bị.",
    targetChunk: { phrase: "turn off all electronic devices", meaningVi: "tắt tất cả các thiết bị điện tử" },
    skeleton: { subject: "(You)", verb: "turn off", object: "all electronic devices" }
  },
  {
    id: "phr_std_027",
    level: "standard",
    question: "The supervisor asked him to ______ the defective units from the production line immediately.",
    options: { A: "take away", B: "take out", C: "take over", D: "take back" },
    correctAnswer: "A",
    clue: "Cụm 'mang đi chỗ khác / loại bỏ': take away / remove.",
    explanationVi: "'take away' mang nghĩa đưa các sản phẩm lỗi ra khỏi dây chuyền sản xuất.",
    targetChunk: { phrase: "take away the defective units", meaningVi: "đưa các sản phẩm lỗi đi chỗ khác" },
    skeleton: { subject: "The supervisor", verb: "asked", object: "him" }
  },
  {
    id: "phr_std_028",
    level: "standard",
    question: "After thorough deliberation, the company decided to ______ the controversial advertisement.",
    options: { A: "pull", B: "pull back", C: "pull out", D: "pull in" },
    correctAnswer: "B",
    clue: "Cụm 'rút lại / thu hồi (quảng cáo, quân đội, sản phẩm)': pull back / pull.",
    explanationVi: "'pull back' mang nghĩa thu hồi, rút lại một chiến dịch quảng cáo gây tranh cãi.",
    targetChunk: { phrase: "decided to pull back the advertisement", meaningVi: "quyết định rút lại đoạn quảng cáo" },
    skeleton: { subject: "the company", verb: "decided to pull back", object: "the advertisement" }
  },
  {
    id: "phr_std_029",
    level: "standard",
    question: "Staff members are expected to ______ promptly at 8:30 AM for the general meeting.",
    options: { A: "show up", B: "show off", C: "show down", D: "show through" },
    correctAnswer: "A",
    clue: "Cụm 'có mặt / xuất hiện': show up = arrive / appear.",
    explanationVi: "'show up' nghĩa là đến nơi, có mặt đúng giờ.",
    targetChunk: { phrase: "show up promptly at 8:30 AM", meaningVi: "có mặt đúng 8:30 sáng" },
    skeleton: { subject: "Staff members", verb: "are expected to show up", object: null }
  },
  {
    id: "phr_std_030",
    level: "standard",
    question: "The director told the sales staff to ______ the good work after reaching record revenue.",
    options: { A: "keep up", B: "keep on", C: "keep off", D: "keep away" },
    correctAnswer: "A",
    clue: "Thành ngữ khen ngợi 'hãy tiếp tục phát huy phong độ tốt': keep up the good work!",
    explanationVi: "'keep up' nghĩa là duy trì phong độ, chất lượng công việc tốt.",
    targetChunk: { phrase: "keep up the good work", meaningVi: "tiếp tục phát huy phong độ làm việc tốt" },
    skeleton: { subject: "The director", verb: "told", object: "the sales staff" }
  }
];

// 27 câu Advanced mới (phr_adv_004 đến phr_adv_030)
const newAdvancedQuestions = [
  {
    id: "phr_adv_004",
    level: "advanced",
    question: "The acquisition proposal was very attractive, but the board eventually decided to turn ______ down.",
    options: { A: "it", B: "them", C: "its", D: "itself" },
    correctAnswer: "A",
    clue: "BẪY TÁCH ĐẠI TỪ (Separable Phrasal Verb): Khi tân ngữ là đại từ (it/them), BẮT BUỘC kẹp giữa động từ và giới từ (turn it down, KHÔNG dùng turn down it).",
    explanationVi: "'The acquisition proposal' là danh từ số ít, thay bằng 'it'. Đại từ phải đứng giữa: 'turn it down'.",
    targetChunk: { phrase: "decided to turn it down", meaningVi: "quyết định từ chối nó" },
    skeleton: { subject: "the board", verb: "decided to turn down", object: "it" }
  },
  {
    id: "phr_adv_005",
    level: "advanced",
    question: "Domestic sales figures account ______ more than sixty percent of the company's total annual earnings.",
    options: { A: "for", B: "with", C: "to", D: "at" },
    correctAnswer: "A",
    clue: "Collocation biểu đồ TOEIC 990: 'account for + %' (chiếm bao nhiêu phần trăm) hoặc 'giải thích cho điều gì'.",
    explanationVi: "'account for' nghĩa là chiếm tỷ lệ bao nhiêu trong tổng số.",
    targetChunk: { phrase: "account for more than sixty percent", meaningVi: "chiếm hơn sáu mươi phần trăm" },
    skeleton: { subject: "Domestic sales figures", verb: "account for", object: "more than sixty percent of earnings" }
  },
  {
    id: "phr_adv_006",
    level: "advanced",
    question: "After twenty years of dedicated service, the chief executive announced his intention to ______ down from his post.",
    options: { A: "step", B: "look", C: "stand", D: "bring" },
    correctAnswer: "A",
    clue: "Cụm 'từ chức / rút lui khỏi vị trí lãnh đạo': step down from a post/position.",
    explanationVi: "'step down' là thuật ngữ báo chí tài chính chỉ việc lãnh đạo cấp cao từ chức.",
    targetChunk: { phrase: "step down from his post", meaningVi: "từ chức khỏi cương vị của mình" },
    skeleton: { subject: "the chief executive", verb: "announced", object: "his intention to step down" }
  },
  {
    id: "phr_adv_007",
    level: "advanced",
    question: "The executive committee completely ruled ______ the possibility of selling off the overseas manufacturing plant.",
    options: { A: "out", B: "off", C: "in", D: "down" },
    correctAnswer: "A",
    clue: "Cụm mang nghĩa 'loại trừ / bác bỏ (khả năng xảy ra)': rule out the possibility.",
    explanationVi: "'rule out' là cụm cố định biểu thị việc loại bỏ một phương án hoặc khả năng.",
    targetChunk: { phrase: "ruled out the possibility of selling", meaningVi: "bác bỏ khả năng bán đi nhà máy" },
    skeleton: { subject: "The committee", verb: "ruled out", object: "the possibility of selling" }
  },
  {
    id: "phr_adv_008",
    level: "advanced",
    question: "The automotive company will gradually phase ______ combustion-engine models in favor of electric vehicles.",
    options: { A: "out", B: "in", C: "off", D: "down" },
    correctAnswer: "A",
    clue: "Cụm 'từng bước loại bỏ / ngừng sản xuất theo từng giai đoạn': phase out sth.",
    explanationVi: "'phase out' là ngừng sản xuất hoặc loại bỏ dần một dòng sản phẩm theo lộ trình.",
    targetChunk: { phrase: "phase out combustion-engine models", meaningVi: "từng bước khai tử các mẫu xe chạy động cơ đốt trong" },
    skeleton: { subject: "The automotive company", verb: "will phase out", object: "combustion-engine models" }
  },
  {
    id: "phr_adv_009",
    level: "advanced",
    question: "Due to the project manager's sudden illness, Ms. Davis graciously agreed to stand ______ for him at the summit.",
    options: { A: "in", B: "out", C: "up", D: "by" },
    correctAnswer: "A",
    clue: "Cụm 3 từ 'đại diện / thế chỗ / làm thay cho ai': stand in for sb.",
    explanationVi: "'stand in for sb' nghĩa là tạm thời thay thế vị trí của ai đó trong cuộc họp.",
    targetChunk: { phrase: "stand in for him at the summit", meaningVi: "thay mặt anh ấy tại hội nghị thượng đỉnh" },
    skeleton: { subject: "Ms. Davis", verb: "agreed to stand in", object: "for him" }
  },
  {
    id: "phr_adv_010",
    level: "advanced",
    question: "The marketing director is reluctant to put ______ with recurring shipment delays from the overseas supplier.",
    options: { A: "up", B: "down", C: "off", D: "on" },
    correctAnswer: "A",
    clue: "Cụm 3 từ kinh điển 'chịu đựng / nhẫn nhịn điều gì khó chịu': put up with sth = tolerate.",
    explanationVi: "'put up with' nghĩa là chịu đựng tình trạng chậm trễ liên tiếp.",
    targetChunk: { phrase: "put up with recurring delays", meaningVi: "chịu đựng sự chậm trễ lặp đi lặp lại" },
    skeleton: { subject: "The marketing director", verb: "is reluctant to put up with", object: "recurring delays" }
  },
  {
    id: "phr_adv_011",
    level: "advanced",
    question: "If our primary software fails during the live demonstration, we will have to fall back ______ our backup servers.",
    options: { A: "on", B: "to", C: "with", D: "for" },
    correctAnswer: "A",
    clue: "Cụm 'trông cậy vào / dựa vào phương án dự phòng khi kế hoạch A thất bại': fall back on sth.",
    explanationVi: "'fall back on' nghĩa là cầu viện đến giải pháp dự phòng cuối cùng.",
    targetChunk: { phrase: "fall back on our backup servers", meaningVi: "phải nhờ cậy đến hệ thống máy chủ dự phòng" },
    skeleton: { subject: "we", verb: "will have to fall back on", object: "our backup servers" }
  },
  {
    id: "phr_adv_012",
    level: "advanced",
    question: "Subscribers can easily opt ______ of receiving promotional newsletters by clicking the link at the bottom.",
    options: { A: "out", B: "in", C: "off", D: "up" },
    correctAnswer: "A",
    clue: "Cụm 'chọn không tham gia / từ chối nhận thông tin': opt out of sth (trái nghĩa với opt into).",
    explanationVi: "'opt out of' là thuật ngữ trong chính sách bảo mật và email marketing chỉ việc hủy đăng ký nhận tin.",
    targetChunk: { phrase: "opt out of receiving promotional newsletters", meaningVi: "từ chối nhận bản tin quảng cáo" },
    skeleton: { subject: "Subscribers", verb: "can opt out of", object: "receiving promotional newsletters" }
  },
  {
    id: "phr_adv_013",
    level: "advanced",
    question: "The contract negotiation broke ______ after neither side could agree on royalty distribution percentages.",
    options: { A: "down", B: "off", C: "out", D: "away" },
    correctAnswer: "A",
    clue: "Cụm 'đàm phán đổ vỡ / thất bại không thành': negotiations broke down.",
    explanationVi: "Khi dùng với cuộc đàm phán hay quan hệ hợp tác, 'break down' mang nghĩa sụp đổ, bế tắc.",
    targetChunk: { phrase: "negotiation broke down", meaningVi: "cuộc đàm phán đã đổ vỡ" },
    skeleton: { subject: "The contract negotiation", verb: "broke down", object: null }
  },
  {
    id: "phr_adv_014",
    level: "advanced",
    question: "The pharmaceutical firm hopes that the pain medication's initial side effects will gradually wear ______.",
    options: { A: "off", B: "out", C: "down", D: "away" },
    correctAnswer: "A",
    clue: "Cụm 'mất dần tác dụng / giảm dần cường độ (thuốc, cảm xúc)': wear off.",
    explanationVi: "'wear off' dùng cho tác dụng của thuốc hoặc cảm giác mờ nhạt dần theo thời gian.",
    targetChunk: { phrase: "side effects will gradually wear off", meaningVi: "các tác dụng phụ sẽ dần dần biến mất" },
    skeleton: { subject: "the side effects", verb: "will wear off", object: null }
  },
  {
    id: "phr_adv_015",
    level: "advanced",
    question: "The financial advisor urged clients not to dive ______ high-risk speculative assets without thorough research.",
    options: { A: "into", B: "at", C: "on", D: "up" },
    correctAnswer: "A",
    clue: "Cụm 'lao đầu vào / dấn thân vào một lĩnh vực': dive into sth.",
    explanationVi: "'dive into' nghĩa là vội vàng nhảy vào đầu tư hoặc nghiên cứu mà không chuẩn bị.",
    targetChunk: { phrase: "dive into high-risk assets", meaningVi: "lao vào các tài sản có tính đầu cơ rủi ro cao" },
    skeleton: { subject: "The advisor", verb: "urged", object: "clients not to dive into high-risk assets" }
  },
  {
    id: "phr_adv_016",
    level: "advanced",
    question: "The sudden departure of the creative director brought ______ unexpected organizational changes.",
    options: { A: "about", B: "up", C: "down", D: "in" },
    correctAnswer: "A",
    clue: "Cụm 'dẫn đến / gây ra / mang lại (kết quả, thay đổi)': bring about = cause.",
    explanationVi: "'bring about change' là collocation học thuật rất phổ biến trong đề thi TOEIC điểm cao.",
    targetChunk: { phrase: "brought about unexpected organizational changes", meaningVi: "đã mang lại những thay đổi bất ngờ trong tổ chức" },
    skeleton: { subject: "The sudden departure", verb: "brought about", object: "organizational changes" }
  },
  {
    id: "phr_adv_017",
    level: "advanced",
    question: "The auditor was unable to make ______ the signatures on the faded purchase requisition slips.",
    options: { A: "out", B: "up", C: "off", D: "over" },
    correctAnswer: "A",
    clue: "Cụm 'nhìn rõ / phân biệt được / đọc được chữ mờ': make out.",
    explanationVi: "'make out' mang nghĩa nhìn hoặc đọc được chữ viết một cách khó khăn.",
    targetChunk: { phrase: "unable to make out the signatures", meaningVi: "không thể đọc được các chữ ký" },
    skeleton: { subject: "The auditor", verb: "was unable to make out", object: "the signatures" }
  },
  {
    id: "phr_adv_018",
    level: "advanced",
    question: "The restructuring plan, ______ was drawn up by external consultants, will take effect immediately.",
    options: { A: "which", B: "that", C: "what", D: "who" },
    correctAnswer: "A",
    clue: "Mệnh đề quan hệ không xác định có dấu phẩy đứng trước cụm động từ 'draw up' (soạn thảo).",
    explanationVi: "draw up a plan: soạn thảo kế hoạch. Đại từ quan hệ 'which' thay thế cho 'restructuring plan' sau dấu phẩy.",
    targetChunk: { phrase: "plan was drawn up by consultants", meaningVi: "kế hoạch được soạn thảo bởi các chuyên gia tư vấn" },
    skeleton: { subject: "The restructuring plan", verb: "will take effect", object: null }
  },
  {
    id: "phr_adv_019",
    level: "advanced",
    question: "During the audit, the inspector stumbled ______ an unrecorded bank account containing substantial funds.",
    options: { A: "upon", B: "into", C: "at", D: "over" },
    correctAnswer: "A",
    clue: "Cụm 'tình cờ phát hiện ra / tình cờ bắt gặp': stumble upon/on = discover by chance.",
    explanationVi: "'stumble upon' mang nghĩa tình cờ lần ra manh mối hay tài liệu.",
    targetChunk: { phrase: "stumbled upon an unrecorded account", meaningVi: "tình cờ phát hiện ra một tài khoản chưa kê khai" },
    skeleton: { subject: "the inspector", verb: "stumbled upon", object: "an unrecorded bank account" }
  },
  {
    id: "phr_adv_020",
    level: "advanced",
    question: "The board instructed legal counsel to press ______ with the lawsuit despite potential public backlash.",
    options: { A: "ahead", B: "down", C: "back", D: "off" },
    correctAnswer: "A",
    clue: "Cụm 'tiếp tục đẩy mạnh / kiên quyết tiến hành': press ahead/on with sth.",
    explanationVi: "'press ahead with' nghĩa là quyết tâm tiến hành kế hoạch dù có khó khăn ngăn trở.",
    targetChunk: { phrase: "press ahead with the lawsuit", meaningVi: "kiên quyết thúc đẩy vụ kiện" },
    skeleton: { subject: "The board", verb: "instructed", object: "legal counsel" }
  },
  {
    id: "phr_adv_021",
    level: "advanced",
    question: "After five hours of intense deliberations, the committee finally hammered ______ a compromise deal.",
    options: { A: "out", B: "down", C: "in", D: "away" },
    correctAnswer: "A",
    clue: "Cụm thành ngữ kinh doanh 'thương lượng vất vả để đạt được (thỏa thuận)': hammer out an agreement/deal.",
    explanationVi: "'hammer out a deal' là collocation cao cấp chỉ quá trình đàm phán căng thẳng để đi đến đồng thuận.",
    targetChunk: { phrase: "hammered out a compromise deal", meaningVi: "đạt được một thỏa thuận thỏa hiệp sau nhiều đàm phán" },
    skeleton: { subject: "the committee", verb: "hammered out", object: "a compromise deal" }
  },
  {
    id: "phr_adv_022",
    level: "advanced",
    question: "The factory's daily output has fallen ______ the target quota established by the manufacturing board.",
    options: { A: "short of", B: "back of", C: "down of", D: "out of" },
    correctAnswer: "A",
    clue: "Cụm thành ngữ cố định: 'fall short of sth' (không đạt tới / thấp hơn mức kỳ vọng hoặc chỉ tiêu).",
    explanationVi: "'fall short of expectations/targets' nghĩa là hụt chỉ tiêu, không đạt mức đề ra.",
    targetChunk: { phrase: "fallen short of the target quota", meaningVi: "không đạt được định mức chỉ tiêu" },
    skeleton: { subject: "output", verb: "has fallen short of", object: "the target quota" }
  },
  {
    id: "phr_adv_023",
    level: "advanced",
    question: "The legal department cautioned staff that failure to comply could bring ______ severe statutory penalties.",
    options: { A: "down", B: "in", C: "on", D: "away" },
    correctAnswer: "C",
    clue: "Cụm 'chuốc lấy / gây ra hậu quả xấu': bring on sth.",
    explanationVi: "'bring on' dùng khi một hành vi dẫn tới hậu quả tiêu cực như án phạt hoặc tai họa.",
    targetChunk: { phrase: "bring on severe statutory penalties", meaningVi: "chuốc lấy các hình phạt nghiêm khắc theo luật định" },
    skeleton: { subject: "failure to comply", verb: "could bring on", object: "statutory penalties" }
  },
  {
    id: "phr_adv_024",
    level: "advanced",
    question: "A comprehensive investigation was set ______ motion immediately following the financial irregularities report.",
    options: { A: "in", B: "on", C: "to", D: "at" },
    correctAnswer: "A",
    clue: "Thành ngữ cố định bị động: 'set in motion' (kích hoạt / bắt đầu khởi động tiến trình).",
    explanationVi: "'be set in motion' nghĩa là một guồng quay hoặc một tiến trình điều tra chính thức được bắt đầu.",
    targetChunk: { phrase: "was set in motion immediately", meaningVi: "đã được khởi động ngay lập tức" },
    skeleton: { subject: "A comprehensive investigation", verb: "was set in motion", object: null }
  },
  {
    id: "phr_adv_025",
    level: "advanced",
    question: "The retail giant plans to branch ______ into digital banking services over the next two fiscal years.",
    options: { A: "out", B: "off", C: "up", D: "down" },
    correctAnswer: "A",
    clue: "Cụm 'mở rộng hoạt động sang mảng mới': branch out into sth.",
    explanationVi: "'branch out' nghĩa là mở rộng phạm vi kinh doanh sang những lĩnh vực khác biệt.",
    targetChunk: { phrase: "branch out into digital banking", meaningVi: "lấn sân sang mảng dịch vụ ngân hàng số" },
    skeleton: { subject: "The retail giant", verb: "plans to branch out into", object: "digital banking services" }
  },
  {
    id: "phr_adv_026",
    level: "advanced",
    question: "The project team must iron ______ all remaining scheduling conflicts before launching the global campaign.",
    options: { A: "out", B: "down", C: "up", D: "away" },
    correctAnswer: "A",
    clue: "Cụm thành ngữ 'giải quyết / dàn xếp ổn thỏa (xung đột, bất đồng)': iron out problems/conflicts.",
    explanationVi: "'iron out' có nghĩa bóng là là phẳng những nếp nhăn, tức giải quyết dứt điểm các vướng mắc.",
    targetChunk: { phrase: "iron out scheduling conflicts", meaningVi: "dàn xếp ổn thỏa các xung đột về lịch trình" },
    skeleton: { subject: "The team", verb: "must iron out", object: "all remaining scheduling conflicts" }
  },
  {
    id: "phr_adv_027",
    level: "advanced",
    question: "The firm's legal team successfully brushed ______ allegations of copyright infringement in court.",
    options: { A: "off", B: "away", C: "out", D: "down" },
    correctAnswer: "A",
    clue: "Cụm 'phớt lờ / gạt bỏ không đếm xỉa tới': brush off allegations/criticism.",
    explanationVi: "'brush off' nghĩa là dễ dàng gạt bỏ các cáo buộc hoặc lời chỉ trích.",
    targetChunk: { phrase: "brushed off allegations of infringement", meaningVi: "gạt phăng các cáo buộc vi phạm bản quyền" },
    skeleton: { subject: "The legal team", verb: "brushed off", object: "allegations of copyright infringement" }
  },
  {
    id: "phr_adv_028",
    level: "advanced",
    question: "Several smaller startups were swallowed ______ by the tech giant during the industry consolidation.",
    options: { A: "up", B: "down", C: "in", D: "out" },
    correctAnswer: "A",
    clue: "Cụm thành ngữ kinh doanh bị động 'bị nuốt chửng / bị thâu tóm hoàn toàn': be swallowed up.",
    explanationVi: "'swallow up' mô tả việc các doanh nghiệp nhỏ bị tập đoàn lớn thâu tóm và sáp nhập.",
    targetChunk: { phrase: "were swallowed up by the tech giant", meaningVi: "đã bị người khổng lồ công nghệ nuốt chửng" },
    skeleton: { subject: "Several smaller startups", verb: "were swallowed up", object: null }
  },
  {
    id: "phr_adv_029",
    level: "advanced",
    question: "When evaluating overseas suppliers, one must factor ______ fluctuating international shipping tariffs.",
    options: { A: "in", B: "on", C: "at", D: "to" },
    correctAnswer: "A",
    clue: "Cụm 'tính đến / cân nhắc đến một yếu tố': factor in sth.",
    explanationVi: "'factor in costs/tariffs' nghĩa là đưa các chi phí phát sinh vào tính toán bài toán kinh tế.",
    targetChunk: { phrase: "factor in fluctuating shipping tariffs", meaningVi: "tính đến sự biến động của biểu cước vận chuyển" },
    skeleton: { subject: "one", verb: "must factor in", object: "fluctuating shipping tariffs" }
  },
  {
    id: "phr_adv_030",
    level: "advanced",
    question: "The unexpected rise in fuel costs ate ______ the logistics company's quarterly operating profits.",
    options: { A: "into", B: "up", C: "away", D: "through" },
    correctAnswer: "A",
    clue: "Cụm thành ngữ tài chính 'bào mòn / ăn thâm hụt vào (lợi nhuận, ngân sách)': eat into profits/savings.",
    explanationVi: "'eat into profits' là collocation cao cấp chỉ chi phí gia tăng làm sụt giảm lợi nhuận.",
    targetChunk: { phrase: "ate into quarterly operating profits", meaningVi: "ăn thâm hụt vào lợi nhuận hoạt động quý" },
    skeleton: { subject: "The unexpected rise", verb: "ate into", object: "quarterly operating profits" }
  }
];

const existingStd = existingData.questions.filter(q => q.level === 'standard');
const existingAdv = existingData.questions.filter(q => q.level === 'advanced');

const allQuestions = [...existingStd, ...newStandardQuestions, ...existingAdv, ...newAdvancedQuestions];

existingData.questions = allQuestions;

fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
console.log('phrasal_verbs.json updated! Total questions:', allQuestions.length);
console.log('Standard:', allQuestions.filter(q => q.level === 'standard').length);
console.log('Advanced:', allQuestions.filter(q => q.level === 'advanced').length);
