import { Hono } from 'hono';
import { Bindings } from '../types';
import { requireAuth, requireAdmin } from '../middleware';
import { UserWithNullablePhone } from '@shared/schema';
import { D1Storage, IStorage } from '../storage';
import { notifyAdmins, notifyUser, orderNo, STATUS_NOTICES, won } from '../push';
import { deliverOrderEmail, emailConfigured, renderOrderEmail } from '../email';
import type { OrderEmailReceipt } from '../../shared/order-email';
import { destinationParts, readShippingRates, shippingQuote } from '../../shared/shipping';

type Env = {
    Bindings: Bindings;
    Variables: {
        user: UserWithNullablePhone | null;
        storage: IStorage;
    };
};

const app = new Hono<Env>();

app.get('/orders/:id/email', requireAdmin, async (c) => {
    c.header('Cache-Control', 'no-store');
    await c.env.DB.prepare("UPDATE order_emails SET status='uncertain', last_error='Delivery interrupted; check Brevo before retry' WHERE order_id=? AND status='sending' AND locked_until < ?")
        .bind(Number(c.req.param('id')), Date.now()).run();
    const row = await c.env.DB.prepare('SELECT status, attempts, provider_message_id, last_error, updated_at, locked_until FROM order_emails WHERE order_id=?')
        .bind(Number(c.req.param('id'))).first();
    return c.json({ configured: emailConfigured(c.env), delivery: row });
});

app.get('/orders/:id/email-preview', requireAdmin, async (c) => {
    c.header('Cache-Control', 'no-store');
    const row = await c.env.DB.prepare('SELECT payload FROM order_emails WHERE order_id=?')
        .bind(Number(c.req.param('id'))).first<{ payload: string }>();
    if (!row) return c.json({ message: 'Receipt unavailable' }, 404);
    return c.html(renderOrderEmail(Number(c.req.param('id')), JSON.parse(row.payload), c.env.BASE_URL || new URL(c.req.url).origin).html);
});

app.post('/orders/:id/email/retry', requireAdmin, async (c) => {
    if (!emailConfigured(c.env)) return c.json({ message: 'Email provider is not configured' }, 503);
    const id = Number(c.req.param('id'));
    const row = await c.env.DB.prepare('SELECT status FROM order_emails WHERE order_id=?').bind(id).first<{ status: string }>();
    if (!row) return c.json({ message: 'Receipt unavailable' }, 404);
    if (!['pending', 'failed'].includes(row.status)) return c.json({ message: 'Already sent or delivery requires provider review' }, 409);
    return c.json(await deliverOrderEmail(c.env, id));
});

// Orders
app.get('/orders/pending-count', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const [count, latestOrderId] = await Promise.all([
        storage.getPendingOrdersCount(),
        storage.getLatestOrderId(),
    ]);
    return c.json({ count, latestOrderId });
});

app.get('/orders/stats', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const stats = await storage.getStats();
    return c.json(stats);
});

app.get('/orders', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const startDateStr = c.req.query('startDate');
    const endDateStr = c.req.query('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const orders = await storage.getOrdersWithItems(startDate, endDate);
    return c.json(orders);
});

app.get('/orders/:id', requireAuth, async (c) => {
    const storage = c.get('storage');
    const user = c.get('user')!;
    const id = parseInt(c.req.param('id'));

    const order = await storage.getOrderWithItems(id);

    if (!order) {
        return c.json({ message: "Order not found" }, 404);
    }

    // Provide access if admin or own order
    if (!user.isAdmin && order.userId !== user.id) {
        return c.json({ message: "Unauthorized" }, 403);
    }

    return c.json(order);
});

