// Disposable local accounts and a fake mail provider only. Never use real passwords or recipients.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Miniflare } from 'miniflare';
const mail = [];
let providerStatus = 201;
const oldPassword = 'Local-old-admin-password#2026';
const newPassword = 'Local-new-admin-password#2026';
const bindings = { SESSION_SECRET: 'local-password-recovery-test-secret-more-than-32', ADMIN_USERNAME: 'reset-owner', ADMIN_PASSWORD: 'Local-bootstrap-password#2026', BREVO_API_KEY: 'fake-local-key', PASSWORD_RESET_EMAIL_FROM: 'reset@example.invalid' };
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'], bindings,
  serviceBindings: { ASSETS: () => new Response('local fixture') },
  outboundService: async request => {
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.headers.get('api-key'), 'fake-local-key');
    const data = await request.json();
    mail.push(data);
    return new Response(JSON.stringify(providerStatus === 201 ? { messageId: 'local-fixture' } : { message: 'Rejected' }), { status: providerStatus, headers: { 'Content-Type': 'application/json' } });
  },
});
const cookieOf = res => res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
let sequence = 0;
function request(route, { body, cookie, token, ip = '203.0.113.7', origin = 'https://meatmall.kr', type = 'application/json' } = {}) {
  return runtime.dispatchFetch('https://meatmall.kr/api' + route, {
    method: body ? 'POST' : 'GET', redirect: 'manual', headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(body ? { 'Content-Type': type } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await sleep(20); }
  throw new Error('Background test operation timed out');
}
const extractToken = message => message.textContent.match(/#token=([a-f0-9]{64})/)[1];
try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  async function register(username) {
    const res = await request('/register', { body: { username, email: username + '@example.invalid', password: oldPassword } });
    assert.equal(res.status, 201);
    return cookieOf(res);
  }
  const oldSession = await register('reset-owner');
  await register('reset-member');
  await db.prepare("UPDATE users SET is_admin = 1, google_id = 'original-google-link' WHERE username = 'reset-owner'").run();
  const owner = await db.prepare("SELECT * FROM users WHERE username = 'reset-owner'").first();
  const login = await request('/admin/login', { body: { username: 'reset-owner', password: oldPassword } });
  const bearer = (await login.json()).token;
  const state = await request('/admin/password-recovery/status');
  assert.equal((await state.json()).configured, true);
  assert.equal(state.headers.get('Cache-Control'), 'no-store');
  const route = '/admin/password-recovery/request';
  assert.equal((await request(route, { body: { email: 'reset-owner@example.invalid' }, origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await request(route, { body: { email: 'reset-owner@example.invalid' }, type: 'text/plain' })).status, 415);
  assert.equal((await request(route, { body: { email: 'invalid' } })).status, 400);
  const unknown = await request(route, { body: { email: 'unknown@example.invalid' } });
  const member = await request(route, { body: { email: 'reset-member@example.invalid' } });
  const generic = await unknown.text();
  assert.equal(await member.text(), generic);
  assert.equal(unknown.status, 202);
  async function issue(email = 'reset-owner@example.invalid') {
    const previous = mail.length;
    const res = await request(route, { body: { email }, ip: '203.0.113.' + (++sequence + 20) });
    assert.equal(res.status, 202);
    assert.equal(await res.text(), generic, 'admin/non-admin/unknown requests must look identical');
    await until(() => mail.length === previous + 1);
    const message = mail.at(-1);
    const token = extractToken(message);
    const hash = createHash('sha256').update(token).digest('hex');
    await until(async () => (await db.prepare('SELECT delivery_status FROM admin_password_resets WHERE token_hash = ?').bind(hash).first())?.delivery_status !== 'pending');
    const row = await db.prepare('SELECT * FROM admin_password_resets WHERE token_hash = ?').bind(hash).first();
    assert.equal(row.token_hash, hash);
    assert.notEqual(row.token_hash, token);
    assert(!JSON.stringify(row).includes(token));
    assert(row.expires_at - row.created_at === 15 * 60 * 1000);
    assert.equal(message.sender.email, 'reset@example.invalid');
    assert.equal(message.to[0].email, owner.email);
    assert(!message.textContent.includes(oldPassword));
    assert(!message.textContent.includes(owner.password));
    assert(message.htmlContent.includes('#token='));
    assert(message.htmlContent.includes('charset="utf-8"'), 'Mongolian email must declare UTF-8');
    assert(!message.htmlContent.includes('?token='));
    return { token, row, message };
  }
  let recovery = await issue(' RESET-OWNER@EXAMPLE.INVALID ');
  assert.equal(mail.length, 1, 'members and unknown emails do not receive reset links');
  assert.deepEqual(await db.prepare('SELECT * FROM users WHERE id = ?').bind(owner.id).first(), owner, 'request alone never changes password or account');
  assert.equal((await request('/admin/check-auth', { cookie: oldSession })).status, 200);
  const inspect = token => request('/admin/password-recovery/inspect', { body: { token } });
  const reset = (token, overrides = {}) => request('/admin/password-recovery/reset', { body: { token, newPassword, confirmPassword: newPassword, ...overrides } });
  assert.equal((await inspect('x')).status, 400);
  assert.equal((await reset(recovery.token, { newPassword: 'short', confirmPassword: 'short' })).status, 400);
  assert.equal((await reset(recovery.token, { confirmPassword: 'Different-password#2026' })).status, 400);
  await db.prepare('UPDATE admin_password_resets SET expires_at = ? WHERE id = ?').bind(Date.now() - 1, recovery.row.id).run();
  assert.equal((await inspect(recovery.token)).status, 400);
  recovery = await issue();
  const oldToken = recovery.token;
  // Clear test-only rate rows to exercise multiple independent lifecycle cases.
  await db.prepare('DELETE FROM admin_recovery_limits').run();
  recovery = await issue();
  assert.equal((await inspect(oldToken)).status, 400, 'new request invalidates earlier link');
  assert.equal((await inspect(recovery.token)).status, 200);
  const claims = await Promise.all([reset(recovery.token), reset(recovery.token)]);
  assert.equal(claims.filter(res => res.status === 200).length, 1, 'concurrent token claims must be atomic');
  const success = claims.find(res => res.status === 200);
  assert.equal(success.headers.getSetCookie().length, 0, 'reset must not sign in automatically');
  assert(!('token' in await success.json()), 'reset must not issue a login token');
  assert.equal((await reset(recovery.token)).status, 400);
  assert.equal((await request('/admin/check-auth', { cookie: oldSession })).status, 401, 'old cookie invalidated');
  assert.equal((await request('/admin/check-auth', { token: bearer })).status, 401, 'old bearer invalidated');
  assert.equal((await request('/admin/login', { body: { username: owner.email, password: oldPassword } })).status, 401);
  assert.equal((await request('/admin/login', { body: { username: 'reset-owner', password: bindings.ADMIN_PASSWORD } })).status, 401, 'bootstrap secret cannot bypass reset');
  assert.equal((await request('/admin/login', { body: { username: owner.email, password: newPassword } })).status, 200);
  const after = await db.prepare('SELECT * FROM users WHERE id = ?').bind(owner.id).first();
  const { password: beforePassword, ...beforeIdentity } = owner;
  const { password: afterPassword, ...afterIdentity } = after;
  assert.deepEqual(afterIdentity, beforeIdentity, 'email, Google link, role and account ID preserved');
  assert(afterPassword.startsWith('admin-v1$'));
  await db.prepare('DELETE FROM admin_recovery_limits').run();
  recovery = await issue();
  await db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?').bind(owner.id).run();
  assert.equal((await reset(recovery.token)).status, 400, 'demoted admin cannot recover admin access');
  await db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(owner.id).run();
  await db.prepare('DELETE FROM admin_recovery_limits').run();
  providerStatus = 400;
  recovery = await issue();
  assert.equal(recovery.row.delivery_status, 'failed');
  assert.equal((await inspect(recovery.token)).status, 400, 'provider-rejected link is invalidated');
  await db.prepare('DELETE FROM admin_recovery_limits').run();
  for (let i = 0; i < 10; i++) assert.equal((await request(route, { body: { email: `unknown-${i}@example.invalid` }, ip: '203.0.113.99' })).status, 202);
  assert.equal((await request(route, { body: { email: 'unknown-limit@example.invalid' }, ip: '203.0.113.99' })).status, 429);
  console.log('PASS: generic requests, no member reset, hashed 15-minute links, expiry/reissue/replay/concurrency, password validation, session invalidation, bootstrap rejection, identity preservation, provider failures and rate limits');
} finally { await runtime.dispose(); }
const unavailable = new Miniflare({ modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }], compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], r2Buckets: ['BUCKET'], bindings: { SESSION_SECRET: bindings.SESSION_SECRET }, serviceBindings: { ASSETS: () => new Response('fixture') } });
try {
  const res = await unavailable.dispatchFetch('https://meatmall.kr/api/admin/password-recovery/request', { method: 'POST', headers: { Origin: 'https://meatmall.kr', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'any@example.invalid' }) });
  assert.equal(res.status, 503, 'never pretend email delivery is configured');
  console.log('PASS: explicit unavailable state without mail credentials');
} finally { await unavailable.dispose(); }
