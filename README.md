# 🎧 TOEIC Chunk Trainer — Luyện Phản Xạ Tiếng Anh Toàn Diện Bằng Phương Pháp Chunking & AI

> **Dự án**: `TOEIC Chunk Trainer` (Package: `speaking_chunk`)  
> **Sứ mệnh**: Giúp người học tiếng Anh xóa bỏ hoàn toàn thói quen "dịch từng từ trong đầu" (word-by-word), tự tin đạt điểm cao TOEIC Listening & Reading cũng như làm chủ phản xạ giao tiếp tự nhiên trong công việc thông qua **Phương pháp Chunking khoa học**, kết hợp **Hệ sinh thái Trí tuệ Nhân tạo Đa phương thức (Multimodal AI)** và **Thuật toán lặp lại ngắt quãng (Spaced Repetition System - SM-2)**.

---

## 📑 MỤC LỤC HỆ THỐNG

1. [Tổng quan Triết lý & Các Vấn đề Cố hữu](#1-tổng-quan-triết-lý--các-vấn-đề-cố-hữu)
2. [Chi Tiết 7 Phương Pháp Học Đột Phá](#2-chi-tiết-7-phương-pháp-học-đột-phá)
   - [2.1 Phương pháp 1: Chunking Method (Khối ngôn ngữ & Collocations)](#21-phương-pháp-1-chunking-method-khối-ngôn-ngữ--collocations)
   - [2.2 Phương pháp 2: Active Recall Dictation (Chép chính tả & Luyện nghe 4 chế độ)](#22-phương-pháp-2-active-recall-dictation-chép-chính-tả--luyện-nghe-4-chế-độ)
   - [2.3 Phương pháp 3: Flashcard 3D & Ải Kiểm Tra Chính Tả 2 Giai Đoạn (Dot Masking)](#23-phương-pháp-3-flashcard-3d--ải-kiểm-tra-chính-tả-2-giai-đoạn-dot-masking)
   - [2.4 Phương pháp 4: Scaffolding Translation (Luyện dịch câu bậc thang 3 cấp độ)](#24-phương-pháp-4-scaffolding-translation-luyện-dịch-câu-bậc-thang-3-cấp-độ)
   - [2.5 Phương pháp 5: AI Conversational Roleplay & Thẩm Định Phát Âm Cấp Độ 2](#25-phương-pháp-5-ai-conversational-roleplay--thẩm-định-phát-âm-cấp-độ-2)
   - [2.6 Phương pháp 6: Spaced Repetition (SRS SM-2, Level Map Track A/B & 4 Khung Giờ Vàng)](#26-phương-pháp-6-spaced-repetition-srs-sm-2-level-map-track-ab--4-khung-giờ-vàng)
   - [2.7 Phương pháp 7: Grammar Chunking qua Đọc Hiểu Part 5 & 6 (`Reading Lab`)](#27-phương-pháp-7-grammar-chunking-qua-đọc-hiểu-part-5--6-reading-lab)
3. [Kho Học Liệu Thực Chiến Tích Hợp Sẵn](#3-kho-học-liệu-thực-chiến-tích-hợp-sẵn)
   - [3.1 Lộ trình Hackers TOEIC 30 Ngày (30-Day Intensive Roadmap)](#31-lộ-trình-hackers-toeic-30-ngày-30-day-intensive-roadmap)
   - [3.2 Kho 5000 Từ Vựng Cốt Lõi Phân Theo 12+ Chủ Đề](#32-kho-5000-từ-vựng-cốt-lõi-phân-theo-12-chủ-đề)
   - [3.3 Kho Transcript Hội Thoại TOEIC Part 3 & Bài Nói Part 4](#33-kho-transcript-hội-thoại-toeic-part-3--bài-nói-part-4)
4. [Kiến trúc Công nghệ (Tech Stack)](#4-kiến-trúc-công-nghệ-tech-stack)
5. [Cấu trúc Thư mục Codebase](#5-cấu-trúc-thư-mục-codebase)
6. [Mô hình Dữ liệu (Data Model)](#6-mô-hình-dữ-liệu-data-model)
7. [Hướng dẫn Cài đặt & Khởi chạy](#7-hướng-dẫn-cài-đặt--khởi-chạy)
8. [Trạng thái Phát triển & Roadmap](#8-trạng-thái-phát-triển--roadmap)

---

## 1. Tổng quan Triết lý & Các Vấn đề Cố hữu

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TỪ TƯ DUY RỜI RẠC ĐẾN PHẢN XẠ NGUYÊN KHỐI                       │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ ❌ CÁCH HỌC TRUYỀN THỐNG (Word-by-Word)   │  CƠ CHẾ CHUNKING CỦA TOEIC CHUNK TRAINER  │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Học từ đơn lẻ: submit, proposal, board  │ • Nạp cụm: "submit a proposal to the board"│
│ • Khi nói: Phải nghĩ từ vựng -> nghĩ ngữ  │ • Khi nói: Kích hoạt nguyên khối tự nhiên  │
│   pháp -> ghép từng từ lại -> ngắc ngứ.   │   không cần dừng lại chia thì hay giới từ. │
│ • Luyện nghe thụ động: Chỉ đọc transcript │ • Luyện nghe chủ động: Dictation từng từ   │
│   hoặc nghe lướt, không bắt được âm đuôi. │   với phím tắt thông minh và blind audio.  │
│ • Luyện phát âm qua Speech-to-Text chữ:   │ • Chấm âm thanh đa phương thức bằng AI:    │
│   Máy tự động sửa từ sai thành đúng.      │   Chỉ rõ lỗi nuốt âm đuôi /t/, /d/, /s/.   │
│ • Quên 80% kiến thức sau 48 giờ học.      │ • Thuật toán SRS SM-2 nhắc đúng khung giờ. │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Chi Tiết 7 Phương Pháp Học Đột Phá

Hệ thống tích hợp **7 phương pháp học tập khoa học** được liên kết chặt chẽ thành một chu trình khép kín: **Nạp nguyên liệu $\rightarrow$ Tiêu hóa & Thấu hiểu $\rightarrow$ Chuyển hóa thành phản xạ chủ động $\rightarrow$ Khắc sâu dài hạn**.

```
                   ┌──────────────────────────────────────────────┐
                   │           1. NẠP NGUYÊN LIỆU ĐẦU VÀO         │
                   │ • Hackers TOEIC 30 Ngày  • 5000 Từ Cốt Lõi   │
                   │ • Đề thi Part 3/4/5/6    • Flashcard 3D      │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │           2. PHƯƠNG PHÁP CHUNKING            │
                   │ Bóc tách Collocations, Functional Phrases    │
                   │ và Discourse Connectors theo ngữ cảnh chuẩn  │
                   └──────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│     3. LUYỆN NGHE & DICTATION         │   │     4. LUYỆN VIẾT BẬC THANG           │
│ • Blind Listening (Che chữ)           │   │ • 3 Cấp độ thử thách (Dễ -> Khó)      │
│ • Phím tắt Ctrl (lùi 3s) & Shift      │   │ • Phím Tab chuyển câu siêu tốc        │
│ • Giọng đọc Neural 4 accent ETS       │   │ • AI Batch Grading phân tích lỗi      │
└───────────────────┬───────────────────┘   └───────────────────┬───────────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │     5. LUYỆN NÓI GIAO TIẾP & THẨM ĐỊNH IPA   │
                   │ • AI Conversational Roleplay (Nhập vai 1-1)  │
                   │ • Chấm phát âm Cấp độ 2 qua Gemini Audio     │
                   │ • Word Inspector soi từng âm vị /s/, /t/, /ed│
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │     6. LẶP LẠI NGẮT QUÃNG (SRS SM-2)         │
                   │ • Track A / Track B phân tầng trí nhớ        │
                   │ • Tái sử dụng 100% câu cũ (Tiết kiệm quota)  │
                   │ • Thông báo đẩy Web Push 4 khung giờ vàng    │
                   └──────────────────────────────────────────────┘
```

---

### 2.1 Phương pháp 1: Chunking Method (Khối ngôn ngữ & Collocations)

- **Cơ sở khoa học**: Theo nghiên cứu của GS. Michael Lewis (*The Lexical Approach*), ngôn ngữ tự nhiên không được cấu thành từ ngữ pháp và từ vựng riêng rẽ, mà gồm hàng ngàn **cụm từ định sẵn (pre-fabricated chunks)**. Người bản xứ giao tiếp trôi chảy vì họ kích hoạt các khối ngôn ngữ này từ bộ nhớ ngắn hạn thay vì tự ghép từ mới từ đầu.
- **Cách thức vận hành trong app**:
  - Tự động trích xuất các cụm từ đắt giá từ transcript bài thi và từ vựng.
  - Phân loại chunk chuẩn mực:
    - **Collocations (Cụm kết hợp tự nhiên)**: Ví dụ: *make a reservation*, *conduct an investigation*, *meet the deadline*.
    - **Functional Phrases (Cụm chức năng giao tiếp)**: Ví dụ: *Would you mind if I...*, *I would like to inquire about...*.
    - **Discourse Connectors (Cụm liên kết tư duy)**: Ví dụ: *in addition to*, *with regard to*, *as a consequence of*.
  - Người học không học từ đơn lẻ mà học thuộc lòng cả cụm kèm nghĩa tiếng Việt, câu gốc và câu ứng dụng thực tế.

---

### 2.2 Phương pháp 2: Active Recall Dictation (Chép chính tả & Luyện nghe 4 chế độ)

- **Mục tiêu**: Phá vỡ rào cản nghe thụ động (nghe nhưng trôi tuột, không hiểu chi tiết), giải quyết hiện tượng "nuốt âm" (*connected speech*), nối âm (*linking sounds*) và biến âm trong đề thi TOEIC thật.
- **4 Chế độ luyện nghe chuyên sâu**:
  1. **Chế độ Bình thường (Normal)**: Nghe toàn diện với script song ngữ, highlight các cụm chunk trọng tâm.
  2. **Chế độ Che chữ (Blind Listening)**: Lời thoại bị che mờ hoàn toàn để người học tập trung 100% bằng tai. Sau khi câu phát xong, chữ tự động mở ra để đối chiếu xem tai mình bắt âm có chính xác hay không.
  3. **Chế độ Chép chính tả (Dictation)**: Từng từ trong câu bị ẩn thành các chấm tròn `••••••`. Người học nghe và gõ từng từ vào ô nhập liệu:
     - Gõ đúng từ nào $\rightarrow$ Từ đó lập tức sáng xanh và cố định vị trí.
     - Phím tắt <kbd>Ctrl</kbd>: Tua lùi lại 3 giây ngay lập tức để nghe lại âm thanh mà không cần nhấc tay khỏi bàn phím (hoạt động kể cả khi con trỏ đang trong ô gõ).
     - Phím tắt <kbd>Shift</kbd>: Gợi ý mở từ khó tiếp theo (thuật toán tự động phân biệt khi người dùng gõ hoa `Shift + Ký tự` để không bị kích hoạt nhầm).
  4. **Chế độ Chỉ hiện Chunk (Chunk Focus)**: Chỉ hiển thị các cụm từ then chốt để rèn phản xạ bắt "keyword" khi làm bài thi TOEIC Part 3/4.
- **Giọng đọc AI Neural chuẩn ETS**: Tự động nhận diện nhiều nhân vật hội thoại (Speaker 1, Speaker 2,...), gán đúng giới tính và accent (Mỹ, Anh, Úc, Canada) với nhịp đọc rõ ràng, tự nhiên và 100% không bị méo tiếng.

---

### 2.3 Phương pháp 3: Flashcard 3D & Ải Kiểm Tra Chính Tả 2 Giai Đoạn (Dot Masking)

Phương pháp học từ vựng được nâng cấp thành **Quy trình 2 ải liên hoàn** nhằm ngăn chặn việc "nhận thức ảo" (người học tưởng mình đã thuộc từ khi nhìn flashcard, nhưng thực tế khi viết hoặc nói thì không nhớ ra mặt chữ):

```
┌───────────────────────────────────┐     Bấm "Đã thuộc"     ┌───────────────────────────────────┐
│        ẢI 1: FLASHCARD 3D         │ ─────────────────────> │     ẢI 2: THỬ THÁCH CHÍNH TẢ      │
│ • Lật 2 mặt trực quan             │                        │ • Ẩn từ thành các chấm ●●●●●      │
│ • Xem phiên âm IPA, loại từ, audio│                        │ • Bắt buộc gõ đúng 100% mặt chữ   │
│ • Câu ví dụ & nghĩa tiếng Việt    │                        │ • Chuẩn hóa dấu tự động (resume)  │
└───────────────────────────────────┘                        └───────────────────────────────────┘
```

1. **Ải 1 — Flashcard 3D Không Gian Chiều**:
   - **Mặt trước**: Hiển thị từ vựng tiếng Anh, phiên âm quốc tế IPA, từ loại (`noun`, `verb`, `adj`,...), nút loa phát âm âm thanh bản xứ chân thực.
   - **Mặt sau**: Định nghĩa tiếng Việt chuẩn, gia đình từ (*word family*), collocations hay gặp trong bài thi TOEIC và câu ví dụ minh họa ngữ cảnh.
   - Người học tự đánh giá: **"Chưa thuộc"** (thẻ sẽ được giữ lại để ôn tiếp) hoặc **"Đã thuộc"**.
2. **Ải 2 — Thử Thách Gõ Chính Tả Bắt Buộc (Dot Masking Active Spelling Recall)**:
   - Khi bấm "Đã thuộc", hệ thống **không cho qua từ mới ngay** mà kích hoạt ải kiểm tra trí nhớ truy xuất chủ động (*Active Retrieval*).
   - Từ vựng bị ẩn đi và thay thế bằng hàng chấm tròn màu sắc tương ứng với số lượng ký tự (ví dụ từ `invest` sẽ hiển thị `●●●●●●`).
   - Người học gõ bàn phím: Ký tự gõ đúng sẽ mở ra tại vị trí tương ứng. Chỉ khi gõ chính xác 100% mặt chữ thì hệ thống mới chúc mừng và mở khóa từ tiếp theo.
   - **Thuật toán Chuẩn Hóa Ký Tự (`stripAccents`)**: Tự động loại bỏ rào cản ký tự đặc biệt/mượn tiếng Pháp (ví dụ: từ `résumé` trong đề thi TOEIC người học gõ `resume` không dấu vẫn được công nhận chính xác tuyệt đối).

---

### 2.4 Phương pháp 4: Scaffolding Translation (Luyện dịch câu bậc thang 3 cấp độ)

- **Cơ sở sư phạm**: Kỹ thuật giàn giáo (*Instructional Scaffolding*) của nhà tâm lý học Lev Vygotsky. Não bộ người học tiếp cận cụm từ từ dễ đến khó, giúp xây dựng sự tự tin và phản xạ ngữ pháp tự nhiên.
- **3 Cấp độ Thử thách**:
  - **★ Cấp 1 (Cơ bản)**: Câu đơn ngắn ($\le 10$ từ), 1 mệnh đề, thì Hiện tại đơn / Quá khứ đơn, 0–2 gợi ý từ vựng.
  - **★★ Cấp 2 (Trung cấp)**: Câu 10–15 từ, có mệnh đề trạng ngữ chỉ thời gian/nguyên nhân, thì Hiện tại hoàn thành / Bị động, 2–3 gợi ý từ vựng.
  - **★★★ Cấp 3 (Nâng cao)**: Câu ghép 15–20 từ, cấu trúc câu phức với Mệnh đề quan hệ, Đảo ngữ hoặc Câu điều kiện, 4–5 gợi ý từ vựng.
- **Tối ưu hóa thao tác với phím <kbd>Tab</kbd>**:
  - Gõ xong câu 1, nhấn <kbd>Tab</kbd> $\rightarrow$ Con trỏ tự động nhảy xuống câu 2, màn hình cuộn mượt vào tầm nhìn.
  - Nhấn <kbd>Shift + Tab</kbd> $\rightarrow$ Quay lại câu trước.
  - Nhấn <kbd>Enter</kbd> $\rightarrow$ Đóng/mở nhanh câu dịch mẫu của người bản xứ.
- **AI Batch Grading**: Toàn bộ 3 câu dịch được gửi đi trong 1 lần thẩm định duy nhất, AI phản hồi: Điểm số (0–100), Phân tích việc ứng dụng chunk (`usedChunk`), Giải thích lỗi ngữ pháp cặn kẽ và Gợi ý câu văn tự nhiên hơn.

---

### 2.5 Phương pháp 5: AI Conversational Roleplay & Thẩm Định Phát Âm Cấp Độ 2

Ứng dụng cung cấp 2 chế độ luyện nói đột phá: **Luyện phản xạ từng câu (SpeakingSession)** và **Hội thoại nhập vai 2 chiều theo ngữ cảnh (ConversationalSpeakingModal)**:

#### A. Hội Thoại Nhập Vai 2 Chiều AI (AI Conversational Roleplay)
- **Tình huống mẫu phong phú (Curated Presets)**: Lựa chọn các bối cảnh đời thực và công sở (gọi đồ uống tại quán cà phê New York, check-in khách sạn London, đàm phán hợp đồng, phỏng vấn xin việc, họp báo cáo tiến độ,...).
- **Tự tạo kịch bản theo yêu cầu (Custom Scenario Generator)**: Nhập bất kỳ bối cảnh nào bạn muốn thực hành (ví dụ: *"Tôi đi mua máy tính tại Apple Store và muốn hỏi về chế độ bảo hành toàn cầu"*), AI sẽ tự động nhập vai đối ứng phù hợp.
- **Tích hợp VoiceStudio Local API / Neural Voices**: Giọng đọc AI đóng vai đối tác trò chuyện tự nhiên, biểu cảm chân thực 100%.

#### B. Tiêu chuẩn Phát Âm "Cấp Độ 2" & Thẩm định Âm thanh Đa phương thức
- **Tiêu chuẩn Cấp độ 2**: Người học không cần phát âm tuyệt đối như người bản xứ sinh ra ở Oxford hay New York (Cấp độ 3), mà chỉ cần đạt chuẩn **Phát âm rõ ràng, chuẩn xác, không nuốt âm đuôi và đúng trọng âm để người nước ngoài nghe hiểu trọn vẹn và tin cậy**.
- **Chấm trực tiếp file âm thanh gốc qua Gemini Flash Multimodal**: Khác biệt hoàn toàn với các app nhận diện giọng nói thông thường (vốn dùng Web Speech API chuyển thành chữ trước rồi mới chấm, dễ tự sửa sai lỗi phát âm), TOEIC Chunk Trainer gửi file ghi âm gốc (`audio/webm`, `audio/mp4`) lên mô hình Multimodal để chuyên gia AI thẩm định trực tiếp sóng âm thanh.
- **3 Thang màu trực quan & Ngôi sao Chunk**:
  - 🟢 **Xanh lá (Đúng chuẩn - 80–100đ)**: Âm vị chuẩn xác, người bản xứ nghe hiểu ngay.
  - 🟡 **Vàng hổ phách (Cần chú ý - 50–79đ)**: Người nghe hiểu được nhưng còn lỗi nhỏ: thiếu âm đuôi, nuốt âm nhẹ, lệch trọng âm.
  - 🔴 **Đỏ (Cần sửa - 0–49đ)**: Biến dạng từ, phát âm sai hẳn hoặc mất từ.
  - ⭐ **Ngôi sao vàng**: Đánh dấu các từ thuộc cụm Chunk trọng tâm.
- **Bảng Soi Âm Vị Từng Từ (Word Inspector)**: Chạm vào bất kỳ từ nào trên màn hình để:
  - Xem phiên âm quốc tế **IPA** chuẩn xác (`[ˈmeɪn.li]`, `[ˈstɑːrtɪd]`).
  - Xem điểm số riêng của từ đó (ví dụ: `75/100`).
  - Xem giải thích lỗi âm vị chi tiết bằng tiếng Việt (*"Thiếu âm đuôi /t/", "Nuốt âm /s/ kết thúc", "Trọng âm rơi sai âm tiết"*).
  - Bấm nút **🔊 Nghe mẫu riêng từ đó** để bắt chước nhại lại ngay lập tức.
- **Cơ chế Fallback Offline**: Khi mất mạng, hệ thống chuyển sang bộ đối soát âm vị học tích hợp sẵn trên máy (`phonetics.js`), đảm bảo việc học không bao giờ gián đoạn.

---

### 2.6 Phương pháp 6: Spaced Repetition (SRS SM-2, Level Map Track A/B & 4 Khung Giờ Vàng)

- **Thuật toán SuperMemo SM-2**: Tự động tính toán điểm chất lượng câu trả lời ($q = 0 \rightarrow 5$), cập nhật hệ số dễ nhớ Ease Factor ($EF$) và lên lịch ngày ôn tập tiếp theo ($nextReviewAt$) đúng vào thời điểm chuẩn bị quên theo đường cong Ebbinghaus:
  $$EF' = \max\left(1.3, \; EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)\right)$$
- **2 Lộ trình Tối ưu hóa**:
  - **Track A (Người mới bắt đầu — Chu kỳ lặp dày)**: 15p $\rightarrow$ 1h $\rightarrow$ 4h $\rightarrow$ 1 ngày $\rightarrow$ 2 ngày $\rightarrow$ 4 ngày $\rightarrow$ 7 ngày $\rightarrow$ 12 ngày $\rightarrow$ 20 ngày $\rightarrow$ 30 ngày $\rightarrow$ 90 ngày (`Mastered`).
  - **Track B (Người có nền tảng — Giãn cách nhanh)**: 3h $\rightarrow$ 1 ngày $\rightarrow$ 3 ngày $\rightarrow$ 7 ngày $\rightarrow$ 14 ngày $\rightarrow$ 30 ngày $\rightarrow$ 60 ngày $\rightarrow$ 90 ngày (`Mastered`).
- **Nguyên tắc Vàng — Tái Sử Dụng 100% Câu Cũ Khi Ôn Tập**: Khi một chunk đến hạn ôn tập, app sử dụng lại toàn bộ câu mẫu và ngữ cảnh đã sinh trước đó, tuyệt đối **không gọi AI sinh mới**. Vừa giúp củng cố cùng một liên kết nơ-ron thần kinh, vừa **tiết kiệm 100% chi phí và hạn ngạch API**.
- **Thông Báo Đẩy Web Push 4 Khung Giờ Vàng**:
  - `08:00 (Sáng)`: 🌅 Khởi động tư duy đầu ngày.
  - `12:00 (Trưa)`: ☀️ Tận dụng giờ nghỉ trưa ôn nhanh phản xạ.
  - `18:00 (Chiều)`: 🌆 Củng cố kiến thức cuối ngày sau giờ làm việc.
  - `21:00 (Tối)`: 🌙 Ôn tập nhẹ trước khi ngủ giúp não bộ ghi sâu vào trí nhớ dài hạn.

---

### 2.7 Phương pháp 7: Grammar Chunking qua Đọc Hiểu Part 5 & 6 (`Reading Lab`)

- **Không học ngữ pháp chết**: Thay vì học các công thức ngữ pháp khô khan rời rạc (công thức thì, mệnh đề quan hệ, đảo ngữ,...), người học tiếp cận ngữ pháp thông qua các **Grammar Chunks** thực chiến trong đề thi TOEIC Reading Part 5 & 6.
- **Phân tích bẫy đề thi cặn kẽ**: Mỗi câu hỏi đều có giải thích chi tiết tại sao đáp án này đúng, các bẫy thường gặp của ETS và trích xuất trực tiếp các cụm ngữ pháp liên quan (*dependent prepositions, fixed verb patterns, transitional phrases*) để lưu về Kho Chunks luyện tập.

---

## 3. Kho Học Liệu Thực Chiến Tích Hợp Sẵn

Ứng dụng đi kèm sẵn các bộ dữ liệu đồ sộ được chuẩn hóa bài bản:

### 3.1 Lộ trình Hackers TOEIC 30 Ngày (30-Day Intensive Roadmap)
- Tích hợp trọn vẹn toàn bộ 30 ngày học từ vựng kinh điển của bộ giáo trình Hackers TOEIC.
- Mỗi ngày học gồm hàng chục từ vựng trọng điểm, phiên âm IPA, từ loại, nghĩa tiếng Việt, collocations đi kèm và file âm thanh phát âm chuẩn.
- Hỗ trợ học linh hoạt theo cả 2 phương pháp: **Trích xuất Chunk ngữ cảnh** và **Lật thẻ Flashcard 3D + Ải gõ chính tả Dot Masking**.

### 3.2 Kho 5000 Từ Vựng Cốt Lõi Phân Theo 12+ Chủ Đề
- 12+ nhóm chủ đề thực chiến: *Business Operations, Office Life, Technology & Computing, Finance & Banking, Marketing & Sales, Travel & Hospitality, Personnel & HR, Manufacturing,...*
- Quy trình học 3 bước: Duyệt chủ đề $\rightarrow$ Chọn số lượng từ cần học $\rightarrow$ AI sinh Chunks tự động theo lô 10 từ.

### 3.3 Kho Transcript Hội Thoại TOEIC Part 3 & Bài Nói Part 4
- Hàng chục bài nghe chuẩn đề thi ETS với phân trang 10 bài/trang mượt mà.
- Hỗ trợ người dùng tự dán bất kỳ bài nghe nào từ bên ngoài để AI tự động phân tích bối cảnh và trích xuất Chunks.

---

## 4. Kiến trúc Công nghệ (Tech Stack)

| Thành phần | Công nghệ chính | Mục đích & Chi tiết triển khai |
|---|---|---|
| **Frontend Framework** | **React 19** (`react`, `react-dom`) | Single Page Application với React Hooks hiện đại (`useMemo`, `useCallback`, `useRef`, custom hooks). |
| **Build Tool & Bundler** | **Vite 8** (`@vitejs/plugin-react`) | Biên dịch siêu tốc (< 500ms), Hot Module Replacement (HMR). |
| **UI Icons** | **lucide-react** | Hệ thống icon vector phong phú, chuẩn công nghiệp. |
| **Code Quality** | **oxlint** | Linter viết bằng Rust cực nhanh, đảm bảo chuẩn hook và cú pháp. |
| **Styling & Theme** | **Modern Pure CSS** (`src/index.css`) | Dark Glassmorphism, Responsive 100%, Safe Area Inset, Left Slide-Out Navigation Drawer trên Mobile. |
| **AI Engine (Multimodal)** | **Google Gemini API** (`generateContent`) | Trích xuất chunk, chấm bài dịch hàng loạt, thẩm định phát âm qua mô hình `gemini-2.5-flash-lite`, `gemini-2.0-flash`. |
| **Speech Processing** | **MediaRecorder + Web Audio API** | Thu âm microphone 16kHz PCM / WebM, Audio Wave Visualizer thời gian thực. |
| **Speech Synthesis (TTS)** | **Web Speech API + VoiceStudio** | Bộ thuật toán `scoreVoice` tự động ưu tiên giọng **Neural / Natural / Online** (Edge, Chrome, Windows) cho 4 accent US, UK, AU, CA. |
| **Phonetics & IPA** | **Custom Phonetics Service** (`phonetics.js`) | Thư viện phiên âm IPA offline, thuật toán đối soát âm vị học fuzzy cho ending sounds (-s, -ed, -t, -d). |
| **Database & Cloud Sync** | **Supabase JS Client** (`@supabase/supabase-js`) | Postgres Cloud Database, Supabase Auth (Email/Password), hỗ trợ Guest Mode và Cloud Sync. |
| **Offline-First Storage** | **LocalStorage Abstraction** (`storage.js`) | Lưu trữ toàn bộ dữ liệu người dùng cục bộ, tự động lưu nháp realtime, hoạt động độc lập không cần internet. |
| **Notification & PWA** | **Service Worker & Notification API** (`public/sw.js`) | Bắn thông báo đẩy theo 4 khung giờ vàng (8h, 12h, 18h, 21h). |

---

## 5. Cấu trúc Thư mục Codebase

```
speaking_chunk/
├── public/
│   ├── favicon.svg             # Favicon ứng dụng
│   ├── manifest.json           # Cấu hình PWA (Progressive Web App)
│   └── sw.js                   # Service Worker xử lý Web Push 4 khung giờ
├── data/
│   ├── hackers_toeic_30days.json # Toàn bộ dữ liệu Lộ trình Hackers TOEIC 30 Ngày
│   └── vocab_5000.json         # 5000 từ vựng cốt lõi TOEIC chia theo 12+ nhóm chủ đề
├── scripts/
│   ├── import-vocab.js         # Script nhập từ vựng vào Supabase
│   └── generate-chunks-batch.js# Script sinh chunk tự động hàng loạt
├── src/
│   ├── main.jsx                # Entry point chính của ứng dụng React 19
│   ├── App.jsx                 # Điều phối trung tâm: Routing, Active Tab, Notifications, Auto-save
│   ├── index.css               # Hệ thống CSS Design System toàn app, Dark Theme, Animations, Mobile Drawer
│   ├── components/
│   │   ├── Auth/               # Giao diện Đăng nhập / Đăng ký Supabase Auth & chế độ Guest
│   │   ├── ChunkModule/        # Quản lý kho Chunk, lọc theo nhóm, thẻ tương tác
│   │   ├── ConversationalSpeaking/ # Phòng Luyện Nói Giao Tiếp AI 2 Chiều: Nhập vai đối ứng, VoiceStudio
│   │   │   ├── ConversationalSpeakingModal.jsx # Modal hội thoại 2 chế độ (Preset & Tự tạo tình huống)
│   │   │   └── ConversationalSpeaking.css   # Giao diện responsive 2 tầng cho Mobile
│   │   ├── Layout/             # Header tối giản, Sidebar Desktop, Slide-Out Drawer & Floating Menu Button Mobile
│   │   ├── PracticeModule/     # Luyện viết dịch câu 3 cấp độ, Accordion mục lục, gọi SpeakingSession
│   │   │   ├── index.jsx       # Component luyện viết bậc thang, Batch Grading, phím Tab thông minh
│   │   │   └── SpeakingSession.jsx # Phòng Luyện Nói AI Cấp độ 2: Audio Wave, Word Inspector, Gemini STT
│   │   ├── ProgressModule/     # Thống kê tiến độ, phân bổ cấp độ SRS SM-2, danh sách đến hạn ôn
│   │   ├── ReadingModule/      # Luyện đọc hiểu Part 5 & 6, bóc tách ngữ pháp & trích xuất Grammar Chunks
│   │   ├── Settings/           # Cấu hình Dual Gemini API Key, Supabase, SRS Track A/B, Level Map Modal
│   │   ├── TranscriptModule/   # Phân tích transcript TOEIC Part 3/4, phân trang Pagination
│   │   │   ├── index.jsx       # Danh sách transcript kèm bộ phân trang 10 bài/trang
│   │   │   └── TranscriptListeningModal.jsx # Phòng Luyện Nghe chuyên sâu (Dictation, Phím tắt Ctrl/Shift, TTS Neural)
│   │   ├── VocabModule/        # Module Từ Vựng: Hackers TOEIC 30 Ngày, Kho 5000 từ, Flashcard 3D, Ải gõ Dot Masking
│   │   │   ├── index.jsx       # Quản lý danh mục từ vựng, chuyển đổi lộ trình học
│   │   │   └── FlashcardSession.jsx # Phiên học Flashcard 3D lật thẻ + Thử thách gõ chính tả Dot Masking
│   │   └── ui/                 # Reusable UI: Modal, Pagination, ScoreRing, Badge, Spinner, Toast
│   ├── hooks/
│   │   ├── useAuth.js          # Hook quản lý phiên đăng nhập Supabase
│   │   ├── useSpeech.js        # Hook Web Speech Synthesis
│   │   └── useStorage.js       # Hook kết nối LocalStorage & Cloud Database
│   ├── services/
│   │   ├── ai.js               # Prompt Engineering, Gemini API, Dual Key Rotator, Multimodal Assessment
│   │   ├── notifications.js    # Quản lý Web Push thông báo 4 khung giờ vàng (8h, 12h, 18h, 21h)
│   │   ├── phonetics.js        # Thư viện phiên âm IPA offline & thuật toán so khớp âm vị
│   │   ├── speech.js           # Xử lý Text-to-Speech & thuật toán tìm kiếm giọng đọc bản xứ
│   │   ├── srs.js              # Thuật toán Spaced Repetition (SuperMemo SM-2, Level Map Track A/B)
│   │   ├── ttsService.js       # Audio playback cache và preload transcript
│   │   ├── ttsVoiceMap.js      # Bản đồ giọng đọc Neural cho từng speaker và accent
│   │   └── supabase.js         # Client cơ sở dữ liệu Supabase
│   └── store/
│       └── storage.js          # Data Access Layer: LocalStorage Offline-First + Cloud Sync
├── package.json
├── vite.config.js
└── README.md
```

---

## 6. Mô hình Dữ liệu (Data Model)

### LocalStorage Schema (Offline-First)

| Khóa lưu trữ (Key) | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `toeic_transcripts` | `Record<string, Transcript>` | Danh sách các bài transcript Part 3 & 4 đã phân tích. |
| `toeic_chunks` | `Record<string, Chunk[]>` | Danh sách các cụm từ theo từng `transcriptId` hoặc `wordId`. |
| `toeic_situations` | `Record<string, Exercise[]>` | Bộ 3 câu luyện dịch (Cơ bản, Trung cấp, Nâng cao) của từng chunk. |
| `toeic_progress` | `Record<string, Progress>` | Dữ liệu tiến độ: `practiceCount`, `lastScore`, `srsLevel`, `nextReviewAt`, `intervalMinutes`, `easeFactor`, `speakingHistory`. |
| `toeic_practice_drafts` | `Record<string, Draft>` | Bản nháp bài dịch đang gõ dở theo từng `chunkId`. |
| `toeic_vocab_learned` | `Record<string, LearnedVocab>` | Danh sách các từ vựng đã thuộc trong kho học liệu. |
| `toeic_vocab_flashcard_progress` | `Record<string, FlashcardProgress>` | Tiến độ học Flashcard 3D và trạng thái vượt ải chính tả của từng từ. |
| `toeic_settings` | `Settings` | Cấu hình API Keys, Supabase, lộ trình `srsTrack`, cài đặt thông báo. |

---

## 7. Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu hệ thống:
- **Node.js**: Phiên bản $\ge 18.0.0$
- **npm** hoặc **yarn / pnpm**
- **Google Gemini API Key**: Đăng ký miễn phí tại [Google AI Studio](https://aistudio.google.com/)

### Các bước cài đặt:

1. **Clone mã nguồn dự án**:
   ```bash
   git clone https://github.com/deV-inh08/chunking_method.git
   cd speaking_chunk
   ```

2. **Cài đặt các thư viện phụ thuộc**:
   ```bash
   npm install
   ```

3. **Cấu hình môi trường (Tùy chọn)**:
   Tạo file `.env` tại thư mục gốc (hoặc nhập trực tiếp vào giao diện web trong mục `Settings`):
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Khởi chạy môi trường phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: `http://localhost:5173`

5. **Kiểm tra mã nguồn & Đóng gói Production**:
   ```bash
   # Kiểm tra lint bằng oxlint siêu tốc
   npm run lint

   # Đóng gói sản phẩm production
   npm run build

   # Xem trước bản build
   npm run preview
   ```

---

## 8. Trạng thái Phát triển & Roadmap

### Các tính năng đã hoàn thiện 100%:
- [x] **Phương pháp Chunking**: Trích xuất Collocations, Functional Phrases và Connectors từ đề thi TOEIC.
- [x] **Lộ trình Hackers TOEIC 30 Ngày**: 30 ngày từ vựng thực chiến tích hợp sẵn.
- [x] **Kho 5000 Từ Vựng Cốt Lõi**: Phân theo 12+ nhóm chủ đề chuyên sâu.
- [x] **Quy trình Flashcard 3D & Ải Kiểm Tra Chính Tả 2 Giai Đoạn (Dot Masking Active Recall)**.
- [x] **Phòng Luyện Nghe Độc Lập (`TranscriptListeningModal`)**:
  - 4 chế độ: Bình thường, Che chữ (Blind), Chép chính tả (Dictation), Chỉ hiện Chunk.
  - Phím tắt <kbd>Ctrl</kbd> tua lùi 3s và <kbd>Shift</kbd> gợi ý từ tiếp theo.
  - Tuyển chọn giọng đọc Neural Edge/Chrome tự nhiên, không méo tiếng.
- [x] **Phòng Luyện Nói Giao Tiếp AI 2 Chiều (`ConversationalSpeakingModal`)**:
  - Nhập vai giao tiếp 1-1 theo ngữ cảnh đời thực & công sở.
  - Tự do tạo kịch bản đàm thoại bất kỳ bằng AI.
  - Giao diện Header 2 tầng responsive chuẩn di động.
- [x] **Phòng Luyện Nói AI Cấp Độ 2 (`SpeakingSession`)**:
  - Thẩm định file âm thanh ghi âm trực tiếp bằng Gemini Flash Multimodal.
  - Đánh giá từng từ theo 3 thang màu (🟢 Đúng chuẩn, 🟡 Cần chú ý, 🔴 Cần sửa).
  - Bảng Soi Âm Vị Từng Từ (Word Inspector): Xem phiên âm IPA, lỗi nuốt âm đuôi và nghe mẫu riêng từng từ.
- [x] **Luyện dịch câu bậc thang 3 cấp độ** kèm phím <kbd>Tab</kbd> chuyển câu thông minh.
- [x] **Luyện đọc hiểu TOEIC Reading Part 5 & 6 (`ReadingLab`)** và bóc tách Grammar Chunks.
- [x] **Thuật toán Spaced Repetition (SuperMemo SM-2 & Leitner Box)** cho cả bài Viết và bài Nói.
- [x] **Tái sử dụng 100% câu cũ khi ôn tập** giúp tiết kiệm hoàn toàn quota API.
- [x] **Hệ thống Thông báo Đẩy 4 Khung Giờ Vàng (Web Push Service Worker)**.
- [x] **Giao diện Di Động Hiện Đại**:
  - Nút Menu nổi (Floating Button) tại góc dưới bên trái màn hình (Thumb Zone).
  - Sidebar Drawer trượt trái Dark Glassmorphism, tự động tránh tai thỏ (Safe Area).
  - Breadcrumb rút gọn `Workspace > [Tên ngắn]` trên 1 dòng duy nhất.
- [x] **Cơ chế lưu bản nháp Realtime (Draft Auto-Save)** không lo mất bài khi tải lại trang.
- [x] **Cơ chế xoay vòng Dual Gemini API Key & Fallback Model Candidates**.

### Định hướng tương lai (Roadmap):
- [ ] Giao tiếp giọng nói liên tục hai chiều thời gian thực qua giao thức Gemini Live WebSocket (Full Duplex Voice).
- [ ] Chế độ Shadowing: Nghe phát âm native và nhại theo ngữ điệu, chấm điểm độ trễ và độ trùng khớp sóng âm.
- [ ] Bảng xếp hạng thi đua học tập (Community Leaderboard) và hệ thống danh hiệu huy hiệu.

---
*Dự án được xây dựng với tâm huyết mang lại giải pháp đột phá, giúp người học tiếng Anh làm chủ phản xạ ngôn ngữ tự nhiên và đạt kết quả xuất sắc trong các bài thi TOEIC.*
