const payos = require('../config/payos');

// Map dùng để lưu trữ ánh xạ giữa Mã đơn hàng (orderCode) và ID Telegram của khách (userId)
const pendingOrders = new Map();

class PaymentService {
    async createPaymentLink(orderData, userId) {
        try {
            // orderCode của PayOS yêu cầu là một số nguyên dương (Number)
            // Dùng Date.now() kết hợp random để đảm bảo không trùng lặp
            const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));

            // Chuyển đổi mảng items của AI thành định dạng của PayOS
            const mappedItems = orderData.items.map(item => ({
                name: `${item.name} (Size ${item.size})`,
                quantity: item.quantity,
                price: item.price
            }));

            const requestData = {
                orderCode: orderCode,
                amount: orderData.total_amount,
                description: `Thanh toan TS ${orderCode}`, // Mô tả tối đa 25 ký tự
                items: mappedItems,
                // Các link điều hướng nếu dùng trên web (ở đây ta chat bot nên có thể để link mặc định)
                returnUrl: "https://casso.vn",
                cancelUrl: "https://casso.vn"
            };

            const paymentLinkResponse = await payos.paymentRequests.create(requestData);

            // Lưu lại userId gắn với orderCode này để chờ Webhook
            pendingOrders.set(orderCode, {
                userId: userId,
                orderData: orderData // Chứa items, total_amount, customer_name, customer_address
            });

            // Trả về một object chứa link checkout và chuỗi nội dung QR chữ
            return {
                checkoutUrl: paymentLinkResponse.checkoutUrl,
                qrCode: paymentLinkResponse.qrCode
            };

        } catch (error) {
            console.error("Lỗi khi tạo link thanh toán PayOS:", error);
            throw error;
        }
    }

    getOrderInfoByCode(orderCode) {
        return pendingOrders.get(Number(orderCode));
    }

    removePendingOrder(orderCode) {
        pendingOrders.delete(Number(orderCode));
    }
}

module.exports = new PaymentService();