# 🎧 TOEIC Chunk Trainer — Luyện Phản Xạ Tiếng Anh Theo Phương Pháp Chunking

> **Dự án**: `TOEIC Chunk Trainer` (Tên package: `speaking_chunk`)  
> **Mục tiêu**: Giúp người học tiếng Anh (đặc biệt là TOEIC Speaking & Listening Part 3/4) phát triển phản xạ giao tiếp tự nhiên thông qua phương pháp **Chunking** (học theo cụm từ có nghĩa hoàn chỉnh thay vì học từ vựng đơn lẻ), kết hợp **Trí tuệ nhân tạo Đa phương thức (Google Gemini Multimodal AI)**, **Phòng Luyện Nói Phản Xạ Đánh Giá Âm Thanh Cấp Độ 2 (IPA & Word-by-Word Pronunciation Scoring)**, **Chế độ Luyện Nghe Dictation Phím Tắt Thông Minh** và **Thuật toán lặp lại ngắt quãng (Spaced Repetition System - SM-2)**.

---

## 📑 MỤC LỤC

1. [Tổng quan dự án & Triết lý sản phẩm](#1-tổng-quan-dự-án--triết-lý-sản-phẩm)
2. [Kiến trúc Công nghệ (Tech Stack)](#2-kiến-trúc-công-nghệ-tech-stack)
3. [Cấu trúc Thư mục Codebase](#3-cấu-trúc-thư-mục-codebase)
4. [Toàn bộ Logic Chức năng & Các Module Nghiệp vụ](#4-toàn-bộ-logic-chức-năng--các-module-nghiệp-vụ)
   - [4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)](#41-module-5000-từ-vựng-cốt-lõi-vocabmodule)
   - [4.2 Module Transcript & Phân Trang Thông Minh (`TranscriptModule`)](#42-module-transcript--phân-trang-thông-minh-transcriptmodule)
   - [4.3 Chế độ Luyện Nghe Chuyên Sâu & Phím Tắt Dictation (`TranscriptListeningModal`)](#43-chế-độ-luyện-nghe-chuyên-sâu--phím-tắt-dictation-transcriptlisteningmodal)
   - [4.4 Module Quản lý Kho Chunk (`ChunkModule`)](#44-module-quản-lý-kho-chunk-chunkmodule)
   - [4.5 Chế độ Luyện Viết Dịch Câu Bậc Thang & Phím Tab (`PracticeModule`)](#45-chế-độ-luyện-viết-dịch-câu-bậc-thang--phím-tab-practicemodule)
   - [4.6 Phòng Luyện Nói AI "Cấp Độ 2" Đánh Giá Âm Thanh Thực Tế (`SpeakingSession`)](#46-phòng-luyện-nói-ai-cấp-độ-2-đánh-giá-âm-thanh-thực-tế-speakingsession)
   - [4.7 Module Thống kê Tiến độ & Tầng Trí Nhớ (`ProgressModule`)](#47-module-thống-kê-tiến-độ--tầng-trí-nhớ-progressmodule)
   - [4.8 Module Cấu hình (`Settings`) & Xác thực Đám mây (`Auth`)](#48-module-cấu-hình-settings--xác-thực-đám-mây-auth)
5. [Thuật toán & Cơ chế Vận hành Nâng cao](#5-thuật-toán--cơ-chế-vận-hành-nâng-cao)
   - [5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map Track A/B)](#51-thuật-toán-spaced-repetition-srs-sm-2--level-map-track-ab)
   - [5.2 Chu kỳ SRS Luyện Nói (Speaking SRS Lifecycle)](#52-chu-kỳ-srs-luyện-nói-speaking-srs-lifecycle)
   - [5.3 Cơ chế Tuyển Chọn Giọng Đọc Neural & Cadence Chuẩn TOEIC](#53-cơ-chế-tuyển-chọn-giọng-đọc-neural--cadence-chuẩn-toeic)
   - [5.4 Quản lý Quota AI: Dual API Key, Model Candidates & Batching](#54-quản-lý-quota-ai-dual-api-key-model-candidates--batching)
   - [5.5 Thông báo Đẩy 4 Khung Giờ Vàng (Web Push & Service Worker)](#55-thông-báo-đẩy-4-khung-giờ-vàng-web-push--service-worker)
   - [5.6 Lưu Nháp Realtime (Draft Auto-Save & Persistent State)](#56-lưu-nháp-realtime-draft-auto-save--persistent-state)
6. [Mô hình Dữ liệu (Data Model)](#6-mô-hình-dữ-liệu-data-model)
   - [6.1 LocalStorage Schema (Offline-First)](#61-localstorage-schema-offline-first)
   - [6.2 Supabase Database Schema (Cloud Sync)](#62-supabase-database-schema-cloud-sync)
7. [Hướng dẫn Cài đặt & Vận hành](#7-hướng-dẫn-cài-đặt--vận-hành)
8. [Trạng thái Dự án & Lộ trình Tương lai](#8-trạng-thái-dự-án--lộ-trình-tương-lai)

---

## 1. Tổng quan dự án & Triết lý sản phẩm

### Vấn đề cố hữu của người học tiếng Anh:
- **Học từ vựng đơn lẻ (word-by-word)**: Dẫn đến phản xạ ngập ngừng, ghép từ theo tư duy tiếng Việt (Viet-lish), sai cấu trúc ngữ pháp tự nhiên.
- **Học thụ động (Passive Recognition)**: Khi đọc transcript bài thi TOEIC thì hiểu nhưng khi nói hoặc viết thì không nhớ ra từ để dùng.
- **Giọng đọc máy giật cục (Robotic TTS)**: Các ứng dụng thường sử dụng giọng máy mặc định của hệ điều hành với pitch bị méo mó, không phản ánh đúng ngữ điệu tự nhiên của người bản xứ trong đề thi thật.
- **Đánh giá phát âm nông cạn**: Nhận diện giọng nói bằng text thông thường dễ tự động "sửa sai" từ nói dở, không chỉ ra được lỗi âm vị học quan trọng như nuốt âm đuôi (*ending sounds: /s/, /t/, /d/, /ed/*) hay sai trọng âm.
- **Đường cong quên lãng (Ebbinghaus)**: Học xong không có lịch ôn tập ngắt quãng khoa học dẫn đến quên 80% kiến thức sau 48 giờ.

### Giải pháp đột phá của TOEIC Chunk Trainer:
1. **Phương pháp Chunking (Cụm từ cố định & Collocations)**: Huấn luyện não bộ phản xạ theo từng khối ngôn ngữ (chẳng hạn: thay vì học `submit`, hãy học `submit a proposal to the board`).
2. **Luyện Nghe Chủ Động (Active Listening & Dictation)**: Luyện nghe từng lượt thoại với giọng đọc AI Neural tự nhiên (chuẩn 4 accent TOEIC: US, UK, AU, CA), phím tắt tua lùi 3s (`Ctrl`) và gợi ý từ tiếp theo (`Shift`).
3. **Luyện Dịch Bậc Thang (Active Recall Translation)**: Bắt buộc tự truy xuất cụm từ qua 3 cấp độ thử thách, hỗ trợ chuyển câu siêu tốc với phím `Tab`.
4. **Phòng Luyện Nói Phản Xạ Đạt Chuẩn "Cấp Độ 2" (Pronunciation Assessment)**: Đưa file ghi âm gốc trực tiếp lên Gemini Flash Multimodal để chấm từng từ theo 3 thang màu, phân tích âm vị IPA, chỉ rõ lỗi nuốt âm đuôi và nhận xét ngữ điệu.
5. **Thuật toán Spaced Repetition (SuperMemo SM-2)**: Tự động lên lịch nhắc ôn tập đúng 4 khung giờ vàng (8h, 12h, 18h, 21h) với nguyên tắc tái sử dụng câu cũ để tiết kiệm 100% quota và khắc sâu trí nhớ dài hạn.

---

## 2. Kiến trúc Công nghệ (Tech Stack)

| Lớp kiến trúc | Công nghệ | Mục đích & Chi tiết triển khai |
|---|---|---|
| **Core Framework** | **React 19** (`react`, `react-dom`) | Single Page Application (SPA), React Hooks hiện đại (`useMemo`, `useCallback`, `useRef`, custom hooks). |
| **Bundler & Tooling** | **Vite 8** (`@vitejs/plugin-react`) | Build production siêu tốc (< 500ms), Hot Module Replacement (HMR). |
| **Icons & UI Assets** | **lucide-react** | Bộ icon vector phong phú, đồng bộ chuẩn công nghiệp. |
| **Linter & Code Style** | **oxlint** | Linter Rust cực nhanh, đảm bảo chất lượng mã nguồn và hook dependencies. |
| **Styling & Theme** | **Modern Pure CSS + Variables** (`src/index.css`) | Thiết kế Dark/Elevated, Glassmorphism, responsive 100% (Mobile, Tablet, Desktop) không phụ thuộc framework CSS nặng. |
| **AI Intelligence (Text & Multimodal)** | **Google Gemini API** (`generateContent`) | Trích xuất chunk, chấm bài dịch hàng loạt, thẩm định phát âm qua mô hình `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-1.5-flash`. |
| **Speech & Audio Engine** | **MediaRecorder API + Web Audio API** | Thu âm microphone chất lượng cao (`audio/webm`, `audio/mp4`), chuyển đổi Base64 và phân tích âm lượng thời gian thực (Audio Wave Visualizer). |
| **Natural TTS Synthesis** | **Web Speech API** (`SpeechSynthesis`) | Bộ thuật toán `scoreVoice` tự động ưu tiên giọng **Neural / Natural / Online** (Edge & Chrome) cho các accent US, UK, AU, CA với cadence TOEIC tự nhiên. |
| **Phonetics & IPA** | **Custom Phonetics Service** (`src/services/phonetics.js`) | Thư viện phiên âm IPA offline, thuật toán so khớp âm vị học fuzzy cho ending sounds (-s, -ed, -t, -d). |
| **Database & Cloud Sync** | **Supabase JS Client** (`@supabase/supabase-js`) | Postgres Cloud Database, Supabase Authentication (Email/Password), hỗ trợ Realtime sync. |
| **Offline-First Storage** | **LocalStorage Abstraction** (`src/store/storage.js`) | Lưu trữ toàn bộ dữ liệu người dùng cục bộ, tự động lưu nháp realtime, hoạt động độc lập không cần internet/server. |
| **Notification & PWA** | **Service Worker & Notification API** (`public/sw.js`) | Bắn thông báo đẩy theo 4 khung giờ vàng, hỗ trợ cài đặt ứng dụng kiểu PWA. |

---

## 3. Cấu trúc Thư mục Codebase

```
speaking_chunk/
├── public/
│   ├── favicon.svg             # Favicon ứng dụng
│   ├── manifest.json           # Cấu hình PWA (Progressive Web App)
│   └── sw.js                   # Service Worker xử lý Web Push 4 khung giờ & Background Routing
├── data/
│   └── vocab_5000.json         # 5000 từ vựng TOEIC chia theo 12+ nhóm chủ đề thực chiến
├── scripts/
│   ├── import-vocab.js         # Script Node.js nhập từ vựng vào Supabase
│   └── generate-chunks-batch.js# Script Node.js sinh chunk tự động cho kho từ vựng
├── src/
│   ├── main.jsx                # Entry point chính của React 19
│   ├── App.jsx                 # Điều phối trung tâm: Routing, Active Tab, Notifications, Auto-save
│   ├── index.css               # Hệ thống CSS Design System toàn app, Dark Theme, Animations
│   ├── components/
│   │   ├── Auth/               # Giao diện Đăng nhập / Đăng ký Supabase Auth & chế độ Guest
│   │   ├── ChunkModule/        # Quản lý kho Chunk, lọc theo nhóm, thẻ tương tác
│   │   ├── Layout/             # Header, Sidebar (Desktop), Bottom Navigation Bar (Mobile)
│   │   ├── PracticeModule/     # Luyện viết dịch câu 3 cấp độ, Accordion mục lục, gọi SpeakingSession
│   │   │   ├── index.jsx       # Component luyện viết bậc thang, Batch Grading, phím Tab thông minh
│   │   │   └── SpeakingSession.jsx # Phòng Luyện Nói AI Cấp độ 2: Audio Wave, Word Inspector, Gemini STT
│   │   ├── ProgressModule/     # Thống kê tiến độ, phân bổ cấp độ SRS SM-2, danh sách đến hạn ôn
│   │   ├── Settings/           # Cấu hình Dual Gemini API Key, Supabase, SRS Track A/B, Level Map Modal
│   │   ├── TranscriptModule/   # Phân tích transcript TOEIC Part 3/4, phân trang Pagination
│   │   │   ├── index.jsx       # Danh sách transcript kèm bộ phân trang 10 bài/trang
│   │   │   └── TranscriptListeningModal.jsx # Phòng Luyện Nghe chuyên sâu (Dictation, Phím tắt Ctrl/Shift, TTS Neural)
│   │   ├── VocabModule/        # Quy trình học 5000 từ vựng cốt lõi qua 3 màn hình chuyên sâu
│   │   └── ui/                 # Reusable UI: Modal, Pagination, ScoreRing, Badge, Spinner, Toast
│   ├── hooks/
│   │   ├── useAuth.js          # Hook quản lý trạng thái phiên đăng nhập Supabase
│   │   ├── useSpeech.js        # Hook giao tiếp Web Speech Synthesis
│   │   └── useStorage.js       # Hook kết nối LocalStorage & Cloud Database
│   ├── services/
│   │   ├── ai.js               # Prompt Engineering, Gemini REST API, Dual Key Rotator, Multimodal Assessment
│   │   ├── notifications.js    # Quản lý Web Push thông báo 4 khung giờ vàng (8h, 12h, 18h, 21h)
│   │   ├── phonetics.js        # Thư viện phiên âm IPA offline & thuật toán đối soát âm vị học
│   │   ├── speakingLive.js     # Helper chuẩn bị Audio 16kHz PCM cho tương tác giọng nói
│   │   ├── speech.js           # Xử lý Text-to-Speech & thuật toán tìm kiếm giọng đọc bản xứ
│   │   ├── srs.js              # Thuật toán Spaced Repetition (SuperMemo SM-2, Level Map Track A/B)
│   │   └── supabase.js         # Client thao tác cơ sở dữ liệu Supabase
│   └── store/
│       └── storage.js          # Tầng lưu trữ dữ liệu (Data Access Layer): LocalStorage + Cloud Sync nền
├── package.json
├── vite.config.js
└── README.md
```

---

## 4. Toàn bộ Logic Chức năng & Các Module Nghiệp vụ

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 LUỒNG HỌC TẬP TOÀN DIỆN                                │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. NẠP NGUYÊN LIỆU       │ 2. TIÊU HÓA & PHẢN XẠ       │ 3. KHẮC SÂU DÀI HẠN           │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Kho 5000 Từ Vựng TOEIC │ • Luyện Nghe (Dictation)    │ • Thuật toán SRS SM-2         │
│   (3 Màn hình chuyên sâu)│   (Phím tắt Ctrl/Shift)     │ • Thông báo 4 khung giờ vàng  │
│ • Transcript Part 3 & 4  │ • Luyện Viết Dịch 3 Cấp Độ  │ • Tái sử dụng 100% câu cũ     │
│   (Bóc tách Collocations)│   (Phím Tab chuyển câu)     │ • Đồng bộ Cloud & LocalStorage│
│ • Kho Chunks Đa Dạng     │ • Phòng Luyện Nói "Cấp độ 2"│                               │
│                          │   (Word Inspector & IPA)    │                               │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

### 4.1 Module 5000 Từ Vựng Cốt Lõi (`VocabModule`)

Quy trình học được tổ chức theo cấu trúc **3 màn hình mạch lạc** nhằm loại bỏ cảm giác choáng ngợp khi đứng trước kho dữ liệu 5000 từ:

```
[Màn 1: Topic Browser] ──> [Màn 2: Word Selector] ──> [Màn 3: Learning Session]
  Chọn 1 trong 12+ chủ đề     Chọn số lượng từ (1-50)     Batch AI sinh Chunks (10 từ)
  Xem % tiến độ hoàn thành     Đổi từ ngẫu nhiên (Swap)   Xem Thẻ học & Chuyển Luyện tập
```

1. **Màn 1 — Duyệt Chủ Đề (`Topic Browser`)**:
   - 12+ nhóm chủ đề quen thuộc trong bài thi TOEIC và môi trường công sở: *Business, Tech & Science, Health, Travel, Finance, Office, Marketing,...*
   - Thẻ chủ đề hiển thị: Tên chủ đề, tổng số từ vựng, số từ đã thuộc (`learnedVocab`) và thanh phần trăm tiến độ trực quan.
2. **Màn 2 — Bộ Lựa Chọn Từ Vựng (`Word Selector`)**:
   - Tự động lọc ra những từ chưa học trong chủ đề.
   - **Tùy biến số lượng học**: Nút chọn nhanh mức phổ biến (`20`, `30`, `50` từ), nút điều chỉnh `-5` / `+5`, hoặc thanh kéo `range slider` tùy ý từ 1 từ đến tối đa số từ khả dụng.
   - **Lưới thẻ từ (Word Chips Grid)**:
     - Hiển thị từ vựng, từ loại (`noun`, `verb`, `adj`,...), nghĩa tiếng Việt chuẩn.
     - Nút **Đổi từ (`Swap`)**: Bỏ 1 từ cụ thể và thay thế ngay bằng 1 từ ngẫu nhiên khác.
     - Nút **`Randomize lại`**: Xáo trộn toàn bộ danh sách để có tổ hợp từ mới.
3. **Màn 3 — Buổi Học & Sinh Chunk Tự Động (`Learning Session`)**:
   - **Chia lô thông minh (Batch 10)**: AI sinh chunk theo từng khối 10 từ kèm thanh tiến trình phần trăm, loại bỏ nguy cơ nghẽn mạng hay lỗi quota 429.
   - Mỗi từ sinh ra 2–3 chunk giao tiếp thực tế kèm phân loại (`collocation`, `functional`, `connector`) và câu ví dụ hoàn chỉnh.
   - Người học có thể nhấn **`Luyện viết với chunk này →`** trên từng từ, hoặc **`Luyện viết tất cả (N chunk) →`** để nạp toàn bộ vào phòng luyện dịch.

---

### 4.2 Module Transcript & Phân Trang Thông Minh (`TranscriptModule`)

- **Phân tích hội thoại TOEIC Part 3 & bài nói Part 4**:
  - Người dùng dán đoạn văn bản transcript vào ô nhập liệu.
  - AI phân tích bối cảnh, đặt tiêu đề song ngữ Anh - Việt, chia transcript thành 2–4 tình huống giao tiếp và bóc tách 6–12 chunks tinh hoa (nghĩa tiếng Việt, câu gốc trong bài thi, câu ví dụ mở rộng, ghi chú sử dụng).
- **Phân trang chuyên nghiệp (Pagination System)**:
  - Mặc định hiển thị **10 transcript / trang**, giải quyết triệt để tình trạng người dùng phải cuộn chuột quá dài khi danh sách lên đến hàng chục transcript.
  - Hỗ trợ chọn hiển thị linh hoạt: **10 / 20 / 50 bài trên 1 trang**.
  - Thanh header thông minh: `Hiển thị 1–10 trong 13 transcript (Trang 1/2)` kèm bộ nút chuyển trang nhanh `‹` `›`.
  - Tự động reset về trang 1 khi người dùng gõ tìm kiếm, bấm đổi tab bộ lọc (Part 3, Part 4, Đã hoàn thành, Cần ôn) hoặc đổi cách sắp xếp.
  - Tự động cuộn mượt (`scrollIntoView`) lên đầu danh sách bài học khi chuyển trang.

---

### 4.3 Chế độ Luyện Nghe Chuyên Sâu & Phím Tắt Dictation (`TranscriptListeningModal`)

Khi mở một bài transcript, người học có thể kích hoạt **Phòng Luyện Nghe Độc Lập** với 4 chế độ tương tác cao cấp:

1. **4 Chế độ hiển thị linh hoạt**:
   - **Bình thường (Normal)**: Hiển thị đầy đủ lời thoại song ngữ và làm nổi bật các chunk trọng tâm.
   - **Che chữ (Blind Listening)**: Lời thoại bị che mờ để người học tập trung lắng nghe 100% bằng tai. Khi kết thúc câu, chữ sẽ tự động mở ra để đối chiếu.
   - **Chép chính tả (Dictation Mode)**: Các từ trong câu bị ẩn dưới dạng các dấu chấm tròn `••••••`. Người học nghe và gõ vào ô nhập liệu. Gõ đúng từ nào thì từ đó lập tức mở ra chữ màu xanh lá.
   - **Chỉ hiện Chunk**: Chỉ hiển thị các cụm từ trọng tâm để người học bắt "keyword" trong lúc nghe.
2. **Bộ phím tắt thông minh (Keyboard-driven Productivity)**:
   - <kbd>Ctrl</kbd> **Tua lùi 3 giây**: Hoạt động ngay lập tức, **kể cả khi con trỏ đang nằm bên trong ô nhập liệu Dictation**, kèm hiệu ứng sóng âm tua lùi trực quan.
   - <kbd>Shift</kbd> **Gợi ý từ tiếp theo**: Khi nghe đến một từ khó trong chế độ Dictation, người học chỉ cần chạm nhẹ phím `Shift`, hệ thống sẽ lập tức mở từ ẩn tiếp theo thành màu xanh. Thuật toán phân biệt thông minh: Nếu người dùng gõ phím viết hoa (`Shift + [ký tự]`), hệ thống hiểu là đang gõ phím và không kích hoạt gợi ý.
   - <kbd>Space</kbd>: Tạm dừng / Tiếp tục phát âm thanh.
   - <kbd>L</kbd>: Lặp lại câu hiện tại (Loop sentence).
   - **Cảm ứng di động**: Hỗ trợ Double Tap 2 lần trên nửa bên trái màn hình để tua lùi 3s, nửa bên phải để chuyển sang câu tiếp theo.
3. **Giọng đọc Neural chuẩn bài thi TOEIC**:
   - Tự động nhận diện đa nhân vật (Speaker 1, Speaker 2,...), gán đúng giới tính và accent (US, UK, AU, CA).
   - 100% không bị méo tiếng (giữ nguyên `pitch = 1.0`, điều chỉnh nhịp đọc `rate = 0.96` thư thái, rõ ràng như giọng phát thanh viên ETS).

---

### 4.4 Module Quản lý Kho Chunk (`ChunkModule`)

- Lưu trữ tập trung toàn bộ các cụm từ đã được bóc tách từ các bài nghe hoặc từ vựng.
- **Bộ lọc đa tiêu chí**: Lọc theo phân loại chunk (`Collocation`, `Functional Phrase`, `Discourse Connector`) hoặc theo từng đoạn hội thoại nguồn.
- **Thẻ Chunk tương tác**: Xem chi tiết câu gốc trong đề thi, phiên âm IPA, câu ví dụ ngoài đời thực, ghi chú ngữ cảnh và cấp độ ghi nhớ SRS hiện tại.
- Cho phép tích chọn nhiều chunk cùng lúc để bắt đầu một phiên luyện dịch tập trung.

---

### 4.5 Chế độ Luyện Viết Dịch Câu Bậc Thang & Phím Tab (`PracticeModule`)

Xây dựng nền tảng ngữ pháp và phản xạ truy xuất từ vựng chủ động (Active Recall):

1. **3 Cấp độ Thử Thách Bậc Thang**:
   - **★ Cấp 1 (Cơ bản)**: Câu ngắn ($\le 10$ từ), 1 mệnh đề, các thì đơn giản, 0–2 gợi ý từ vựng.
   - **★★ Cấp 2 (Trung cấp)**: Câu 10–15 từ, có trạng ngữ thời gian/nơi chốn, thì phức hợp, 2–3 gợi ý từ vựng.
   - **★★★ Cấp 3 (Nâng cao)**: Câu ghép 15–20 từ, câu phức có mệnh đề quan hệ, thì nâng cao, 4–5 gợi ý từ vựng.
2. **Phím `Tab` Chuyển Câu Mượt Mà**:
   - Khi viết xong câu 1, người học chỉ cần nhấn phím <kbd>Tab</kbd>, con trỏ sẽ tự động chuyển thẳng xuống ô nhập liệu của câu 2 (và từ câu 2 sang câu 3) kèm hiệu ứng cuộn mượt mà vào giữa màn hình.
   - Nhấn <kbd>Shift + Tab</kbd> để quay lại câu trước.
   - Nhấn <kbd>Enter</kbd> để đóng/mở câu dịch tham khảo nhanh.
3. **Mục lục Cây Phân Cấp (Course Outline Accordion)**:
   - Gom nhóm bài học tự động: Theo Từ Vựng gốc hoặc theo Đoạn hội thoại Transcript.
   - Hiển thị dấu tích xanh khi hoàn thành, điểm số và biểu tượng ngọn lửa đỏ 🔥 khi chunk đã đến hạn ôn tập SRS.
4. **Chấm Bài Hàng Loạt (Batch Grading Optimization)**:
   - Gửi tất cả các câu đã dịch trong 1 request duy nhất lên AI, giảm 66% số lần gọi API.
   - Phân tích chi tiết: Có dùng đúng chunk (`usedChunk`), Đúng nghĩa (`correct`), Điểm số (0–100), Phân tích lỗi ngữ pháp cụ thể và Gợi ý câu văn tự nhiên chuẩn người bản xứ.

---

### 4.6 Phòng Luyện Nói AI "Cấp Độ 2" Đánh Giá Âm Thanh Thực Tế (`SpeakingSession`)

Sau khi hoàn thành phần viết, người học bấm nút **`🎙️ Luyện nói với AI`** để bước vào phòng luyện phản xạ nói miệng.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHÒNG LUYỆN NÓI AI "CẤP ĐỘ 2"                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Nghe câu mẫu (5 Giọng AI: US/UK/AUS - Nam/Nữ)                       │
│ 2. Thu âm trực tiếp qua Micro (Audio Wave Visualizer 10 thanh)         │
│ 3. Gemini Flash Multimodal Audio: Chấm trực tiếp file âm thanh gốc    │
│ 4. Đánh giá từng từ: 🟢 Đúng chuẩn | 🟡 Cần chú ý | 🔴 Cần sửa | ★ Chunk│
│ 5. Word Inspector: Bấm vào từ để xem IPA, Điểm số, Lỗi & Nghe mẫu      │
│ 6. Nhận xét của Giám khảo AI & Cập nhật tự động vào chu kỳ SRS        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tiêu chuẩn "Cấp độ 2" là gì?
> Người học không cần phải phát âm hoàn hảo như một người bản xứ sinh ra tại Oxford hay New York (Cấp độ 3), mà chỉ cần đạt **Cấp độ 2**: **Phát âm rõ ràng, chuẩn xác để người nước ngoài hiểu trọn vẹn và giao tiếp tự tin**. Cấp độ này đòi hỏi không bị nuốt âm đuôi (*ending sounds*), không nói sai trọng âm chính và giữ được nhịp điệu tự nhiên.

#### Chi tiết tính năng nổi bật:
1. **Phân tích âm thanh thực tế bằng Gemini Flash Multimodal**:
   - Thay vì chuyển giọng nói thành text thô bằng Web Speech API (vốn có nhược điểm tự sửa sai lỗi phát âm của người học), hệ thống gửi trực tiếp file ghi âm gốc (`audio/webm` hoặc `audio/mp4`) lên Gemini Flash để chuyên gia AI lắng nghe từng âm vị học.
2. **Chấm điểm từng từ theo 3 thang màu trực quan**:
   - 🟢 **Xanh lá (Đúng chuẩn - 80–100đ)**: Phát âm chuẩn xác, rõ ràng, người bản xứ nghe hiểu ngay.
   - 🟡 **Vàng hổ phách (Cần chú ý - 50–79đ)**: Đạt tiêu chuẩn Cấp độ 2 (người nghe hiểu được) nhưng còn lỗi nhỏ cần lưu ý: thiếu âm đuôi (/s/, /t/, /d/, /ed/), nuốt âm nhẹ, hoặc hơi lệch trọng âm.
   - 🔴 **Đỏ (Cần sửa - 0–49đ)**: Phát âm sai hẳn, biến dạng từ hoặc nuốt mất từ.
   - ⭐ **Ngôi sao vàng (Chunk mục tiêu)**: Làm nổi bật các từ thuộc cụm từ trọng tâm cần rèn luyện.
3. **Bảng Soi Âm Vị Từng Từ (Word Inspector)**:
   - Khi bấm vào bất kỳ từ nào trên màn hình, một panel chi tiết sẽ xuất hiện ngay lập tức:
     - **Phiên âm quốc tế IPA chuẩn**: Ví dụ `[ˈmeɪn.li]`, `[ˈstɑːrtɪd]`.
     - **Huy hiệu điểm số chi tiết**: Ví dụ `Điểm: 75/100`.
     - **Ghi chú lỗi bằng tiếng Việt**: Chỉ ra chính xác lỗi âm vị (ví dụ: *"Thiếu âm đuôi /t/", "Nuốt âm /s/ kết thúc", "Trọng âm rơi vào âm tiết thứ nhất"*).
     - **Nút "🔊 Nghe phát âm mẫu"**: Cho phép nghe AI đọc riêng từ đó để người học bắt chước nhại lại ngay lập tức.
4. **Nhận xét của Giám khảo AI (`feedbackVi`)**:
   - Tổng hợp nhận xét mang tính xây dựng và khích lệ, chỉ ra điểm mạnh về ngữ điệu và hướng dẫn cách khắc phục lỗi.
5. **Cơ chế Fallback Âm Vị Học Offline**:
   - Nếu mất mạng hoặc hết quota API, hệ thống tự động chuyển sang bộ phân tích âm vị học tích hợp sẵn trên máy (`analyzeSpokenSentence` kết hợp `phonetics.js`), hỗ trợ so khớp mờ đuôi từ (-ed, -s, -ing) và hiển thị phiên âm IPA mà không làm gián đoạn bài học.

---

### 4.7 Module Thống kê Tiến độ & Tầng Trí Nhớ (`ProgressModule`)

- **Báo cáo tổng quan**: Tổng số chunk đã nạp, số chunk đã thành thạo (*Mastered - Level 5+*), tổng lượt luyện viết & luyện nói, điểm trung bình toàn bộ khóa học.
- **Biểu đồ phân bổ Level SRS**: Phản ánh chính xác số lượng chunk đang nằm ở từng tầng trí nhớ (từ Level 0 đến Level 10+).
- **Danh sách đến hạn ôn tập**: Hiển thị danh sách các chunk cần ôn tập hôm nay kèm bộ đếm thời gian ngược (phút/giờ/ngày).
- **Nút "Luyện lại"**: Bấm vào để mở ngay bài tập luyện viết hoặc phòng luyện nói cho chunk tương ứng.

---

### 4.8 Module Cấu hình (`Settings`) & Xác thực Đám mây (`Auth`)

- **Quản lý Dual Gemini API Key**: Hỗ trợ nhập 2 API Key (Chính và Dự phòng) kèm tính năng kiểm tra kết nối thời gian thực.
- **Lộ trình Spaced Repetition**: Cho phép lựa chọn giữa **Track A** (người mới bắt đầu - lặp dày hơn) và **Track B** (người đã có nền tảng - giãn cách nhanh hơn).
- **Quản lý Thông báo đẩy (Web Push)**: Bật/tắt thông báo 4 khung giờ vàng kèm nút gửi thông báo thử nghiệm để kiểm tra Service Worker.
- **Chế độ Khách & Đồng bộ Đám mây (Hybrid Sync)**: Người dùng có thể trải nghiệm 100% tính năng dưới dạng Khách (*Guest Mode*). Khi đăng nhập tài khoản Supabase, dữ liệu trên máy sẽ tự động hợp nhất với cơ sở dữ liệu đám mây.

---

## 5. Thuật toán & Cơ chế Vận hành Nâng cao

### 5.1 Thuật toán Spaced Repetition (SRS SM-2 + Level Map Track A/B)

Ứng dụng kết hợp thuật toán **SuperMemo SM-2** kinh điển và mô hình **Leitner Box** để xác định thời điểm vàng trước khi trí nhớ bắt đầu phai mờ:

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

#### 1. Công thức cập nhật Ease Factor ($EF$):
$$EF' = \max\left(1.3, \; EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)\right)$$
*(Giá trị mặc định ban đầu: $EF = 2.5$)*

#### 2. Lộ trình Level Map (Track A & Track B):
- **Track A (Người mới bắt đầu — Chu kỳ lặp dày dặn)**:
  Level 0 (15 phút) $\rightarrow$ Level 1 (1 giờ) $\rightarrow$ Level 2 (4 giờ) $\rightarrow$ Level 3 (1 ngày) $\rightarrow$ Level 4 (2 ngày) $\rightarrow$ Level 5 (4 ngày) $\rightarrow$ Level 6 (7 ngày) $\rightarrow$ Level 7 (12 ngày) $\rightarrow$ Level 8 (20 ngày) $\rightarrow$ Level 9 (30 ngày) $\rightarrow$ Level 10+ ($\times 1.6$, tối đa 90 ngày $\rightarrow$ `Mastered`).
- **Track B (Người có nền tảng — Giãn cách nhanh)**:
  Level 0 (3–4 giờ) $\rightarrow$ Level 1 (1 ngày) $\rightarrow$ Level 2 (3 ngày) $\rightarrow$ Level 3 (7 ngày) $\rightarrow$ Level 4 (14 ngày) $\rightarrow$ Level 5 (30 ngày) $\rightarrow$ Level 6 (60 ngày) $\rightarrow$ Level 7 (90 ngày $\rightarrow$ `Mastered`).

#### 3. Nguyên tắc Vàng: Tái Sử Dụng Câu Cũ Khi Ôn Tập
Khi một chunk đến hạn ôn tập (`isDueForReview`), hệ thống **tái sử dụng 100% các câu mẫu đã sinh trước đó**, tuyệt đối **không gọi AI sinh câu mới**. Điều này giúp:
- Khắc sâu cùng một cấu trúc vào tiềm thức và rèn phản xạ tự nhiên.
- Tiết kiệm 100% chi phí và hạn ngạch API trong toàn bộ các buổi ôn tập lặp lại.

---

### 5.2 Chu kỳ SRS Luyện Nói (Speaking SRS Lifecycle)

Kết quả từ phòng luyện nói AI được tính toán qua hàm `computeQualityFromSpeaking(speakingResult)`:
- **Bắt buộc dùng đúng chunk mục tiêu**: Nếu người học không dùng chunk mục tiêu (`usedTargetChunk = false`), điểm chất lượng bị giới hạn tối đa $q \le 2$ (Chưa đạt).
- **Mức độ dễ hiểu (`comprehensible`)**: Nếu phát âm quá mờ nhạt hoặc biến dạng âm khiến người nghe không nhận diện được $\rightarrow q = 2$.
- Khi thỏa mãn dùng đúng chunk và phát âm đạt:
  - Điểm $\ge 90$: $q = 5$
  - Điểm $75 - 89$: $q = 4$
  - Điểm $50 - 74$: $q = 3$
  - Điểm $< 50$: $q = 2$
- Kết quả được ghi nhận vào `speakingHistory` (lưu 5 lần gần nhất) và cập nhật thời gian ôn tập tiếp theo.

---

### 5.3 Cơ chế Tuyển Chọn Giọng Đọc Neural & Cadence Chuẩn TOEIC

Để loại bỏ hoàn toàn cảm giác giọng đọc "robot" giật cục:
1. **Thuật toán xếp hạng giọng đọc `scoreVoice`**:
   - Cộng `+400 điểm` cho các giọng **Natural / Neural / Online** của Microsoft và Google (`Jenny`, `Guy`, `Sonia`, `Ryan`, `Natasha`, `William`, `Clara`, `Liam`).
   - Phạt `-200 điểm` cho các giọng máy Desktop đời cũ (`Microsoft David`, `Microsoft Zira`).
   - Khớp chính xác mã ngôn ngữ (`en-US`, `en-GB`, `en-AU`, `en-CA`) và giới tính (`male` / `female`).
2. **Cadence chuẩn bài thi TOEIC**:
   - Khóa cứng `pitch = 1.0` đối với giọng Neural (không làm biến dạng tần số âm thanh).
   - Tinh chỉnh tốc độ đọc `rate = 0.96` nhằm mô phỏng đúng nhịp điệu phát âm rõ ràng, khoan thai của các bài thi TOEIC Listening Part 3/4.

---

### 5.4 Quản lý Quota AI: Dual API Key, Model Candidates & Batching

Hệ thống tối ưu hóa tối đa để hoạt động ổn định trên các gói Google AI Studio Free Tier:
1. **Cơ chế Xoay Vòng Dual Key**: Tự động chuyển từ Key 1 sang Key 2 khi gặp lỗi `429 (ResourceExhausted)`.
2. **Chuỗi Model Dự Phòng**:
   `gemini-2.5-flash-lite` $\rightarrow$ `gemini-2.0-flash-lite` $\rightarrow$ `gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash` $\rightarrow$ `Dynamic Fallback (models.list)`.
3. **Chấm Bài Hàng Loạt (Batch Grading)**: Gom 3 câu dịch vào 1 request duy nhất, giảm 66% số lần gọi API.
4. **Hàng Đợi Sinh Bài Tuần Tự (Sequential Queue)**: Sinh bài tập cho từng chunk lần lượt kèm thanh tiến trình trực quan, loại bỏ tình trạng bắn request ồ ạt gây tràn quota.

---

### 5.5 Thông báo Đẩy 4 Khung Giờ Vàng (Web Push & Service Worker)

| Khung giờ | Tiêu đề thông báo | Ý nghĩa sư phạm |
|---|---|---|
| **08:00 (Sáng)** | `🌅 Buổi sáng: Có N chunk TOEIC cần ôn tập!` | Khởi động tư duy đầu ngày mới. |
| **12:00 (Trưa)** | `☀️ Nghỉ trưa: Ôn lại N chunk TOEIC nào!` | Tận dụng thời gian nghỉ trưa để luyện phản xạ nhanh. |
| **18:00 (Chiều)** | `🌆 Chiều tối: Có N chunk đang chờ bạn ôn!` | Củng cố kiến thức sau giờ học/làm việc. |
| **21:00 (Tối)** | `🌙 Buổi tối: Hoàn thành N chunk trước khi ngủ!` | Ôn tập nhẹ nhàng trước khi ngủ giúp não chuyển kiến thức vào trí nhớ dài hạn. |

- Service Worker (`public/sw.js`) kiểm tra định kỳ mỗi phút.
- Mỗi khung giờ chỉ phát **duy nhất 1 thông báo/ngày** nếu có bài cần ôn. Nếu người học đã hoàn thành hết bài, ứng dụng hoàn toàn im lặng.
- Bấm vào thông báo sẽ tự động mở ứng dụng và chuyển thẳng đến tab Luyện tập.

---

### 5.6 Lưu Nháp Realtime (Draft Auto-Save & Persistent State)

1. **Giữ Nguyên Trạng Thái Giao Diện (Persistent Mounting)**:
   - Các màn hình `PracticeModule` và `VocabModule` được duy trì trong DOM tree (ẩn bằng CSS `display: none` khi chuyển tab), giúp người dùng thoải mái chuyển tab tra cứu mà không bị mất dữ liệu đang làm dở.
2. **Lưu Từng Ký Tự Vào LocalStorage (`savePracticeDraft`)**:
   - Tất cả nội dung đang gõ trong ô dịch, trạng thái mở câu mẫu và kết quả chấm bài được tự động lưu realtime theo từng `chunkId`. F5 tải lại trang hay đóng trình duyệt thì toàn bộ dữ liệu vẫn được khôi phục 100%.

---

## 6. Mô hình Dữ liệu (Data Model)

### 6.1 LocalStorage Schema (Offline-First)

| Khóa lưu trữ (Key) | Kiểu dữ liệu | Ý nghĩa |
|---|---|---|
| `toeic_transcripts` | `Record<string, Transcript>` | Danh sách các bài transcript Part 3 & 4 đã phân tích. |
| `toeic_chunks` | `Record<string, Chunk[]>` | Danh sách các cụm từ theo từng `transcriptId` hoặc `wordId`. |
| `toeic_situations` | `Record<string, Exercise[]>` | Bộ 3 câu luyện dịch (Cơ bản, Trung cấp, Nâng cao) của từng chunk. |
| `toeic_progress` | `Record<string, Progress>` | Tiến độ học: `practiceCount`, `lastScore`, `srsLevel`, `nextReviewAt`, `intervalMinutes`, `easeFactor`, `speakingHistory`. |
| `toeic_practice_drafts` | `Record<string, Draft>` | Bản nháp bài dịch đang gõ dở theo từng `chunkId`. |
| `toeic_settings` | `Settings` | Lưu trữ API Keys, Supabase credentials, lộ trình `srsTrack`, cấu hình thông báo. |
| `toeic_vocab_learned` | `Record<string, LearnedVocab>` | Danh sách các từ vựng trong kho 5000 từ đã hoàn thành. |
| `toeic_vocab_daily` | `string[]` | Danh sách các từ vựng đang học trong phiên hôm nay. |

---

### 6.2 Supabase Database Schema (Cloud Sync)

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

-- 3. Bảng Situations (Bài tập luyện dịch)
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
  last_feedback JSONB, -- Chứa srsLevel, srsTrack, easeFactor, intervalMinutes, nextReviewAt, speakingHistory
  updated_at BIGINT NOT NULL
);
```

---

## 7. Hướng dẫn Cài đặt & Vận hành

### Yêu cầu tiên quyết:
- **Node.js**: Phiên bản $\ge 18.0.0$
- **npm** hoặc **yarn / pnpm**
- **Google Gemini API Key** (Đăng ký miễn phí tại [Google AI Studio](https://aistudio.google.com/))

### Các bước cài đặt:

1. **Clone mã nguồn dự án**:
   ```bash
   git clone https://github.com/deV-inh08/chunking_method.git
   cd speaking_chunk
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường (Tùy chọn)**:
   Tạo file `.env` tại thư mục gốc của dự án:
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
   *(Ghi chú: Bạn có thể nhập trực tiếp API Key trong mục Cài đặt (`Settings`) của giao diện web mà không nhất thiết phải tạo file `.env`)*.

4. **Khởi chạy máy chủ phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: `http://localhost:5173`

5. **Kiểm tra Linter & Đóng gói Production**:
   ```bash
   # Kiểm tra lint bằng oxlint siêu tốc
   npm run lint

   # Đóng gói sản phẩm cho production
   npm run build

   # Chạy thử bản build production trên máy cục bộ
   npm run preview
   ```

---

## 8. Trạng thái Dự án & Lộ trình Tương lai

### Các tính năng đã hoàn thiện 100%:
- [x] **Trích xuất Chunk thông minh từ Transcript TOEIC Part 3 & Part 4**.
- [x] **Kho 5000 Từ Vựng Cốt Lõi** với quy trình học 3 màn hình chuyên sâu.
- [x] **Phân trang danh sách Transcript (Pagination)** 10 bài/trang mượt mà.
- [x] **Phòng Luyện Nghe Độc Lập (`TranscriptListeningModal`)**:
  - 4 chế độ: Bình thường, Che chữ (Blind), Dictation, Chỉ hiện Chunk.
  - Phím tắt <kbd>Ctrl</kbd> tua lùi 3s và <kbd>Shift</kbd> mở từ gợi ý.
  - Tuyển chọn giọng đọc Neural tự nhiên của Edge/Chrome, loại bỏ méo tiếng.
- [x] **Luyện dịch câu bậc thang 3 cấp độ** với phím <kbd>Tab</kbd> chuyển câu thông minh.
- [x] **Chấm điểm viết AI hàng loạt (Batch Grading)** tiết kiệm 66% request.
- [x] **Phòng Luyện Nói Phản Xạ AI "Cấp Độ 2" (`SpeakingSession`)**:
  - Chấm trực tiếp file âm thanh ghi âm bằng Gemini Flash Multimodal.
  - Đánh giá từng từ theo 3 thang màu: 🟢 Đúng chuẩn, 🟡 Cần chú ý, 🔴 Cần sửa, ⭐ Chunk.
  - Word Inspector: Xem phiên âm quốc tế IPA, điểm số, lỗi âm vị và nghe phát âm mẫu riêng từng từ.
  - Nhận xét toàn diện của Giám khảo AI (`feedbackVi`).
  - Fallback âm vị học offline khi mất mạng.
- [x] **Thuật toán Spaced Repetition (SuperMemo SM-2 & Leitner Box)** cho cả bài Viết và bài Nói.
- [x] **Tái sử dụng 100% câu cũ khi ôn tập** giúp tiết kiệm hoàn toàn quota API.
- [x] **Hệ thống Thông báo Đẩy 4 Khung Giờ Vàng (Web Push Service Worker)**.
- [x] **Cơ chế lưu bản nháp Realtime (Draft Auto-Save)** không lo mất dữ liệu.
- [x] **Cơ chế xoay vòng Dual Gemini API Key & Fallback Model Candidates**.

### Định hướng mở rộng (Roadmap):
- [ ] Mở rộng hội thoại tương tác 2 chiều liên tục qua giao thức Gemini Live WebSocket.
- [ ] Chế độ Shadowing (nghe câu mẫu và nhại theo nhịp điệu người bản xứ có chấm điểm độ trễ).
- [ ] Bổ sung bảng thành tích (Leaderboard) và huy hiệu khen thưởng (Badges).

---
*Dự án được xây dựng với sứ mệnh giúp người học tiếng Anh chinh phục phản xạ giao tiếp tự nhiên và đạt điểm cao trong các bài thi TOEIC Speaking & Listening.*
