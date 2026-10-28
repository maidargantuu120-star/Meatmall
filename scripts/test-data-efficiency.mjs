// Disposable local D1/R2 only. Never run against production or with mail keys.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Miniflare, Log, LogLevel } from 'miniflare';
import sharp from 'sharp';

const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'local-efficiency-test-session-secret-2026' },
  serviceBindings: { ASSETS: () => new Response('local fixture') },
  log: new Log(LogLevel.NONE),
});
const request = (path, { body, cookie, method = body ? 'POST' : 'GET' } = {}) => runtime.dispatchFetch('https://meatmall.kr/api' + path, {
  method, headers: { Origin: 'https://meatmall.kr', ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
try {
  const db = await runtime.getD1Database('DB');
  for (const file of ['0000_meatmall.sql', '0004_order_email_outbox.sql']) for (const sql of (await readFile('migrations/' + file, 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  async function register(username) {
    const res = await request('/register', { body: { username, email: username + '@example.invalid', password: 'Local-efficiency-test#2026' } });
    assert.equal(res.status, 201);
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }
  const admin = await register('efficiency-admin'), member = await register('efficiency-member');
  await db.prepare("UPDATE users SET is_admin=1 WHERE username='efficiency-admin'").run();
  await db.prepare("INSERT INTO products (id,name,description,category,price,stock,image_url) VALUES (1,'Local fixture','Local only','beef',10000,100,'/hero-meat.webp')").run();
  await db.prepare(`WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM seq WHERE x<10000)
    INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,customer_address,total_amount,status,created_at)
    SELECT x,1+(x%2),'Бат-Эрдэнэ '||x,'fixture@example.invalid','010-0000-0000','Local only',16000,
      CASE WHEN x>9997 THEN 'pending' ELSE 'completed' END,1790780400000+x*60000 FROM seq`).run();
  await db.prepare('INSERT INTO order_items (order_id,product_id,quantity,price) SELECT id,1,1,10000 FROM orders').run();
  await db.prepare(`WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM seq WHERE x<60)
    INSERT INTO order_items (order_id,product_id,quantity,price) SELECT 10000,1,1,10000 FROM seq`).run();
  const before = await db.prepare('SELECT count(*) AS n,sum(total_amount) AS total FROM orders').first();
  const oldRead = await db.prepare("SELECT * FROM orders WHERE status='pending'").all();
  for (const sql of (await readFile('migrations/0005_query_indexes.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  assert.deepEqual(await db.prepare('SELECT count(*) AS n,sum(total_amount) AS total FROM orders').first(), before);
  const indexedCount = await db.prepare("SELECT count(*) AS n FROM orders WHERE status='pending'").all();
  const latestRead = await db.prepare('SELECT id FROM orders ORDER BY id DESC LIMIT 1').all();
  const plan = await db.prepare("EXPLAIN QUERY PLAN SELECT count(*) FROM orders WHERE status='pending'").all();
  assert(JSON.stringify(plan.results).includes('COVERING INDEX orders_status_id_idx'));
  assert.equal(indexedCount.results[0].n, 3);
  assert(oldRead.meta.rows_read >= 10000);
  assert(latestRead.meta.rows_read < 10);
  assert(indexedCount.meta.rows_read < 20);
  assert.equal((await request('/orders/page')).status, 401);
  assert.equal((await request('/orders/latest-id', { cookie: member })).status, 403);
  assert.equal((await request('/orders/page', { cookie: member })).status, 403);
  assert.equal((await (await request('/orders/latest-id', { cookie: admin })).json()).latestOrderId, 10000);
  assert.equal((await (await request('/orders/pending-count', { cookie: admin })).json()).count, 3);
  assert.equal((await (await request('/orders?limit=5', { cookie: admin })).json()).length, 5);
  assert.equal((await (await request('/orders', { cookie: admin })).json()).length, 10000, 'legacy admin clients retain complete history');
  assert.equal((await (await request('/user/orders', { cookie: member })).json()).length, 5000, 'legacy customer clients retain complete history');
  assert.equal((await request('/orders?limit=99999', { cookie: admin })).status, 400);

  // Visit the complete history through bounded cursors, including a 61-line order.
  const all = new Set();
  let cursor;
  do {
    const response = await request('/orders/page' + (cursor ? '?before=' + cursor : ''), { cookie: admin });
    assert.equal(response.status, 200);
    const page = await response.json();
    assert(page.orders.length <= 50);
    for (const order of page.orders) {
      assert(!all.has(order.id), 'no duplicate order across page boundaries');
      all.add(order.id);
      assert.equal(order.items.length, order.id === 10000 ? 61 : 1, 'line items are never split by pagination');
    }
    cursor = page.nextBeforeId;
  } while (cursor);
  assert.equal(all.size, 10000, 'no historical orders are hidden or removed');
  assert.equal((await (await request('/orders/page?search=%23ORD-0005', { cookie: admin })).json()).orders[0].id, 5);
  assert.equal((await (await request('/orders/page?search=' + encodeURIComponent('бат-эрдэнэ'), { cookie: admin })).json()).orders.length, 50);
  await db.prepare("UPDATE orders SET customer_name='БАТ %_*?[]' WHERE id=9999").run();
  assert.equal((await (await request('/orders/page?search=' + encodeURIComponent('бат %_*?[]'), { cookie: admin })).json()).orders.length, 1);
  assert.equal((await (await request('/orders/page?status=pending', { cookie: admin })).json()).orders.length, 3);
  assert.equal((await request('/orders/page?before=-1', { cookie: admin })).status, 400);
  assert.equal((await request('/orders/page?startDate=bad', { cookie: admin })).status, 400);
  const range = new URLSearchParams({ startDate: new Date(1790780400000 + 5*60000).toISOString(), endDate: new Date(1790780400000 + 8*60000).toISOString(), search: 'Бат' });
  const dated = await (await request('/orders/page?' + range, { cookie: admin })).json();
  assert.deepEqual(dated.orders.map(order => order.id), [8,7,6,5], 'dates and search apply across complete history');

  const userIds = new Set(); cursor = undefined;
  do {
    const page = await (await request('/user/orders/page' + (cursor ? '?before=' + cursor : ''), { cookie: member })).json();
    assert(page.orders.length <= 20);
    for (const order of page.orders) { assert.equal(order.userId, 2); assert(!userIds.has(order.id)); userIds.add(order.id); }
    cursor = page.nextBeforeId;
  } while (cursor);
  assert.equal(userIds.size, 5000, 'customer can retrieve all of their own history only');
  assert.equal((await request('/user/orders/page')).status, 401);

  const bytes = await sharp({ create: { width: 120, height: 180, channels: 3, background: '#e4002b' } }).webp().toBuffer();
  async function upload() {
    const form = new FormData(); form.append('file', new File([bytes], 'fixture.webp', { type: 'image/webp' }));
    // Node's native FormData must be serialized before crossing Miniflare's
    // Request implementation; real browsers send these same multipart bytes.
    const encoded = new Request('https://meatmall.kr/api/media', { method: 'POST', body: form });
    const response = await runtime.dispatchFetch(encoded.url, { method: 'POST', headers: { Cookie: admin, Origin: 'https://meatmall.kr', 'Content-Type': encoded.headers.get('content-type') }, body: await encoded.arrayBuffer() });
    const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result)); return result;
  }
  const first = await upload(), duplicate = await upload();
  assert.equal(first.url, duplicate.url); assert.equal(first.id, duplicate.id);
  assert.match(first.url, /^\/uploads\/media\/[a-f0-9]{64}\.webp$/);
  const bucket = await runtime.getR2Bucket('BUCKET');
  assert.equal((await bucket.list()).objects.length, 1);
  let response = await runtime.dispatchFetch('https://meatmall.kr' + first.url + '?v=1');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const cache = await (await runtime.getCaches()).open('meatmall-public-images-v1');
  for (let i=0; i<100 && !(await cache.match('https://meatmall.kr' + first.url)); i++) await new Promise(r => setTimeout(r,10));
  assert(await cache.match('https://meatmall.kr' + first.url));
  // Disposable local object: proving the next response comes from edge cache.
  await bucket.delete(first.url.replace('/uploads/',''));
  response = await runtime.dispatchFetch('https://meatmall.kr' + first.url + '?v=2');
  assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const report = { seededOrders: 10000, oldPollRows: oldRead.meta.rows_read,
    newPollRows: latestRead.meta.rows_read, indexedPendingRows: indexedCount.meta.rows_read,
    adminPages: all.size / 50, customerOrdersPreserved: userIds.size,
    repeatedUploads: 2, distinctStoredImages: 1 };
  await writeFile('.deployment/data-efficiency-report.json', JSON.stringify(report,null,2));
  console.log('PASS: ' + JSON.stringify(report));
  console.log('Indexes preserve records/totals; complete pagination, permissions, Mongolian/literal search, deduplication and cached image bytes verified. No production data changed.');
} finally { await runtime.dispose(); }
