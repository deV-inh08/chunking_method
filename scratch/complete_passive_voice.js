import fs from 'fs';

const filePath = './data/grammar/passive_voice.json';
const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 27 câu Standard mới (pass_std_004 đến pass_std_030)
const newStandardQuestions = [
  {
    id: "pass_std_004",
    level: "standard",
    question: "The newly drafted employment contract ______ to the union representatives tomorrow morning.",
    options: { A: "will present", B: "will be presented", C: "presents", D: "has presented" },
    correctAnswer: "B",
    clue: "Chủ ngữ là vật 'contract' kết hợp trạng từ tương lai 'tomorrow morning' → Bị động tương lai đơn.",
    explanationVi: "Bản hợp đồng không tự thuyết trình mà 'sẽ được trình bày' (will be presented).",
    targetChunk: { phrase: "will be presented to union representatives", meaningVi: "sẽ được trình bày tới đại diện công đoàn" },
    skeleton: { subject: "The newly drafted employment contract", verb: "will be presented", object: null }
  },
  {
    id: "pass_std_005",
    level: "standard",
    question: "Detailed financial statements ______ to all shareholders at the end of each fiscal quarter.",
    options: { A: "distribute", B: "are distributed", C: "distributing", D: "distributed" },
    correctAnswer: "B",
    clue: "Hành động lặp lại định kỳ 'at the end of each fiscal quarter' với chủ ngữ là vật 'statements' → Bị động hiện tại đơn.",
    explanationVi: "Báo cáo tài chính 'được phân phát' định kỳ (are distributed).",
    targetChunk: { phrase: "are distributed to all shareholders", meaningVi: "được gửi tới tất cả các cổ đông" },
    skeleton: { subject: "Detailed financial statements", verb: "are distributed", object: null }
  },
  {
    id: "pass_std_006",
    level: "standard",
    question: "All incoming packages must ______ by the security team before being brought into the executive suites.",
    options: { A: "inspect", B: "be inspected", C: "inspecting", D: "inspected" },
    correctAnswer: "B",
    clue: "Sau động từ khuyết thiếu 'must' ở thể bị động là 'must be + V3/ed'.",
    explanationVi: "Các bưu kiện 'phải được kiểm tra' bởi đội an ninh (must be inspected).",
    targetChunk: { phrase: "must be inspected by security", meaningVi: "phải được kiểm tra bởi đội an ninh" },
    skeleton: { subject: "All incoming packages", verb: "must be inspected", object: null }
  },
  {
    id: "pass_std_007",
    level: "standard",
    question: "The downtown convention center is currently ______ to accommodate larger international delegations.",
    options: { A: "renovating", B: "renovated", C: "being renovated", D: "renovate" },
    correctAnswer: "C",
    clue: "Trạng từ 'currently' kết hợp 'is' chỉ hành động đang diễn ra ở dạng bị động: is being + V3/ed.",
    explanationVi: "Trung tâm hội nghị 'hiện đang được tu sửa' (is currently being renovated).",
    targetChunk: { phrase: "is currently being renovated", meaningVi: "hiện đang được tu sửa" },
    skeleton: { subject: "The downtown convention center", verb: "is being renovated", object: null }
  },
  {
    id: "pass_std_008",
    level: "standard",
    question: "The keynote speaker's presentation was ______ by thunderous applause from the entire audience.",
    options: { A: "follow", B: "following", C: "followed", D: "follows" },
    correctAnswer: "C",
    clue: "Sau to be 'was' và có tác nhân 'by thunderous applause' → Bị động quá khứ đơn (was followed).",
    explanationVi: "Bài thuyết trình 'được theo sau bởi' tràng pháo tay giòn giã.",
    targetChunk: { phrase: "was followed by thunderous applause", meaningVi: "được theo sau bởi tràng pháo tay vang dội" },
    skeleton: { subject: "The presentation", verb: "was followed", object: null }
  },
  {
    id: "pass_std_009",
    level: "standard",
    question: "Free shuttle bus service ______ between the airport terminals and the hotel every fifteen minutes.",
    options: { A: "provides", B: "is provided", C: "providing", D: "provided" },
    correctAnswer: "B",
    clue: "Dịch vụ xe buýt không tự cung cấp mà 'được cung cấp' (is provided).",
    explanationVi: "Chủ ngữ là dịch vụ vô tri, diễn ra thường xuyên (every fifteen minutes) nên chia bị động hiện tại đơn.",
    targetChunk: { phrase: "is provided between airport terminals", meaningVi: "được cung cấp giữa các nhà ga sân bay" },
    skeleton: { subject: "Free shuttle bus service", verb: "is provided", object: null }
  },
  {
    id: "pass_std_010",
    level: "standard",
    question: "The regional branch manager has just ______ that the annual revenue target was met.",
    options: { A: "been notified", B: "notifying", C: "notifies", D: "notify" },
    correctAnswer: "A",
    clue: "Giám đốc chi nhánh 'được thông báo' rằng... (has just been notified that...).",
    explanationVi: "Hiện tại hoàn thành thể bị động: has/have been + V3/ed.",
    targetChunk: { phrase: "has just been notified", meaningVi: "vừa mới được thông báo" },
    skeleton: { subject: "The regional branch manager", verb: "has been notified", object: null }
  },
  {
    id: "pass_std_011",
    level: "standard",
    question: "Digital copies of the user manual can ______ directly from the official corporate website.",
    options: { A: "download", B: "downloading", C: "be downloaded", D: "downloaded" },
    correctAnswer: "C",
    clue: "Modal verb bị động: can be + V3/ed (bản hướng dẫn có thể được tải về).",
    explanationVi: "Can be downloaded: có thể được tải xuống.",
    targetChunk: { phrase: "can be downloaded directly", meaningVi: "có thể được tải xuống trực tiếp" },
    skeleton: { subject: "Digital copies of the manual", verb: "can be downloaded", object: null }
  },
  {
    id: "pass_std_012",
    level: "standard",
    question: "The damaged shipment ______ to the supplier early this morning for a complete replacement.",
    options: { A: "returned", B: "was returned", C: "returning", D: "returns" },
    correctAnswer: "B",
    clue: "Lô hàng 'đã được trả lại' nhà cung cấp sáng sớm nay (was returned).",
    explanationVi: "Hành động đã hoàn tất trong quá khứ (early this morning), chủ ngữ chịu tác động nên dùng was returned.",
    targetChunk: { phrase: "was returned to the supplier", meaningVi: "đã được trả lại cho nhà cung cấp" },
    skeleton: { subject: "The damaged shipment", verb: "was returned", object: null }
  },
  {
    id: "pass_std_013",
    level: "standard",
    question: "Customer service inquiries should ______ within twenty-four hours to maintain client satisfaction.",
    options: { A: "address", B: "addressing", C: "be addressed", D: "addressed" },
    correctAnswer: "C",
    clue: "Cấu trúc should be + V3/ed (các yêu cầu thắc mắc nên được xử lý).",
    explanationVi: "Inquiries không tự xử lý mà 'cần được xử lý' (should be addressed).",
    targetChunk: { phrase: "should be addressed within twenty-four hours", meaningVi: "nên được xử lý trong vòng 24 giờ" },
    skeleton: { subject: "Customer service inquiries", verb: "should be addressed", object: null }
  },
  {
    id: "pass_std_014",
    level: "standard",
    question: "A grand reception ______ at the Hilton Hotel to celebrate the company's silver jubilee.",
    options: { A: "will be held", B: "will hold", C: "holding", D: "holds" },
    correctAnswer: "A",
    clue: "Buổi tiệc 'sẽ được tổ chức' (will be held). Hold a reception → A reception is/will be held.",
    explanationVi: "Động từ 'hold' khi đi với sự kiện/tiệc tùng ở dạng bị động là 'be held'.",
    targetChunk: { phrase: "will be held at the Hilton Hotel", meaningVi: "sẽ được tổ chức tại khách sạn Hilton" },
    skeleton: { subject: "A grand reception", verb: "will be held", object: null }
  },
  {
    id: "pass_std_015",
    level: "standard",
    question: "All expense claims must ______ by department heads prior to submission to accounting.",
    options: { A: "sign", B: "be signed", C: "signing", D: "signed" },
    correctAnswer: "B",
    clue: "Bị động với modal 'must': must be + V3/ed (phải được ký duyệt).",
    explanationVi: "Bản kê khai chi phí phải được ký duyệt bởi trưởng bộ phận.",
    targetChunk: { phrase: "must be signed by department heads", meaningVi: "phải được ký bởi các trưởng phòng" },
    skeleton: { subject: "All expense claims", verb: "must be signed", object: null }
  },
  {
    id: "pass_std_016",
    level: "standard",
    question: "The final contract ______ by both parties late yesterday after intense negotiations.",
    options: { A: "finalized", B: "was finalized", C: "finalizing", D: "finalizes" },
    correctAnswer: "B",
    clue: "Có mốc thời gian 'yesterday' và tác nhân 'by both parties' → Bị động quá khứ đơn (was finalized).",
    explanationVi: "Hợp đồng cuối cùng đã được chốt và ký kết bởi cả hai bên.",
    targetChunk: { phrase: "was finalized by both parties", meaningVi: "đã được hoàn tất bởi cả hai bên" },
    skeleton: { subject: "The final contract", verb: "was finalized", object: null }
  },
  {
    id: "pass_std_017",
    level: "standard",
    question: "Our newly designed mobile application has already ______ over two million times worldwide.",
    options: { A: "downloaded", B: "been downloaded", C: "downloading", D: "download" },
    correctAnswer: "B",
    clue: "Ứng dụng 'đã được tải xuống' hơn 2 triệu lượt: has already been downloaded.",
    explanationVi: "Chủ ngữ là ứng dụng di động, kết hợp 'has already' → Bị động hiện tại hoàn thành: has been downloaded.",
    targetChunk: { phrase: "has already been downloaded", meaningVi: "đã được tải xuống hơn hai triệu lần" },
    skeleton: { subject: "Our application", verb: "has been downloaded", object: null }
  },
  {
    id: "pass_std_018",
    level: "standard",
    question: "Safety goggles and hard hats are ______ in all heavy manufacturing areas.",
    options: { A: "require", B: "requiring", C: "required", D: "requires" },
    correctAnswer: "C",
    clue: "Cấu trúc be required (bị bắt buộc / được yêu cầu).",
    explanationVi: "Kính bảo hộ và mũ cứng 'được yêu cầu' phải đeo trong khu vực xưởng sản xuất nặng.",
    targetChunk: { phrase: "are required in all manufacturing areas", meaningVi: "được yêu cầu trong mọi khu vực sản xuất" },
    skeleton: { subject: "Safety goggles and hard hats", verb: "are required", object: null }
  },
  {
    id: "pass_std_019",
    level: "standard",
    question: "The software glitch ______ by our senior programming team within thirty minutes.",
    options: { A: "resolved", B: "was resolved", C: "resolving", D: "resolves" },
    correctAnswer: "B",
    clue: "Lỗi phần mềm 'đã được giải quyết' bởi đội lập trình viên (was resolved by...).",
    explanationVi: "Sự cố phần mềm là vật chịu tác động, có 'by our programming team' → Bị động quá khứ đơn.",
    targetChunk: { phrase: "was resolved by our programming team", meaningVi: "đã được xử lý bởi đội lập trình" },
    skeleton: { subject: "The software glitch", verb: "was resolved", object: null }
  },
  {
    id: "pass_std_020",
    level: "standard",
    question: "New employees are ______ with a comprehensive training packet on their first day.",
    options: { A: "provide", B: "provided", C: "providing", D: "provides" },
    correctAnswer: "B",
    clue: "Cấu trúc be provided with sth (được cung cấp cái gì).",
    explanationVi: "Nhân viên mới 'được cung cấp' tập tài liệu đào tạo (are provided with).",
    targetChunk: { phrase: "are provided with a training packet", meaningVi: "được cung cấp tài liệu đào tạo" },
    skeleton: { subject: "New employees", verb: "are provided", object: "with a training packet" }
  },
  {
    id: "pass_std_021",
    level: "standard",
    question: "The corporate headquarters ______ conveniently in the central business district.",
    options: { A: "locates", B: "is located", C: "locating", D: "has located" },
    correctAnswer: "B",
    clue: "Cụm cố định chỉ vị trí: be located in/at/on (tọa lạc tại).",
    explanationVi: "Trong tiếng Anh, vị trí tòa nhà luôn dùng dạng bị động 'is located'.",
    targetChunk: { phrase: "is located conveniently", meaningVi: "tọa lạc thuận tiện" },
    skeleton: { subject: "The corporate headquarters", verb: "is located", object: null }
  },
  {
    id: "pass_std_022",
    level: "standard",
    question: "Any damaged equipment should ______ to the maintenance supervisor without delay.",
    options: { A: "report", B: "reporting", C: "be reported", D: "reported" },
    correctAnswer: "C",
    clue: "Thiết bị hỏng 'cần phải được báo cáo' (should be reported).",
    explanationVi: "Chủ ngữ là thiết bị vô tri (equipment), câu mang nghĩa bị động khuyên nhủ/bắt buộc.",
    targetChunk: { phrase: "should be reported without delay", meaningVi: "cần được báo cáo không chậm trễ" },
    skeleton: { subject: "Any damaged equipment", verb: "should be reported", object: null }
  },
  {
    id: "pass_std_023",
    level: "standard",
    question: "The candidate ______ the position of lead accountant due to her extensive experience.",
    options: { A: "offered", B: "was offered", C: "offering", D: "offers" },
    correctAnswer: "B",
    clue: "Bị động của động từ 2 tân ngữ (offer sb sth → sb was offered sth). Ứng viên 'được đề nghị' nhận vị trí.",
    explanationVi: "Ứng viên được trao vị trí công việc (was offered the position), không phải ứng viên đi tuyển người.",
    targetChunk: { phrase: "was offered the position of lead accountant", meaningVi: "được mời nhận vị trí kế toán trưởng" },
    skeleton: { subject: "The candidate", verb: "was offered", object: "the position" }
  },
  {
    id: "pass_std_024",
    level: "standard",
    question: "Passenger luggage is carefully ______ through X-ray machines prior to boarding.",
    options: { A: "scan", B: "scanned", C: "scanning", D: "scans" },
    correctAnswer: "B",
    clue: "Hành lý 'được quét cẩn thận' qua máy X-quang: is scanned.",
    explanationVi: "Sau to be 'is' và trạng từ 'carefully' là V3/ed thể hiện hành động bị động thường quy.",
    targetChunk: { phrase: "is carefully scanned through machines", meaningVi: "được quét cẩn thận qua máy soi" },
    skeleton: { subject: "Passenger luggage", verb: "is scanned", object: null }
  },
  {
    id: "pass_std_025",
    level: "standard",
    question: "Payments ______ via credit card, bank transfer, or electronic wallet.",
    options: { A: "can make", B: "can be made", C: "making", D: "makes" },
    correctAnswer: "B",
    clue: "Thanh toán 'có thể được thực hiện': can be made.",
    explanationVi: "Cụm chủ động: make a payment → Bị động: payment is/can be made.",
    targetChunk: { phrase: "Payments can be made via credit card", meaningVi: "Các khoản thanh toán có thể được thực hiện qua thẻ tín dụng" },
    skeleton: { subject: "Payments", verb: "can be made", object: null }
  },
  {
    id: "pass_std_026",
    level: "standard",
    question: "All conference attendees were ______ with an information packet and a personalized name badge.",
    options: { A: "issue", B: "issuing", C: "issued", D: "issues" },
    correctAnswer: "C",
    clue: "Người tham dự 'được cấp phát' tài liệu: were issued with sth.",
    explanationVi: "Sau 'were' là động từ V3/ed 'issued' mang nghĩa được cấp phát/trao tặng.",
    targetChunk: { phrase: "were issued with an information packet", meaningVi: "được phát tập tài liệu thông tin" },
    skeleton: { subject: "All conference attendees", verb: "were issued", object: "with an information packet" }
  },
  {
    id: "pass_std_027",
    level: "standard",
    question: "The newly hired receptionist ______ warmly by all staff members on her first morning.",
    options: { A: "greeted", B: "was greeted", C: "greeting", D: "greets" },
    correctAnswer: "B",
    clue: "Nhân viên lễ tân 'đã được chào đón nồng nhiệt' bởi các đồng nghiệp (was greeted warmly by...).",
    explanationVi: "Hành động chào đón diễn ra trong quá khứ đối với người mới đến (was greeted).",
    targetChunk: { phrase: "was greeted warmly by staff", meaningVi: "được chào đón nồng nhiệt bởi nhân viên" },
    skeleton: { subject: "The receptionist", verb: "was greeted", object: null }
  },
  {
    id: "pass_std_028",
    level: "standard",
    question: "The updated company guidelines will be ______ on the employee bulletin board by noon.",
    options: { A: "post", B: "posting", C: "posted", D: "posts" },
    correctAnswer: "C",
    clue: "Sau cấu trúc bị động tương lai 'will be' là V3/ed: will be posted (sẽ được dán/đăng).",
    explanationVi: "Bản hướng dẫn sẽ được niêm yết trên bảng thông báo nội bộ.",
    targetChunk: { phrase: "will be posted on the bulletin board", meaningVi: "sẽ được niêm yết trên bảng thông báo" },
    skeleton: { subject: "The guidelines", verb: "will be posted", object: null }
  },
  {
    id: "pass_std_029",
    level: "standard",
    question: "The shipment was ______ delayed because of customs clearance complications at the port.",
    options: { A: "unavoidable", B: "unavoidably", C: "unavoidability", D: "unavoidableness" },
    correctAnswer: "B",
    clue: "Vị trí chen giữa trợ động từ 'was' và động từ chính dạng bị động 'delayed' bắt buộc là một Trạng từ (-ly).",
    explanationVi: "Cấu trúc kẹp: Be + [Adv] + V3/ed → chọn 'unavoidably' (một cách không thể tránh khỏi).",
    targetChunk: { phrase: "was unavoidably delayed", meaningVi: "đã bị trì hoãn một cách bất khả kháng" },
    skeleton: { subject: "The shipment", verb: "was delayed", object: null }
  },
  {
    id: "pass_std_030",
    level: "standard",
    question: "Visitors are strictly ______ from entering the construction zone without authorized escorts.",
    options: { A: "prohibit", B: "prohibiting", C: "prohibited", D: "prohibition" },
    correctAnswer: "C",
    clue: "Cấu trúc bị động: be prohibited from doing sth (bị nghiêm cấm làm gì).",
    explanationVi: "Khách tham quan 'bị cấm' đi vào khu vực công trường nếu không có người hộ tống.",
    targetChunk: { phrase: "are strictly prohibited from entering", meaningVi: "bị nghiêm cấm vào" },
    skeleton: { subject: "Visitors", verb: "are prohibited", object: null }
  }
];

