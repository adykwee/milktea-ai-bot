const bot = require('../config/bot');
const aiService = require('./aiService');
const menuService = require('./menuService');
const paymentService = require('./paymentService');

// Dùng Map để lưu lịch sử chat của từng người dùng (Key: userId, Value: Array các tin nhắn)
const userSessions = new Map();

class BotService {
    init() {
        // Xử lý khi khách bấm /start
        bot.start(async (ctx) => {
            const userId = ctx.from.id;
            // Reset lịch sử chat khi khách bắt đầu lại
            userSessions.set(userId, []);
            await ctx.reply('Chào con, con muốn đặt món gì nè? Cô gửi con xem menu nhen!');

            const menuString = menuService.getMenuString();
            await ctx.reply(`Menu của quán có đây nè:\n${menuString}\nCon chọn món rồi nhắn lại cho cô nhé!`);
        });

        // Xử lý khi khách muốn đặt lại từ đầu
        bot.command('new', async (ctx) => {
            const userId = ctx.from.id;

            // Xóa trắng lịch sử chat
            userSessions.set(userId, []);

            await ctx.reply('Cô đã bỏ đơn cũ đi rồi nhé. Con gọi lại từ đầu nha, con muốn uống gì nào?');
        });

        // Xử lý khi khách nhắn tin văn bản
        bot.on('text', async (ctx) => {
            const userId = ctx.from.id;
            const userMessage = ctx.message.text;

            // 1. Lấy lịch sử chat cũ (nếu chưa có thì tạo mảng rỗng)
            if (!userSessions.has(userId)) {
                userSessions.set(userId, []);
            }
            const chatHistory = userSessions.get(userId);

            // 2. Thêm tin nhắn mới của khách vào lịch sử
            chatHistory.push({ role: 'user', content: userMessage });

            // Giới hạn lịch sử chat (ví dụ giữ lại 10 tin nhắn gần nhất) để tránh tốn token OpenAI
            if (chatHistory.length > 10) {
                chatHistory.splice(0, chatHistory.length - 10);
            }

            try {
                // Hiển thị trạng thái "đang gõ..." trên Telegram cho sinh động
                await ctx.sendChatAction('typing');

                // 3. Gửi lịch sử lên AI để lấy phản hồi
                const aiResponse = await aiService.processChat(chatHistory);

                // 4. Xử lý phản hồi từ AI
                if (aiResponse.type === 'text') {
                    // Nếu AI chỉ chat bình thường -> Gửi tin nhắn cho khách
                    await ctx.reply(aiResponse.content);

                    // Lưu câu trả lời của AI vào lịch sử
                    chatHistory.push({ role: 'assistant', content: aiResponse.content });

                } else if (aiResponse.type === 'action' && aiResponse.action === 'CREATE_PAYMENT') {
                    // Nếu AI quyết định chốt đơn và gọi hàm thanh toán
                    const orderData = aiResponse.data;

                    await ctx.reply(`Cô đang lên hóa đơn cho con nhé. Tổng tiền của con là: ${orderData.total_amount.toLocaleString('vi-VN')} VNĐ.\nĐợi cô xíu để cô tạo mã QR nha!`);

                    // Lưu vào lịch sử để AI nhớ là đã chốt đơn
                    chatHistory.push({
                        role: 'assistant',
                        content: `Cô đã tạo đơn hàng với tổng tiền ${orderData.total_amount} VNĐ và đang gửi mã QR cho con.`
                    });

                    // Tạm in ra console để test. Bước tiếp theo ta sẽ gọi PayOS ở đây!
                    console.log('AI yêu cầu tạo thanh toán:', orderData);

                    // Gọi paymentService để tạo link PayOS và gửi cho khách
                    const paymentLink = await paymentService.createPaymentLink(orderData, userId);

                    // Gửi ảnh QR Code cho khách quét trực tiếp
                    if (paymentLink.qrCode) {
                        const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(paymentLink.qrCode)}&size=400`;
                        await ctx.replyWithPhoto(
                            { url: qrImageUrl },
                            { caption: `Mã QR thanh toán của con đây nha!\n\nHoặc con bấm link này để thanh toán: ${paymentLink.checkoutUrl}` }
                        );
                    } else {
                        await ctx.reply(`Con bấm link này để thanh toán cho cô nhé:\n${paymentLink.checkoutUrl}`);
                    }
                }

            } catch (error) {
                console.error("Lỗi khi xử lý tin nhắn Telegram:", error);
                await ctx.reply('Xin lỗi con, máy tính của cô đang hơi lag xíu, con nhắn lại giúp cô nha!');
            }
        });

        // Xử lý các lỗi gián đoạn của bot
        bot.catch((err, ctx) => {
            console.error(`Lỗi cho update ${ctx.updateType}`, err);
        });
    }

    clearUserSession(userId) {
        if (userSessions.has(userId)) {
            userSessions.set(userId, []);
            console.log(`Đã reset lịch sử chat cho user ${userId} sau khi thanh toán.`);
        }
    }

    // Hàm hỗ trợ để gửi tin nhắn chủ động (dùng khi nhận webhook thanh toán thành công)
    async sendMessageToUser(userId, message) {
        try {
            await bot.telegram.sendMessage(userId, message);
        } catch (error) {
            console.error(`Không thể gửi tin nhắn tới user ${userId}:`, error);
        }
    }
}

module.exports = new BotService();