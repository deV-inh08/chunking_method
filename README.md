# 🎧 TOEIC Chunk Trainer — Luyện Phản Xạ Tiếng Anh Theo Phương Pháp Chunking

> **Dự án**: `TOEIC Chunk Trainer` (Tên package nội bộ: `speaking_chunk`)  
> **Mục tiêu**: Giúp người học tiếng Anh (đặc biệt là TOEIC Speaking & Listening Part 3/4) phát triển phản xạ tự nhiên thông qua phương pháp **Chunking** (học theo cụm từ có nghĩa hoàn chỉnh thay vì học từ vựng đơn lẻ), kết hợp **Trí tuệ nhân tạo (Google Gemini AI)**, **Phòng Luyện Nói Phản Xạ AI (Live Voice Session)** và **Thuật toán lặp lại ngắt quãng (Spaced Repetition System - SM-2)**.

---

## 📑 MỤC LỤC

1. [Tổng quan dự án & Triết lý sản phẩm](#1-tổng-quan-dự-án--triết-lý-sản-phẩm)
2. [Kiến trúc Công nghệ (Tech Stack)](#2-kiến-trúc-công-nghệ-tech-stack)
3. [Cấu trúc Thư mục Codebase](#3-cấu-trúc-thư-mục-codebase)
4. [Các Module & Tính năng Nghiệp vụ Chi tiết](#4-các-module--tính-năng-nghiệp-vụ-chi-tiết)
   - [4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)](#41-module-5000-từ-vựng-cốt-lõi-vocabmodule)
   - [4.2 Module Phân tích Transcript (`TranscriptModule`)](#42-module-phân-tích-transcript-transcriptmodule)
   - [4.3 Module Quản lý Chunk (`ChunkModule`)](#43-module-quản-lý-chunk-chunkmodule)
   - [4.4 Module Luyện Tập Kép: Viết & Nói (`PracticeModule`)](#44-module-luyện-tập-kép-viết--nói-practicemodule)
     - [4.4.1 Chế độ Luyện Viết Dịch Câu Bậc Thang (Writing Mode)](#441-chế-độ-luyện-viết-dịch-câu-bậc-thang-writing-mode)
     - [4.4.2 Phòng Luyện Nói Phản Xạ AI Thời Gian Thực (`SpeakingSession`)](#442-phòng-luyện-nói-phản-xạ-ai-thời-gian-thực-speakingsession)
   - [4.5 Module Thống kê Tiến độ (`ProgressModule`)](#45-module-thống-kê-tiến-độ-progressmodule)
   - [4.6 Module Cấu hình (`Settings`)](#46-module-cấu-hình-settings)
   - [4.7 Module Xác thực & Đám mây (`Auth`)](#47-module-xác-thực--đám-mây-auth)
5. [Thuật toán & Logic Nghiệp vụ Cốt lõi](#5-thuật-toán--logic-nghiệp-vụ-cốt-lõi)
   - [5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map Track A/B)](#51-thuật-toán-spaced-repetition-srs-sm-2--level-map-track-ab)
   - [5.2 Chu kỳ SRS & Logic Đánh giá cho Buổi Luyện Nói (Speaking SRS Lifecycle)](#52-chu-kỳ-srs--logic-đánh-giá-cho-buổi-luyện-nói-speaking-srs-lifecycle)
   - [5.3 Quản lý Quota AI: Dual API Key, Model Candidates & Batch Optimization](#53-quản-lý-quota-ai-dual-api-key-model-candidates--batch-optimization)
   - [5.4 Chấm điểm Dịch Câu Hàng loạt (Batch Grading Optimization)](#54-chấm-điểm-dịch-câu-hàng-loạt-batch-grading-optimization)
   - [5.5 Thông báo Đẩy 4 Khung Giờ Vàng (Service Worker & Web Push)](#55-thông-báo-đẩy-4-khung-giờ-vàng-service-worker--web-push)
   - [5.6 Quản lý Trạng thái & Tự động Lưu Bản Nháp (Draft Auto-Save & Persistent State)](#56-quản-lý-trạng-thái--tự-động-lưu-bản-nháp-draft-auto-save--persistent-state)
6. [Mô hình Dữ liệu (Data Model)](#6-mô-hình-dữ-liệu-data-model)
   - [6.1 LocalStorage Schema](#61-localstorage-schema)
   - [6.2 Supabase Cloud Database Schema (Tuỳ chọn)](#62-supabase-cloud-database-schema-tuỳ-chọn)
7. [Hướng dẫn Cài đặt & Vận hành](#7-hướng-dẫn-cài-đặt--vận-hành)
8. [Trạng thái Hoàn thiện & Lộ trình Phát triển](#8-trạng-thái-hoàn-thiện--lộ-trình-phát-triển)

---

## 1. Tổng quan dự án & Triết lý sản phẩm

### Vấn đề của người học tiếng Anh:
- **Học từ vựng đơn lẻ (word-by-word)**: Dẫn đến phản xạ ngập ngừng, ghép từ sai ngữ pháp, cấu trúc câu gượng gạo và mang nặng tính "Viet-lish".
- **Học thụ động khi nghe/đọc transcript TOEIC**: Người học nắm được nội dung đại ý nhưng không chuyển hóa được các cụm từ đắt giá trong bài thành vốn từ chủ động (active vocabulary) để tự tin nói và viết.
- **Đường cong quên lãng (Ebbinghaus Forgetting Curve)**: Thiếu cơ chế kiểm tra ngắt quãng khoa học khiến từ vựng nhanh chóng bị lãng quên sau 24–48 giờ.

### Giải pháp cốt lõi của TOEIC Chunk Trainer:
1. **Trích xuất Chunk thông minh (Collocations & Fixed Phrases)**: AI phân tích transcript hoặc từ vựng để bóc tách các cụm từ có nghĩa trọn vẹn, có tính ứng dụng cao nhất trong giao tiếp công việc.
2. **Luyện dịch 3 cấp độ (Active Recall)**: Buộc não bộ phải tự truy xuất và ứng dụng chunk vào câu dịch tiếng Anh từ cơ bản đến nâng cao.
3. **Phòng Luyện Nói Phản Xạ AI (Voice Interactive Practice)**: Không chỉ dừng lại ở bài tập viết, người học được trực tiếp đối thoại bằng giọng nói với AI, nhận diện phát âm từng từ và kiểm tra việc dùng đúng chunk trong thời gian thực.
4. **Hệ thống Spaced Repetition (SRS SM-2)**: Tính toán chính xác thời điểm trí nhớ bắt đầu suy giảm để gửi thông báo nhắc ôn tập đúng 4 khung giờ vàng trong ngày.

---

## 2. Kiến trúc Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng | Mô tả & Vai trò |
|---|---|---|
| **Frontend Core** | **React 19** (`react`, `react-dom`) | Single Page Application (SPA), React hooks hiện đại, useMemo, useCallback. |
| **Build Tool & Dev Server** | **Vite 8** (`@vitejs/plugin-react`) | Bundler siêu tốc, Hot Module Replacement (HMR). |
| **Icons** | **lucide-react** | Hệ thống biểu tượng UI hiện đại, đồng bộ. |
| **Linter & Code Quality** | **oxlint** | Linter viết bằng Rust siêu nhanh, kiểm tra cú pháp và hook dependencies. |
| **Styling** | **Pure CSS + CSS Variables** (`src/index.css`) | Thiết kế responsive hoàn toàn (Desktop, Tablet, Mobile), Theme Dark/Elevated, Glassmorphism, không dùng framework CSS nặng nề. |
| **AI Intelligence** | **Google Gemini API** (Direct REST Fetch) | Gemini Flash / Flash-Lite (`gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`,...) cho text và Gemini Audio Transcription cho giọng nói. |
| **Voice & Speech** | **Web Speech API & Gemini STT** | Phát âm câu mẫu (Text-to-Speech đa giọng bản xứ US/UK/AUS) kết hợp Gemini Audio Transcription để nhận diện giọng nói chính xác cao. |
| **Database & Auth (Cloud Sync)** | **Supabase JS Client** (`@supabase/supabase-js`) | Cơ sở dữ liệu đám mây Postgres, Supabase Auth (Email/Password). |
| **Notification & Offline** | **Notification API & Service Worker** (`public/sw.js`) | Thông báo đẩy Web Push 4 khung giờ vàng, lưu cache offline PWA. |
| **Kiến trúc dữ liệu** | **Offline-First & Hybrid Cloud Sync** | 100% chức năng hoạt động mượt mà với `LocalStorage` khi không có Supabase; tự động merge dữ liệu khi đăng nhập. |

---

## 3. Cấu trúc Thư mục Codebase

```
speaking_chunk/
├── public/
│   ├── favicon.svg             # Favicon ứng dụng
│   ├── manifest.json           # Cấu hình PWA (Progressive Web App)
│   └── sw.js                   # Service Worker xử lý Web Push & Background Navigation
├── data/
│   └── vocab_5000.json         # Dữ liệu 5000 từ vựng TOEIC chia theo 12+ chủ đề thực tế
├── scripts/
│   ├── import-vocab.js         # Script đồng bộ từ vựng JSON lên Supabase database
│   └── generate-chunks-batch.js # Script Node.js sinh chunk hàng loạt cho kho từ vựng
├── src/
│   ├── main.jsx                # Entry point ứng dụng React
│   ├── App.jsx                 # Bộ điều phối trung tâm: Routing, State, Notifications, Cloud Sync
│   ├── index.css               # Hệ thống CSS Design System toàn app, Dark Theme, Breakpoints
│   ├── components/
│   │   ├── Auth/               # Màn hình Đăng nhập / Đăng ký Supabase Auth
│   │   ├── ChunkModule/        # Quản lý, hiển thị, lọc danh sách Chunk theo nhóm/loại
│   │   ├── Layout/             # Header, Sidebar (Desktop), Bottom Navigation Bar (Mobile)
│   │   ├── PracticeModule/     # Luyện viết dịch câu, Course Outline Accordion, Gọi Speaking Session
│   │   │   ├── index.jsx       # Component luyện viết 3 cấp độ, Accordion mục lục, Batch Grading
│   │   │   └── SpeakingSession.jsx # Phòng Luyện Nói AI: Audio Waveform, Gemini STT, Tô màu từ vựng
│   │   ├── ProgressModule/     # Thống kê tiến độ, Phân bổ cấp độ SRS, Danh sách đến hạn ôn
│   │   ├── Settings/           # Cấu hình Dual Gemini API Key, Supabase, SRS Track, Level Map Modal
│   │   ├── TranscriptModule/   # Nhập & Phân tích transcript TOEIC Part 3/4
│   │   ├── VocabModule/        # Quy trình học 5000 từ vựng cốt lõi theo 3 màn hình chuyên sâu
│   │   └── ui/                 # Reusable UI: Modal, Badge, Spinner, EmptyState, ErrorBoundary, Toast
│   ├── hooks/
│   │   ├── useAuth.js          # Quản lý trạng thái phiên đăng nhập Supabase
│   │   ├── useSpeech.js        # Hook giao tiếp Web Speech API
│   │   └── useStorage.js       # Hook đồng bộ dữ liệu với LocalStorage và Supabase
│   ├── services/
│   │   ├── ai.js               # Prompt Engineering, Gemini REST API, Dual Key Rotator, Batch Grading
│   │   ├── notifications.js    # Quản lý thông báo Web Push 4 khung giờ vàng (8h, 12h, 18h, 21h)
│   │   ├── speakingLive.js     # Helper xử lý Audio (Downsampling 16kHz, PCM 16-bit, Gemini Live Config)
│   │   ├── speech.js           # Xử lý Text-to-Speech và đối soát chuỗi giọng nói
│   │   ├── srs.js              # Thuật toán Spaced Repetition (SuperMemo SM-2, Level Map, SRS Speaking)
│   │   └── supabase.js         # API Client thao tác cơ sở dữ liệu Supabase
│   └── store/
│       └── storage.js          # Data Access Layer: LocalStorage abstraction + Cloud Sync nền
├── package.json
├── vite.config.js
└── README.md
```

---

## 4. Các Module & Tính năng Nghiệp vụ Chi tiết

### 4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)

Module được thiết kế theo quy trình **3 màn hình liền mạch (Topic Browser $\rightarrow$ Word Selector $\rightarrow$ Learning Session)** giúp người học tiếp cận kho 5000 từ vựng TOEIC mà không bị ngợp:

```
[Màn 1: Topic Browser] ──> [Màn 2: Word Selector] ──> [Màn 3: Learning Session]
   Chọn chủ đề (12+)           Chọn 1-50 từ / Swap           AI sinh chunk (Batch 10)
   Xem tiến độ %               Randomize danh sách           Xem card chunk & Luyện tập
```

1. **Màn hình 1 — Duyệt Chủ Đề (`Topic Browser`)**:
   - Thư viện 5000 từ vựng chuẩn chia thành các chủ đề thực chiến: *Business & Management, Tech & Science, Education, Health, Travel & Transport, Food, Finance & Economy, Office,...*
   - Mỗi card chủ đề hiển thị: Icon emoji đại diện, tổng số từ vựng, số từ đã hoàn thành (`learnedVocab`), số từ còn lại và **thanh tiến độ phần trăm trực quan**.
2. **Màn hình 2 — Bộ Chọn Từ Linh Hoạt (`Word Selector`)**:
   - Hệ thống tự động lọc các từ chưa học trong chủ đề đã chọn.
   - **Tùy chỉnh số lượng từ muốn học**:
     - Nút tăng/giảm nhanh `-5` / `+5`.
     - Các nút chọn sẵn mức phổ biến: `20`, `30`, `50` từ.
     - Thanh trượt `range slider` linh hoạt từ 1 từ đến tối đa số từ chưa học.
   - **Lưới thẻ từ (Word Chips Grid)**:
     - Hiển thị từ, từ loại (`noun`, `verb`, `adj`,...), nghĩa tiếng Việt.
     - Nút **Đổi từ (`Swap`)**: Bỏ 1 từ cụ thể và thay thế bằng 1 từ ngẫu nhiên khác trong kho từ chưa học.
     - Nút **`Randomize lại`**: Xáo trộn và lấy một tổ hợp từ hoàn toàn mới.
3. **Màn hình 3 — Buổi Học & Sinh Chunk Hàng Loạt (`Learning Session`)**:
   - **Cơ chế Batching thông minh**: AI sinh chunk theo từng lô **10 từ/lần** (`generateChunksBatch`) kèm thanh tiến trình phần trăm, giúp tránh nghẽn mạng và hạn ngạch API.
   - Với mỗi từ vựng, AI sinh từ 2–3 chunk tự nhiên (kèm phân loại `collocation`, `functional`, `connector`, nghĩa tiếng Việt).
   - **Thẻ hiển thị từ vựng (`WordLearningCard`)**: Hiển thị các viên thuốc chunk (`Chunk Pills`), đánh dấu `✓ Đã học` khi hoàn thành.
   - **Điều hướng luyện tập**:
     - Bấm **`Luyện viết với chunk này →`** trên từng từ để luyện riêng lẻ.
     - Hoặc bấm **`Luyện viết tất cả (N chunk) →`** ở đầu trang để chuyển toàn bộ danh sách vừa sinh sang tab Luyện tập (`PracticeModule`).

---

### 4.2 Module Phân tích Transcript (`TranscriptModule`)

- Dành cho người học luyện nghe và đọc hiểu TOEIC Part 3 (Hội thoại ngắn) và Part 4 (Bài nói ngắn).
- **Phân tích ngữ cảnh sâu (`analyzeTranscript`)**:
  - Người dùng dán transcript đoạn hội thoại, chọn Part 3 hoặc Part 4.
  - AI phân tích ngữ cảnh, đặt tên chủ đề song ngữ (Anh - Việt), chia transcript thành 2–4 tình huống giao tiếp thực tế.
  - Bóc tách 6–12 chunks trọng tâm (nghĩa tiếng Việt, câu gốc trong bài thi, câu ví dụ ngoài đời, ghi chú ngữ cảnh).
- **Tự động sinh bài tập nền (`auto-generate`)**:
  - Ngay sau khi trích xuất chunk xong, ứng dụng tự động đưa các chunk vào hàng đợi sinh bài luyện viết tuần tự với thanh tiến trình hiển thị rõ ràng trên header.

---

### 4.3 Module Quản lý Chunk (`ChunkModule`)

- Hiển thị toàn bộ kho chunk đã trích xuất từ các đoạn transcript hoặc từ vựng.
- **Bộ lọc đa chiều**: Lọc theo phân loại chunk (`Collocation`, `Functional`, `Connector`) hoặc theo từng đoạn hội thoại nguồn.
- **Thẻ Chunk tương tác**: Cho phép xem câu gốc trong bài thi, ví dụ thực tế, ghi chú cách dùng.
- **Chọn bài học hàng loạt**: Người học tick chọn các chunk muốn rèn luyện và bấm *"Luyện viết N chunks"* để bắt đầu.

---

### 4.4 Module Luyện Tập Kép: Viết & Nói (`PracticeModule`)

`PracticeModule` là trái tim của ứng dụng, kết hợp 2 chế độ học bổ trợ cho nhau: **Luyện Viết Dịch Câu** (xây dựng nền tảng ngữ pháp & từ vựng) và **Phòng Luyện Nói Phản Xạ AI** (rèn ngữ điệu & phản xạ âm thanh thời gian thực).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRACTICE MODULE                               │
├────────────────────────────────────┬────────────────────────────────────┤
│   CHẾ ĐỘ 1: LUYỆN VIẾT DỊCH CÂU    │      CHẾ ĐỘ 2: PHÒNG LUYỆN NÓI AI  │
│   (Writing Translation)            │      (Speaking Session - Modal)    │
├────────────────────────────────────┼────────────────────────────────────┤
│ • 3 cấp độ: Cơ bản → Trung → Cao   │ • Đối thoại giọng nói với AI       │
│ • Gợi ý từ vựng & Phân tích thì    │ • 5 giọng bản xứ: US, UK, AUS      │
│ • Batch Grading: Chấm bài 1 request│ • Audio Waveform sóng âm trực quan │
│ • Nghe phát âm câu mẫu (TTS)       │ • Chấm phát âm từng từ (Xanh/Đỏ)   │
│ • Tự động lưu bản nháp realtime    │ • Tự động cập nhật tiến độ SRS     │
└────────────────────────────────────┴────────────────────────────────────┘
```

#### 4.4.1 Chế độ Luyện Viết Dịch Câu Bậc Thang (Writing Mode)
- **3 Cấp độ Thử Thách theo Chunk**:
  1. **★ Cơ bản**: Câu ngắn ($\le 10$ từ), 1 mệnh đề, thì quen thuộc (Present Simple, Past Simple), 0–2 gợi ý từ vựng.
  2. **★★ Trung cấp**: Câu 10–15 từ, có trạng ngữ thời gian/nơi chốn, thì phức hợp (Present Continuous, Future Simple), 2–3 gợi ý từ vựng.
  3. **★★★ Nâng cao**: Câu ghép 15–20 từ, cấu trúc câu phức/mệnh đề phụ, thì nâng cao (Present Perfect, Modal Verbs), 4–5 gợi ý từ vựng.
- **Mục lục Bài học Dạng Cây (Course Outline Accordion)**:
  - Tự động gom nhóm thông minh: Nếu chunk sinh từ từ vựng thì gom theo Từ (VD: `invest` $\rightarrow$ các chunks liên quan); nếu sinh từ Transcript thì gom theo đoạn hội thoại (VD: `Part 3 - Contract Discussion`).
  - **Desktop**: Sidebar Accordion phân cấp, hiển thị tiến độ hoàn thành, dấu tích xanh, điểm số từng chunk và huy hiệu ngọn lửa đỏ khi đến hạn ôn.
  - **Mobile**: Chapter Bar trên đầu trang kèm nút `Mục lục (N)`, mở Bottom Sheet Drawer tiện lợi cùng 2 nút chuyển bài `← Chunk trước` / `Chunk tiếp theo →`.
- **Chấm bài AI hàng loạt (`gradeWritingBatch`)**:
  - Gửi tất cả các câu đã làm trong 1 request duy nhất.
  - Đánh giá: Có dùng đúng chunk (`usedChunk`), Đúng nghĩa (`correct`), Điểm số (0–100), Phân tích chi tiết lỗi ngữ pháp (`grammarErrors`), Gợi ý cách viết tự nhiên chuẩn bản xứ (`naturalSuggestion`).
- **Khối CTA Luyện Nói Rõ Ràng**:
  - Sau khi hoàn thành các câu viết, ở cuối bài có thẻ CTA nổi bật: **`🎙️ Luyện nói với AI`** mời người học chuyển sang luyện phản xạ nói bằng miệng.

---

#### 4.4.2 Phòng Luyện Nói Phản Xạ AI Thời Gian Thực (`SpeakingSession`)

Khi bấm nút **`🎙️ Luyện nói với AI`**, ứng dụng sẽ mở ra giao diện phòng luyện nói chuyên sâu:

1. **Kiến trúc Voice & Audio**:
   - **5 Tùy chọn Giọng Đọc AI Bản Xứ**:
     - 👩 🇺🇸 Anh - Mỹ (Nữ)
     - 👨 🇺🇸 Anh - Mỹ (Nam)
     - 👩 🇬🇧 Anh - Anh (Nữ)
     - 👨 🇬🇧 Anh - Anh (Nam)
     - 👩 🇦🇺 Anh - Úc (Nữ)
     *(Giúp người học rèn luyện phản xạ với đầy đủ các accent thường xuất hiện trong bài thi TOEIC Listening/Speaking).*
   - **Audio Wave Visualizer**: Hệ thống sóng nhạc 10 thanh dao động theo thời gian thực tương ứng với cường độ âm lượng thu âm qua micro của người dùng.
2. **Kịch bản Luyện Nói 2 Câu Phản Xạ**:
   - **Câu 1 — Cơ bản (Khởi động)**: Câu tình huống ngắn chứa chunk mục tiêu.
   - **Câu 2 — Tình huống thực tế (Nâng cao)**: Câu giao tiếp công việc phức tạp hơn.
3. **Quy trình Thực hiện**:
   - Người học bấm nghe AI phát âm câu mẫu bản xứ.
   - Nhấn nút **Micro (Bắt đầu nói)** và đọc câu tiếng Anh bằng giọng của mình.
   - Âm thanh được chuyển đổi và phân tích thông qua Gemini Audio Processing (`transcribeAudioWithGemini`).
4. **Phân tích Phát Âm Từng Từ (Word-by-word Accuracy Coloring)**:
   - Hệ thống so khớp văn bản nói với câu chuẩn:
     - **Từ màu xanh lá**: Phát âm chính xác, dùng đúng từ ngữ.
     - **Từ màu đỏ**: Phát âm sai, thiếu từ hoặc sai cấu trúc.
5. **Báo cáo Kết quả & Cập nhật Tiến độ**:
   - Vòng tròn điểm số (ScoreRing) từ 0–100 điểm.
   - Đánh giá 2 tiêu chí trọng yếu: Dùng đúng chunk mục tiêu (`usedTargetChunk`) và Mức độ dễ hiểu với người nghe (`comprehensible`).
   - Nhận xét tổng quan và gợi ý cải thiện ngữ điệu.
   - **Tự động lưu vào hệ thống SRS**: Kết quả buổi luyện nói được đồng bộ trực tiếp vào chu kỳ Spaced Repetition (`saveSpeakingProgress`).

---

### 4.5 Module Thống kê Tiến độ (`ProgressModule`)

- **Báo cáo tổng quan**: Tổng số chunk đã nạp, số chunk đã "Thành thạo" (Mastered - Level 5+), tổng lượt luyện tập (viết & nói), điểm trung bình toàn bộ bài học.
- **Biểu đồ phân bổ Level SRS**: Thống kê số lượng chunk ở từng tầng trí nhớ (Level 0 đến Level 10+).
- **Danh sách đến hạn ôn tập**: Hiển thị các chunk cần ôn hôm nay kèm đồng hồ đếm ngược thời gian ôn tiếp theo (phút/giờ/ngày).
- **Nút "Luyện lại"**: Bấm để mở ngay bài luyện tập cho bất kỳ chunk nào.

---

### 4.6 Module Cấu hình (`Settings`)

- **Quản lý Dual Gemini API Key**: Cho phép nhập `API Key 1` (Chính) và `API Key 2` (Dự phòng) kèm nút kiểm tra kết nối thời gian thực.
- **Cấu hình Supabase Cloud Sync**: Nhập URL và Anon Key để kích hoạt tính năng đồng bộ đám mây và tài khoản người dùng.
- **Lộ trình SRS (SRS Track Selection)**: Lựa chọn giữa **Track A** (người mới bắt đầu) và **Track B** (người đã có nền tảng) kèm modal xem chi tiết bảng Level Map.
- **Quản lý Thông báo đẩy (Web Push)**: Bật/tắt thông báo 4 lần/ngày kèm nút gửi thông báo thử nghiệm.

---

### 4.7 Module Xác thực & Đám mây (`Auth`)

- Đăng ký, đăng nhập và xác nhận tài khoản qua Supabase Auth.
- Hỗ trợ chế độ **Khách (Guest Mode)**: Người dùng không cần tạo tài khoản vẫn có thể sử dụng đầy đủ 100% tính năng dựa trên LocalStorage.
- Khi đăng nhập thành công, hệ thống tự động đồng bộ 2 chiều: hợp nhất dữ liệu từ LocalStorage lên Cloud và tải dữ liệu Cloud về máy.

---

## 5. Thuật toán & Logic Nghiệp vụ Cốt lõi

### 5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map Track A/B)

Hệ thống ứng dụng thuật toán **SuperMemo SM-2 cải tiến** kết hợp **Leitner Box** để xác định thời điểm chính xác người học sắp quên kiến thức:

```
                  ┌─────────────────────────────────┐
                  │    Người dùng hoàn thành bài    │
                  │   (Chấm Viết hoặc Luyện Nói)    │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │  AI Chấm Điểm (Score: 0 - 100)  │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │    Quy đổi Quality Grade q      │
                  │           (0 đến 5)             │
                  └────────────────┬────────────────┘
                                   │
          ┌────────────────────────┴────────────────────────┐
          │                                                 │
    [q < 3: Chưa đạt]                                 [q >= 3: Đạt]
          │                                                 │
┌─────────▼──────────────┐                        ┌─────────▼──────────┐
│ • Reset Level = 1      │                        │ • Level = Level + 1│
│ • Giảm Ease Factor (EF)│                        │ • Cập nhật EF      │
│ • Khoảng cách ngắn     │                        │ • Tăng Interval    │
└─────────┬──────────────┘                        └─────────┬──────────┘
          │                                                 │
          └────────────────────────┬────────────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │     Tính nextReviewAt           │
                  │     = now + intervalMinutes     │
                  └─────────────────────────────────┘
```

#### 1. Bảng quy đổi Điểm bài viết sang Quality Grade ($q \in [0, 5]$):
- Điểm $\ge 90$: $q = 5$ (Nhớ hoàn hảo, không do dự)
- Điểm $75 - 89$: $q = 4$ (Tốt, nhớ đúng sau thoáng nghĩ)
- Điểm $50 - 74$: $q = 3$ (Đạt yêu cầu)
- Điểm $30 - 49$: $q = 2$ (Chưa đạt, sai nghĩa hoặc sai ngữ pháp nặng)
- Điểm $10 - 29$: $q = 1$ (Sai phần lớn)
- Điểm $< 10$: $q = 0$ (Hoàn toàn không nhớ)

#### 2. Công thức cập nhật Ease Factor ($EF$):
$$EF' = \max\left(1.3, \; EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)\right)$$
*(Mặc định ban đầu: $EF = 2.5$)*

#### 3. Bảng Lộ trình Level Map:
- **Track A (Dành cho người mới bắt đầu — Lặp dày hơn ở giai đoạn đầu)**:
  - Level 0 $\rightarrow$ 1: Sau **15 phút**
  - Level 1 $\rightarrow$ 2: Sau **1 giờ**
  - Level 2 $\rightarrow$ 3: Sau **4 giờ**
  - Level 3 $\rightarrow$ 4: Sau **1 ngày**
  - Level 4 $\rightarrow$ 5: Sau **2 ngày**
  - Level 5 $\rightarrow$ 6: Sau **4 ngày**
  - Level 6 $\rightarrow$ 7: Sau **7 ngày**
  - Level 7 $\rightarrow$ 8: Sau **12 ngày**
  - Level 8 $\rightarrow$ 9: Sau **20 ngày**
  - Level 9 $\rightarrow$ 10: Sau **30 ngày**
  - Level 10+: Nhân **$\times 1.6$** khoảng cách trước (Tối đa 90 ngày $\rightarrow$ chuyển trạng thái `Mastered`).
- **Track B (Dành cho người đã có nền tảng — Giãn cách nhanh hơn)**:
  - Level 0 $\rightarrow$ 1: Sau **3–4 giờ**
  - Level 1 $\rightarrow$ 2: Sau **1 ngày**
  - Level 2 $\rightarrow$ 3: Sau **3 ngày**
  - Level 3 $\rightarrow$ 4: Sau **7 ngày**
  - Level 4 $\rightarrow$ 5: Sau **14 ngày**
  - Level 5 $\rightarrow$ 6: Sau **30 ngày**
  - Level 6 $\rightarrow$ 7: Sau **60 ngày**
  - Level 7 $\rightarrow$ 8: Sau **90 ngày** $\rightarrow$ `Mastered`.

#### 4. Nguyên tắc Tái Sử Dụng Câu Cũ Khi Ôn Tập:
Khi một chunk đến hạn ôn tập (`isDueForReview`), hệ thống **tái sử dụng 100% bộ câu mẫu đã tạo trước đó**, tuyệt đối **không gọi AI sinh câu mới**. Điều này giúp:
- Khắc sâu cùng một cấu trúc vào phản xạ dài hạn.
- Thực hành phương pháp Active Recall chuẩn mực.
- Tiết kiệm 100% chi phí và hạn ngạch API trong các phiên ôn tập lặp lại.

---

### 5.2 Chu kỳ SRS & Logic Đánh giá cho Buổi Luyện Nói (Speaking SRS Lifecycle)

Kết quả từ phòng luyện nói AI (`SpeakingSession`) được tính toán riêng biệt thông qua hàm `computeQualityFromSpeaking(speakingResult)` và `updateSRSAfterSpeaking`:

1. **Quy tắc tính Quality Grade ($q$) cho bài Nói**:
   - **Bắt buộc dùng đúng chunk**: Nếu người học không dùng đúng chunk mục tiêu (`usedTargetChunk = false`), dù nói trôi chảy câu khác, điểm chất lượng bị phạt xuống $q \le 2$ (Chưa đạt).
   - **Mức độ dễ hiểu (`comprehensible`)**: Nếu phát âm bị biến dạng khiến AI không thể nhận diện được nghĩa cơ bản $\rightarrow q = 2$.
   - Khi thỏa mãn dùng đúng chunk và phát âm nhận diện được:
     - Điểm $\ge 90$: $q = 5$
     - Điểm $75 - 89$: $q = 4$
     - Điểm $50 - 74$: $q = 3$
     - Điểm $< 50$: $q = 2$
2. **Cập nhật dữ liệu SRS**:
   - Gọi `calculateNextReview` với Quality Grade vừa tính để gia hạn `nextReviewAt`.
   - Lưu trữ lịch sử 5 lần luyện nói gần nhất trong mảng `speakingHistory` của chunk đó.
   - Gắn cờ trạng thái `review_mode: 'speaking_first'` để ghi nhận chunk được củng cố bằng giọng nói.

---

### 5.3 Quản lý Quota AI: Dual API Key, Model Candidates & Batch Optimization

Để đảm bảo ứng dụng vận hành mượt mà trên các gói Google AI Studio Free Tier (vốn có giới hạn RPD và RPM nghiêm ngặt):

1. **Cơ chế Xoay Vòng Hai Key (Dual Key Rotator)**:
   - Ứng dụng ưu tiên thực hiện request với `Key 1`.
   - Nếu gặp lỗi `429 (ResourceExhausted)` hoặc hết hạn ngạch ngày, hệ thống tự động đánh dấu và chuyển sang `Key 2` ngay lập tức mà không làm gián đoạn trải nghiệm người học.
2. **Danh sách Model Dự Phòng (Candidate Models Fallback)**:
   Hệ thống lần lượt thử nghiệm danh sách các model tối ưu:
   ```
   1. gemini-2.5-flash-lite  (Ưu tiên hàng đầu: RPD 500/ngày, độ trễ cực thấp)
   2. gemini-2.0-flash-lite
   3. gemini-2.0-flash
   4. gemini-1.5-flash
   5. Dynamic Fallback       (Tự động gọi models.list để tìm model Flash khả dụng)
   ```
3. **Sinh Chunk Chia Lô (Batch Generation 10 từ/lần)**:
   Khi sinh chunk cho kho từ vựng, hệ thống chia danh sách thành từng batch 10 từ để gửi cho Gemini, tối ưu thời gian chờ và tránh vượt giới hạn token trên mỗi request.
4. **Hàng đợi Sinh Bài Viết Tuần Tự (Sequential Queue)**:
   Sau khi trích xuất chunks từ transcript, ứng dụng sinh bài tập lần lượt từng chunk kèm thanh tiến độ thay vì bắn hàng loạt request song song, triệt tiêu nguy cơ lỗi 429.

---

### 5.4 Chấm điểm Dịch Câu Hàng loạt (Batch Grading Optimization)

Thay vì gửi 3 request độc lập cho 3 câu dịch trong một chunk (lãng phí 3 lần chi phí kết nối mạng và token context):
- Hàm `gradeWritingBatch(chunk, filledItems, apiKey)` gom tất cả các câu người dùng đã làm vào **1 request duy nhất**.
- AI chấm song song và trả về cấu trúc JSON chứa mảng kết quả `results[]`.
- **Hiệu quả**: Giảm **66%** lượng request, tăng tốc độ trả kết quả gấp 3 lần và tiết kiệm tối đa quota API.

---

### 5.5 Thông báo Đẩy 4 Khung Giờ Vàng (Service Worker & Web Push)

Hệ thống thiết lập 4 thời điểm thông báo đẩy nhắc nhở ôn tập cố định trong ngày theo nhịp sinh học học tập:

| Khung giờ | Tiêu đề thông báo | Mục đích & Ngữ cảnh |
|---|---|---|
| **08:00 (Sáng)** | `🌅 Buổi sáng: Có N chunk TOEIC cần ôn tập!` | 5 phút khởi động não bộ đầu ngày mới. |
| **12:00 (Trưa)** | `☀️ Nghỉ trưa: Ôn lại N chunk TOEIC nào!` | Tận dụng giờ nghỉ trưa để luyện phản xạ nhanh. |
| **18:00 (Chiều)** | `🌆 Chiều tối: Có N chunk đang chờ bạn ôn!` | Củng cố kiến thức sau giờ tan làm/tan học. |
| **21:00 (Tối)** | `🌙 Buổi tối: Hoàn thành N chunk trước khi ngủ!` | Ôn tập nhẹ nhàng trước khi ngủ giúp não bộ ghi nhớ sâu. |

- **Nguyên tắc hoạt động**:
  - Service Worker (`public/sw.js`) hoặc App kiểm tra định kỳ mỗi 1 phút.
  - Mỗi khung giờ chỉ phát **duy nhất 1 thông báo/ngày** nếu có chunk đến hạn ôn (`dueChunks.length > 0`).
  - Nếu người học đã hoàn thành hết bài trong khung giờ đó, ứng dụng hoàn toàn im lặng, không làm phiền.
  - Khi click vào thông báo, ứng dụng tự động mở và chuyển thẳng đến tab Luyện tập.

---

### 5.6 Quản lý Trạng thái & Tự động Lưu Bản Nháp (Draft Auto-Save & Persistent State)

1. **Persistent Component Mounting**:
   - Các component `PracticeModule` và `VocabModule` được giữ nguyên trạng thái trong DOM tree (ẩn bằng CSS `display: none` khi chuyển tab) thay vì bị unmount hoàn toàn.
   - Người học có thể chuyển đổi giữa các tab `Từ vựng`, `Transcripts`, `Progress` mà không bị mất câu đang viết dở hay vị trí bài học.
2. **Lưu Nháp Tự Động Từng Ký Tự (`savePracticeDraft`)**:
   - Toàn bộ nội dung người học nhập vào ô dịch, trạng thái mở câu mẫu và kết quả chấm bài được tự động lưu realtime vào `localStorage` theo từng `chunkId`.
   - Khi F5 tải lại trang hoặc đóng trình duyệt mở lại, 100% dữ liệu đang làm được khôi phục nguyên vẹn.
   - Khi người học bấm nút **`Viết lại`** (`RotateCcw`), bản nháp của riêng chunk đó mới được dọn sạch.

---

## 6. Mô hình Dữ liệu (Data Model)

### 6.1 LocalStorage Schema

| Key | Kiểu dữ liệu | Mô tả chi tiết |
|---|---|---|
| `toeic_transcripts` | `Record<string, Transcript>` | Lưu danh sách đoạn hội thoại Part 3/4 đã phân tích. |
| `toeic_chunks` | `Record<string, Chunk[]>` | Danh sách các chunk theo `transcriptId` hoặc `wordId`. |
| `toeic_situations` | `Record<string, Exercise[]>` | Bộ 3 bài luyện dịch (Cơ bản, Trung cấp, Nâng cao) của từng `chunkId`. |
| `toeic_progress` | `Record<string, Progress>` | Tiến độ học: `practiceCount`, `successCount`, `lastScore`, `srsLevel`, `nextReviewAt`, `intervalMinutes`, `easeFactor`, `lastFeedback` (chứa `speakingHistory`). |
| `toeic_practice_drafts` | `Record<string, Draft>` | Bản nháp realtime (inputs gõ dở, kết quả chấm, showSamples) theo `chunkId`. |
| `toeic_settings` | `Settings` | Cấu hình API keys, Supabase credentials, `srsTrack` ('track_a'/'track_b'), `notificationsEnabled`. |
| `toeic_vocab_learned` | `Record<string, LearnedVocab>` | Danh sách các từ vựng trong kho 5000 từ đã hoàn thành. |
| `toeic_vocab_daily` | `string[]` | Danh sách `wordId` của phiên học trong ngày. |

---

### 6.2 Supabase Cloud Database Schema (Tuỳ chọn)

Khi người dùng cấu hình Supabase, hệ thống sẽ đồng bộ dữ liệu với 4 bảng:

```sql
-- 1. Bảng Transcripts
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  part TEXT NOT NULL,
  theme TEXT,
  theme_vi TEXT,
  theme_description TEXT,
  created_at BIGINT NOT NULL
);

-- 2. Bảng Chunks
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  transcript_id TEXT REFERENCES transcripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  meaning_vi TEXT NOT NULL,
  type TEXT NOT NULL,
  formality TEXT,
  group_id TEXT,
  group_name TEXT,
  usage_note TEXT,
  original_sentence TEXT,
  another_example TEXT,
  created_at BIGINT NOT NULL
);

-- 3. Bảng Situations / Writing Exercises
CREATE TABLE situations (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  situations JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 4. Bảng User Progress & SRS Tracking
CREATE TABLE progress (
  chunk_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  last_score INT,
  last_practiced BIGINT,
  last_feedback JSONB, -- Chứa srsLevel, srsTrack, easeFactor, intervalMinutes, nextReviewAt, status, speakingHistory
  updated_at BIGINT NOT NULL
);
```

---

## 7. Hướng dẫn Cài đặt & Vận hành

### Yêu cầu môi trường:
- **Node.js**: $\ge 18.0.0$
- **npm** hoặc **pnpm / yarn**
- **Google Gemini API Key** (Miễn phí từ [Google AI Studio](https://aistudio.google.com/))

### Các bước cài đặt:

1. **Clone repository**:
   ```bash
   git clone https://github.com/deV-inh08/chunking_method.git
   cd speaking_chunk
   ```

2. **Cài đặt thư viện phụ thuộc**:
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường (Tuỳ chọn)**:
   Tạo file `.env` tại thư mục gốc:
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
   *(Lưu ý: Bạn hoàn toàn có thể nhập API Key trực tiếp trong màn hình Settings của ứng dụng mà không bắt buộc phải tạo file `.env`)*

4. **Khởi chạy máy chủ phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại địa chỉ: `http://localhost:5173`

5. **Kiểm tra linter & Build Production**:
   ```bash
   # Kiểm tra lint bằng oxlint siêu tốc
   npm run lint

   # Đóng gói sản phẩm cho production
   npm run build

   # Xem thử bản build production trên local
   npm run preview
   ```

---

## 8. Trạng thái Hoàn thiện & Lộ trình Phát triển

### Các tính năng đã hoàn thiện:
- [x] **Trích xuất Chunk từ Transcript TOEIC Part 3 & Part 4** với phân nhóm ngữ cảnh thông minh.
- [x] **Thư viện 5000 Từ Vựng Cốt Lõi** chia theo chủ đề với quy trình 3 màn hình chuyên sâu.
- [x] **Sinh chunk chia lô (Batch Generation 10 từ)** giúp hạn chế tối đa lỗi nghẽn API.
- [x] **Luyện dịch câu 3 cấp độ (Active Recall)** với gợi ý từ vựng và giải thích thì ngữ pháp.
- [x] **Chấm điểm AI hàng loạt (Batch Grading Optimization)** giảm 66% request gọi Gemini.
- [x] **Phòng Luyện Nói Phản Xạ AI Thời Gian Thực (`SpeakingSession`)**:
  - 5 giọng đọc bản xứ (Anh-Mỹ, Anh-Anh, Anh-Úc).
  - Audio Wave Visualizer hiển thị sóng âm nhấp nhô theo giọng nói.
  - Phân tích và tô màu chính xác từng từ phát âm (Xanh = Đúng, Đỏ = Sai).
  - Đánh giá sử dụng đúng chunk mục tiêu và độ dễ hiểu.
- [x] **Thuật toán Spaced Repetition (SuperMemo SM-2 & Leitner Box)**:
  - Tự động tính toán chu kỳ ôn tập cho cả bài Luyện Viết và bài Luyện Nói.
  - Tái sử dụng 100% câu cũ khi ôn tập để rèn phản xạ tự nhiên và tiết kiệm quota.
- [x] **Hệ thống Thông báo Đẩy Web Push 4 lần/ngày** theo các khung giờ vàng sinh học.
- [x] **Giao diện Mục lục Bài học phân cấp (Course Outline Accordion)** hỗ trợ cả Desktop lẫn Mobile.
- [x] **Cơ chế lưu bản nháp Realtime (Draft Auto-Save)** không lo mất bài khi F5.
- [x] **Hỗ trợ Dual Gemini API Key & Model Candidates Fallback** ổn định cao trên Free Tier.

### Lộ trình phát triển tiếp theo (Roadmap):
- [ ] Thêm nút **"🎙️ Luyện nói ngay"** trực tiếp trên từng card từ vựng tại màn hình `VocabModule`.
- [ ] Mở rộng chế độ hội thoại hai chiều liên tục (Multi-turn Voice Conversation) qua giao thức Gemini Live WebSocket.
- [ ] Chế độ Shadowing (nghe câu mẫu và nhại lại theo nhịp điệu bản xứ).

---
*Dự án được xây dựng và phát triển với tâm huyết nâng tầm phương pháp học phản xạ tiếng Anh TOEIC.*
