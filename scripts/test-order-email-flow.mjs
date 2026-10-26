// Local orders and intercepted Brevo requests only. No real mail or production data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const messages = [];
let providerStatus = 201;
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'local-order-mail-test-secret-2026-more-than-32',
    BREVO_API_KEY: 'fake-order-key', ORDER_EMAIL_FROM: 'sender@example.invalid',
    ORDER_EMAIL_REPLY_TO: 'operator@example.invalid', BASE_URL: 'https://meatmall.kr' },
  serviceBindings: { ASSETS: () => new Response('local fixture') },
  outboundService: async request => {
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.headers.get('api-key'), 'fake-order-key');
    messages.push(await request.json());
    return new Response(JSON.stringify(providerStatus === 201 ? { messageId: 'local-order-' + messages.length } : { message: 'Daily quota reached' }),
      { status: providerStatus, headers: { 'Content-Type': 'application/json' } });
  },
});
const request = (route, { body, method = body ? 'POST' : 'GET', cookie } = {}) => runtime.dispatchFetch('https://meatmall.kr/api' + route, {
  method, headers: { Origin: 'https://meatmall.kr', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
async function until(check) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('Local background delivery timed out');
}
try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  async function register(username) {
    const response = await request('/register', { body: { username, email: username + '@example.invalid', password: 'Local-order-mail-password#2026' } });
    assert.equal(response.status, 201);
    return response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }
  const admin = await register('mail-admin');
  const member = await register('mail-customer');
  await db.prepare("UPDATE users SET is_admin = 1 WHERE username = 'mail-admin'").run();
  await db.prepare("INSERT INTO products (id,name,description,category,price,stock,image_url) VALUES (1,'Үхрийн мах','Local only','beef',12000,100,'/hero-meat.webp')").run();
  await db.prepare("INSERT INTO bank_accounts (id,bank_name,account_number,account_holder,is_default) VALUES (1,'DEFAULT TEST BANK','NOT-SELECTED','Default fixture',1),(2,'SELECTED TEST BANK','SELECTED-ACCOUNT','Selected fixture',0)").run();
  const payload = { orderData: { customerName: 'Бат (жишээ)', customerEmail: 'checkout-recipient@example.invalid',
    customerPhone: '010-0000-0000', customerAddress: '제주특별자치도 제주시 문연로 6', customerPostalCode: '63122',
    transferAccountHolder: 'Бат шилжүүлэгч', selectedBankAccount: '2', totalAmount: 1 },
    cartItems: [{ productId: 1, quantity: 3, price: 1 }] };
  const delivery = id => db.prepare('SELECT * FROM order_emails WHERE order_id=?').bind(id).first();
  let response = await request('/orders', { body: payload, cookie: member });
  assert.equal(response.status, 201);
  const first = await response.json();
  assert.equal(first.totalAmount, 48000);
  await until(async () => (await delivery(first.id))?.status === 'sent');
  assert.equal(messages.length, 1);
  const mail = messages[0];
  assert.equal(mail.to[0].email, payload.orderData.customerEmail);
  assert.equal(mail.sender.email, 'sender@example.invalid');
  assert.equal(mail.replyTo.email, 'operator@example.invalid');
  assert.deepEqual(mail.tags, ['order-confirmation']);
  for (const value of ['SELECTED TEST BANK', 'SELECTED-ACCOUNT', 'Selected fixture', 'Бат шилжүүлэгч', '₩48,000', '₩12,000', 'Доорх дансанд нийт', 'Чэжү', 'Үхрийн мах']) assert(mail.htmlContent.includes(value), value);
  assert(!mail.htmlContent.includes('NOT-SELECTED'));
  assert(mail.htmlContent.includes('https://meatmall.kr/my-page'));
  assert.equal((await delivery(first.id)).provider_message_id, 'local-order-1');
  await db.prepare("UPDATE bank_accounts SET account_number='CHANGED-LATER' WHERE id=2").run();
  const preview = await request(`/orders/${first.id}/email-preview`, { cookie: admin });
  assert((await preview.text()).includes('SELECTED-ACCOUNT'), 'receipt keeps the bank selected at checkout');
  assert.equal((await request(`/orders/${first.id}/email`, { cookie: member })).status, 403);
  assert.equal((await request(`/orders/${first.id}/email/retry`, { method: 'POST', cookie: admin })).status, 409);
  assert.equal(messages.length, 1, 'accepted mail cannot be sent twice');

  providerStatus = 429;
  response = await request('/orders', { body: payload, cookie: member });
  assert.equal(response.status, 201, 'mail quota cannot fail checkout');
  const second = await response.json();
  await until(async () => (await delivery(second.id))?.status === 'failed');
  assert.equal((await db.prepare('SELECT stock FROM products WHERE id=1').first()).stock, 94);
  assert.equal((await request(`/orders/${second.id}/email/retry`, { method: 'POST', cookie: member })).status, 403);
  providerStatus = 201;
  assert.equal((await request(`/orders/${second.id}/email/retry`, { method: 'POST', cookie: admin })).status, 200);
  assert.equal((await delivery(second.id)).status, 'sent');
  assert.equal((await delivery(second.id)).attempts, 2);
  assert.equal(messages.length, 3);
  console.log('PASS: checkout-to-Brevo Mongolian receipt, checkout recipient, selected bank snapshot, Jeju totals, background send, quota-safe orders, administrator retry and duplicate protection. No real mail sent.');
} finally { await runtime.dispose(); }
