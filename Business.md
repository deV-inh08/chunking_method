# Chunking Method — Luyện từ vựng TOEIC theo phương pháp Chunk

Ứng dụng web giúp người học tiếng Anh (trọng tâm TOEIC Part 3/Part 4) biến transcript hội thoại thành các bài luyện tập cá nhân hoá, dựa trên phương pháp học theo **chunk** (cụm từ có nghĩa hoàn chỉnh) thay vì học từ đơn lẻ. Toàn bộ nội dung học (trích xuất chunk, sinh bài luyện, chấm bài) được tạo tự động bởi Gemini AI.

> Repo: `deV-inh08/chunking_method` — package name nội bộ: `speaking_chunk`

---

## 1. Bài toán & ý tưởng

Người học TOEIC thường nghe/đọc transcript Part 3, Part 4 nhưng không biết cách "giữ lại" những cụm từ hữu ích để dùng lại trong giao tiếp thực tế. Ứng dụng giải quyết việc này theo quy trình:

```
Transcript hội thoại (Part 3/4)
        │  AI phân tích
        ▼
   Danh sách "chunk" (cụm từ giá trị cao), nhóm theo tình huống
        │  AI sinh bài tập
        ▼
   3 bài luyện dịch Việt → Anh / chunk (3 mức độ khó)
        │  Người học làm bài
        ▼
   AI chấm điểm, chỉ lỗi ngữ pháp, gợi ý diễn đạt tự nhiên hơn
        │
        ▼
   Theo dõi tiến độ luyện tập theo từng chunk / từng transcript
```

---

## 2. Luồng nghiệp vụ chi tiết

### Bước 1 — Nhập Transcript (`TranscriptModule`)
- Người dùng paste một đoạn transcript TOEIC, chọn **Part 3** hoặc **Part 4**.
- Bấm **"Analyze & Extract Chunks"** → gọi Gemini (`analyzeTranscript`) với prompt yêu cầu:
  - Đặt tên **chủ đề** (tiếng Anh + tiếng Việt) và mô tả bối cảnh hội thoại.
  - Chia transcript thành **2–4 nhóm tình huống giao tiếp thực tế**.
  - Mỗi nhóm chứa **2–4 chunk** (tổng 6–12 chunk/transcript), mỗi chunk gồm:
    - `phrase`: cụm từ tiếng Anh nguyên văn trong transcript.
    - `meaningVi`: nghĩa tiếng Việt tự nhiên.
    - `usageNote`: cách dùng, ngữ cảnh điển hình.
    - `originalSentence`: câu gốc chứa chunk trong transcript.
    - `anotherExample`: một câu ví dụ khác (ngoài transcript) dùng cùng chunk.
    - `type`: `collocation` (cụm danh/động từ hay đi cùng nhau) | `functional` (cụm giao tiếp có chức năng) | `connector` (từ nối/chuyển ý).
    - `formality`: `formal` | `informal` | `neutral`.
- Transcript + chunk được lưu lại (localStorage, đồng bộ Supabase nếu có cấu hình).
- **Auto-generate**: ngay sau khi trích xuất xong, hệ thống tự động sinh bài luyện viết tuần tự cho **tất cả** chunk vừa tạo (không cần người dùng bấm từng chunk), có thanh tiến trình hiển thị "đang sinh bài luyện viết…".

### Bước 2 — Duyệt & chọn Chunk (`ChunkModule`)
- Chunk được hiển thị theo nhóm tình huống, có thể lọc theo loại (`collocation`/`functional`/`connector`).
- Mỗi chunk card cho xem thêm: câu gốc trong bài, ví dụ khác, ghi chú cách dùng.
- Người dùng **tick chọn** các chunk muốn luyện, hoặc bấm **"Luyện viết"** trên từng chunk để sinh riêng bài tập nếu chưa có.
- Chunk đã luyện (có ít nhất 1 lần practice) có thể ẩn/hiện để tập trung vào chunk mới.
- Bấm **"Luyện viết N chunks"** → chuyển sang màn luyện tập.

### Bước 3 — Luyện tập (`PracticeModule`)
Với mỗi chunk đã sinh bài, có **3 bài dịch Việt → Anh** theo 3 mức độ tăng dần (sinh bởi `generateWritingExercises`):

