// Run against a disposable local D1/R2 instance, never against production.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const base = 'http://127.0.0.1:8799';
const secrets = JSON.parse(await fs.readFile('.deployment/secrets.json', 'utf8'));
let token;
async function request(path, body, method = 'POST') {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}
assert.equal((await request('/api/products', undefined, 'GET')).response.status, 200);
assert.equal((await request('/api/media', new FormData())).response.status, 401);
const login = await request('/api/admin/login', { username: secrets.ADMIN_USERNAME, password: secrets.ADMIN_PASSWORD });
assert.equal(login.response.status, 200, JSON.stringify(login.data));
token = login.data.token;
assert.ok(token);
const bank = await request('/api/bank-accounts', { bankName: 'LOCAL TEST BANK', accountNumber: 'LOCAL-ONLY-123', accountHolder: 'Local Meatmall', isDefault: true, isActive: true });
assert.equal(bank.response.status, 201);
const bytes = await sharp({ create: { width: 240, height: 160, channels: 3, background: '#e4002b' } }).webp().toBuffer();
const form = new FormData();
form.append('file', new File([bytes], 'smoke.webp', { type: 'image/webp' }));
const media = await request('/api/media', form);
assert.equal(media.response.status, 201, JSON.stringify(media.data));
assert.match(media.data.url, /^\/uploads\/media\/[\w-]+\.webp$/);
const stored = await fetch(base + media.data.url);
assert.equal(stored.headers.get('content-type'), 'image/webp');
assert.deepEqual(Buffer.from(await stored.arrayBuffer()), bytes);
const invalid = new FormData();
invalid.append('file', new File(['invalid'], 'fake.webp', { type: 'image/webp' }));
assert.equal((await request('/api/media', invalid)).response.status, 415);
assert.equal((await request('/api/site-settings', { key: 'test_inline', value: '<img src="data:image/png;base64,AAAA">' })).response.status, 400);
const product = await request('/api/products', { name: 'Local smoke test', category: 'test', price: 12500, stock: 5, imageUrl: media.data.url, description: '' });
assert.equal(product.response.status, 201, JSON.stringify(product.data));
const payload = { customerName: 'Local Test', customerPhone: '000-0000-0000', customerAddress: 'Local test only', customerEmail: 'test@example.invalid', totalAmount: 1,
  selectedBankAccount: bank.data.id, transferAccountHolder: 'Local sender',
  items: [{ productId: product.data.id, quantity: 1.5, price: 1 }] };
const order = await request('/api/orders', payload);
assert.equal(order.response.status, 201, JSON.stringify(order.data));
assert.equal(order.data.totalAmount, 24750);
assert.ok(Math.abs(Date.now() - Date.parse(order.data.createdAt)) < 60000, 'Order date must use the current date');
const email = await request(`/api/orders/${order.data.id}/email`, undefined, 'GET');
assert.equal(email.data.configured, false);
assert.equal(email.data.delivery.status, 'pending');
assert.equal((await request(`/api/orders/${order.data.id}/email/retry`, {})).response.status, 503);
await request(`/api/bank-accounts/${bank.data.id}`, { accountNumber: 'CHANGED-AFTER-ORDER' }, 'PATCH');
const preview = await fetch(base + `/api/orders/${order.data.id}/email-preview`, { headers: { Authorization: `Bearer ${token}` } });
const html = await preview.text();
assert.ok(html.includes('LOCAL-ONLY-123'), 'Receipt must keep the originally selected account');
assert.ok(!html.includes('CHANGED-AFTER-ORDER'));
assert.ok(html.includes('Local sender'));
const updated = await request(`/api/products/${product.data.id}`, undefined, 'GET');
assert.equal(updated.data.stock, 3.5);
payload.items[0].quantity = 100;
assert.equal((await request('/api/orders', payload)).response.status, 400);
payload.items[0].quantity = -1;
assert.equal((await request('/api/orders', payload)).response.status, 400);
const crossOrigin = await fetch(base + '/api/orders', { method: 'POST', headers: { Origin: 'https://example.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
assert.equal(crossOrigin.status, 403);
payload.items[0].quantity = 3;
const concurrent = await Promise.all([request('/api/orders', payload), request('/api/orders', payload)]);
assert.equal(concurrent.filter(result => result.response.status === 201).length, 1);
const afterRace = await request(`/api/products/${product.data.id}`, undefined, 'GET');
assert.equal(afterRace.data.stock, 0.5);
console.log('PASS: D1, admin authentication, R2 WebP round trip, invalid upload/base64 rejection, server prices, fractional quantity, stock, invalid orders and origin checks.');
