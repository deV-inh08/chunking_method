# 🎧 TOEIC Chunk Trainer — Luyện Phản Xạ Tiếng Anh Theo Phương Pháp Chunking

> **Dự án**: `TOEIC Chunk Trainer` (Tên package: `speaking_chunk`)  
> **Mục tiêu**: Giúp người học tiếng Anh (đặc biệt là TOEIC Speaking & Listening Part 3/4) phát triển phản xạ tự nhiên thông qua phương pháp **Chunking** (học theo cụm từ có nghĩa thay vì từ vựng đơn lẻ), kết hợp **Trí tuệ nhân tạo (Google Gemini AI)** và **Thuật toán lặp lại ngắt quãng (Spaced Repetition System - SM-2)**.

---

## 📑 MỤC LỤC

1. [Tổng quan dự án & Triết lý sản phẩm](#1-tổng-quan-dự-án--triết-lý-sản-phẩm)
2. [Kiến trúc Công nghệ (Tech Stack)](#2-kiến-trúc-công-nghệ-tech-stack)
3. [Cấu trúc Thư mục Codebase](#3-cấu-trúc-thư-mục-codebase)
4. [Các Module & Tính năng Nghiệp vụ](#4-các-module--tính-năng-nghiệp-vụ)
   - [4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)](#41-module-5000-từ-vựng-cốt-lõi-vocabmodule)
   - [4.2 Module Phân tích Transcript (`TranscriptModule`)](#42-module-phân-tích-transcript-transcriptmodule)
   - [4.3 Module Quản lý Chunk (`ChunkModule`)](#43-module-quản-lý-chunk-chunkmodule)
   - [4.4 Module Luyện Viết Dịch Câu & Chấm AI (`PracticeModule`)](#44-module-luyện-viết-dịch-câu--chấm-ai-practicemodule)
   - [4.5 Module Thống kê Tiến độ (`ProgressModule`)](#45-module-thống-kê-tiến-độ-progressmodule)
   - [4.6 Module Cấu hình (`Settings`)](#46-module-cấu-hình-settings)
   - [4.7 Module Xác thực & Đám mây (`Auth`)](#47-module-xác-thực--đám-mây-auth)
5. [Thuật toán & Logic Nghiệp vụ Cốt lõi](#5-thuật-toán--logic-nghiệp-vụ-cốt-lõi)
   - [5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map)](#51-thuật-toán-spaced-repetition-srs-sm-2--level-map)
   - [5.2 Quản lý Quota AI: Dual API Key & Model Fallback](#52-quản-lý-quota-ai-dual-api-key--model-fallback)
   - [5.3 Chấm điểm AI Hàng loạt (Batch Grading Optimization)](#53-chấm-điểm-ai-hàng-loạt-batch-grading-optimization)
   - [5.4 Thông báo Đẩy 4 Khung Giờ Vàng (Service Worker & Web Push)](#54-thông-báo-đẩy-4-khung-giờ-vàng-service-worker--web-push)
   - [5.5 Quản lý Trạng thái & Tự động Lưu Bản Nháp (Draft Auto-Save)](#55-quản-lý-trạng-thái--tự-động-lưu-bản-nháp-draft-auto-save)
6. [Mô hình Dữ liệu (Data Model)](#6-mô-hình-dữ-liệu-data-model)
7. [Hướng dẫn Cài đặt & Chạy ứng dụng](#7-hướng-dẫn-cài-đặt--chạy-ứng-dụng)

---

## 1. Tổng quan dự án & Triết lý sản phẩm

### Vấn đề của người học tiếng Anh:
- Học từ vựng đơn lẻ (word-by-word) dẫn đến phản xạ chậm, ghép từ sai ngữ pháp, câu văn gượng gạo ("Viet-lish").
- Khi nghe hoặc đọc transcript TOEIC Part 3/Part 4, người học nắm được ý chính nhưng không biến các cụm từ đắt giá trong bài thành vốn từ chủ động (active vocabulary) của bản thân.
- Thiếu cơ chế nhắc nhở ôn tập ngắt quãng khoa học dẫn đến hiện tượng "học trước quên sau" theo đường cong quên lãng (Ebbinghaus Forgetting Curve).

### Giải pháp của TOEIC Chunk Trainer:
1. **Trích xuất Chunk thông minh**: AI tự động trích xuất các **Collocations**, **Functional Phrases**, **Connectors** từ transcript hoặc từ vựng gốc.
2. **Luyện dịch 3 cấp độ (Active Recall)**: Người học tự dịch 3 câu tiếng Việt $\rightarrow$ Anh với độ khó tăng dần (Cơ bản $\rightarrow$ Trung cấp $\rightarrow$ Nâng cao) chứa chunk mục tiêu.
3. **Chấm bài AI thời gian thực**: AI kiểm tra việc sử dụng chunk, tính chính xác của nghĩa, phân tích lỗi ngữ pháp và gợi ý cách diễn đạt tự nhiên chuẩn bản xứ.
4. **Spaced Repetition System (SRS)**: Thuật toán tự động lên lịch nhắc ôn tập theo chu kỳ ngắt quãng, tự động dùng lại bộ câu cũ đã học để khắc sâu phản xạ.

---

## 2. Kiến trúc Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng | Mô tả & Vai trò |
|---|---|---|
| **Frontend Core** | **React 19** (`react`, `react-dom`) | Single Page Application (SPA), React hooks, useMemo, useCallback. |
| **Build Tool & Dev Server** | **Vite 8** (`@vitejs/plugin-react`) | Bundler siêu tốc, Hot Module Replacement (HMR). |
| **Icons** | **lucide-react** | Hệ thống biểu tượng UI hiện đại, đồng bộ. |
| **Linter & Code Quality** | **oxlint** | Linter viết bằng Rust siêu nhanh, kiểm tra cú pháp và hook deps. |
| **Styling** | **Pure CSS + CSS Variables** (`src/index.css`) | Thiết kế responsive hoàn toàn (Desktop, Tablet, Mobile), Theme Dark/Elevated, Glassmorphism. Không phụ thuộc Tailwind/Bootstrap. |
| **AI Processing** | **Google Gemini API** (`@google/genai` qua Direct REST Fetch) | Các model: `gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`, `gemini-1.5-pro`. |
| **Database & Auth (Cloud Sync)** | **Supabase JS Client** (`@supabase/supabase-js`) | Lưu trữ đám mây Postgres (Transcripts, Chunks, Progress, Situations), Supabase Auth. |
| **Browser APIs** | **Web Speech API** (`SpeechSynthesis`, `SpeechRecognition`), **Notification API**, **Service Worker** (`public/sw.js`) | Phát âm câu mẫu (TTS), Nhận diện giọng nói (STT), Thông báo đẩy màn hình (Web Push). |
| **Architecture Paradigm** | **Offline-First & Hybrid Cloud Sync** | Hoạt động 100% độc lập qua `LocalStorage` khi không có Supabase; tự động đồng bộ 2 chiều khi người dùng đăng nhập. |

---

## 3. Cấu trúc Thư mục Codebase

```
speaking_chunk/
├── public/
│   ├── favicon.svg             # Favicon ứng dụng
│   ├── manifest.json           # Cấu hình PWA (Progressive Web App)
│   └── sw.js                   # Service Worker xử lý Push Notification & Cache
├── data/
│   └── vocab_5000.json         # Cơ sở dữ liệu 5000 từ vựng TOEIC theo 12+ chủ đề
├── scripts/
│   ├── import-vocab.js         # Script đồng bộ từ vựng JSON lên Supabase database
│   └── generate-chunks-batch.js # Script chạy nền sinh chunk tự động cho kho từ vựng
├── src/
│   ├── main.jsx                # Entry point React DOM
│   ├── App.jsx                 # Bộ điều phối trung tâm: Routing, State, Notifications, Cloud Sync
│   ├── index.css               # Hệ thống Style toàn app, Responsive Breakpoints, Dark Theme
│   ├── components/
│   │   ├── Auth/               # Modal Đăng nhập / Đăng ký Supabase Auth
│   │   ├── ChunkModule/        # Quản lý, hiển thị, lọc danh sách Chunk
│   │   ├── Layout/             # Header, Sidebar, Bottom Navigation bar (Mobile)
│   │   ├── PracticeModule/     # Giao diện Luyện viết, Chấm điểm AI, Course Accordion
│   │   ├── ProgressModule/     # Báo cáo tiến độ học tập, Thống kê SRS, Tỷ lệ nhớ
│   │   ├── Settings/           # Cấu hình Dual API Key, Supabase, SRS Track, Level Map Modal
│   │   ├── TranscriptModule/   # Nhập & Phân tích transcript TOEIC Part 3/4
│   │   ├── VocabModule/        # Học 5000 từ vựng cốt lõi, Daily Session, Sinh chunk từ vựng
│   │   └── ui/                 # Reusable UI: Modal, Badge, Spinner, EmptyState, ErrorBoundary
│   ├── hooks/
│   │   ├── useAuth.js          # Hook theo dõi phiên đăng nhập Supabase
│   │   ├── useSpeech.js        # Hook giao tiếp Web Speech Recognition
│   │   └── useStorage.js       # Hook đồng bộ state với LocalStorage
│   ├── services/
│   │   ├── ai.js               # Service gọi Gemini API, Prompt Engineering, Dual Key Rotator
│   │   ├── notifications.js    # Service quản lý Thông báo đẩy (4 khung giờ vàng/ngày)
│   │   ├── speech.js           # Xử lý Audio Text-to-Speech & Speech Matching
│   │   ├── srs.js              # Thuật toán Spaced Repetition (SuperMemo SM-2 & Leitner)
│   │   └── supabase.js         # REST CRUD thao tác cơ sở dữ liệu Supabase
│   └── store/
│       └── storage.js          # Lớp trừu tượng dữ liệu (Data Access Layer), LocalStorage + Sync Cloud
├── package.json
├── vite.config.js
└── README.md
```

---

## 4. Các Module & Tính năng Nghiệp vụ

### 4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)
- **Kho dữ liệu chuẩn**: Tích hợp sẵn 5000 từ vựng TOEIC trọng tâm phân theo các chủ đề: *Business & Management, Office & Workplace, Human Resources, Finance & Banking, Marketing & Sales, Logistics & Supply Chain, Technology, Travel & Hospitality,...*
- **Chế độ Học theo ngày (Daily Session)**: Mỗi ngày hệ thống chọn lọc 10 từ vựng mục tiêu để người học không bị quá tải.
- **Trích xuất Chunk thực chiến từ Từ Vựng (`generateVocabChunks`)**:
  - Khi chọn 1 từ vựng (ví dụ: `invest`), AI tự động sinh **3 chunks tự nhiên** (ví dụ: `invest time and money`, `invest in the future`, `invest heavily in`).
  - Mỗi chunk có nghĩa tiếng Việt, câu ví dụ và bối cảnh sử dụng.
- **Tự động sinh bài tập**: Bấm *"Luyện viết với chunk"* sẽ chuyển mượt mà sang `PracticeModule`.

### 4.2 Module Phân tích Transcript (`TranscriptModule`)
- Dành cho người học luyện nghe/đọc TOEIC Part 3 (Short Conversations) và Part 4 (Short Talks).
- **Phân tích ngữ cảnh (`analyzeTranscript`)**:
  - AI xác định chủ đề tiếng Anh/Việt, phân chia transcript thành 2–4 tình huống giao tiếp.
  - Tách từ 6–12 chunks trọng tâm (Collocations, Functional, Connectors).
  - Tự động kích hoạt hàng đợi sinh bài luyện dịch (`auto-generate`) ngay sau khi phân tích xong.

### 4.3 Module Quản lý Chunk (`ChunkModule`)
- Hiển thị danh sách tất cả các chunks đã trích xuất từ các đoạn transcript.
- Lọc theo loại chunk (`Collocation`, `Functional`, `Connector`) hoặc theo đoạn Transcript.
- Thẻ Chunk chi tiết: hiển thị câu gốc trong bài thi, câu ví dụ mở rộng, ghi chú ngữ pháp.
- Người dùng có thể chọn hàng loạt chunk (`Select Chunks`) để bắt đầu buổi luyện tập.

### 4.4 Module Luyện Viết Dịch Câu & Chấm AI (`PracticeModule`)
- **Cấu trúc Bài Luyện theo Chunk**:
  Mỗi chunk bao gồm **3 bài dịch câu Việt $\rightarrow$ Anh** theo cấp độ bậc thang:
  1. **★ Cơ bản**: Câu ngắn ($\le 10$ từ), 1 mệnh đề, thì cơ bản (Present Simple, Past Simple), 0–2 gợi ý từ vựng.
  2. **★★ Trung cấp**: Câu 10–15 từ, có trạng từ/thời gian, thì phức hợp hơn (Present Continuous, Future Simple), 2–3 gợi ý.
  3. **★★★ Nâng cao**: Câu ghép 15–20 từ, mệnh đề quan hệ/nguyên nhân, thì nâng cao (Present Perfect, Modal Verbs), 4–5 gợi ý.
- **Giao diện Mục lục Bài học phân cấp (Course Outline Accordion)**:
  - Gom nhóm tự động theo Từ vựng (VD: `invest` $\rightarrow$ 3 chunks) hoặc theo Transcript (`Part 3 - Contract Negotiation` $\rightarrow$ 4 chunks).
  - **Laptop**: Sidebar Accordion hiển thị cây thư mục bài học như các nền tảng học online (F8, Udemy), có dấu tích xanh hoàn thành, điểm số, badge ôn tập.
  - **Mobile**: Chapter Bar trên cùng kèm nút `[Mục lục bài học]` mở Bottom Sheet Drawer; nút `← Chunk trước` / `Chunk tiếp theo →` chuyển bài nhanh chóng.
- **Khối Chấm bài AI Cố định (Non-floating)**:
  - Nằm ở cuối cùng sau 3 bài tập, không đè hay che khuất ô gõ chữ của người dùng.
- **Chấm bài AI (`gradeWritingBatch`)**:
  - Gửi toàn bộ câu đã điền trong 1 request duy nhất để chấm điểm.
  - Phân tích: Sử dụng đúng chunk (`usedChunk`), Đúng nghĩa (`correct`), Điểm số (0–100đ), Lỗi ngữ pháp chi tiết (`grammarErrors`), Gợi ý diễn đạt tự nhiên bản xứ (`naturalSuggestion`).
- **Phát âm & Phân tích cấu trúc (TTS & Breakdown)**:
  - Tích hợp giọng đọc bản xứ qua Web Speech API.
  - Hiển thị bảng bóc tách cấu trúc từng thành phần trong câu mẫu.

### 4.5 Module Thống kê Tiến độ (`ProgressModule`)
- Tổng quan chỉ số: Tổng số chunk đã học, số chunk đã thành thạo (Mastered - Level 5+), tổng lượt luyện, điểm trung bình.
- Biểu đồ phân bổ Level SRS (từ Level 0 đến Level 10+).
- Danh sách chunk cần ôn tập hôm nay kèm bộ đếm ngược thời gian ôn tiếp theo.
- Nút *"Luyện lại"* để người học ôn tập lại bất kỳ chunk nào.

### 4.6 Module Cấu hình (`Settings`)
- Quản lý **Dual Gemini API Keys** (Key 1 và Key 2) kèm nút Test kết nối.
- Cấu hình kết nối Supabase Cloud Sync (URL + Anon Key).
- Lựa chọn lộ trình SRS (**Track A** cho người mới, **Track B** cho người có nền tảng) kèm Modal Bảng Level Map.
- Quản lý bật/tắt Thông báo đẩy Web Push 4 lần/ngày kèm nút kiểm tra thông báo.

### 4.7 Module Xác thực & Đám mây (`Auth`)
- Hỗ trợ Đăng ký / Đăng nhập / Đăng xuất tài khoản qua Supabase Auth (Email + Password).
- Tự động merge dữ liệu LocalStorage lên tài khoản đám mây khi đăng nhập và tải dữ liệu đám mây về khi mở ứng dụng trên thiết bị mới.

---

## 5. Thuật toán & Logic Nghiệp vụ Cốt lõi

### 5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map)
Hệ thống sử dụng phiên bản cải tiến của thuật toán **SuperMemo SM-2** kết hợp **Leitner Box System** để tính toán thời điểm ôn tập tối ưu cho từng chunk.

```
                  ┌──────────────────────┐
                  │   Người dùng nộp bài  │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │    AI Chấm Điểm      │
                  │   (Score: 0 - 100)   │
                  └──────────┬───────────┘
                             │
               ┌─────────────┴─────────────┐
               │  Quy đổi Quality Grade q  │
               │        (0 đến 5)          │
               └─────────────┬─────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
   [q < 3: Chưa đạt]                       [q >= 3: Đạt]
         │                                       │
┌────────▼──────────────┐             ┌──────────▼──────────┐
│ - Reset Level = 1     │             │ - Level = Level + 1 │
│ - Giảm Ease Factor    │             │ - Cập nhật EF       │
│ - Interval ngắn nhất  │             │ - Tăng Interval     │
└────────┬──────────────┘             └──────────┬──────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                  ┌──────────▼───────────┐
                  │ Tính nextReviewAt    │
                  │ = now + interval     │
                  └──────────────────────┘
```

#### 1. Bảng quy đổi Điểm số sang Quality ($q \in [0, 5]$):
- Điểm $\ge 90$: $q = 5$ (Xuất sắc, nhớ hoàn hảo)
- Điểm $75 - 89$: $q = 4$ (Tốt, nhớ đúng sau thoáng nghĩ)
- Điểm $50 - 74$: $q = 3$ (Đạt yêu cầu)
- Điểm $30 - 49$: $q = 2$ (Chưa đạt, sai nghĩa hoặc ngữ pháp nặng)
- Điểm $10 - 29$: $q = 1$ (Sai phần lớn)
- Điểm $< 10$: $q = 0$ (Không nhớ gì)

#### 2. Công thức cập nhật Ease Factor ($EF$):
$$EF' = \max\left(1.3, \; EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)\right)$$
*(Mặc định $EF = 2.5$)*

#### 3. Bảng Lộ trình Level Map (Track A vs Track B):
- **Track A (Người mới bắt đầu)**:
  - Level 0 $\rightarrow$ 1: Sau **15 phút** (cùng buổi học)
  - Level 1 $\rightarrow$ 2: Sau **1 giờ** (cùng ngày)
  - Level 2 $\rightarrow$ 3: Sau **4 giờ** (buổi tối)
  - Level 3 $\rightarrow$ 4: Sau **1 ngày** (sáng hôm sau)
  - Level 4 $\rightarrow$ 5: Sau **2 ngày**
  - Level 5 $\rightarrow$ 6: Sau **4 ngày**
  - Level 6 $\rightarrow$ 7: Sau **7 ngày**
  - Level 7 $\rightarrow$ 8: Sau **12 ngày**
  - Level 8 $\rightarrow$ 9: Sau **20 ngày**
  - Level 9 $\rightarrow$ 10: Sau **30 ngày**
  - Level 10+: Nhân **$\times 1.6$** khoảng cách trước (Tối đa 90 ngày $\rightarrow$ chuyển trạng thái `Mastered`).
- **Track B (Người đã có nền tảng)**:
  - Level 0 $\rightarrow$ 1: Sau **3-4 giờ** (trong ngày)
  - Level 1 $\rightarrow$ 2: Sau **1 ngày**
  - Level 2 $\rightarrow$ 3: Sau **3 ngày**
  - Level 3 $\rightarrow$ 4: Sau **7 ngày**
  - Level 4 $\rightarrow$ 5: Sau **14 ngày**
  - Level 5 $\rightarrow$ 6: Sau **30 ngày**
  - Level 6 $\rightarrow$ 7: Sau **60 ngày**
  - Level 7 $\rightarrow$ 8: Sau **90 ngày**
  - Level 8+: Nhân **$\times 2.0$** khoảng cách trước.

#### 4. Nguyên tắc Tái sử dụng Câu cũ khi Ôn tập:
Khi một chunk đến hạn ôn tập (`isDueForReview`), hệ thống **tái sử dụng 100% bộ 3 câu mẫu đã tạo trước đó**, tuyệt đối **không gọi AI sinh câu mới** nhằm:
- Đảm bảo tính nhất quán trong phản xạ câu.
- Tối đa hóa hiệu quả của phương pháp Active Recall.
- Tiết kiệm 100% chi phí và hạn ngạch (quota) AI khi ôn tập.

---

### 5.2 Quản lý Quota AI: Dual API Key & Model Fallback

Để giải quyết triệt để vấn đề giới hạn tốc độ (Rate Limit / Error 429) trên các gói Google AI Studio Free Tier:

1. **Hỗ trợ 2 API Key độc lập**: Người dùng có thể cấu hình `API Key 1` (Chính) và `API Key 2` (Dự phòng).
2. **Cơ chế xoay vòng thông minh (Key Rotator)**:
   - Request luôn ưu tiên chạy trên Key 1.
   - Khi Key 1 gặp lỗi `429 (ResourceExhausted)` hoặc `Quota Exceeded`, hệ thống tự động đánh dấu và chuyển sang Key 2 mà không làm gián đoạn trải nghiệm người dùng.
3. **Danh sách Candidate Models Fallback**:
   Hệ thống tự động thử nghiệm danh sách các model tối ưu theo thứ tự:
   ```
   1. gemini-2.5-flash-lite  (Ưu tiên: RPD 500/ngày, tốc độ cao)
   2. gemini-2.0-flash-lite
   3. gemini-2.0-flash
   4. gemini-1.5-flash
   5. Dynamic Model Discovery (Tự gọi models.list để tìm model Flash khả dụng)
   ```

---

### 5.3 Chấm điểm AI Hàng loạt (Batch Grading Optimization)

Thay vì gửi 3 request độc lập cho 3 câu dịch trong 1 chunk (lãng phí 3 lần chi phí kết nối mạng và token context):
- Hàm `gradeWritingBatch(chunk, filledItems, apiKey)` đóng gói toàn bộ các câu người dùng đã viết vào **1 prompt JSON duy nhất**.
- AI chấm song song và trả về mảng kết quả `results[]` trong một phản hồi duy nhất.
- **Hiệu quả**: Giảm **66%** số lượng request AI, tăng tốc độ phản hồi lên gấp 3 lần, tiết kiệm tối đa quota API.

---

### 5.4 Thông báo Đẩy 4 Khung Giờ Vàng (Service Worker & Web Push)

Thay vì gửi thông báo rải rác làm phiền người học, hệ thống thiết lập **4 khung giờ vàng ôn tập cố định trong ngày**:

| Khung giờ | Tiêu đề thông báo mẫu | Mục đích & Ngữ cảnh |
|---|---|---|
| **08:00 (Sáng)** | `🌅 Buổi sáng: Có N chunk TOEIC cần ôn tập!` | Khởi đầu ngày mới với 5 phút ôn tập củng cố trí nhớ dài hạn. |
| **12:00 (Trưa)** | `☀️ Nghỉ trưa: Ôn lại N chunk TOEIC nào!` | Tận dụng giờ nghỉ trưa để luyện dịch phản xạ nhanh. |
| **18:00 (Chiều)** | `🌆 Chiều tối: Có N chunk đang chờ bạn ôn!` | Ôn tập củng cố sau giờ tan làm / tan học. |
| **21:00 (Tối)** | `🌙 Buổi tối: Hoàn thành N chunk trước khi ngủ!` | Ôn tập nhẹ nhàng trước khi ngủ giúp não bộ củng cố ký ức dài hạn. |

- **Nguyên tắc hoạt động**:
  - Hệ thống kiểm tra định kỳ mỗi 1 phút khi ứng dụng đang mở hoặc qua Service Worker (`public/sw.js`).
  - Mỗi khung giờ chỉ phát **đúng 1 thông báo duy nhất trong ngày** nếu có chunk đến hạn ôn (`dueChunks > 0`).
  - Nếu khung giờ đó người dùng đã hoàn thành hết bài, hệ thống hoàn toàn im lặng.

---

### 5.5 Quản lý Trạng thái & Tự động Lưu Bản Nháp (Draft Auto-Save)

Giải quyết vấn đề mất dữ liệu khi người dùng chuyển tab hoặc lỡ tay tải lại trang:
1. **Persistent Component Mounting**:
   - Component `PracticeModule` và `VocabModule` được giữ nguyên trong DOM tree (ẩn bằng CSS `display: none` khi chuyển trang) thay vì bị unmount hoàn toàn. Người dùng chuyển qua lại giữa các tab `Từ vựng`, `Chunks`, `Transcripts`, `Progress` mà không mất vị trí bài học hay câu đang gõ.
2. **Per-chunk Local Storage Drafts (`savePracticeDraft`)**:
   - Mọi ký tự người dùng gõ vào ô dịch, trạng thái mở câu mẫu và kết quả chấm điểm AI được tự động lưu realtime vào `localStorage` theo từng `chunkId`.
   - Dù người dùng chuyển qua các chunk khác nhau, **F5 tải lại trang**, hay **đóng trình duyệt mở lại**, toàn bộ câu chữ đã viết đều được khôi phục nguyên vẹn 100%.
   - Chỉ khi người dùng chủ động bấm nút **"Viết lại"** (`RotateCcw`), bản nháp của chunk đó mới được làm sạch.

---

## 6. Mô hình Dữ liệu (Data Model)

### 6.1 LocalStorage Schema

| Storage Key | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `toeic_transcripts` | `Record<string, Transcript>` | Lưu danh sách các đoạn hội thoại Part 3/4 đã nhập. |
| `toeic_chunks` | `Record<string, Chunk[]>` | Lưu danh sách các chunk đã trích xuất theo `transcriptId`. |
| `toeic_situations` | `Record<string, Exercise[]>` | Lưu bộ 3 bài luyện dịch cho từng `chunkId`. |
| `toeic_progress` | `Record<string, Progress>` | Lưu lịch sử luyện tập, điểm số, `srsLevel`, `nextReviewAt`, `intervalMinutes`, `easeFactor`. |
| `toeic_practice_drafts`| `Record<string, Draft>` | Lưu bản nháp câu trả lời, trạng thái xem câu mẫu, kết quả chấm điểm theo `chunkId`. |
| `toeic_settings` | `Settings` | API keys, Supabase config, `srsTrack`, `notificationsEnabled`. |
| `toeic_vocab_learned` | `Record<string, LearnedVocab>`| Danh sách từ vựng trong kho 5000 từ đã được người dùng học. |
| `toeic_vocab_daily` | `DailySession` | Danh sách 10 từ vựng được chọn học cho ngày hiện tại. |

### 6.2 Supabase Cloud Database Schema (Tuỳ chọn)

Hệ thống có thể liên kết với Supabase qua 4 bảng chính:
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

-- 3. Bảng Situations / Exercises
CREATE TABLE situations (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  situations JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 4. Bảng User Progress & SRS Data
CREATE TABLE progress (
  chunk_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  last_score INT,
  last_practiced BIGINT,
  last_feedback JSONB, -- Chứa srsLevel, srsTrack, easeFactor, intervalMinutes, nextReviewAt, status
  updated_at BIGINT NOT NULL
);
```

---

## 7. Hướng dẫn Cài đặt & Chạy ứng dụng

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

2. **Cài đặt dependencies**:
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
   *(Ghi chú: Bạn cũng có thể nhập API Key trực tiếp trên giao diện Settings của ứng dụng mà không cần tạo file `.env`)*

4. **Khởi chạy môi trường phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại địa chỉ: `http://localhost:5173`

5. **Kiểm tra linter & Build Production**:
   ```bash
   # Kiểm tra lint bằng oxlint siêu tốc
   npm run lint

   # Build đóng gói ứng dụng
   npm run build

   # Chạy thử bản build production
   npm run preview
   ```

---

## 🎯 Tổng kết & Hướng phát triển tiếp theo

- [x] Tích hợp trích xuất Chunk từ Transcript TOEIC Part 3 & Part 4.
- [x] Tích hợp kho 5000 Từ vựng TOEIC cốt lõi phân theo chủ đề.
- [x] Tự động sinh 3 câu luyện dịch phân cấp kèm gợi ý từ vựng & giải thích thì ngữ pháp.
- [x] Tích hợp AI Batch Grading chấm điểm câu hàng loạt siêu tiết kiệm token.
- [x] Thuật toán Lặp lại ngắt quãng Spaced Repetition (SuperMemo SM-2 & Leitner Box).
- [x] Tự động tái sử dụng câu cũ khi đến hạn ôn tập để rèn phản xạ tự nhiên.
- [x] Hệ thống Thông báo Đẩy Web Push 4 lần/ngày theo khung giờ vàng.
- [x] Giao diện Mục lục Bài học phân cấp dạng Course Outline Accordion (chuẩn F8 / Udemy).
- [x] Cơ chế lưu bản nháp Realtime (Draft Auto-Save) & Persistent Component State.
- [x] Hỗ trợ Dual Gemini API Key tự động luân chuyển khi chạm ngưỡng giới hạn (Rate Limit 429).
- [ ] *Tính năng tiếp theo*: Kích hoạt chế độ **Luyện Nói AI (Voice Practice)** bằng micro với Speech-to-Text & chấm điểm phát âm trực tiếp.

---
*Phát triển bởi đội ngũ TOEIC Chunk Trainer.*
