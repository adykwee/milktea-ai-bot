const payos = require('../config/payos');
const paymentService = require('../services/paymentService');
// Cần require botService theo cách lazy hoặc dùng event để tránh vòng lặp (circular dependency)
// Ở đây ta gọi trực tiếp instance bot từ config để gửi tin nhắn
const bot = require('../config/bot'); 

class WebhookController {
    async handlePayosWebhook(req, res) {
        try {
            const webhookData = req.body;

            // Xác thực dữ liệu webhook để đảm bảo đúng là từ payOS gửi tới
            let webhookDataVerified;
            try {
                webhookDataVerified = await payos.webhooks.verify(webhookData);
            } catch (err) {
                return res.status(400).json({ success: false, message: "Webhook data invalid" });
            }

            // Lấy thông tin data bên trong payload
            const { orderCode, code } = webhookDataVerified;

            // '00' là mã code báo trạng thái giao dịch thành công của payOS
            if (code === "00") {
                // 1. Lấy thông tin đơn hàng từ bộ nhớ
                const orderInfo = paymentService.getOrderInfoByCode(orderCode);

                if (orderInfo) {
                    const { userId, orderData } = orderInfo;

                    // 2. Gửi tin nhắn cho khách
                    await bot.telegram.sendMessage(
                        userId, 
                        "Cô đã nhận được tiền rồi nha! Đơn hàng đang được chuẩn bị và sẽ giao đến sớm cho con."
                    );

                    // 3. Đưa đơn hàng mới thanh toán vào Database PostgreSQL (Chạy ngầm không chờ)
                    const orderService = require('../services/orderService');
                    orderService.addOrder({
                        orderCode: orderCode,
                        customer_name: orderData.customer_name,
                        customer_address: orderData.customer_address,
                        customer_phone: orderData.customer_phone,
                        items: orderData.items,
                        total_amount: orderData.total_amount
                    }).catch(console.error);

                    // 4. Dọn dẹp RAM và Xóa session khách
                    paymentService.removePendingOrder(orderCode);
                    const botService = require('../services/botService');
                    botService.clearUserSession(userId);
                } else {
                    console.log(`Không tìm thấy userId cho đơn hàng ${orderCode}`);
                }
            }

            // Luôn trả về 200 OK để payOS biết server đã nhận được webhook
            return res.status(200).json({ success: true });

        } catch (error) {
            console.error("Lỗi khi xử lý webhook PayOS:", error);
            // Vẫn trả về 200 để payOS không gửi lại webhook nhiều lần gây spam
            return res.status(200).json({ success: false }); 
        }
    }
}

module.exports = new WebhookController();