| Mức | Đặc điểm câu tiếng Việt | Thì ngữ pháp | Gợi ý từ vựng |
|---|---|---|---|
| 1 – Cơ bản | ≤10 từ, 1 mệnh đề, ngữ cảnh quen thuộc | ví dụ: Present Simple | 0–2 hint |
| 2 – Trung cấp | 10–15 từ, có trạng ngữ thời gian/địa điểm | ví dụ: Past Simple | 2–3 hint |
| 3 – Nâng cao | 15–20 từ, câu ghép/mệnh đề phụ | ví dụ: Present Perfect | 4–5 hint |

Mỗi bài đều **bắt buộc** người học dùng đúng chunk mục tiêu trong bản dịch. Với mỗi câu, người học có thể:
- Gõ bản dịch vào ô nhập, xem số từ đang gõ.
- Bấm **"Xem câu mẫu"** (hoặc phím Enter) để đối chiếu: hiện câu mẫu tiếng Anh kèm nút nghe phát âm (Text-to-Speech qua Web Speech API) và **phân tích cấu trúc câu** (breakdown từng cụm quan trọng + giải thích ngữ pháp).
- Bấm **"Chấm bài AI"** → gọi `gradeWriting`, AI trả về:
  - `usedChunk`: có dùng đúng chunk mục tiêu không (chấp nhận biến thể chia động từ/số nhiều).
  - `correct`: nghĩa có khớp câu gốc không.
  - `score` (0–100): dùng chunk đúng +50đ, nghĩa đúng +30đ, ngữ pháp hoàn hảo +20đ.
  - `grammarErrors[]`: từng lỗi kèm cách sửa + giải thích.
  - `naturalSuggestion`: gợi ý diễn đạt tự nhiên hơn (nếu có).
  - `overallFeedback`: nhận xét tổng quan, luôn mang tính khích lệ.
- Kết quả hiển thị bằng vòng tròn điểm số (ScoreRing) màu theo ngưỡng: xanh (≥80), vàng (50–79), đỏ (<50).
- Có thể **tái tạo (regenerate)** bộ 3 bài luyện cho một chunk bất kỳ lúc nào (hữu ích khi bài cũ thiếu gợi ý từ vựng — định dạng cũ không có `vocabHints`).

> Ghi chú kỹ thuật: đã có sẵn `services/speech.js` dùng Web Speech API (nhận diện giọng nói trình duyệt) để so khớp câu nói với chunk mục tiêu (`matchChunk`) — đây là nền tảng cho tính năng **luyện nói** (bấm mic, nói câu, so khớp/chấm điểm), hiện chưa được gắn vào giao diện `PracticeModule`.

### Bước 4 — Theo dõi tiến độ (`ProgressModule`)
- Thống kê tổng quan: số chunk đã "thuần thục" (≥3 lần luyện), tổng lượt luyện, tổng lượt thành công.
- Danh sách chunk đã luyện, **nhóm theo transcript nguồn** (theo chủ đề hội thoại), mỗi nhóm show % thành công trung bình, tổng lượt luyện, ngày tạo.
- Mỗi chunk hiển thị thanh tiến độ % thành công, số lần luyện, thời gian luyện gần nhất, và nút **"Luyện lại"** để quay lại `PracticeModule` với đúng chunk đó.

---

## 3. Kiến trúc kỹ thuật

### Tech stack
- **React 19 + Vite 8** (SPA, không server-side rendering).
- **lucide-react** cho icon.
- **Supabase** (tuỳ chọn) để đồng bộ dữ liệu lên cloud + xác thực người dùng (`Auth`).
- **Google Gemini API** (gọi trực tiếp từ frontend bằng `fetch`, không qua backend riêng) cho toàn bộ xử lý AI.
- Không dùng framework CSS — style thuần bằng CSS variables (`src/index.css`) + inline style.

