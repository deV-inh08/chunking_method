# 🎨 Tài Liệu Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UI/UX Design System)
## Dự án: TOEIC Chunk Trainer (`speaking_chunk`)

> **Phiên bản**: 2.0  
> **Mục tiêu tài liệu**: Mô tả chi tiết, toàn diện và có hệ thống toàn bộ triết lý thiết kế, Design Tokens, kiến trúc bố cục, nguyên tử UI, trải nghiệm vi mô (micro-interactions) và luồng giao diện người dùng của tất cả các phân hệ nghiệp vụ trong ứng dụng **TOEIC Chunk Trainer**.

---

## 📑 MỤC LỤC

1. [Triết lý Thiết kế (Design Philosophy & Core Pillars)](#1-triết-lý-thiết-kế-design-philosophy--core-pillars)
2. [Hệ thống Design Tokens (Foundational Tokens)](#2-hệ-thống-design-tokens-foundational-tokens)
   - [2.1 Bảng màu (Color Palette)](#21-bảng-màu-color-palette)
   - [2.2 Hệ thống Typography](#22-hệ-thống-typography)
   - [2.3 Khoảng cách & Lưới (Spacing & Grid)](#23-khoảng-cách--lưới-spacing--grid)
   - [2.4 Bán kính Bo góc (Border Radius)](#24-bán-kính-bo-góc-border-radius)
   - [2.5 Đổ bóng & Hiệu ứng Ánh sáng (Shadows & Glow)](#25-đổ-bóng--hiệu-ứng-ánh-sáng-shadows--glow)
   - [2.6 Chuyển động & Thời gian (Transitions & Motion)](#26-chuyển-động--thời-gian-transitions--motion)
3. [Kiến trúc Bố cục Toàn hệ thống (Layout Architecture)](#3-kiến-trúc-bố-cục-toàn-hệ-thống-layout-architecture)
   - [3.1 Desktop Shell Layout (Màn hình lớn)](#31-desktop-shell-layout-màn-hình-lớn)
   - [3.2 Mobile & Tablet Layout (Thiết bị di động)](#32-mobile--tablet-layout-thiết-bị-di-động)
   - [3.3 Hệ thống Thanh điều hướng (Sidebar, Header, BottomNav)](#33-hệ-thống-thanh-điều-hướng-sidebar-header-bottomnav)
4. [Hệ thống Thành phần Giao diện Dùng chung (Design System Primitives)](#4-hệ-thống-thành-phần-giao-diện-dùng-chung-design-system-primitives)
5. [Thiết kế Chi tiết Từng Module Nghiệp vụ](#5-thiết-kế-chi-tiết-từng-module-nghiệp-vụ)
   - [5.1 Module Luyện Nghe AI & Dictation (`ListeningAiModule`)](#51-module-luyện-nghe-ai--dictation-listeningaimodule)
   - [5.2 Module Luyện Đọc & 24 Chuyên Đề Ngữ Pháp (`ReadingModule`)](#52-module-luyện-đọc--24-chuyên-đề-ngữ-pháp-readingmodule)
   - [5.3 Module 5000 Từ Vựng Cốt Lõi Theo Chủ Đề (`VocabModule`)](#53-module-5000-từ-vựng-cốt-lõi-theo-chủ-đề-vocabmodule)
   - [5.4 Module Quản Lý Kho Chunk Tập Trung (`ChunkModule`)](#54-module-quản-lý-kho-chunk-tập-trung-chunkmodule)
   - [5.5 Module Luyện Viết Dịch Câu Bậc Thang (`PracticeModule`)](#55-module-luyện-viết-dịch-câu-bậc-thang-practicemodule)
   - [5.6 Phòng Luyện Nói AI "Cấp Độ 2" Chấm Âm Thanh (`SpeakingSession`)](#56-phòng-luyện-nói-ai-cấp-độ-2-chấm-âm-thanh-speakingsession)
   - [5.7 Phòng Luyện Nói Giao Tiếp AI Thực Chiến 2 Chiều (`ConversationalSpeakingModal`)](#57-phòng-luyện-nói-giao-tiếp-ai-thực-chiến-2-chiều-conversationalspeakingmodal)
   - [5.8 Module Thống Kê Tiến Độ & Tầng Trí Nhớ SRS (`ProgressModule`)](#58-module-thống-kê-tiến-độ--tầng-trí-nhớ-srs-progressmodule)
   - [5.9 Module Cấu Hình (`Settings`) & Xác Thực Đám Mây (`Auth`)](#59-module-cấu-hình-settings--xác-thực-đám-mây-auth)
6. [Hệ thống Phím Tắt & Tương Tác Năng Suất Cao (Keyboard-Driven UX)](#6-hệ-thống-phím-tắt--tương-tác-năng-suất-cao-keyboard-driven-ux)
7. [Tiêu chuẩn Khả năng Tiếp cận & Trải nghiệm Đa giác quan (Accessibility & Multi-Sensory UX)](#7-tiêu-chuẩn-khả-năng-tiếp-cận--trải-nghiệm-đa-giác-quan-accessibility--multi-sensory-ux)

---

## 1. Triết lý Thiết kế (Design Philosophy & Core Pillars)

TOEIC Chunk Trainer được xây dựng dựa trên 4 trụ cột thiết kế trải nghiệm người dùng cốt lõi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4 TRỤ CỘT THIẾT KẾ UI/UX                        │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. DARK-FIRST &   │ 2. COGNITIVE LOAD │ 3. MULTIMODAL  │ 4. KEYBOARD-  │
│    GLASSMORPHISM  │    REDUCTION      │    FEEDBACK    │    PRODUCTIVE │
├───────────────────┼───────────────────┼────────────────┼───────────────┤
│ Nền tối dịu mắt,  │ Chia nhỏ lộ trình │ Âm thanh sống  │ Điều khiển    │
│ độ sâu phân tầng  │ thành các chặng   │ động, trực quan│ toàn app bằng │
│ với lớp phủ mờ    │ micro-learning    │ hóa sóng âm và │ phím tắt,     │
│ và viền ánh sáng. │ (3-5 phút/phiên). │ màu sắc âm vị. │ không rời tay.│
└───────────────────┴───────────────────┴────────────────┴───────────────┘
```

1. **Dark-First & Elevated Depth (Nền tối phân tầng & Chiều sâu vi mô)**:
   - Học ngoại ngữ đòi hỏi sự tập trung thị giác cao độ trong thời gian dài. Giao diện sử dụng nền tối sâu (`#0d0f14`), kết hợp các bề mặt nổi (`#13161e`, `#1a1e2a`) và kỹ thuật **Glassmorphism** (lớp phủ mờ `backdrop-filter: blur(12px)`) tạo cảm giác sang trọng, giảm thiểu 80% căng thẳng thị giác so với nền sáng truyền thống.
2. **Cognitive Load Reduction (Giảm tải nhận thức tối đa)**:
   - Loại bỏ hoàn toàn sự choáng ngợp trước kho dữ liệu lớn (5000 từ, hàng trăm transcript). Mọi màn hình đều được phân chia mạch lạc thành các bước rõ ràng (3 màn hình học từ vựng, 3 cấp độ dịch câu bậc thang, phân trang thông minh 10 bài/trang).
3. **Instant Multimodal Feedback (Phản hồi đa giác quan tức thì)**:
   - Người học nhận được phản hồi ngay lập tức thông qua cả **Thị giác** (thang 3 màu xanh lá/vàng/đỏ, vạch sóng âm nhấp nhô) lẫn **Thính giác** (giọng đọc Neural bản xứ chuẩn xác của Edge TTS, âm báo thành công khi hoàn thành bài).
4. **Keyboard-Driven Productivity (Tối ưu hóa thao tác bàn phím)**:
   - Trải nghiệm học tập không gián đoạn: di chuyển giữa các câu bằng phím <kbd>Tab</kbd>, tua lùi âm thanh bằng <kbd>Ctrl</kbd>, mở gợi ý từ bằng <kbd>Shift</kbd>, đóng mở câu mẫu bằng <kbd>Enter</kbd> mà không cần chạm chuột.

---

## 2. Hệ thống Design Tokens (Foundational Tokens)

Toàn bộ hệ thống giao diện được định nghĩa thuần túy qua **CSS Custom Properties** (biến CSS) tại file [`src/index.css`](file:///d:/speaking_chunk/src/index.css), đảm bảo tính nhất quán tuyệt đối và hiệu năng render cực đại mà không cần nạp bất kỳ thư viện CSS runtime nào.

### 2.1 Bảng màu (Color Palette)

#### A. Bảng màu Nền & Bề mặt (Surfaces & Backgrounds)
| Biến CSS | Mã màu HEX / RGBA | Vai trò & Ứng dụng |
|---|---|---|
| `--bg-base` | `#0d0f14` | Nền canvas chính của toàn bộ ứng dụng, tạo độ sâu không gian tối. |
| `--bg-surface` | `#13161e` | Bề mặt Sidebar, Header, Modal và các khối Card cấp 1. |
| `--bg-elevated` | `#1a1e2a` | Bề mặt các phần tử nổi, ô input nhập liệu, popover, dropdown menu. |
| `--bg-overlay` | `rgba(13, 15, 20, 0.85)` | Lớp màn phủ mờ (Backdrop) phía sau các cửa sổ Modal đối thoại. |

#### B. Bảng màu Đường viền (Borders & Dividers)
| Biến CSS | Mã màu RGBA | Vai trò & Ứng dụng |
|---|---|---|
| `--border-subtle` | `rgba(255, 255, 255, 0.07)` | Đường chia nhẹ giữa các mục danh sách, viền thẻ card tĩnh. |
| `--border-default` | `rgba(255, 255, 255, 0.12)` | Viền mặc định của các ô input, button viền mờ, card tương tác. |
| `--border-strong` | `rgba(255, 255, 255, 0.22)` | Viền khi hover, thanh cuộn scrollbar thumb, viền active nổi bật. |

#### C. Bảng màu Điểm nhấn Chủ đạo (Accent Palette — Indigo & Violet)
Hệ thống nhận diện thương hiệu sử dụng dải màu Indigo hiện đại, mang lại cảm giác công nghệ cao và tri thức:
| Biến CSS | Mã màu HEX | Vai trò & Ứng dụng |
|---|---|---|
| `--accent-50` | `#eef2ff` | Màu chữ tương phản cực cao trên nền nút bấm đậm. |
| `--accent-300` | `#a5b4fc` | Màu văn bản phụ trợ, tiêu đề nhỏ trong các banner AI. |
| `--accent-400` | `#818cf8` | Màu icon đang active, viền focus, text nhấn mạnh. |
| `--accent-500` | `#6366f1` | **Màu thương hiệu chính**: Nút bấm chính (Primary Button), thanh tiến trình. |
| `--accent-600` | `#4f46e5` | Trạng thái hover của nút bấm chính. |
| `--accent-700` | `#4338ca` | Điểm kết thúc của dải gradient nút bấm và logo icon. |

#### D. Bảng màu Ngữ nghĩa (Semantic States)
| Trạng thái | Nền (`-bg`) | Chữ (`-text`) | Viền (`-border`) | Ý nghĩa học tập |
|---|---|---|---|---|
| **Thành công (Success)** | `rgba(34, 197, 94, 0.12)` | `#4ade80` | `rgba(34, 197, 94, 0.3)` | Điểm cao ($\ge 80$), dùng đúng chunk, phát âm chuẩn. |
| **Cảnh báo (Warning)** | `rgba(234, 179, 8, 0.12)` | `#facc15` | `rgba(234, 179, 8, 0.3)` | Điểm trung bình ($50-79$), thiếu âm đuôi, cần cải thiện. |
| **Lỗi (Error)** | `rgba(239, 68, 68, 0.12)` | `#f87171` | `rgba(239, 68, 68, 0.3)` | Điểm thấp ($< 50$), phát âm sai, chưa dùng chunk, lỗi ngữ pháp. |

#### E. Bảng màu Phân loại Ngôn ngữ học (Chunk Linguistic Taxonomy)
| Loại Chunk | Nền | Màu Chữ | Viền | Ý nghĩa ngôn ngữ học |
|---|---|---|---|---|
| **Collocation** | `rgba(59, 130, 246, 0.15)` | `#60a5fa` (Blue) | `rgba(59, 130, 246, 0.3)` | Cụm kết hợp từ tự nhiên (*reach a goal, make a decision*). |
| **Functional Phrase** | `rgba(168, 85, 247, 0.15)`| `#c084fc` (Purple)| `rgba(168, 85, 247, 0.3)` | Cụm giao tiếp chức năng (*Could you please confirm...*). |
| **Discourse Connector**| `rgba(20, 184, 166, 0.15)`| `#2dd4bf` (Teal)  | `rgba(20, 184, 166, 0.3)` | Cụm từ nối, chuyển ý (*in terms of, on the other hand*). |

---

### 2.2 Hệ thống Typography

* **Phông chữ chính (Primary Font)**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  * Khả năng đọc xuất sắc ở kích thước nhỏ trên màn hình kỹ thuật số.
  * Hỗ trợ đầy đủ bộ ký tự tiếng Việt có dấu với độ cân xứng cao.
* **Phông chữ phiên âm & Code (Monospace Font)**: `'JetBrains Mono', 'Fira Code', monospace`.
  * Được áp dụng cho: Phiên âm quốc tế **IPA** (`/ˈɡɪv ʌp/`), mã thời gian đếm ngược, phím tắt kbd.

#### Phân cấp Thứ bậc Văn bản (Type Scale Hierarchy)
| Cấp bậc | Kích thước | Độ đậm (Font Weight) | Line Height | Ứng dụng thực tế |
|---|---|---|---|---|
| **Display Heading** | `26px - 32px` | 800 (Extra Bold) | 1.2 | Tiêu đề Hero Banner, Chào mừng, Tên bài học lớn. |
| **Section Title (H1/H2)**| `18px - 22px` | 700 (Bold) | 1.3 | Tiêu đề chuyên mục, Tiêu đề cửa sổ Modal. |
| **Card Title (H3)** | `15px - 16px` | 600 (Semi Bold) | 1.4 | Tiêu đề bài test, Cụm từ chunk chính. |
| **Body Standard** | `14px` | 400 (Regular) / 500 (Medium) | 1.6 | Văn bản nội dung, lời thoại hội thoại, hướng dẫn làm bài. |
| **Small / Caption** | `12px - 13px` | 500 (Medium) | 1.5 | Nhãn phụ, thời gian ngày tháng, chú thích ngữ pháp. |
| **Micro Badge** | `10px - 11px` | 700 (Bold) | 1.0 | Huy hiệu số lượng, tag loại từ (Noun, Verb, Part 3). |

---

### 2.3 Khoảng cách & Lưới (Spacing & Grid)

Hệ thống khoảng cách tuân thủ nghiêm ngặt **hệ số 4px** chuẩn công nghiệp:
- `--space-1`: `4px` | `--space-2`: `8px` | `--space-3`: `12px` | `--space-4`: `16px`
- `--space-5`: `20px` | `--space-6`: `24px` | `--space-8`: `32px` | `--space-10`: `40px` | `--space-12`: `48px`

---

### 2.4 Bán kính Bo góc (Border Radius)

Tạo cảm giác mềm mại, hiện đại và thân thiện với thao tác cảm ứng:
- `--radius-sm`: `6px` (Nút bấm phụ, ô nhập nhỏ, phím tắt `<kbd>`).
- `--radius-md`: `10px` (Nút bấm tiêu chuẩn, thẻ từ vựng Word Chips, ô nhập liệu input).
- `--radius-lg`: `14px` (Thẻ Card bài học, Topic Card, hộp thoại thông báo).
- `--radius-xl`: `20px` (Cửa sổ Modal lớn, Container bao ngoài của phòng luyện nói).
- `--radius-full`: `9999px` (Viên thuốc Badge, vòng tròn điểm số, nút tròn Micro).

---

### 2.5 Đổ bóng & Hiệu ứng Ánh sáng (Shadows & Glow)

- `--shadow-sm`: `0 1px 3px rgba(0,0,0,0.4)` (Thẻ card thông thường).
- `--shadow-md`: `0 4px 12px rgba(0,0,0,0.5)` (Dropdown, Card khi hover).
- `--shadow-lg`: `0 10px 30px rgba(0,0,0,0.6)` (Cửa sổ Modal đối thoại).
- `--shadow-glow`: `0 0 20px rgba(99, 102, 241, 0.25)` (Vầng sáng tím neon bao quanh logo icon và nút đang kích hoạt Micro).

---

### 2.6 Chuyển động & Thời gian (Transitions & Motion)

- `--transition-fast`: `150ms cubic-bezier(0.4, 0, 0.2, 1)` (Hover đổi màu button, focus ô input).
- `--transition-base`: `250ms cubic-bezier(0.4, 0, 0.2, 1)` (Hiệu ứng mở Accordion, lật thẻ từ).
- `--transition-slow`: `400ms cubic-bezier(0.4, 0, 0.2, 1)` (Chuyển slide, mở Modal toàn màn hình).

---

## 3. Kiến trúc Bố cục Toàn hệ thống (Layout Architecture)

Ứng dụng sử dụng cấu trúc **Responsive App Shell** với cơ chế chuyển đổi thông minh giữa Desktop và Mobile.

```
                    DESKTOP VIEW (>= 1024px)
┌──────────────┬────────────────────────────────────────────────────────┐
│              │ HEADER (Height: 60px)                                  │
│              │ [Page Title]             [SRS Due 🔥] [User] [Settings]│
│   SIDEBAR    ├────────────────────────────────────────────────────────┤
│ (Width:240px)│ MAIN PAGE CONTENT (Scrollable, Max-width: 1200px)      │
│              │                                                        │
│ [Logo]       │  ┌──────────────────────────────────────────────────┐  │
│ • Nghe AI    │  │  Hero / Banner / Filter Bar                      │  │
│ • Luyện Đọc  │  ├──────────────────────────────────────────────────┤  │
│ • Chunks     │  │  Grid / Cards / Interactive Workspace            │  │
│ • Từ Vựng    │  │                                                  │  │
│ • Practice   │  │                                                  │  │
│ • Nói AI ✨   │  │                                                  │  │
│ • Progress   │  └──────────────────────────────────────────────────┘  │
│ [Footer/User]│                                                        │
└──────────────┴────────────────────────────────────────────────────────┘

                    MOBILE VIEW (< 768px)
┌───────────────────────────────────────────────────────────────────────┐
│ MOBILE HEADER: [Page Title]                       [Settings] [Login]  │
├───────────────────────────────────────────────────────────────────────┤
│ PAGE CONTENT (Scrollable, Full-width, Touch-optimized)                │
│                                                                       │
│  [Card]                                                               │
│  [Interactive Exercise]                                              │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│ BOTTOM NAVIGATION BAR (Height: 64px, Fixed Bottom)                    │
│ [Nghe]    [Đọc]    [Chunks]    [Từ vựng]    [Nói]    [Nói AI] [Tiến độ│
└───────────────────────────────────────────────────────────────────────┘
```

### 3.1 Desktop Shell Layout (Màn hình lớn $\ge 1024\text{px}$)
- **Sidebar cố định bên trái** (`width: 240px`, cố định 100vh): Chứa logo có vầng sáng phát quang, 7 mục điều hướng chính, huy hiệu số bài cần ôn SRS ngọn lửa 🔥 màu đỏ và thông tin tài khoản ở chân Sidebar.
- **Khu vực nội dung chính (`main-content`)**: Chiếm trọn phần còn lại của màn hình, cuộn mượt mà độc lập, căn giữa với độ rộng tối đa chuẩn 1200px để mắt không phải đảo quá rộng khi đọc nội dung.
- **Thanh Header cố định trên đỉnh** (`height: 60px`): Hiển thị tiêu đề trang phụ đề mô tả ngắn, nút kích hoạt nhanh bài ôn tập đến hạn SRS và nút truy cập phòng Luyện Nói AI.

### 3.2 Mobile & Tablet Layout (Thiết bị di động $< 768\text{px}$)
- **Ẩn hoàn toàn Sidebar** để tối ưu hóa 100% diện tích cho bài học.
- **Kích hoạt Bottom Navigation Bar** (`BottomNav`):
  - Cố định ở đáy màn hình với chiều cao 64px kèm hiệu ứng phủ mờ `backdrop-filter: blur(16px)`.
  - Icon kích thước $20\text{px}$, nhãn ngắn gọn (Nghe, Đọc, Chunks, Từ vựng, Nói, Nói AI, Tiến độ).
  - Vùng chạm cảm ứng đạt chuẩn $\ge 44 \times 44\text{px}$, tích hợp badge đếm số lượng mini màu đỏ khi có bài đến hạn ôn tập.
  - Tương thích tốt với thanh Safe Area của iOS (iPhone Home Bar).

---

## 4. Hệ thống Thành phần Giao diện Dùng chung (Design System Primitives)

Tại file [`src/components/ui/index.jsx`](file:///d:/speaking_chunk/src/components/ui/index.jsx):

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ScoreRing     │  │     Badge       │  │     Toast       │
│    ╭──────╮     │  │  ╭───────────╮  │  │ ╭─────────────╮ │
│   │   85   │    │  │  │Collocation│  │  │ │✓ Đã lưu bài │ │
│    ╰──────╯     │  │  ╰───────────╯  │  │ ╰─────────────╯ │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

1. **`Modal` (Cửa sổ đối thoại chuẩn)**:
   - Nền phủ mờ 12px, hiệu ứng trượt nhẹ từ dưới lên `csmSlideUp`.
   - Hỗ trợ đóng nhanh bằng phím <kbd>Escape</kbd> hoặc click vào lớp phủ ngoài.
   - Thân Modal cuộn độc lập với thanh cuộn thu nhỏ, chân trang (Footer) chứa các nút hành động chính cố định dưới đáy.
2. **`ScoreRing` (Vòng tròn điểm số động)**:
   - Vẽ bằng SVG bán kính $28\text{px}$, nét vẽ $6\text{px}$, viền bo tròn (`strokeLinecap="round"`).
   - Hiệu ứng quét vòng mượt mà trong 0.6 giây (`strokeDasharray`).
   - Tự động chuyển đổi màu sắc theo ngưỡng điểm:
     - Xanh lá (`#4ade80`): $\ge 80$ điểm.
     - Vàng hổ phách (`#f59e0b`): $50 - 79$ điểm.
     - Đỏ (`#f87171`): $< 50$ điểm.
3. **`Badge` (Huy hiệu dạng viên thuốc - Pill Badge)**:
   - Thiết kế nhỏ gọn, bo góc tròn trịa, viền mờ 1px.
   - Các biến thể: `neutral`, `success`, `error`, `warning`, `collocation`, `functional`, `connector`.
4. **`Toast` (Thông báo nổi thông minh)**:
   - Nổi ở góc trên bên phải màn hình, có thanh màu nhận diện và icon tương ứng.
   - Tự động tan biến sau 4 giây, hỗ trợ bấm nút <kbd>×</kbd> để tắt tức thì.
5. **`Pagination` (Thanh phân trang linh hoạt)**:
   - Gồm nút Về đầu `«`, Lùi `‹`, danh sách số trang có highlight trang hiện tại, Tiến `›` và Về cuối `»`.
   - Tích hợp bộ đếm tổng số mục: `Hiển thị 1–10 trong 24 bài`.
6. **`Audio Wave Visualizer` (Trực quan hóa sóng âm)**:
   - 10 thanh sóng âm chuyển động theo biên độ tín hiệu micro thật, tạo cảm giác trực quan và kích thích nói to, rõ ràng.

---

## 5. Thiết kế Chi tiết Từng Module Nghiệp vụ

### 5.1 Module Luyện Nghe AI & Dictation (`ListeningAiModule`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🎧 LUYỆN NGHE TOEIC                                                    │
│ [Tạo đề nghe AI ✨]  [Dán Transcript thủ công +]  [Bộ lọc Part 3/4]    │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐  ┌──────────────────────────┐             │
│ │ 💼 Họp dự án Part 3      │  │ ✈️ Sân bay & Đổi vé      │             │
│ │ 🇺🇸 Mỹ & 🇬🇧 Anh          │  │ 🇺🇸 Mỹ & 🇦🇺 Úc            │             │
│ │ 8 Chunks • Đã làm 85%    │  │ 6 Chunks • Chưa luyện    │             │
│ │ [Nghe Dictation] [Luyện] │  │ [Nghe Dictation] [Luyện] │             │
│ └──────────────────────────┘  └──────────────────────────┘             │
└────────────────────────────────────────────────────────────────────────┘
```

* **Giao diện Quản lý Bài nghe**:
  - Dạng lưới Card hiển thị rõ ràng: Tên chủ đề song ngữ, biểu tượng cờ quốc gia các giọng đọc tham gia (🇺🇸, 🇬🇧, 🇦🇺, 🇨🇦), số lượng chunk đã bóc tách và thanh tiến độ.
  - Bộ phân trang chuyển trang siêu mượt mà với 10/20/50 bài trên trang.
* **Modal Luyện Nghe Độc Lập (`TranscriptListeningModal`)**:
  - **4 Chế độ linh hoạt**: Bình thường, Che chữ (Blind), Chép chính tả (Dictation) và Chỉ hiện Chunk.
  - **Trải nghiệm Dictation**: Các từ chưa gõ hiển thị dạng chấm mờ `••••••`. Khi người học nghe và gõ đúng, chữ sẽ bừng sáng màu xanh lá kèm âm thanh xác nhận.
  - **Phím tắt điều khiển tối cao**: <kbd>Ctrl</kbd> tua lùi 3s kèm hiệu ứng gợn sóng âm thanh lùi; <kbd>Shift</kbd> mở ngay từ ẩn kế tiếp khi gặp từ khó.

---

### 5.2 Module Luyện Đọc & 24 Chuyên Đề Ngữ Pháp (`ReadingModule`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📖 TOEIC READING MASTERY — 24 CHUYÊN ĐỀ NGỮ PHÁP                       │
│ [Thì & Phối thì] [Từ loại] [Mệnh đề quan hệ] [Câu bị động] [Tất cả]   │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Câu 3/10: The marketing team _____ the proposal by tomorrow.       │ │
│ │                                                                    │ │
│ │ (A) will submit    (B) submitted    (C) has submit    (D) submits  │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ 💡 GIẢI THÍCH CHI TIẾT:                                            │ │
│ │ • Đáp án đúng là (A) vì có trạng ngữ chỉ tương lai "by tomorrow"... │ │
│ │ • Chunk đắt giá: "submit the proposal"                             │ │
│ │   [+ Lưu Chunk vào Kho để Luyện Viết/Nói]                          │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

* **Banner Hero Khí chất**: Gradient tím đậm `linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(20, 20, 26, 0.95))` hiển thị tổng số chuyên đề và tỷ lệ hoàn thành.
* **Đấu Trường Trắc Nghiệm (`GrammarQuizArena`)**:
  - Khoảng trống cần điền `_____` được làm nổi bật với màu chữ vàng neon hoặc gạch chân phát sáng.
  - 4 phương án A/B/C/D trình bày dạng nút bấm lớn, có trạng thái hover đổi màu viền tím. Khi chọn, nếu đúng sẽ đổi sang viền xanh lá, nếu sai sẽ đổi sang viền đỏ và tự động highlight đáp án đúng màu xanh.
  - Khối **"Lưu Chunk từ câu hỏi"**: Nút bấm màu xanh ngọc cho phép người học lưu collocations đắt giá vào kho cá nhân chỉ với 1 cú click chuột.

---

### 5.3 Module 5000 Từ Vựng Cốt Lõi Theo Chủ Đề (`VocabModule`)

Thiết kế theo mô hình **3 bước chuyển màn hình mượt mà (3-Screen Journey)**:
1. **Màn 1 — Topic Browser**: Lưới thẻ chủ đề lớn kèm Emoji đại diện (💼 Kinh doanh, 🔬 Công nghệ, ✈️ Du lịch...), thanh phần trăm tiến độ hoàn thành từ vựng màu xanh lục.
2. **Màn 2 — Word Selector**:
   - Thanh trượt điều chỉnh số lượng học từ 1 đến 50 từ.
   - Các nút chọn nhanh phổ biến: `20 từ`, `30 từ`, `50 từ`.
   - Lưới thẻ từ vựng (Word Chips): Màu sắc thay đổi theo từ loại (Danh từ: Xanh dương, Động từ: Tím, Tính từ: Xanh lá). Mỗi thẻ từ đều có nút **Đổi từ (`Swap`)** để người học loại bỏ từ đã biết.
3. **Màn 3 — Learning Session**:
   - Thẻ từ dạng Flashcard hiện đại với phiên âm IPA to, rõ ràng và nút loa phát âm Edge Neural.
   - Thanh tiến trình sinh bài tự động chia theo từng đợt 10 từ kèm hiệu ứng lượn sóng phần trăm.

---

### 5.4 Module Quản Lý Kho Chunk Tập Trung (`ChunkModule`)

* **Giao diện Bảng Thẻ Tương Tác**:
  - Mỗi cụm từ được đóng gói trong một thẻ Card chuyên biệt với viền màu theo loại (Collocation: Xanh dương, Functional: Tím, Connector: Xanh ngọc).
  - Hiển thị đầy đủ: Nghĩa tiếng Việt, phiên âm IPA, câu gốc trong đề thi ETS, câu ví dụ mới ngoài đời sống và ghi chú ngữ cảnh.
* **Huy hiệu Tầng Trí Nhớ SRS**: Mỗi chunk hiển thị huy hiệu level từ `Level 0` đến `Level 10 (Mastered)` kèm biểu tượng ngọn lửa đỏ 🔥 nếu đã đến hạn ôn.
* **Thanh tác vụ chọn hàng loạt (Floating Action Bar)**: Khi tích chọn nhiều chunk, một thanh điều khiển sẽ nổi lên từ đáy màn hình, cho phép bấm **"Luyện viết N chunks"** hoặc **"Luyện nói AI"**.

---

### 5.5 Module Luyện Viết Dịch Câu Bậc Thang (`PracticeModule`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📝 CỤM TỪ: "take into account" (Cân nhắc, tính đến) — Level 3 🔥        │
├────────────────────────────────────────────────────────────────────────┤
│ ★ CẤP 1 (Cơ bản): Chúng tôi luôn cân nhắc ý kiến của khách hàng.       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ We always take customers' feedback into account.                   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [Xem câu mẫu (Enter)] ───► Nhấn [Tab] để chuyển câu tiếp theo ─────────┤
│                                                                        │
│ ★★ CẤP 2 (Trung cấp): Ban quản lý đã cân nhắc ngân sách trước khi ký.   │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ The management took the budget into account before signing.        │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ [Chấm bài AI (Gửi cả 3 câu)] ────► [Vòng tròn điểm: 92/100 🎉]         │
└────────────────────────────────────────────────────────────────────────┘
```

* **Trải nghiệm gõ phím liên tục**: Người học gõ xong câu 1, bấm phím <kbd>Tab</kbd> $\rightarrow$ con trỏ tự động nhảy xuống ô gõ của câu 2 kèm hiệu ứng cuộn mượt mà (`scrollIntoView`) đưa câu 2 vào chính giữa tầm mắt.
* **Khối chấm điểm hàng loạt (Batch Grading Result)**:
  - Vòng tròn `ScoreRing` lớn với điểm số chuyển động.
  - Khối phân tích lỗi ngữ pháp viền đỏ, chỉ rõ nguyên nhân và cách sửa bằng tiếng Việt.
  - Khối gợi ý câu văn tự nhiên hơn chuẩn bản xứ viền vàng hổ phách.
* **GroupCompletionModal**: Cửa sổ vinh danh hoàn thành nhóm bài với cúp vàng, chuỗi streak học tập và nút bấm **"Dọn dẹp bài đã ôn xong"** giúp giải phóng không gian học.

---

### 5.6 Phòng Luyện Nói AI "Cấp Độ 2" Chấm Âm Thanh (`SpeakingSession`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   🎙️ PHÒNG LUYỆN NÓI AI CẤP ĐỘ 2                       │
├────────────────────────────────────────────────────────────────────────┤
│ Câu mẫu: "We should take the weather conditions into account."         │
│                                                                        │
│ [ 🔊 Nghe mẫu ]     [ 🎙️ BẤM ĐỂ NÓI (Giữ Micro hoặc Click) ]           │
│                      ▂ ▃ ▅ ▆ █ ▆ ▅ ▃ ▂ (Sóng âm Visualizer)            │
│                                                                        │
│ KẾT QUẢ PHÂN TÍCH TỪNG TỪ:                                             │
│ 🟢 We   🟢 should   ⭐ take   🟢 the   🟡 weather   🔴 conditions...   │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 WORD INSPECTOR (Khi bấm vào từ "conditions"):                   │ │
│ │ • Phiên âm IPA chuẩn: [kənˈdɪʃ.ənz]                                │ │
│ │ • Điểm phát âm: 45/100                                             │ │
│ │ • Lỗi phát hiện: "Nuốt âm đuôi /z/, phát âm sai nguyên âm /ɪ/"     │ │
│ │ • [🔊 Nghe AI phát âm mẫu từ này]                                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

* **Nút Thu Âm Trọng Tâm**: Nút tròn lớn $64\text{px}$ đặt ở trung tâm, phát sáng vầng hào quang tím khi đang ghi âm (`animate-pulse`).
* **Hiển thị Câu Nói 3 Thang Màu**:
  - 🟢 **Xanh lá**: Từ phát âm chuẩn xác ($\ge 80$ điểm).
  - 🟡 **Vàng hổ phách**: Người nghe hiểu được nhưng còn lỗi nhẹ ($60 - 79$ điểm).
  - 🔴 **Đỏ**: Phát âm sai hoặc nuốt từ ($< 60$ điểm).
  - ⭐ **Ngôi sao**: Cụm từ chunk mục tiêu.
* **Bảng Soi Âm Vị Học (Word Inspector Panel)**:
  - Xuất hiện ngay khi người học click vào bất kỳ từ nào trong câu.
  - Hiển thị từng âm vị cấu thành (`phones`), chỉ rõ lỗi âm đuôi (-s, -z, -t, -d, -ed) và có nút bấm nghe riêng phát âm chuẩn của từ đó.

---

### 5.7 Phòng Luyện Nói Giao Tiếp AI Thực Chiến 2 Chiều (`ConversationalSpeakingModal`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 💬 LUYỆN NÓI GIAO TIẾP THỰC CHIẾN VỚI AI                [X Đóng]       │
│ Chủ đề: Nhận phòng khách sạn & Đổi phòng | Target Chunks: 3            │
├────────────────────────────────────────────────────────────────────────┤
│ [AI] 🤖: Hello! Welcome to Grand Hotel. How can I assist you today?    │
│          (Xin chào! Chào mừng quý khách...)                            │
│                                                                        │
│ [User] 👤: I would like to check in, and I made a reservation online.  │
│            🟢 make a reservation (Đã kích hoạt phản xạ chunk!)         │
│            [▶ Nghe lại ghi âm]  [Xem điểm phát âm IPA: 88/100]         │
│                                                                        │
│ [AI] 🤖: Certainly! May I have your passport and confirmation number?  │
├────────────────────────────────────────────────────────────────────────┤
│ 💡 GỢI Ý TRẢ LỜI: "Here is my passport. Could you check if..."         │
│                                                                        │
│            [ 🎙️ BẤM ĐỂ NÓI VỚI AI (GOP Real-time <100ms) ]            │
│               [✓ Bật bản dịch tiếng Việt]   [Kết thúc buổi nói]        │
└────────────────────────────────────────────────────────────────────────┘
```

* **Màn 1: Chọn Chủ Đề Giao Tiếp**:
  - Lưới 6 thẻ tình huống/trang với ảnh icon đại diện sắc nét.
  - Ô nhập chủ đề tự do (Custom Topic) với nút khởi tạo kịch bản tức thì.
* **Màn 2: Sàn Đấu Hội Thoại (Chat Arena)**:
  - Thiết kế dạng luồng tin nhắn đàm thoại hiện đại.
  - **Tô Sáng Cụm Chunk Thời Gian Thực (Green Highlight)**: Bất kỳ khi nào người học hoặc AI nói đúng chunk mục tiêu, cụm từ đó lập tức được bao bọc bởi khung nền màu xanh lá kèm huy hiệu chúc mừng.
  - **Nút Gợi Ý Trả Lời (<kbd>💡</kbd>)**: Nhấn vào biểu tượng bóng đèn để mở ra các câu trả lời mẫu gợi ý nếu người học bị bí ý tưởng.
  - **Công tắc Dịch Song Ngữ**: Nút gạt bật/tắt hiển thị nghĩa tiếng Việt ngay dưới mỗi lời thoại của AI.

---

### 5.8 Module Tiến Độ (`ProgressModule`)

* **3 Thẻ Chỉ Số Trọng Tâm (KPI Cards)**: Số chunk đã làm chủ (Mastered), Tổng số lượt luyện tập và Tỷ lệ thành công trung bình.
* **Biểu Đồ Tầng Trí Nhớ SRS 11 Cấp Độ**:
  - Dạng cột ngang xếp tầng từ `Level 0` đến `Level 10+`.
  - Màu sắc chuyển dịch từ tím nhạt (mới nạp) sang xanh lục đậm (đã khắc sâu vào trí nhớ dài hạn).
* **Bảng Đếm Ngược Thời Gian Ôn Tập**: Liệt kê các chunk sắp đến hạn với đồng hồ đếm ngược sinh động (`Còn 15 phút`, `Còn 2 giờ`, `Hôm nay cần ôn!`).

---

### 5.9 Module Cấu Hình (`Settings`) & Xác Thực Đám Mây (`Auth`)

* **Cửa sổ Cài Đặt (`SettingsModal`)**:
  - Được chia thành các nhóm cấu hình trực quan:
    1. *API Keys*: Nhập Dual Gemini API Key (Key 1 & Key 2) kèm nút "Kiểm tra kết nối" có đèn báo xanh/đỏ.
    2. *Lộ trình SRS*: Thẻ chọn dạng radio lớn giữa **Track A** (Người mới bắt đầu) và **Track B** (Người có nền tảng).
    3. *VoiceStudio*: Địa chỉ máy chủ giọng đọc offline cục bộ.
    4. *Thông báo*: Công tắc bật/tắt Web Push 4 khung giờ vàng kèm nút "Gửi thử thông báo".
* **Màn hình Đăng Nhập / Đăng Ký (`AuthScreen`)**:
  - Hỗ trợ cả 2 dạng: Màn hình độc lập và Modal nổi.
  - Nút **"Tiếp tục với tư cách Khách (Guest Mode)"** nổi bật, cho phép người dùng trải nghiệm ngay mà không có rào cản tạo tài khoản.

---

## 6. Hệ thống Phím Tắt & Tương Tác Năng Suất Cao (Keyboard-Driven UX)

Bảng tra cứu toàn bộ các phím tắt được thiết kế trong hệ thống:

| Phím tắt | Phân hệ áp dụng | Hành động tương tác |
|---|---|---|
| <kbd>Tab</kbd> | `PracticeModule` | Chuyển ngay xuống ô nhập câu dịch tiếp theo kèm cuộn mượt màn hình. |
| <kbd>Shift + Tab</kbd>| `PracticeModule` | Quay ngược lại câu dịch trước đó. |
| <kbd>Enter</kbd> | `PracticeModule` | Đóng / Mở nhanh câu dịch mẫu tham khảo. |
| <kbd>Ctrl</kbd> | `ListeningAiModule` | **Tua lùi âm thanh 3 giây** (hoạt động ngay cả khi đang gõ chữ trong ô Dictation). |
| <kbd>Shift</kbd> | `ListeningAiModule` | **Gợi ý từ ẩn tiếp theo** trong chế độ chép chính tả Dictation. |
| <kbd>Space</kbd> | `ListeningAiModule` | Tạm dừng / Tiếp tục phát âm thanh bài nghe. |
| <kbd>L</kbd> | `ListeningAiModule` | Lặp lại câu hiện tại (Loop sentence). |
| <kbd>Escape</kbd> | Toàn bộ ứng dụng | Đóng nhanh bất kỳ cửa sổ Modal hoặc Popover đang mở. |

---

## 7. Tiêu chuẩn Khả năng Tiếp cận & Trải nghiệm Đa giác quan (Accessibility & Multi-Sensory UX)

1. **Độ tương phản màu sắc đạt chuẩn WCAG AA/AAA**:
   - Tất cả văn bản màu trắng và xám bạc trên nền tối đều đạt tỷ lệ tương phản tối thiểu $4.5:1$ (đối với văn bản thường) và $7:1$ (đối với tiêu đề lớn).
2. **Khả năng điều hướng bằng bàn phím hoàn chỉnh (Focus Indicators)**:
   - Tất cả các nút bấm, ô nhập liệu và liên kết đều có đường viền focus phát sáng (`--shadow-glow`) rõ ràng khi người dùng sử dụng phím <kbd>Tab</kbd> để duyệt trang.
3. **Phản hồi lỗi mang tính nhân văn & Khích lệ**:
   - Mọi lời nhận xét của AI hoặc thông báo lỗi đều được định dạng bằng tiếng Việt rõ ràng, chỉ ra chính xác điểm cần khắc phục và luôn đi kèm lời động viên khích lệ tinh thần người học.
4. **Trải nghiệm đệm âm thanh mượt mà không độ trễ**:
   - Nhờ kiến trúc đệm IndexedDB, các câu nói đã nghe một lần sẽ phát lại ngay tức khắc mà không có bất kỳ khoảng lặng khó chịu nào, tạo cảm giác phản hồi nhanh như ứng dụng native trên máy tính.

---

*Tài liệu Design.md này là kim chỉ nam quy chuẩn để duy trì tính nhất quán về thẩm mỹ, kiến trúc bố cục và trải nghiệm người dùng trong suốt quá trình phát triển dự án.*
