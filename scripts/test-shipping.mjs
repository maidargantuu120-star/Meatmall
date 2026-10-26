// Local-only shipping policy and order total tests; no real orders, mail or push delivery.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
const compiled = await build({ entryPoints: ['shared/shipping.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { shippingQuote, readShippingRates } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const rates = { fee: 6000, jejuSurcharge: 6000 };
for (const [address, code, total] of [
  ['서울특별시 중구 세종대로 110', '04524', 6000], ['제주특별자치도 제주시 문연로 6', '63122', 12000],
  ['서귀포시 중앙로 105', '63584', 12000], ['제주 제주시', '', 12000],
  ['6 Munyeon-ro, Jeju-si, Jeju-do', '', 12000], ['서울특별시 제주빌딩 3층', '04524', 6000],
  ['(63122) 제주특별자치도 제주시 문연로 6', '', 12000],
  ['unknown address', '63000', 12000], ['unknown address', '63644', 12000],
  ['unknown address', '62999', 6000], ['unknown address', '63645', 6000],
]) assert.equal(shippingQuote(rates, address, code).total, total, address + ' ' + code);
assert(shippingQuote(rates, '서울 중구', '63122').mismatch);
assert(shippingQuote(rates, '제주특별자치도 제주시', '04524').mismatch);
assert.deepEqual(readShippingRates('[{"min":0,"max":999999,"fee":6000}]'), rates);
console.log('PASS: Korean/English Jeju addresses, postal range boundaries, embedded postcode, false positives and mismatches');

const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'shipping-test-disposable-session-secret-2026' },
  serviceBindings: { ASSETS: () => new Response('local fixture') },
});
try {
  const db = await runtime.getD1Database('DB');
  // Production may have the base schema without the optional email outbox migration.
  for (const file of ['0000_meatmall.sql']) {
    for (const sql of (await readFile('migrations/' + file, 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  }
  const request = (route, { body, method = body ? 'POST' : 'GET', cookie } = {}) => runtime.dispatchFetch('https://meatmall.kr/api' + route, {
    method, headers: { Origin: 'https://meatmall.kr', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  async function register(username) {
    const res = await request('/register', { body: { username, email: username + '@example.invalid', password: 'Local-shipping-test#2026' } });
    assert.equal(res.status, 201);
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }
  const admin = await register('shipping-admin');
  const customer = await register('shipping-customer');
  await db.prepare("UPDATE users SET is_admin = 1 WHERE username = 'shipping-admin'").run();
  await db.prepare("INSERT INTO products (id,name,description,category,price,stock,image_url) VALUES (1,'Local shipping fixture','Local only','beef',10000,100,'/hero-meat.webp')").run();
  const save = (fee, jejuSurcharge, cookie = admin) => request('/settings/shipping-fee', { method: 'PUT', cookie, body: { value: JSON.stringify([{ min:0,max:999999,fee,jejuSurcharge }]) } });
  assert.equal((await save(6000, 6000, '')).status, 401);
  assert.equal((await save(6000, 6000, customer)).status, 403);
  assert.equal((await save(-1, 6000)).status, 400);
  assert.equal((await save(6000, 0.5)).status, 400);
  assert.equal((await save(6000, 6000)).status, 200);
  const orderPayload = (address = '서울특별시 중구 세종대로 110', code = '04524', expectedShippingFee = 6000) => ({
    orderData: { customerName: 'Local Customer', customerPhone: '010-0000-0000', customerEmail: 'shipping-customer@example.invalid', customerAddress: address, customerPostalCode: code, expectedShippingFee, totalAmount: 1 },
    cartItems: [{ productId: 1, quantity: 1, price: 1 }],
  });
  async function place(payload) {
    const res = await request('/orders', { body: payload, cookie: customer });
    return { res, data: await res.json() };
  }
  assert.equal(await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'order_emails'").first(), null);
  let order = await place(orderPayload());
  assert.equal(order.res.status, 201);
  assert.equal(order.data.totalAmount, 16000);
  // Applying the migration later must work after automatic schema repair.
  for (const sql of (await readFile('migrations/0004_order_email_outbox.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  order = await place(orderPayload('제주특별자치도 제주시 문연로 6', '63122', 12000));
  assert.equal(order.res.status, 201);
  assert.equal(order.data.totalAmount, 22000, 'server ignores forged product and total amounts');
  assert(order.data.customerAddress.startsWith('(63122) 제주'));
  const originalJeju = order.data.id;
  const originalReceipt = JSON.parse((await db.prepare('SELECT payload FROM order_emails WHERE order_id = ?').bind(originalJeju).first()).payload);
  assert.equal(originalReceipt.shippingFee, 12000);
  assert.equal(originalReceipt.shippingBaseFee, 6000);
  assert.equal(originalReceipt.shippingSurcharge, 6000);
  assert.equal(originalReceipt.shippingRegion, 'jeju');
  const stock = (await db.prepare('SELECT stock FROM products WHERE id = 1').first()).stock;
  assert.equal((await place(orderPayload('제주특별자치도 제주시 문연로 6', '04524', 6000))).res.status, 400);
  assert.equal((await place(orderPayload('서울 중구 세종대로', '63122', 12000))).res.status, 400);
  assert.equal((await place(orderPayload('제주특별자치도 제주시 문연로 6', '6312', 12000))).res.status, 400);
  assert.equal((await place(orderPayload('제주특별자치도 제주시 문연로 6', 63122, 12000))).res.status, 400);
  const stale = await place(orderPayload('제주특별자치도 제주시 문연로 6', '63122', 6000));
  assert.equal(stale.res.status, 409);
  assert.equal(stale.data.code, 'SHIPPING_FEE_CHANGED');
  assert.equal((await db.prepare('SELECT stock FROM products WHERE id = 1').first()).stock, stock, 'failed quotes never create an order or decrement inventory');
  assert.equal((await save(7000, 8000)).status, 200);
  assert.equal((await place(orderPayload('제주특별자치도 제주시 문연로 6', '63122', 12000))).res.status, 409);
  const updated = await place(orderPayload('제주특별자치도 제주시 문연로 6', '63122', 15000));
  assert.equal(updated.res.status, 201);
  assert.equal(updated.data.totalAmount, 25000);
  assert.equal((await db.prepare('SELECT total_amount FROM orders WHERE id = ?').bind(originalJeju).first()).total_amount, 22000);
  assert.equal(JSON.parse((await db.prepare('SELECT payload FROM order_emails WHERE order_id = ?').bind(originalJeju).first()).payload).shippingFee, 12000, 'historical receipt stays fixed');
  const email = await request(`/orders/${originalJeju}/email-preview`, { cookie: admin });
  assert((await email.text()).includes('Чэжү (제주)'));
  assert.equal((await save(7500, undefined)).status, 200);
  const afterLegacySave = readShippingRates((await (await request('/settings/shipping-fee')).json()).value);
  assert.equal(afterLegacySave.jejuSurcharge, 8000, 'old admin clients cannot erase the configured surcharge');
  console.log('PASS: administrator-only settings, mainland/Jeju totals, tamper resistance, address validation, stale-price refusal, inventory and receipt preservation');
} finally { await runtime.dispose(); }
