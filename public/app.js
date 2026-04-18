// Initialize Lucide Icons
lucide.createIcons();

const ordersContainer = document.getElementById('orders-container');
const emptyState = document.getElementById('empty-state');
let currentOrders = new Map(); // Store to prevent flickering/re-rendering everything

// Formatting helpers
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatTime(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Create an order card HTML element
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.id = `order-${order.order_code}`;

    let itemsHtml = '';
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    if (items && Array.isArray(items)) {
        itemsHtml = items.map(item => `
            <div class="item-row">
                <div class="item-name">
                    <span class="item-qty">${item.quantity}x</span>
                    ${item.name}
                    <span class="item-size">${item.size}</span>
                </div>
                <div>${formatCurrency(item.price * item.quantity)}</div>
            </div>
        `).join('');
    }

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">#${order.order_code}</span>
            <span class="order-time"><i data-lucide="clock" style="width:12px; height:12px; margin-right:4px;"></i>${formatTime(order.created_at)}</span>
        </div>
        
        <div class="customer-info">
            <div class="customer-name">
                <i data-lucide="user"></i> ${order.customer_name}
            </div>
            <div class="customer-meta">
                <div><i data-lucide="map-pin"></i> ${order.customer_address}</div>
                <div><i data-lucide="phone"></i> ${order.customer_phone}</div>
            </div>
        </div>

        <div class="items-list">
            ${itemsHtml}
        </div>

        <div class="order-footer">
            <div>
                <span class="total-label">Tổng thanh toán</span>
                <span class="total-amount">${formatCurrency(order.total_amount)}</span>
            </div>
            <button class="btn-complete" onclick="markComplete('${order.order_code}')">
                <i data-lucide="check-circle" style="width:18px;height:18px"></i> Hoàn thành
            </button>
        </div>
    `;

    return card;
}

// Fetch orders from API
async function fetchOrders() {
    try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Network response was not ok');
        const orders = await response.json();
        
        // Hide/Show Empty State
        if (orders.length === 0) {
            ordersContainer.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            ordersContainer.style.display = 'grid';
            emptyState.style.display = 'none';
        }

        // Render logic to prevent re-rendering cards that already exist
        const newKeys = new Set(orders.map(o => o.order_code));
        
        // Add new orders
        orders.forEach(order => {
            if (!currentOrders.has(order.order_code)) {
                currentOrders.set(order.order_code, order);
                const card = createOrderCard(order);
                ordersContainer.prepend(card); // Add to top
                lucide.createIcons({ root: card });
            }
        });

        // Remove old orders that were completed elsewhere
        for (const key of currentOrders.keys()) {
            if (!newKeys.has(key)) {
                const card = document.getElementById(`order-${key}`);
                if (card) card.remove();
                currentOrders.delete(key);
            }
        }
        
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

// Mark order as complete
window.markComplete = async function(orderCode) {
    const card = document.getElementById(`order-${orderCode}`);
    if (!card) return;

    // Add fade out animation
    card.classList.add('fade-out');

    try {
        const response = await fetch(`/api/orders/${orderCode}/complete`, {
            method: 'POST'
        });
        
        if (response.ok) {
            setTimeout(() => {
                card.remove();
                currentOrders.delete(orderCode);
                if (currentOrders.size === 0) {
                    ordersContainer.style.display = 'none';
                    emptyState.style.display = 'flex';
                }
            }, 500); // Wait for animation
        } else {
            // Revert animation if failed
            card.classList.remove('fade-out');
            alert('Có lỗi xảy ra khi cập nhật đơn hàng!');
        }
    } catch (error) {
        card.classList.remove('fade-out');
        console.error('Error completing order:', error);
    }
}

// Initial fetch and start polling every 1 second
fetchOrders();
setInterval(fetchOrders, 1000);
