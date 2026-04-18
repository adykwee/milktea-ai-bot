const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bot = require('./config/bot');
const menuService = require('./services/menuService');
const botService = require('./services/botService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route xử lý Webhook
app.post('/payos-webhook', (req, res) => webhookController.handlePayosWebhook(req, res));

async function bootstrap() {
    try {
        // 1. Load dữ liệu CSV vào bộ nhớ trước khi làm việc khác
        await menuService.loadMenu();

        // 2. Khởi tạo các sự kiện của Telegram Bot
        botService.init();

        // 3. Khởi chạy Bot
        bot.launch();
        console.log('Telegram Bot đã khởi chạy thành công!');

        // 4. Khởi chạy Express server (chuẩn bị sẵn cho PayOS Webhook)
        app.listen(PORT, () => {
            console.log(`Server Webhook đang chạy tại http://localhost:${PORT}`);
        });

        // Bắt sự kiện tắt server an toàn
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));

    } catch (error) {
        console.error('Khởi động ứng dụng thất bại:', error);
        process.exit(1);
    }
}

bootstrap();