app.post('/orders', async (c) => {
    const storage = c.get('storage');
    const user = c.get('user');
    const body = await c.req.json();

    // Handle two possible formats:
    // 1. Frontend format: { orderData: {...}, cartItems: [...] }
    // 2. Direct format: { items: [...], ...orderData }
    let orderData: any;
    let items: any[];

    if (body.orderData && body.cartItems) {
        // Frontend format
        orderData = body.orderData;
        items = body.cartItems;
    } else if (body.items) {
        // Direct format
        const { items: bodyItems, ...rest } = body;
        orderData = rest;
        items = bodyItems;
    } else {
        return c.json({ message: "Order must have items" }, 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return c.json({ message: "Order must have items" }, 400);
    }

    try {
        const quantities = new Map<number, number>();
        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);
            if (!Number.isSafeInteger(productId) || !Number.isFinite(quantity) || quantity <= 0) {
                return c.json({ message: 'Invalid order item' }, 400);
            }
            quantities.set(productId, (quantities.get(productId) || 0) + quantity);
        }
        const validatedItems = [];
        const receiptItems: OrderEmailReceipt['items'] = [];
        let subtotal = 0;
        for (const [productId, quantity] of Array.from(quantities)) {
            const product = await storage.getProduct(productId);
            if (!product || quantity > product.stock || quantity < (product.minOrderQuantity || 1)) {
                return c.json({ message: 'Product unavailable or invalid quantity' }, 400);
            }
            validatedItems.push({ productId, quantity, price: product.price, orderId: 0 });
            receiptItems.push({ name: product.name, quantity, price: product.price, amount: product.price * quantity });
            subtotal += product.price * quantity;
        }
        const shipping = await storage.getSiteSettingByKey('shipping_fee');
        for (const field of ['customerName', 'customerPhone', 'customerAddress']) {
            if (typeof orderData[field] !== 'string' || !orderData[field].trim()) {
                return c.json({ message: 'Customer name, phone and address are required' }, 400);
            }
        }
        if (orderData.customerPostalCode !== undefined && typeof orderData.customerPostalCode !== 'string') return c.json({ message: 'Invalid postal code' }, 400);
        const destination = destinationParts(orderData.customerAddress, orderData.customerPostalCode || '');
        if (destination.postalCode && !/^(?!00000)[0-9]{5}$/.test(destination.postalCode)) return c.json({ message: 'Invalid postal code' }, 400);
        const quote = shippingQuote(readShippingRates(shipping?.value), destination.street, destination.postalCode);
        if (quote.mismatch) return c.json({ message: 'Хаяг болон шуудангийн код зөрүүтэй байна. Дахин шалгана уу.', code: 'ADDRESS_MISMATCH' }, 400);
        const shippingFee = quote.total;
        if (orderData.expectedShippingFee !== undefined && orderData.expectedShippingFee !== shippingFee) {
            return c.json({ message: 'Хүргэлтийн төлбөр өөрчлөгдсөн байна. Шинэ дүнг шалгаад дахин захиална уу.', code: 'SHIPPING_FEE_CHANGED', shippingFee }, 409);
        }
        const customerAddress = destination.postalCode ? `(${destination.postalCode}) ${destination.street}` : destination.street;
        const customerEmail = String(orderData.customerEmail || '').trim();
        if (customerEmail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customerEmail)) {
            return c.json({ message: 'Invalid customer email' }, 400);
        }
        const selectedId = orderData.selectedBankAccount;
        const account = selectedId
            ? await storage.getBankAccount(Number(selectedId))
            : await storage.getDefaultBankAccount();
        if (selectedId && (!account || !account.isActive)) {
            return c.json({ message: 'Selected bank account is unavailable' }, 400);
        }
        const receipt: OrderEmailReceipt = {
            customerName: orderData.customerName, customerEmail,
            customerPhone: orderData.customerPhone, customerAddress,
            transferAccountHolder: String(orderData.transferAccountHolder || orderData.customerName),
            placedAt: new Date().toISOString(), items: receiptItems, subtotal, shippingFee,
            shippingBaseFee: quote.baseFee, shippingSurcharge: quote.surcharge, shippingRegion: quote.region,
            totalAmount: Math.round((subtotal + shippingFee) * 100) / 100,
            paymentAccount: account?.isActive ? { bankName: account.bankName, accountNumber: account.accountNumber, accountHolder: account.accountHolder } : null,
        };
        const order = await storage.createOrder({
            ...orderData,
            customerAddress,
            totalAmount: Math.round((subtotal + shippingFee) * 100) / 100,
            customerEmail,
            userId: user?.id || null // Allow guest checkout if userId provided or null
        }, validatedItems, receipt);

        // Push after the response is sent so checkout never waits on push services
        c.executionCtx.waitUntil(Promise.all([
            deliverOrderEmail(c.env, order.id).catch(() => console.error('Order email delivery failed', order.id)),
            notifyAdmins(c.env, {
                title: `Шинэ захиалга ${orderNo(order.id)} 🔔`,
                body: `${order.customerName} · ${won(order.totalAmount)}`,
                url: `/admin/orders?id=${order.id}`,
                tag: `admin-order-${order.id}`,
            }),
            order.userId ? notifyUser(c.env, order.userId, {
                title: 'Захиалга хүлээн авлаа',
                body: `${orderNo(order.id)} · ${won(order.totalAmount)} — Төлбөрөө шилжүүлсний дараа бэлтгэж эхэлнэ.`,
                url: '/my-page',
                tag: `order-${order.id}`,
            }) : Promise.resolve(),
        ]));

        return c.json(order, 201);
    } catch (error) {
        console.error("Order creation failed:", error);
        return c.json({ message: "Order creation failed" }, 500);
    }
});

