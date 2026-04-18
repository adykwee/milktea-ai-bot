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
            const isValid = payos.verifyPaymentWebhookData(webhookData);
            
            if (!isValid) {
                return res.status(400).json({ success: false, message: "Webhook data invalid" });
            }

            // Lấy thông tin data bên trong payload
            const { orderCode, code } = webhookData.data;

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

                    // 3. Chuẩn bị "Bill" để gửi vào Group Bếp
                    let receiptMessage = `**CÓ ĐƠN HÀNG MỚI ĐÃ THANH TOÁN**\n`;
                    receiptMessage += `Mã đơn: #${orderCode}\n`;
                    receiptMessage += `Khách hàng: ${orderData.customer_name}\n`;
                    receiptMessage += `Địa chỉ: ${orderData.customer_address}\n`;
                    receiptMessage += `-------------------\n`;
                    
                    orderData.items.forEach(item => {
                        receiptMessage += `- ${item.quantity}x ${item.name} (Size ${item.size})\n`;
                    });
                    
                    receiptMessage += `-------------------\n`;
                    receiptMessage += `Tổng tiền: ${orderData.total_amount.toLocaleString('vi-VN')} VNĐ\n`;

                    // 4. Bắn Bill vào Group Chat (Lấy ID từ file .env)
                    await bot.telegram.sendMessage(
                        process.env.GROUP_CHAT_ID, 
                        receiptMessage
                    );

                    // 5. Dọn dẹp RAM và Xóa session khách
                    paymentService.removePendingOrder(orderCode);
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