// 27 câu Advanced mới (pass_adv_004 đến pass_adv_030)
const newAdvancedQuestions = [
  {
    id: "pass_adv_004",
    level: "advanced",
    question: "The mechanical malfunction ______ during routine maintenance rather than during operating hours.",
    options: { A: "was occurred", B: "occurred", C: "has been occurred", D: "is occurred" },
    correctAnswer: "B",
    clue: "BẪY 990 NỘI ĐỘNG TỪ: 'occur' là nội động từ, TUYỆT ĐỐI KHÔNG BAO GIỜ chia ở thể bị động!",
    explanationVi: "Các nội động từ như occur, happen, appear, arrive, exist, disappear không bao giờ có dạng 'be + V3/ed'. Chọn chủ động 'occurred'.",
    targetChunk: { phrase: "malfunction occurred during routine maintenance", meaningVi: "sự cố kỹ thuật đã xảy ra trong lúc bảo trì" },
    skeleton: { subject: "The mechanical malfunction", verb: "occurred", object: null }
  },
  {
    id: "pass_adv_005",
    level: "advanced",
    question: "Despite substantial currency fluctuations, raw material costs have ______ relatively steady this quarter.",
    options: { A: "remained", B: "been remained", C: "remaining", D: "were remained" },
    correctAnswer: "A",
    clue: "BẪY NỘI ĐỘNG TỪ / LINKING VERB: 'remain' không bao giờ chia bị động (không có 'been remained').",
    explanationVi: "'remain' là động từ liên kết / nội động từ chỉ trạng thái, không nhận tân ngữ nên không thể chia bị động.",
    targetChunk: { phrase: "have remained relatively steady", meaningVi: "vẫn duy trì tương đối ổn định" },
    skeleton: { subject: "raw material costs", verb: "have remained", object: null }
  },
  {
    id: "pass_adv_006",
    level: "advanced",
    question: "After five rounds of rigorous interviews, Ms. Chen was ______ the position of vice president.",
    options: { A: "granted", B: "granting", C: "grant", D: "grants" },
    correctAnswer: "A",
    clue: "Bị động của động từ 2 tân ngữ (grant sb sth → sb is granted sth).",
    explanationVi: "Bà Chen 'được trao cho' chức vụ phó chủ tịch. Phía sau vẫn có tân ngữ danh từ 'the position' nhưng câu là bị động.",
    targetChunk: { phrase: "was granted the position of vice president", meaningVi: "được trao cho chức vụ phó chủ tịch" },
    skeleton: { subject: "Ms. Chen", verb: "was granted", object: "the position of vice president" }
  },
  {
    id: "pass_adv_007",
    level: "advanced",
    question: "It is widely ______ that continuous employee upskilling directly improves retention rates.",
    options: { A: "believe", B: "believed", C: "believing", D: "believes" },
    correctAnswer: "B",
    clue: "Cấu trúc bị động khách quan với chủ ngữ giả 'It': It is believed/acknowledged that + S + V.",
    explanationVi: "Cấu trúc câu tường thuật bị động khách quan: It + is + V3/ed + that... (Người ta tin rằng / Được tin rằng...).",
    targetChunk: { phrase: "It is widely believed that", meaningVi: "Nhiều người tin tưởng rằng" },
    skeleton: { subject: "It", verb: "is believed", object: "that upskilling improves retention" }
  },
  {
    id: "pass_adv_008",
    level: "advanced",
    question: "The senior researcher was awarded a patent ______ the innovative solar panel design.",
    options: { A: "for", B: "to", C: "by", D: "with" },
    correctAnswer: "A",
    clue: "Bị động đi kèm giới từ: be awarded sth FOR sth (được trao giải thưởng/bằng sáng chế vì điều gì).",
    explanationVi: "Cấu trúc 'award sb sth for sth' khi chuyển sang bị động sẽ là 'be awarded sth for sth'.",
    targetChunk: { phrase: "was awarded a patent for the design", meaningVi: "được trao bằng sáng chế cho mẫu thiết kế" },
    skeleton: { subject: "The senior researcher", verb: "was awarded", object: "a patent" }
  },
  {
    id: "pass_adv_009",
    level: "advanced",
    question: "Unexpected logistical complications ______ when the major freight corridor was temporarily closed.",
    options: { A: "arose", B: "were arisen", C: "have been arisen", D: "arising" },
    correctAnswer: "A",
    clue: "BẪY NỘI ĐỘNG TỪ: 'arise' (phát sinh) là nội động từ, KHÔNG BAO GIỜ chia bị động!",
    explanationVi: "Arise - arose - arisen là nội động từ chỉ sự phát sinh/nảy sinh, luôn chia ở thể chủ động (arose).",
    targetChunk: { phrase: "logistical complications arose", meaningVi: "các trục trặc về vận chuyển đã phát sinh" },
    skeleton: { subject: "Unexpected complications", verb: "arose", object: null }
  },
  {
    id: "pass_adv_010",
    level: "advanced",
    question: "The company's groundbreaking electric vehicle was hailed ______ a monumental breakthrough in mobility.",
    options: { A: "as", B: "for", C: "to", D: "at" },
    correctAnswer: "A",
    clue: "Cấu trúc bị động: be hailed as sth (được ca ngợi / hoan nghênh như là một...).",
    explanationVi: "Hail A as B → A is hailed as B. 'hail as' là collocation điểm cao trong bài thi Reading Part 5.",
    targetChunk: { phrase: "was hailed as a monumental breakthrough", meaningVi: "được ca ngợi như một bước đột phá vĩ đại" },
    skeleton: { subject: "The electric vehicle", verb: "was hailed as", object: "a monumental breakthrough" }
  },
  {
    id: "pass_adv_011",
    level: "advanced",
    question: "The board members were unanimous in demanding that the proposal ______ immediately.",
    options: { A: "reconsiders", B: "be reconsidered", C: "is reconsidered", D: "reconsidering" },
    correctAnswer: "B",
    clue: "Bẫy Thức Giả Định kết hợp Thể Bị Động: demand that + S + [should] + BE + V3/ed.",
    explanationVi: "Sau 'demand that', động từ ở mệnh đề phụ phải ở dạng nguyên mẫu không 'to'. Ở thể bị động là 'be reconsidered'.",
    targetChunk: { phrase: "demanding that proposal be reconsidered", meaningVi: "yêu cầu bản đề xuất phải được xem xét lại" },
    skeleton: { subject: "The board members", verb: "were unanimous in demanding", object: "that the proposal be reconsidered" }
  },
  {
    id: "pass_adv_012",
    level: "advanced",
    question: "No hazardous chemicals are allowed to ______ on the manufacturing floor overnight.",
    options: { A: "leave", B: "be left", C: "leaving", D: "left" },
    correctAnswer: "B",
    clue: "Bẫy bị động sau To-V: allow sb to do sth → sth is allowed TO BE + V3/ed.",
    explanationVi: "Hóa chất độc hại không được phép 'bị bỏ lại' (to be left) qua đêm.",
    targetChunk: { phrase: "allowed to be left on the floor", meaningVi: "được phép bị để lại trên sàn xưởng" },
    skeleton: { subject: "No hazardous chemicals", verb: "are allowed", object: "to be left" }
  },
  {
    id: "pass_adv_013",
    level: "advanced",
    question: "Employees expressed immense frustration at ______ of the branch closure through social media.",
    options: { A: "informing", B: "being informed", C: "inform", D: "informed" },
    correctAnswer: "B",
    clue: "Bẫy bị động sau giới từ: at + being + V3/ed (bực bội vì BỊ thông báo qua mạng xã hội thay vì nội bộ).",
    explanationVi: "Sau giới từ 'at' cần V-ing, kết hợp nghĩa bị động (nhân viên là đối tượng được/bị báo tin) → 'being informed'.",
    targetChunk: { phrase: "frustration at being informed", meaningVi: "sự bức xúc khi bị thông báo qua mạng xã hội" },
    skeleton: { subject: "Employees", verb: "expressed", object: "immense frustration" }
  },
  {
    id: "pass_adv_014",
    level: "advanced",
    question: "The newly installed cooling towers are scheduled to ______ operational by early November.",
    options: { A: "become", B: "be become", C: "been become", D: "became" },
    correctAnswer: "A",
    clue: "Bẫy nội động từ 'become': 'become' không chia bị động, chỉ dùng dạng nguyên thể 'to become operational'.",
    explanationVi: "Cấu trúc be scheduled to do sth. 'Become' là linking verb, không bao giờ chia 'be become'.",
    targetChunk: { phrase: "scheduled to become operational", meaningVi: "dự kiến sẽ đi vào hoạt động" },
    skeleton: { subject: "The cooling towers", verb: "are scheduled", object: "to become operational" }
  },
  {
    id: "pass_adv_015",
    level: "advanced",
    question: "The international courier service is renowned ______ its expedited customs clearance procedures.",
    options: { A: "as", B: "with", C: "for", D: "by" },
    correctAnswer: "C",
    clue: "Tính từ/phân từ bị động đi với giới từ cố định: be renowned FOR sth (nổi tiếng vì điều gì).",
    explanationVi: "be renowned for = be famous for / be celebrated for: nổi danh về cái gì.",
    targetChunk: { phrase: "is renowned for its expedited customs clearance", meaningVi: "nổi tiếng với thủ tục thông quan hỏa tốc" },
    skeleton: { subject: "The courier service", verb: "is renowned", object: "for its procedures" }
  },
  {
    id: "pass_adv_016",
    level: "advanced",
    question: "Several confidential blueprints were discovered ______ in an unlocked storage room.",
    options: { A: "hidden", B: "hide", C: "hiding", D: "hid" },
    correctAnswer: "A",
    clue: "Cấu trúc bị động: be discovered + V-ed/Adj (được phát hiện trong tình trạng bị giấu đi).",
    explanationVi: "Bản vẽ được phát hiện 'trong tình trạng bị cất giấu' (hidden).",
    targetChunk: { phrase: "were discovered hidden in a storage room", meaningVi: "được phát hiện đang bị giấu trong phòng kho" },
    skeleton: { subject: "Several confidential blueprints", verb: "were discovered", object: "hidden" }
  },
  {
    id: "pass_adv_017",
    level: "advanced",
    question: "The CEO had the executive boardroom ______ with state-of-the-art teleconferencing equipment.",
    options: { A: "outfit", B: "outfitted", C: "outfitting", D: "outfits" },
    correctAnswer: "B",
    clue: "Cấu trúc Thể Sai Khiến Bị Động: have + sth (vật) + V3/ed (thuê/bố trí cái gì được trang bị).",
    explanationVi: "Have sth outfitted with sth: trang bị cho phòng họp thiết bị tối tân.",
    targetChunk: { phrase: "had the boardroom outfitted with equipment", meaningVi: "cho phòng họp được trang bị thiết bị tối tân" },
    skeleton: { subject: "The CEO", verb: "had", object: "the executive boardroom outfitted" }
  },
  {
    id: "pass_adv_018",
    level: "advanced",
    question: "Unless ______ instructed by the safety inspector, do not re-enter the production wing.",
    options: { A: "otherwise", B: "other", C: "anyway", D: "instead" },
    correctAnswer: "A",
    clue: "Cụm rút gọn bị động kinh điển TOEIC 990: 'Unless otherwise instructed/stated/notified' (Trừ khi có chỉ dẫn khác).",
    explanationVi: "Trạng từ 'otherwise' (khác đi) đứng trước phân từ bị động 'instructed'.",
    targetChunk: { phrase: "Unless otherwise instructed", meaningVi: "Trừ khi có hướng dẫn khác" },
    skeleton: { subject: "(You)", verb: "do not re-enter", object: "the production wing" }
  },
  {
    id: "pass_adv_019",
    level: "advanced",
    question: "The software upgrade was completed well ______ schedule, impressing the corporate steering committee.",
    options: { A: "beforehand", B: "ahead of", C: "prior", D: "in advance" },
    correctAnswer: "B",
    clue: "Collocation bị động kết hợp thời gian: be completed ahead of schedule (được hoàn thành trước thời hạn).",
    explanationVi: "ahead of schedule là cụm giới từ cố định mang nghĩa 'trước tiến độ/thời hạn'.",
    targetChunk: { phrase: "was completed ahead of schedule", meaningVi: "được hoàn thành trước thời hạn" },
    skeleton: { subject: "The software upgrade", verb: "was completed", object: "ahead of schedule" }
  },
  {
    id: "pass_adv_020",
    level: "advanced",
    question: "The corporate restructuring plan was ______ by industry analysts as a prudent defensive maneuver.",
    options: { A: "regarded", B: "regarding", C: "regards", D: "regard" },
    correctAnswer: "A",
    clue: "Cấu trúc bị động: be regarded as sth (được xem như là một...).",
    explanationVi: "Kế hoạch tái cấu trúc 'được coi là' một bước đi phòng thủ thận trọng.",
    targetChunk: { phrase: "was regarded as a prudent maneuver", meaningVi: "được xem như một nước đi thận trọng" },
    skeleton: { subject: "The restructuring plan", verb: "was regarded", object: "as a prudent maneuver" }
  },
  {
    id: "pass_adv_021",
    level: "advanced",
    question: "All sensitive data must be securely deleted so that it cannot be ______ by unauthorized intruders.",
    options: { A: "retrieved", B: "retrieve", C: "retrieving", D: "retrieval" },
    correctAnswer: "A",
    clue: "Sau modal bị động 'cannot be' bắt buộc là V3/ed: cannot be retrieved (không thể bị truy xuất).",
    explanationVi: "Dữ liệu không thể 'bị khôi phục/truy xuất' bởi những kẻ xâm nhập bất hợp pháp.",
    targetChunk: { phrase: "cannot be retrieved by intruders", meaningVi: "không thể bị khôi phục bởi kẻ đột nhập" },
    skeleton: { subject: "it", verb: "cannot be retrieved", object: null }
  },
  {
    id: "pass_adv_022",
    level: "advanced",
    question: "The construction project is expected to be ______ within the allocated seventy-million-dollar budget.",
    options: { A: "finish", B: "finished", C: "finishing", D: "finishes" },
    correctAnswer: "B",
    clue: "Bị động sau To-V: is expected to be + V3/ed (dự kiến sẽ được hoàn thành).",
    explanationVi: "Dự án xây dựng là vật được mong đợi hoàn thành: to be finished.",
    targetChunk: { phrase: "expected to be finished within budget", meaningVi: "dự kiến được hoàn thành trong ngân sách" },
    skeleton: { subject: "The construction project", verb: "is expected", object: "to be finished" }
  },
  {
    id: "pass_adv_023",
    level: "advanced",
    question: "The defective shipment of circuit boards was immediately ______ to the manufacturing depot.",
    options: { A: "re-routed", B: "re-routing", C: "re-route", D: "re-routes" },
    correctAnswer: "A",
    clue: "Cấu trúc kẹp: was + [Adv: immediately] + [V3/ed: re-routed]. Lô hàng 'được chuyển hướng lập tức'.",
    explanationVi: "Trạng từ 'immediately' đứng giữa 'was' và V3/ed 're-routed'.",
    targetChunk: { phrase: "was immediately re-routed to the depot", meaningVi: "được chuyển hướng ngay về kho sản xuất" },
    skeleton: { subject: "The defective shipment", verb: "was re-routed", object: null }
  },
  {
    id: "pass_adv_024",
    level: "advanced",
    question: "The regional director was ______ with organizing the upcoming Asia-Pacific symposium.",
    options: { A: "tasked", B: "tasking", C: "task", D: "tasks" },
    correctAnswer: "A",
    clue: "Cấu trúc bị động giao việc: be tasked with + V-ing (được giao nhiệm vụ làm gì).",
    explanationVi: "Task sb with sth → sb is tasked with sth (ai đó được giao phó trọng trách gì).",
    targetChunk: { phrase: "was tasked with organizing the symposium", meaningVi: "được giao nhiệm vụ tổ chức hội nghị chuyên đề" },
    skeleton: { subject: "The regional director", verb: "was tasked", object: "with organizing the symposium" }
  },
  {
    id: "pass_adv_025",
    level: "advanced",
    question: "The revised zoning ordinance is subject ______ approval by the municipal development board.",
    options: { A: "to", B: "for", C: "with", D: "in" },
    correctAnswer: "A",
    clue: "Cụm cố định cực kỳ phổ biến ở hợp đồng TOEIC: be subject TO + Noun/V-ing (phải chịu sự phê duyệt của ai).",
    explanationVi: "be subject to approval: phải chờ được phê chuẩn.",
    targetChunk: { phrase: "is subject to approval by the board", meaningVi: "phải chờ hội đồng phê duyệt" },
    skeleton: { subject: "The revised ordinance", verb: "is", object: "subject to approval" }
  },
  {
    id: "pass_adv_026",
    level: "advanced",
    question: "The company's initial public offering was ______ oversubscribed within two hours of opening.",
    options: { A: "heavy", B: "heavily", C: "heaviness", D: "heavier" },
    correctAnswer: "B",
    clue: "Trạng từ bổ nghĩa cho tính từ phân từ bị động 'oversubscribed' (được đăng ký mua vượt mức).",
    explanationVi: "Heavily oversubscribed là cụm collocation tài chính cao cấp mang nghĩa 'lượng đặt mua vượt quá cung rất nhiều'.",
    targetChunk: { phrase: "was heavily oversubscribed", meaningVi: "được đặt mua vượt mức kỷ lục" },
    skeleton: { subject: "The initial public offering", verb: "was oversubscribed", object: null }
  },
  {
    id: "pass_adv_027",
    level: "advanced",
    question: "The senior partner was ______ of insider trading following an exhaustive regulatory inquiry.",
    options: { A: "exonerated", B: "exonerating", C: "exonerate", D: "exonerates" },
    correctAnswer: "A",
    clue: "Cấu trúc bị động: be exonerated of/from sth (được tuyên bố trắng án / được minh oan khỏi tội gì).",
    explanationVi: "Vị thành viên cấp cao 'được minh oan' khỏi cáo buộc giao dịch nội gián sau cuộc thanh tra.",
    targetChunk: { phrase: "was exonerated of insider trading", meaningVi: "đã được tuyên bố vô tội về giao dịch nội gián" },
    skeleton: { subject: "The senior partner", verb: "was exonerated", object: "of insider trading" }
  },
  {
    id: "pass_adv_028",
    level: "advanced",
    question: "The newly renovated auditorium is equipped ______ state-of-the-art acoustic panels.",
    options: { A: "by", B: "for", C: "with", D: "in" },
    correctAnswer: "C",
    clue: "Cụm bị động đi với giới từ cố định: be equipped WITH sth (được trang bị cái gì).",
    explanationVi: "Hội trường 'được trang bị các tấm cách âm hiện đại' (is equipped with).",
    targetChunk: { phrase: "is equipped with state-of-the-art panels", meaningVi: "được trang bị các tấm cách âm tối tân" },
    skeleton: { subject: "The auditorium", verb: "is equipped", object: "with state-of-the-art acoustic panels" }
  },
  {
    id: "pass_adv_029",
    level: "advanced",
    question: "Had the safety warning been ______, the catastrophic refinery fire could have been prevented.",
    options: { A: "heed", B: "heeded", C: "heeding", D: "heeds" },
    correctAnswer: "B",
    clue: "Đảo ngữ câu điều kiện loại 3 dạng bị động: Had + S + been + V3/ed (Nếu cảnh báo an toàn được để ý lắng nghe).",
    explanationVi: "'heed' nghĩa là để tâm, chú ý lắng nghe lời cảnh báo. Dạng bị động trong đảo ngữ là 'been heeded'.",
    targetChunk: { phrase: "Had the warning been heeded", meaningVi: "Giá như lời cảnh báo đã được chú ý lắng nghe" },
    skeleton: { subject: "the fire", verb: "could have been prevented", object: null }
  },
  {
    id: "pass_adv_030",
    level: "advanced",
    question: "The pharmaceutical patent is deemed ______ expired, allowing generic production to commence.",
    options: { A: "having", B: "to have", C: "have", D: "had" },
    correctAnswer: "B",
    clue: "Cấu trúc bị động nâng cao: be deemed TO HAVE + V3/ed (được coi là đã hết hạn).",
    explanationVi: "Deem sth to do/have done sth → sth is deemed to have expired (bằng sáng chế được phán quyết là đã hết hạn).",
    targetChunk: { phrase: "is deemed to have expired", meaningVi: "được coi là đã hết hạn hiệu lực" },
    skeleton: { subject: "The pharmaceutical patent", verb: "is deemed", object: "to have expired" }
  }
];

const existingStd = existingData.questions.filter(q => q.level === 'standard');
const existingAdv = existingData.questions.filter(q => q.level === 'advanced');

const allQuestions = [...existingStd, ...newStandardQuestions, ...existingAdv, ...newAdvancedQuestions];

existingData.questions = allQuestions;

fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
console.log('passive_voice.json updated! Total questions:', allQuestions.length);
console.log('Standard:', allQuestions.filter(q => q.level === 'standard').length);
console.log('Advanced:', allQuestions.filter(q => q.level === 'advanced').length);