### Cấu trúc thư mục
```
src/
├─ App.jsx                  # Điều phối state toàn app, điều hướng 4 trang chính
├─ components/
│  ├─ TranscriptModule/     # Nhập & phân tích transcript
│  ├─ ChunkModule/          # Xem/chọn/lọc chunk theo nhóm
│  ├─ PracticeModule/       # Luyện dịch + chấm điểm AI
│  ├─ ProgressModule/       # Thống kê tiến độ học tập
│  ├─ Settings/             # Cấu hình API key, Supabase, ngôn ngữ
│  ├─ Auth/                 # Đăng nhập/đăng ký (khi bật Supabase)
│  ├─ Layout/                # Sidebar, Header, BottomNav (responsive mobile)
│  └─ ui/                    # Toast, Spinner, Badge, EmptyState, SkeletonCard
├─ hooks/
│  └─ useStorage.js, useAuth.js   # Hook truy cập localStorage/Supabase + auth state
├─ services/
│  ├─ ai.js                 # Toàn bộ prompt & gọi Gemini API (phân tích, sinh bài, chấm bài)
│  ├─ speech.js              # Web Speech API: nhận diện giọng nói, so khớp chunk (chưa gắn UI)
│  └─ supabase.js            # CRUD đồng bộ transcript/chunk/situations/progress lên cloud
└─ store/
   └─ storage.js             # Lớp trừu tượng lưu trữ local (localStorage) + đẩy nền lên Supabase
```

### Mô hình dữ liệu (localStorage keys)
| Key | Nội dung |
|---|---|
| `toeic_transcripts` | `{ id → transcript }` — text gốc, part, theme, ngày tạo |
| `toeic_chunks` | `{ transcriptId → chunk[] }` — chunk đã trích xuất, có `groupId`/`groupName` |
| `toeic_situations` | `{ chunkId → exercise[] }` — 3 bài luyện dịch của mỗi chunk |
| `toeic_progress` | `{ chunkId → progress }` — số lần luyện, số lần thành công, điểm/feedback gần nhất |
| `toeic_settings` | API key Gemini, ngôn ngữ, cấu hình Supabase (URL + key) |

Xoá transcript sẽ **cascade xoá** toàn bộ chunk và bài luyện liên quan.

### Cơ chế gọi AI (`services/ai.js`)
- Danh sách model Gemini được thử theo thứ tự ưu tiên (`MODEL_CANDIDATES`), ưu tiên các bản **"lite"** vì có hạn mức miễn phí cao hơn (RPD 500/ngày) so với bản Flash thường (RPD 20/ngày).
- Khi gặp lỗi **429 (rate limit)**, model đó bị đưa vào blacklist tạm thời (reset khi reload trang) và hệ thống tự động chuyển sang model tiếp theo trong danh sách — tăng độ ổn định khi dùng free-tier.
- Nếu tất cả model trong danh sách đều lỗi, hệ thống fallback bằng cách gọi `models.list` để tự tìm một model Flash khả dụng khác.
- Toàn bộ prompt được thiết kế để trả về **JSON thuần**, response được parse bằng regex bóc khối \`\`\`json\`\`\` hoặc `{...}` đầu tiên tìm thấy.
- 3 nghiệp vụ AI chính: `analyzeTranscript` (trích chunk), `generateWritingExercises` (sinh 3 bài luyện/chunk), `gradeWriting` (chấm bài dịch).

### Đồng bộ Cloud (tuỳ chọn, `services/supabase.js` + `store/storage.js`)
- Nếu người dùng cấu hình Supabase URL + key (trong Settings), app sẽ:
  - Yêu cầu đăng nhập/đăng ký (`Auth`) trước khi vào app.
  - Ghi mọi thay đổi (transcript, chunk, situations, progress) song song lên Supabase (best-effort, không chặn UI nếu lỗi mạng).
  - Khi đăng nhập, tự động `syncFromSupabase()` để merge dữ liệu cloud vào cache local.
- Nếu **không** cấu hình Supabase, ứng dụng hoạt động hoàn toàn **offline-first**, chỉ dùng localStorage — không cần tài khoản.

### Cấu hình
- API key Gemini có thể set qua biến môi trường build-time `VITE_API_KEY`, hoặc nhập tay trong màn hình **Settings** (ưu tiên: env key > key nhập tay).
- Lần đầu mở app mà chưa có API key, Settings modal tự động bật lên để yêu cầu nhập.

---

## 4. Chạy dự án

```bash
npm install
npm run dev        # môi trường phát triển
npm run build       # build production
npm run preview     # xem thử bản build
npm run lint         # oxlint
```

Cần có API key Gemini (miễn phí tại Google AI Studio) để sử dụng các tính năng AI. Supabase là tuỳ chọn, chỉ cần khi muốn đồng bộ dữ liệu đa thiết bị.