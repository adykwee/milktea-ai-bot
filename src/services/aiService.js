const { OpenAI } = require('openai');
const menuService = require('./menuService');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Khai báo công cụ tạo link thanh toán cho AI
const tools = [
    {
        type: "function",
        function: {
            name: "create_payment",
            description: "Gọi hàm này khi khách đã chốt món VÀ đã cung cấp TÊN + ĐỊA CHỈ giao hàng.",
            parameters: {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        description: "Danh sách các món khách đã đặt",
                        items: {
                            type: "object",
                            properties: {
                                item_id: { type: "string", description: "Mã món ăn (VD: TS01)" },
                                name: { type: "string", description: "Tên món ăn" },
                                size: { type: "string", enum: ["M", "L"], description: "Size của món (M hoặc L)" },
                                quantity: { type: "integer", description: "Số lượng" },
                                price: { type: "integer", description: "Đơn giá của 1 ly theo size" },
                                customer_name: { type: "string", description: "Tên của khách hàng" },
                                customer_address: { type: "string", description: "Địa chỉ giao hàng của khách" },
                                customer_phone: { type: "string", description: "Số điện thoại của khách" }
                            },
                            required: ["items", "total_amount", "customer_name", "customer_address", "customer_phone"] // Bắt buộc phải có
                        }
                    },
                    total_amount: {
                        type: "integer",
                        description: "Tổng số tiền của cả đơn hàng (VNĐ)"
                    }
                },
                required: ["items", "total_amount"]
            }
        }
    }
];

class AiService {
    // Lấy System Prompt chứa persona và menu
    getSystemPrompt() {
        const menuString = menuService.getMenuString();
        return {
            role: "system",
            content: `Bạn là bà chủ một quán trà sữa gia đình hiền lành, thân thiện và ấm áp. Bạn đang chat với khách hàng trên mạng (xưng là "cô", gọi khách là "con").
            Nhiệm vụ của bạn:
            1. Chào hỏi thân thiện, tư vấn món dựa trên sở thích của khách.
            2. Menu của quán: \n${menuString}\n
            3. Hãy hỏi rõ size (M hoặc L) và số lượng khi khách chọn món.
            4. Tóm tắt lại đơn hàng trước khi chốt.
            5. KHI KHÁCH CHỐT MÓN: Bắt buộc phải hỏi Tên và Địa chỉ giao hàng của khách.
            6. CHỈ KHI NÀO KHÁCH ĐÃ ĐỒNG Ý CHỐT ĐƠN VÀ ĐÃ CUNG CẤP ĐỦ TÊN VÀ ĐỊA CHỈ VÀ SỐ ĐIỆN THOẠI, bạn mới được gọi hàm "create_payment" để xuất hóa đơn.
            Trả lời ngắn gọn, tự nhiên như chat Telegram/Zalo, không dùng format markdown quá phức tạp.`
        };
    }

    // Xử lý luồng chat với AI
    async processChat(chatHistory) {
        // chatHistory là mảng các object [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
        const messages = [this.getSystemPrompt(), ...chatHistory];

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Model tiết kiệm, đủ thông minh cho tác vụ này
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                temperature: 0.7,
            });

            const responseMessage = response.choices[0].message;

            // Kiểm tra xem AI có muốn gọi hàm create_payment không
            if (responseMessage.tool_calls) {
                const toolCall = responseMessage.tool_calls[0];
                if (toolCall.function.name === "create_payment") {
                    const orderData = JSON.parse(toolCall.function.arguments);
                    return {
                        type: "action",
                        action: "CREATE_PAYMENT",
                        data: orderData
                    };
                }
            }

            // Nếu không gọi hàm, trả về text bình thường
            return {
                type: "text",
                content: responseMessage.content
            };

        } catch (error) {
            console.error("Lỗi từ OpenAI API:", error);
            return {
                type: "text",
                content: "Cô đang bận tay pha trà xíu, con nhắn lại sau một lát nhé!"
            };
        }
    }
}

module.exports = new AiService();