app.patch('/orders/:id/status', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const { status } = await c.req.json();

    const before = await storage.getOrder(id);
    const order = await storage.updateOrderStatus(id, status);
    if (!order) return c.json({ message: "Order not found" }, 404);

    // Tell the customer only when the status really changed
    const notice = STATUS_NOTICES[status];
    if (notice && order.userId && before?.status !== status) {
        c.executionCtx.waitUntil(notifyUser(c.env, order.userId, {
            title: notice.title,
            body: `${orderNo(order.id)} · ${notice.body}`,
            url: '/my-page',
            tag: `order-${order.id}`,
        }));
    }

    return c.json(order);
});

app.delete('/orders/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));

    // Check if order exists
    const order = await storage.getOrder(id);
    if (!order) {
        return c.json({ message: "Захиалга олдсонгүй" }, 404);
    }

    const success = await storage.deleteOrder(id);
    if (success) {
        return c.json({ message: "Захиалга амжилттай устгагдлаа", id });
    } else {
        return c.json({ message: "Захиалгийг устгахад алдаа гарлаа" }, 500);
    }
});

// Bank Accounts
app.get('/bank-accounts', async (c) => {
    const storage = c.get('storage');
    const accounts = await storage.getBankAccounts();
    return c.json(accounts);
});

app.get('/bank-accounts/default', async (c) => {
    const storage = c.get('storage');
    const account = await storage.getDefaultBankAccount();
    if (!account) return c.json({ message: "No default account" }, 404);
    return c.json(account);
});

app.post('/bank-accounts', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const account = await storage.createBankAccount(body);
    return c.json(account, 201);
});

app.patch('/bank-accounts/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const account = await storage.updateBankAccount(id, body);
    if (!account) return c.json({ message: "Account not found" }, 404);
    return c.json(account);
});

app.delete('/bank-accounts/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const success = await storage.deleteBankAccount(id);
    if (!success) return c.json({ message: "Account not found or is default" }, 400);
    return c.json({ success: true });
});

app.post('/bank-accounts/:id/set-default', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const success = await storage.setDefaultBankAccount(id);
    if (!success) return c.json({ message: "Failed to set default" }, 500);
    return c.json({ success: true });
});

// Delivery Settings
app.get('/delivery-settings', async (c) => {
    const storage = c.get('storage');
    const settings = await storage.getDeliverySettings();
    // Return default if not set
    if (!settings) return c.json({
        cutoffHour: 18,
        cutoffMinute: 30,
        processingDays: 1
    });
    return c.json(settings);
});

app.put('/delivery-settings', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const settings = await storage.updateDeliverySettings(body);
    return c.json(settings);
});

// Non-delivery days
app.get('/non-delivery-days', async (c) => {
    const storage = c.get('storage');
    const days = await storage.getNonDeliveryDays();
    return c.json(days);
});

app.post('/non-delivery-days', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const day = await storage.createNonDeliveryDay(body);
    return c.json(day, 201);
});

app.delete('/non-delivery-days/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const success = await storage.deleteNonDeliveryDay(id);
    if (!success) return c.json({ message: "Day not found" }, 404);
    return c.json({ success: true });
});

export default app;
