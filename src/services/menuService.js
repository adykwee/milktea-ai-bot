const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class MenuService {
    constructor() {
        this.menuString = '';
    }

    // Đọc file CSV và khởi tạo dữ liệu menu
    async loadMenu() {
        return new Promise((resolve, reject) => {
            const menuItems = [];
            const filePath = path.join(__dirname, '../data/Menu.csv');

            if (!fs.existsSync(filePath)) {
                return reject(new Error(`Không tìm thấy file menu: ${filePath}`));
            }

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Chỉ lấy các món đang bán
                    if (row.available.toLowerCase() === 'true') {
                        menuItems.push(row);
                    }
                })
                .on('end', () => {
                    this.menuString = this.formatMenuForAI(menuItems);
                    console.log('Đã load xong menu vào bộ nhớ!');
                    resolve(this.menuString);
                })
                .on('error', (error) => {
                    console.error('Lỗi khi đọc file Menu.csv:', error);
                    reject(error);
                });
        });
    }

    // Format dữ liệu thành string ngắn gọn để tiết kiệm token của OpenAI
    formatMenuForAI(items) {
        let formatted = "Danh sách các món (Đơn giá VNĐ):\n";
        
        // Nhóm theo category để AI dễ hiểu cấu trúc menu
        const categories = [...new Set(items.map(item => item.category))];
        
        categories.forEach(category => {
            formatted += `\n--- ${category} ---\n`;
            const categoryItems = items.filter(item => item.category === category);
            
            categoryItems.forEach(item => {
                // Ví dụ: [TS01] Trà Sữa Trân Châu Đen - M: 35000, L: 45000 (Trà sữa thơm béo...)
                formatted += `- [${item.item_id}] ${item.name} - Size M: ${item.price_m}, Size L: ${item.price_l} (${item.description})\n`;
            });
        });

        return formatted;
    }

    getMenuString() {
        return this.menuString;
    }
}

module.exports = new MenuService();