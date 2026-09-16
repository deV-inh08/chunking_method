# 🎨 UI/UX Component Specification v2.0 — TOEIC Chunk Trainer

**Mục đích tài liệu**: Đặc tả chi tiết từng component và từng luồng UI/UX, dựa trên nghiệp vụ hiện có (`README.md`) và Design System v1 (`Design.md`), được nâng cấp theo hướng hybrid: giữ bản sắc Dark-First + Glassmorphism, đồng thời áp dụng nguyên tắc kỷ luật về accessibility, contrast và spacing tham khảo từ Coursera Design System.

**Thay đổi cốt lõi so với v1**:
- Bổ sung trạng thái Loading / Empty / Error cho mọi component
- Tách màu sắc khỏi vai trò "kênh thông tin duy nhất" (bổ sung icon bắt buộc)
- Thêm Light Mode tùy chọn
- Tinh gọn điều hướng (Bottom Nav tối đa 5 mục)
- Đổi tên 2 tính năng dễ nhầm lẫn ("Nói" → "Luyện âm", "Nói AI" → "Hội thoại AI")

---

## 📑 MỤC LỤC

1. [Nguyên tắc thiết kế v2 (Design Principles)](#1-nguyên-tắc-thiết-kế-v2)
2. [Design Tokens Hybrid](#2-design-tokens-hybrid)
3. [Component Nguyên tử (Atomic Components)](#3-component-nguyên-tử-atomic-components)
4. [Điều hướng (Navigation)](#4-điều-hướng-navigation)
5. [Đặc tả UI/UX theo từng Module Nghiệp vụ](#5-đặc-tả-uiux-theo-từng-module-nghiệp-vụ)
6. [Trạng thái Hệ thống (System States)](#6-trạng-thái-hệ-thống-system-states)
7. [Checklist Accessibility](#7-checklist-accessibility)

---

## 1. Nguyên tắc thiết kế v2

| # | Nguyên tắc | Áp dụng từ |
|---|---|---|
| 1 | **Màu không bao giờ là kênh thông tin duy nhất** — mọi trạng thái màu (xanh/vàng/đỏ) phải đi kèm icon hoặc ký hiệu | Coursera accessibility guideline (~8% nam giới mù màu đỏ/lục) |
| 2 | **Contrast tối thiểu AA (4.5:1), ưu tiên AAA (7:1)** cho mọi cặp chữ/nền | Coursera contrast audit |
| 3 | **Mọi component tương tác đều có focus-ring 2px, offset 2px** | Coursera focus indicator |
| 4 | **Touch target ≥ 44×44px** trên mobile | Coursera + WCAG |
| 5 | **Mọi màn hình async đều có 3 trạng thái bắt buộc: Loading / Empty / Error** — không được để trắng màn hình | Chuẩn UX hệ thống |
| 6 | **Tối đa 5 mục ở Bottom Navigation** trên mobile | Chuẩn UX mobile |
| 7 | **Không lồng Modal trong Modal trên mobile** — chuyển sang full-screen page hoặc bottom sheet | Mobile UX best practice |
| 8 | **Giữ Dark-first làm mặc định, Light Mode là tùy chọn** — không đảo ngược triết lý gốc | Giữ bản sắc sản phẩm |

---

## 2. Design Tokens Hybrid

### 2.1 Màu sắc — Dark Mode (Mặc định, giữ nguyên bản sắc)

| Token | Giá trị | Ghi chú |
|---|---|---|
| `--bg-base` | `#0d0f14` | Không đổi |
| `--bg-surface` | `#13161e` | Không đổi |
| `--bg-elevated` | `#1a1e2a` | Không đổi |
| `--text-primary` | `#f4f5f7` | Định nghĩa chuẩn, contrast với `--bg-base` đạt ~17.8:1 (AAA) |
| `--text-secondary` | `#a0a4b0` | Dùng cho caption/văn bản phụ, contrast ~7.2:1 (AAA) trên `--bg-base` |
| `--accent-500` | `#6366f1` | Giữ làm màu thương hiệu chính |
| `--accent-700` | `#4338ca` | Dùng cho text/link cần contrast cao hơn |

### 2.2 Màu sắc — Light Mode (Tùy chọn mới, cấu trúc tham khảo Coursera)

| Token | Giá trị | Ghi chú |
|---|---|---|
| `--bg-base-light` | `#eef0f7` | Periwinkle nhạt, đỡ chói hơn trắng thuần, tham khảo Coursera `#dae1ed` |
| `--bg-surface-light` | `#ffffff` | Card, modal |
| `--text-primary-light` | `#12131a` | Contrast ~18:1 trên surface (AAA) |
| `--border-light` | `#d7dbe8` | Viền nhẹ |
| `--accent-500` | `#6366f1` | Giữ nguyên accent thương hiệu |

*Vị trí bật/tắt*: Settings → nhóm "Giao diện" → radio Dark / Light / Theo hệ thống.

### 2.3 Màu ngữ nghĩa — nâng cấp kèm icon bắt buộc

| Trạng thái | Màu | Icon bắt buộc đi kèm | Áp dụng |
|---|---|---|---|
| **Thành công** | `#4ade80` | `CheckCircle2` (lucide-react) | Điểm ≥ 80, chunk đúng |
| **Cảnh báo** | `#facc15` | `AlertTriangle` | Điểm 60–79, cần chú ý |
| **Lỗi** | `#f87171` | `XCircle` | Điểm < 60, sai |
| **Chunk mục tiêu** | `#818cf8` | `Star` (fill) | Từ thuộc target chunk |

*Lý do bắt buộc icon*: ~8% nam giới bị mù màu đỏ/lục — nếu chỉ dựa vào màu, nhóm này không phân biệt được kết quả chấm phát âm, ảnh hưởng trực tiếp tính năng lõi.

### 2.4 Typography, Spacing, Radius, Motion

- Giữ nguyên toàn bộ token từ `Design.md` v1 (Inter / JetBrains Mono, scale 4px, radius sm → full, transition fast/base/slow).
- Bổ sung:
  - `--transition-settle: 300ms cubic-bezier(0, 0, 0.5, 1)` (tham khảo easing Coursera) dùng cho hiệu ứng mở Modal / Vòng tròn điểm số.
  - Thêm `@media (prefers-reduced-motion)` và `@media (prefers-reduced-transparency)`: tắt `backdrop-filter: blur()` trên thiết bị yếu hoặc theo thiết lập người dùng.

---

## 3. Component Nguyên tử (Atomic Components)

### 3.1 Button
- **Default**: `--accent-500` nền, `--accent-50` chữ.
- **Hover**: `--accent-600`, `transition-fast`.
- **Active/Pressed**: `--accent-700`, `scale(0.98)`.
- **Focus (Bàn phím)**: `outline: 2px solid var(--accent-400)`, `outline-offset: 2px`.
- **Disabled**: `opacity: 0.4`, `cursor: not-allowed`, KHÔNG set `tabIndex={-1}`, dùng thuộc tính `disabled` để screen reader đọc được.
- **Loading**: Thay label bằng spinner 16px, giữ nguyên width/height nút (dùng min-width để tránh layout shift).

### 3.2 Input / Textarea
- **Default**: `--bg-elevated`, viền `--border-default`.
- **Focus**: Viền `--accent-400` + `--shadow-glow` nhẹ.
- **Error**: Viền `--error-border`, hiển thị text lỗi kèm icon `AlertCircle` ngay dưới, không chỉ đổi màu viền.
- **Disabled**: `opacity: 0.5`.
- **Draft-saved** (Practice Module): Icon `Check` mờ dần bên phải input sau 800ms không gõ, tự ẩn sau 1.5s (`DraftSaveIndicator`).

### 3.3 ScoreRing
- Giữ nguyên cơ chế SVG animate.
- Số điểm text ở giữa vòng tròn phải đạt contrast AA với nền.
- Thêm icon nhỏ (`CheckCircle2` / `AlertTriangle` / `XCircle`) cạnh số điểm.

### 3.4 Badge
- Giữ dáng viên thuốc (Pill shape).
- Mỗi variant màu thêm icon 12px tương ứng:
  - `Collocation`: icon `Link2`
  - `Functional`: icon `MessageSquare`
  - `Connector`: icon `ArrowRightLeft`

### 3.5 Toast
- Thêm variant `loading` (spinner icon, không tự tắt sau 4s, phải gọi dismiss thủ công).
- Toast lỗi mạng / quota: thêm prop `onRetry` render nút "Thử lại" ngay trong toast.

### 3.6 Modal → Adaptive Modal / Page
- Desktop ($\ge 1024\text{px}$): Giữ Modal như v1.
- Mobile ($< 768\text{px}$): Các Modal cấp 1 (Speaking Session, Conversational Speaking, Listening) chuyển thành full-screen page. `Word Inspector` mở dưới dạng Bottom Sheet trượt lên, có thể vuốt xuống để đóng.

### 3.7 Audio Wave Visualizer
- Thêm logic: Nếu không phát hiện biên độ âm thanh nào > ngưỡng tối thiểu trong 3 giây liên tục khi đang ghi âm, hiển thị gợi ý text nhỏ: *"Không nghe thấy giọng nói, hãy nói to hơn"*.

---

## 4. Điều hướng (Navigation)

### 4.1 Bottom Navigation Mobile (Tối đa 5 mục)
```
┌─────────────────────────────────────────────────────────┐
│       [Nghe]    [Đọc]    [Luyện tập]    [Luyện âm]    [Thêm]       │
└─────────────────────────────────────────────────────────┘
```
1. **Nghe**: `ListeningAiModule`
2. **Đọc**: `ReadingModule`
3. **Luyện tập**: Gộp `Chunk Bank` + `Practice Module` (có sub-tab điều hướng trong)
4. **Luyện âm**: `SpeakingSession` (chấm câu đơn lẻ) — đổi tên từ "Nói"
5. **Thêm**: Menu mở rộng gồm: *Hội thoại AI (Conversational Speaking)*, *Từ vựng*, *Tiến độ*, *Cài đặt*

### 4.2 Desktop Sidebar
- Giữ 7 mục như cũ vì có đủ không gian, nhưng đổi tên đồng bộ:
  - "Nói" → "Luyện âm"
  - "Nói AI" → "Hội thoại AI"

---

## 5. Đặc tả UI/UX theo từng Module Nghiệp vụ

### 5.1 ListeningAiModule
- **Layout**: Grid card 2–3 cột desktop, 1 cột mobile.
- **Empty state**: Khi chưa có bài nghe nào: Illustration + CTA lớn *"Tạo đề nghe đầu tiên với AI ✨"*.
- **Loading state**: Skeleton card (3 khối xám nhấp nháy) khi tải danh sách; Progress bar dạng steps khi AI sinh kịch bản.
- **Error state**: Toast + card *"Không thể tạo bài nghe, thử lại"* nếu API lỗi.
- **Phím tắt**: Tooltip onboarding lần đầu mở Dictation liệt kê 4 phím (<kbd>Ctrl</kbd>, <kbd>Shift</kbd>, <kbd>Space</kbd>, <kbd>L</kbd>).
- **Accessibility**: Nút tua lùi/next có `aria-label`.

### 5.2 ReadingModule (24 chuyên đề)
- **Đáp án đúng/sai**: Viền màu + icon `Check`/`X` đè lên góc nút đáp án.
- **Loading**: Shimmer skeleton khi AI tạo giải thích chi tiết.
- **Empty**: *"Chuyên đề đang được cập nhật"*.
- **Lưu chunk**: Nút chuyển trạng thái tức thì *"✓ Đã lưu"* trong 1.5s rồi ẩn.

### 5.3 VocabModule (5000 từ)
- **Màn 1**: Skeleton grid khi tải % tiến độ.
- **Màn 2**: Nút Swap hiển thị số lượng từ còn lại để đổi (*"Còn 45 từ để đổi"*).
- **Màn 3**: Progress bar hiển thị số lô hiện tại / tổng số lô (*"Lô 2/5"*).
- **Lỗi quota**: Giữ nguyên các lô đã xong, chỉ retry lô lỗi.

### 5.4 ChunkModule
- **Phân loại**: 3 màu + 3 icon riêng biệt (`Link2`, `MessageSquare`, `ArrowRightLeft`).
- **Empty**: CTA điều hướng sang 3 nguồn tạo chunk (Nghe / Từ vựng / Đọc).
- **Floating Action Bar**: Hiển thị số lượng đã chọn + nút *"Bỏ chọn tất cả"*.

### 5.5 PracticeModule
- **Batch Grading**: Trong lúc chấm 3 câu, disable nút Submit, hiện skeleton loading vùng kết quả, không khóa toàn màn hình.
- **Lỗi chấm**: Giữ nguyên bài đã gõ (không mất draft), hiện toast *"Không chấm được, đang dùng lại bản nháp của bạn"*.
- **Phím Tab**: Chỉ báo nhỏ *"Nhấn Tab để chuyển câu tiếp"* (chỉ hiện 2 lần đầu rồi ẩn).
- **GroupCompletionModal**: Full-screen trên mobile, nút *"Dọn dẹp bài đã ôn"* đạt $\ge 44\text{px}$.

### 5.6 SpeakingSession ("Luyện âm")
- **Trạng thái Mic**: Default → Recording (pulse + đếm giây) → Processing (spinner) → Result.
- **Không có quyền Mic**: Modal giải thích cách cấp quyền kèm hình minh họa.
- **Mất mạng**: Tự động chuyển sang offline fallback, hiện banner *"Đang chấm bằng chế độ offline, độ chính xác có thể thấp hơn"*.
- **Word Inspector**: Bottom Sheet trên mobile, nút loa $\ge 44\text{px}$.
- **Thang điểm**: 🟢🟡🔴⭐ kèm icon tương ứng đè góc dưới mỗi từ.

### 5.7 ConversationalSpeakingModal ("Hội thoại AI")
- **Loading giữa lượt**: Hiển thị 3 chấm nhấp nháy *"AI đang suy nghĩ..."* trong bong bóng chat.
- **Lỗi STT**: Cho phép người dùng gõ tay câu trả lời thay thế.
- **Tô sáng chunk**: Highlight xanh + icon Star nhỏ cạnh chunk kích hoạt.
- **Thoát sớm**: Nút cố định + Dialog xác nhận nếu còn chunk chưa luyện.

### 5.8 ProgressModule
- **Empty**: Thông điệp khích lệ + CTA *"Bắt đầu luyện tập đầu tiên"*.
- **Biểu đồ 11 tầng**: Bổ sung số liệu text cụ thể cạnh mỗi cột.

### 5.9 Settings & Auth
- **Test API Key**: Đèn báo + text *"Kết nối thành công"* / *"Thất bại: sai key"*.
- **Thông báo**: Cho phép bật/tắt riêng từng khung giờ và tùy chỉnh giờ.
- **Guest Mode**: Banner nhắc nhẹ *"Đăng nhập để đồng bộ dữ liệu"* sau 3 ngày sử dụng liên tục.

---

## 6. Trạng thái Hệ thống (System States)

Áp dụng thống nhất cho mọi màn hình:
- **Loading**: Skeleton UI mô phỏng đúng layout thật.
- **Empty**: Luôn có illustration/icon nhẹ + 1 câu mô tả + 1 CTA hành động cụ thể.
- **Error (Mạng)**: Toast + nút *"Thử lại"* tại chỗ, giữ nguyên dữ liệu đã nhập.
- **Error (Quota AI 429)**: Thông báo tiếng Việt rõ ràng: *"Đã hết lượt gọi AI hôm nay, hệ thống đang chuyển sang Key dự phòng"*.
- **Success**: Toast xanh 4s tự tắt, có nút $\times$.

---

## 7. Checklist Accessibility

- [ ] Mọi cặp text/nền đạt tối thiểu 4.5:1 (AA), ưu tiên 7:1 (AAA).
- [ ] Mọi trạng thái màu (success/warning/error/chunk-type) có icon đi kèm.
- [ ] Mọi phần tử tương tác có focus-ring 2px, offset 2px khi Tab.
- [ ] Touch target $\ge 44 \times 44\text{px}$ trên mobile UI.
- [ ] Không có Modal-trong-Modal trên mobile.
- [ ] Tất cả icon-only button có `aria-label`.
- [ ] Hỗ trợ `prefers-reduced-motion` và `prefers-reduced-transparency`.
- [ ] Test toàn bộ luồng lõi bằng bàn phím thuần túy.
