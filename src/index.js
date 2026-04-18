const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bot = require('./config/bot');
const menuService = require('./services/menuService');
const botService = require('./services/botService');
const webhookController = require('./controllers/webhookController');
const orderService = require('./services/orderService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Phục vụ giao diện Dashboard
app.use(express.static('public'));

// Trả về danh sách đơn hàng cho Dashboard
app.get('/api/orders', async (req, res) => {
    const orders = await orderService.getPendingOrders();
    res.json(orders);
});

// Xử lý nút hoàn thành đơn hàng từ Dashboard
app.post('/api/orders/:orderCode/complete', async (req, res) => {
    const { orderCode } = req.params;
    const success = await orderService.markOrderCompleted(orderCode);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Không tìm thấy hoặc lỗi update" });
    }
});

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