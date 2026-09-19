# ⚡ Speaking Chunk — Chrome Extension (Manifest V3)

Trợ lý học tiếng Anh theo ngữ cảnh & đồng bộ hai chiều với Web App **Speaking Chunk**.

---

## 📌 Tính Năng Nổi Bật

1. **Tô đen dịch ngữ cảnh tức thì**: Khi đọc báo (BBC, CNN, New York Times), Reddit, Medium hoặc tài liệu:
   - Chỉ cần bôi đen bất kỳ từ hoặc cụm từ nào (1–8 từ).
   - Tooltip AI tự động trích xuất **cả câu ngữ cảnh** xung quanh và gọi Gemini AI dịch nghĩa chính xác nhất theo câu đó (thay vì dịch máy chung chung).
   - Hiển thị phiên âm IPA, loại từ và sắc thái sử dụng.
2. **Lưu 1-Click vào Giỏ từ vựng**:
   - Bấm `[+ Lưu vào Giỏ từ]` ngay trên Tooltip nổi.
   - Bản ghi tự động được lưu vào Supabase Cloud (bảng `saved_words`) kèm câu gốc và link bài báo.
3. **Đăng ký & Đăng nhập Email/Mật khẩu**:
   - Dùng chung tài khoản với Web App.
   - Tự động đồng bộ Gemini API Key đã cấu hình từ Web App sang Extension (bảo mật qua Supabase RLS).
4. **Biến từ vựng thành Chunks phản xạ trên Web App**:
   - Mở tab **"Giỏ từ Extension"** trên Web App.
   - Chọn các từ muốn học → Bấm **"Tạo Chunks & Luyện tập"**.
   - AI tự động sinh 2 collocations thực tế/từ và 3 bài luyện dịch Việt → Anh (3 cấp độ).
   - Chuyển thẳng sang giao diện luyện dịch & luyện nói chấm điểm AI!

---

## 🚀 Hướng Dẫn Cài Đặt (Chỉ mất 2 phút)

### Bước 1: Chạy SQL Migration trên Supabase (Chỉ làm lần đầu)
1. Mở [Supabase Dashboard](https://supabase.com/dashboard) và chọn project của bạn.
2. Vào mục **SQL Editor** (biểu tượng `>_` bên thanh trái).
3. Mở file [scripts/supabase_extension_migration.sql](../scripts/supabase_extension_migration.sql) trong project này, sao chép toàn bộ nội dung và dán vào SQL Editor.
4. Bấm nút **Run** (chạy). Bạn sẽ thấy thông báo *Success. No rows returned*.

---

### Bước 2: Cài Extension vào Chrome hoặc Microsoft Edge
1. Mở trình duyệt Chrome (hoặc Edge, Brave, Cốc Cốc).
2. Truy cập thanh địa chỉ:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén).
5. Chọn thư mục `extension` trong dự án của bạn:
   `D:\speaking_chunk\extension`
6. Tiện ích **Speaking Chunk — Context Translator & Word Basket** sẽ xuất hiện trên thanh công cụ! (Hãy bấm ghim icon ⚡ lên thanh trình duyệt).

---

### Bước 3: Đăng nhập & Sử dụng
1. Bấm vào icon **Speaking Chunk** ⚡ trên thanh công cụ trình duyệt.
2. Đăng nhập bằng **Email & Mật khẩu** mà bạn đang dùng trên Web App (hoặc đăng ký tài khoản mới ngay tại popup).
3. Mở bất kỳ trang web tiếng Anh nào (ví dụ: BBC News, Wikipedia, Medium...).
4. **Tô đen một từ hoặc cụm từ** bạn chưa biết:
   - Tooltip AI màu tối sang trọng sẽ hiện ra và dịch theo đúng ngữ cảnh câu.
   - Bấm **[+ Lưu vào Giỏ từ]** để lưu lại.
5. Khi muốn học, bấm icon Extension → Chọn **🚀 Mở Web App Luyện Chunking** (hoặc mở Web App tab **Giỏ từ Extension**):
   - Tick chọn các từ và bấm **Tạo Chunks & Luyện tập** để bắt đầu luyện phản xạ!
