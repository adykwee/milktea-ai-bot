const { Pool } = require('pg');

class OrderService {
    constructor() {
        if (!process.env.DATABASE_URL) {
            console.error("CHƯA CẤU HÌNH DATABASE_URL. Hãy thêm PostgreSQL URI vào file .env!");
            this.pool = null;
        } else {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                // Supabase / Neon thường cần ssl
                ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
            });

            // Bổ sung bắt lỗi khi Pool rảnh rỗi (idle) bị đứt kết nối (cực kì phổ biến với Neon.tech khi scale-to-zero)
            this.pool.on('error', (err, client) => {
                console.error('Lỗi ngầm từ Pool PostgreSQL (Idle Client):', err.message);
            });

            this.initDatabase();
        }
    }

    async initDatabase() {
        if (!this.pool) return;
        const query = `
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_code VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(100),
                customer_address TEXT,
                customer_phone VARCHAR(20),
                items JSONB NOT NULL,
                total_amount INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await this.pool.query(query);
            console.log("Khởi tạo hoặc load thành công bảng PostgreSQL `orders`.");
        } catch (error) {
            console.error("Lỗi khi khởi tạo bảng orders (PostgreSQL):", error);
        }
    }

    async addOrder(orderData) {
        if (!this.pool) {
            console.error("Không thể thêm đơn hàng vì Database PostgreSQL chưa được kết nối.");
            return;
        }

        const query = `
            INSERT INTO orders (order_code, customer_name, customer_address, customer_phone, items, total_amount, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
            RETURNING *;
        `;
        const values = [
            orderData.orderCode,
            orderData.customer_name,
            orderData.customer_address,
            orderData.customer_phone,
            JSON.stringify(orderData.items),
            orderData.total_amount
        ];

        try {
            const res = await this.pool.query(query, values);
            return res.rows[0];
        } catch (error) {
            console.error("Lỗi khi thêm đơn hàng vào Database:", error);
            throw error;
        }
    }

    async getPendingOrders() {
        if (!this.pool) return [];
        const query = `SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC;`;
        try {
            const res = await this.pool.query(query);
            return res.rows;
        } catch (error) {
            console.error("Lỗi khi lấy đơn hàng từ Database:", error);
            return [];
        }
    }

    async markOrderCompleted(orderCode) {
        if (!this.pool) return false;
        const query = `UPDATE orders SET status = 'completed' WHERE order_code = $1 RETURNING *;`;
        try {
            const res = await this.pool.query(query, [String(orderCode)]);
            return res.rowCount > 0;
        } catch (error) {
            console.error("Lỗi khi update đơn hàng trong Database:", error);
            throw error;
        }
    }
}

module.exports = new OrderService();
