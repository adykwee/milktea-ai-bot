# Milk Tea AI Chatbot & Dashboard

Giải pháp trọn gói vận hành quán đồ uống thông minh, sử dụng Trí Tuệ Nhân Tạo (AI) để tư vấn, nhận đơn và xử lý tự động thanh toán cho khách hàng qua nền tảng Telegram.

[Telegram Chat Bot](https://web.telegram.org/k/#@milkteachatbot)

[Server](https://milktea-ai-bot.onrender.com)

[Dashboard](https://milktea-ai-bot.onrender.com/dashboard.html)

## Tính Năng Nổi Bật

1. **AI Order Tự Động (OpenAI / Gemini):** Trò chuyện mượt mà như nhân viên thật, tư vấn đúng menu, gợi ý món, chốt đơn, xác nhận thông tin nhận hàng của khách (Tên, Địa chỉ, SĐT).
2. **Kênh Thanh Toán PayOS (VietQR):** Tự động sinh mã QR chuyển khoản ngân hàng gắn liền với từng đơn, với số tiền chính xác và nội dung chuyển khoản tự động. Không cần quy trình con người kiểm duyệt bill thủ công.
3. **Webhook Siêu Tốc:** Lắng nghe và xác nhận tiền nổi tự động 24/7 thông qua callback từ hệ thống ngân hàng mở PayOS.
4. **Live Web Dashboard (Glassmorphism):** Giao diện quản lý bếp kiểu dáng hiện đại (Kính mờ, Blobs animation). Đơn hàng nhảy cái vèo lên màn hình ngay khi khách hàng chuyển khoản thành công.
5. **PostgreSQL Storage:** Tất cả giao dịch và trạng thái đơn hàng (Đang chờ, Đã hoàn thành) được lưu trữ an toàn xuống cơ sở dữ liệu trên Cloud, chống rớt đơn kể cả khi sập nguồn server.

---

## Công Nghệ Sử Dụng

- **Backend:** Node.js, Express.js
- **Bot Engine:** Telegraf (Telegram Bot API)
- **AI Engine:** Tích hợp gọi API linh hoạt (OpenAI function calling)
- **Database:** PostgreSQL (với thư viện `pg`)
- **Frontend Dashboard:** Vanilla HTML/CSS/JS (cập nhật siêu tốc qua REST API Polling 1s)
- **Payment Gateway:** `@payos/node` (SDK v2)
- **Deploy/DevOps:** Docker, Docker Compose

---

## Hướng Dẫn Cài Đặt (Chạy Môi Trường Local)

### 1. Yêu Cầu Máy Chủ
- Có cài đặt **Node.js** (Phiên bản LTS 18 hoặc 20 trở lên).
- Có cài đặt bộ quản lý package (NPM).
- Mã nguồn Editor (Khuyên dùng [VS Code](https://code.visualstudio.com/)).

### 2. Biến Môi Trường (Cực Kì Quan Trọng)
Bạn cần tạo một file `.env` ở thư mục gốc của dự án và dán đoạn thông tin cấu hình sau:

```env
# ----- TELEGRAM BOT -----
# Lấy qua hướng dẫn tạo bot từ @BotFather trên Telegram
BOT_TOKEN=8781xxxxx:AAER-zpidf1HegMed2ZM2escFoPi... 

# ----- TRÍ TUỆ NHÂN TẠO -----
# API Key của nhà cung cấp AI
OPENAI_API_KEY=sk-proj-vULpRg...

# ----- CỔNG THANH TOÁN (my.payos.vn) -----
PAYOS_CLIENT_ID=133ca668-....
PAYOS_API_KEY=a855b9b4-...
PAYOS_CHECKSUM_KEY=1accb7801...

# ----- CƠ SỞ DỮ LIỆU POSTGRESQL -----
# Lấy URI từ các host free như Neon.tech, Supabase
DATABASE_URL=postgresql://user:password@hostname:5432/dbname

# ----- SERVER PORT -----
PORT=3000
```

### 3. Cài Đặt và Khởi Chạy
```bash
# 1. Tải toàn bộ thư viện liên quan
npm install

# 2. Khởi động Server Node.js
# Lệnh này sẽ bật Bot và cổng Webhook ở địa chỉ: http://localhost:3000
npm start 

# Hoặc dùng nodemon (để tự reload khi dev):
# npm run dev
```

### 4. Kết nối mạng cho máy Dev (Local ngrok)
Nếu hệ thống chỉ đang chạy trên máy tính nhà của bạn, PayOS trên mạng làm sao thấy được để báo webhook? Hãy bật Terminal phụ để đào hầm nối mạng nhé:
```bash
ngrok http 3000
```
> *Pha mấu chốt:* Hãy copy cái link Ngrok sinh ra dạng HTTPS (ví dụ `https://a683...ngrok.app/payos-webhook`) thả vào phần thiết lập Cấu hình con Bot trên Web quản lý PayOS.

---

## Hướng Dẫn Deploy (Lên Mây rảnh tay với Docker)

Toàn bộ dự án đã được tối ưu hóa cho công nghệ Container **Docker** siêu nhẹ bằng Alpine.

1. **Bước 1:** Cam kết (Commit) toàn bộ mã nguồn đẩy lên Git (Github / Gitlab).
2. **Bước 2:** Truy cập một Cloud Platform phổ biến có hỗ trợ deploy trực tiếp từ Github file Dockerfile (như **Render.com**, **Railway.app**).
3. **Bước 3:** Tại trang cấu hình Server mây, dán lại toàn bộ 6 cái chìa khoá bí mật ở mục lệnh `.env` vào tab **Environment Variables** để Container hiểu được dữ liệu.
4. **Bước 4:** Deploy và tận hưởng. Render sẽ trả cho bạn url ví dụ `https://milktea.onrender.com`. Lấy link này nối thêm đuôi `/payos-webhook` đắp trả lại cho trang cấu hình của thẻ PayOS là xong vĩnh viễn!

*(Khi khách hàng order xong, bạn chỉ việc gõ `https://milktea.onrender.com/dashboard.html` để coi đơn nhảy pưng pưng!)*

---

*Lưu ý bảo mật: Không bao giờ đẩy file `.env` lên Github đại chúng để tránh hacker bào hao hụt sạch tiền API của ban! (Đã được chặn trước trong `.dockerignore`)*.
