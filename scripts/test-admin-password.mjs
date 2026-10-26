// Disposable local data only. Never run password mutations against production.
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { Miniflare } from 'miniflare';

const root = path.resolve('.deployment');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, 'admin-password-test-'));
const bootstrapPassword = 'Bootstrap-only-password#2026';
const initialPassword = 'Initial-DB-password#2026';
const nextPassword = 'Changed-in-site-password#2026';
const latestPassword = 'Second-change-password#2026';
const customerPassword = 'Customer-password#2026';
function legacyHash(password) {
  const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex') + '.' + salt.toString('hex');
}
function makeRuntime(password = bootstrapPassword, username = 'admin') {
  return new Miniflare({
    modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
    compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], d1Persist: directory, r2Buckets: ['BUCKET'],
    bindings: { SESSION_SECRET: 'password-test-session-secret-with-more-than-32', ADMIN_USERNAME: username, ADMIN_PASSWORD: password },
    serviceBindings: { ASSETS: () => new Response('local test') },
  });
}
let runtime = makeRuntime();
async function request(route, { body, cookie, token, origin = 'https://meatmall.kr', method = body ? 'POST' : 'GET', headers = {} } = {}) {
  return runtime.dispatchFetch(`https://meatmall.kr${route}`, {
    method, redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const cookies = response => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
async function login(password, username = 'admin', route = '/api/admin/login') {
  const response = await request(route, { body: { username, password } });
  const data = await response.json();
  return { response, data, cookie: cookies(response) };
}
const payload = (currentPassword, newPassword = nextPassword) => ({ currentPassword, newPassword, confirmPassword: newPassword });
async function checkSession(session, expectedStatus) {
  assert.equal((await request('/api/admin/check-auth', { cookie: session.cookie })).status, expectedStatus, 'cookie session');
  assert.equal((await request('/api/admin/check-auth', { token: session.data.token })).status, expectedStatus, 'bearer session');
}
try {
  let db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(sql => sql.trim())) await db.prepare(sql).run();
  await db.prepare("INSERT INTO users (id, username, email, password, name, phone, google_id, is_admin) VALUES (1, 'admin', 'maidargantuu120@gmail.com', ?, 'Existing Admin', '000-test', 'existing-google-id', 1), (2, 'customer', 'customer@example.invalid', ?, 'Existing Customer', NULL, NULL, 0)").bind(legacyHash(initialPassword), legacyHash(customerPassword)).run();
  await db.prepare("INSERT INTO products (name, description, category, price, image_url) VALUES ('Existing product', 'Preserve me', 'beef', 100, '/test.webp')").run();
  await db.prepare("INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, customer_address, total_amount) VALUES (1, 'Existing order', 'order@example.invalid', '000', 'Local test', 100)").run();
  const snapshot = async () => ({
    users: await db.prepare('SELECT id, username, email, name, phone, google_id, is_admin, created_at FROM users ORDER BY id').all(),
    orders: await db.prepare('SELECT * FROM orders').all(),
    products: await db.prepare('SELECT * FROM products').all(),
  });
  const before = await snapshot();
  const admin = await login(bootstrapPassword);
  assert.equal(admin.response.status, 200, 'legacy Cloudflare credential must still work initially');
  await checkSession(admin, 200);
  const customer = await login(customerPassword, 'customer', '/api/login');
  assert.equal(customer.response.status, 200);
  assert.equal((await request('/api/admin/change-password', { body: payload(bootstrapPassword) })).status, 401);
  assert.equal((await request('/api/admin/change-password', { cookie: customer.cookie, body: payload(customerPassword) })).status, 403);
  for (const origin of ['https://evil.example', null]) {
    assert.equal((await request('/api/admin/change-password', { cookie: admin.cookie, origin, body: payload(bootstrapPassword) })).status, 403);
  }
  assert.equal((await request('/api/admin/change-password', { cookie: admin.cookie, body: payload(bootstrapPassword), headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  for (const body of [payload('wrong-current-password'), payload(bootstrapPassword, 'short'), { ...payload(bootstrapPassword), confirmPassword: 'does-not-match' }, payload(bootstrapPassword, bootstrapPassword), payload(bootstrapPassword, 'x'.repeat(129))]) {
    assert.equal((await request('/api/admin/change-password', { cookie: admin.cookie, body })).status, 400);
  }
  assert.equal((await db.prepare('SELECT password FROM users WHERE id = 1').first()).password, legacyHash(initialPassword), 'failed requests must not mutate data');

  let response = await request('/api/admin/change-password', { cookie: admin.cookie, body: payload(bootstrapPassword) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), ['success', 'token']);
  const renewed = { cookie: cookies(response), data: result };
  await checkSession(renewed, 200);
  await checkSession(admin, 401);
  assert.equal((await login(bootstrapPassword)).response.status, 401, 'old Cloudflare value cannot bypass new password');
  assert.equal((await login(initialPassword)).response.status, 401, 'old DB password must stop working');
  assert.equal((await login(nextPassword)).response.status, 200);
  assert.equal((await login(nextPassword, 'maidargantuu120@gmail.com')).response.status, 200);
  assert.equal((await login(nextPassword, 'admin', '/api/login')).response.status, 200, 'ordinary login supports managed admin hashes');
  assert.match((await db.prepare('SELECT password FROM users WHERE id = 1').first()).password, /^admin-v1\$[a-f0-9]{64}\.[a-f0-9]{32}$/);
  const after = await snapshot();
  // D1 execution timings are intentionally ignored; record contents must match.
  for (const table of Object.keys(before)) assert.deepEqual(after[table].results, before[table].results, `${table} preserved`);

  // A new runtime with a different Cloudflare value must still use the DB password.
  await runtime.dispose();
  runtime = makeRuntime('Different-deployment-env-password#2026');
  db = await runtime.getD1Database('DB');
  assert.equal((await login('Different-deployment-env-password#2026')).response.status, 401);
  const persisted = await login(nextPassword);
  assert.equal(persisted.response.status, 200, 'site password survives restarts/redeployments');
  response = await request('/api/admin/change-password', { cookie: persisted.cookie, body: payload(nextPassword, latestPassword) });
  assert.equal(response.status, 200, 'admins can change their password again without redeployment');
  await checkSession(persisted, 401);
  assert.equal((await login(latestPassword)).response.status, 200);
  assert.equal((await login(nextPassword)).response.status, 401);
  const raceSession = await login(latestPassword);
  const candidates = ['Concurrent-password-A#2026', 'Concurrent-password-B#2026'];
  const racing = await Promise.all(candidates.map(newPassword => request('/api/admin/change-password', {
    cookie: raceSession.cookie, body: payload(latestPassword, newPassword),
  })));
  assert.equal(racing.filter(response => response.status === 200).length, 1, 'only one concurrent write may succeed');
  const winner = racing.findIndex(response => response.status === 200);
  assert.equal((await login(candidates[winner])).response.status, 200);
  assert.equal((await login(candidates[1 - winner])).response.status, 401);
  await runtime.dispose();
  runtime = makeRuntime(customerPassword, 'customer');
  db = await runtime.getD1Database('DB');
  assert.equal((await login(customerPassword, 'customer')).response.status, 403);
  assert.equal((await db.prepare('SELECT is_admin FROM users WHERE id = 2').first()).is_admin, 0, 'bootstrap configuration must not promote an existing customer');
  console.log('Admin password checks passed: authenticated-admin access, current password, validation, CSRF, encrypted storage, account/data preservation, cookie/token revocation, repeated changes, and persistence independent of Cloudflare secrets.');
} finally {
  await runtime.dispose();
  assert.ok(directory.startsWith(path.join(root, 'admin-password-test-')));
  await rm(directory, { recursive: true, force: true });
}
