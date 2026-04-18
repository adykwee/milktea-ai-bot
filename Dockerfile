# Sử dụng Node.js LTS (Phiên bản cực nhẹ alpine để tiết kiệm dung lượng)
FROM node:20-alpine

# Set múi giờ mặc định cho container là Việt Nam
ENV TZ=Asia/Ho_Chi_Minh

# Tạo thư mục làm việc trong container
WORKDIR /app

# Khai báo file cài đặt package.json trước để tận dụng Docker Cache
COPY package*.json ./

# Cài đặt các thư viện (production để bỏ qua devDependencies như nodemon)
RUN npm ci --only=production

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở port 3000 (Render sẽ dùng biến môi trường PORT nội bộ tự động trỏ vào đây)
EXPOSE 3000

# Chạy server
CMD ["npm", "start"]
