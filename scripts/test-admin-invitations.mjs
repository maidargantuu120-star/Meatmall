// Local-only invitation lifecycle and administrator access tests. No production writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'local-admin-invitation-session-secret-2026', ADMIN_USERNAME: 'owner', ADMIN_PASSWORD: 'Old-bootstrap-password#2026' },
  serviceBindings: { ASSETS: () => new Response('local fixture') },
});
const request = (route, { body, cookie, origin = 'https://meatmall.kr', type = 'application/json' } = {}) => runtime.dispatchFetch('https://meatmall.kr/api' + route, {
  method: body ? 'POST' : 'GET', redirect: 'manual', headers: { Origin: origin, ...(body ? { 'Content-Type': type } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
});
const cookieOf = res => res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
const localPassword = 'Local-invitation-password#2026';
let passed = 0;
try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  async function register(username) {
    const res = await request('/register', { body: { username, email: username + '@example.invalid', password: localPassword } });
    assert.equal(res.status, 201);
    return cookieOf(res);
  }
  const owner = await register('owner');
  const member = await register('member');
  await db.prepare("UPDATE users SET is_admin = 1, google_id = 'preserved-owner-google-id' WHERE username = 'owner'").run();
  const oldUsers = await db.prepare('SELECT * FROM users ORDER BY id').all();
  const payload = { email: 'operator@example.invalid' };
  assert.equal((await request('/admin/invitations', { body: payload })).status, 401);
  assert.equal((await request('/admin/invitations', { body: payload, cookie: member })).status, 403);
  assert.equal((await request('/admin/invitations', { cookie: member })).status, 403);
  assert.equal((await request('/admin/invitations', { body: payload, cookie: owner, origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await request('/admin/invitations', { body: payload, cookie: owner, type: 'text/plain' })).status, 415);
  assert.equal((await request('/admin/invitations', { body: { email: 'invalid' }, cookie: owner })).status, 400);
  assert.equal((await request('/admin/invitations', { body: { email: ' MEMBER@EXAMPLE.INVALID ' }, cookie: owner })).status, 409);
  passed += 7;
  async function invite(email = 'operator@example.invalid') {
    const res = await request('/admin/invitations', { body: { email }, cookie: owner });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const data = await res.json();
    const url = new URL(data.url);
    assert.equal(url.pathname, '/admin/activate');
    assert.equal(url.search, '', 'bearer token must not be sent in URL query/logs');
    return { ...data, token: new URLSearchParams(url.hash.slice(1)).get('token') };
  }
  let invitation = await invite(' OPERATOR@EXAMPLE.INVALID ');
  assert.equal(invitation.email, 'operator@example.invalid');
  const stored = await db.prepare('SELECT * FROM admin_invitations WHERE id = ?').bind(invitation.id).first();
  assert.notEqual(stored.token_hash, invitation.token);
  assert.equal(stored.token_hash.length, 64);
  assert(stored.expires_at - Date.now() <= 24 * 60 * 60 * 1000);
  assert.equal((await request('/admin/invitations/inspect', { body: { token: 'bad' } })).status, 404);
  assert.equal((await request('/admin/invitations/inspect', { body: { token: invitation.token } })).status, 200);
  const activation = token => ({ token, name: 'New Operator', newPassword: localPassword, confirmPassword: localPassword });
  assert.equal((await request('/admin/invitations/accept', { body: { ...activation(invitation.token), newPassword: 'weak', confirmPassword: 'weak' } })).status, 400);
  assert.equal((await request('/admin/invitations/accept', { body: { ...activation(invitation.token), confirmPassword: 'not-matching-password' } })).status, 400);
  const concurrent = await Promise.all([request('/admin/invitations/accept', { body: activation(invitation.token) }), request('/admin/invitations/accept', { body: activation(invitation.token) })]);
  assert.equal(concurrent.filter(res => res.status === 201).length, 1, 'only one concurrent claim succeeds');
  assert.equal((await request('/admin/invitations/accept', { body: activation(invitation.token) })).status, 404);
  const operator = await db.prepare('SELECT * FROM users WHERE email = ?').bind(invitation.email).first();
  assert.equal(operator.is_admin, 1);
  assert(operator.password.startsWith('admin-v1$'));
  const login = await request('/admin/login', { body: { username: invitation.email, password: localPassword } });
  assert.equal(login.status, 200, 'new operator can use email and their chosen password');
  assert.equal((await request('/admin/check-auth', { cookie: cookieOf(login) })).status, 200);
  assert.deepEqual((await db.prepare('SELECT * FROM users WHERE id IN (1, 2) ORDER BY id').all()).results, oldUsers.results, 'preserve original accounts, password, role and Google identity');
  passed += 13;
  invitation = await invite('expired@example.invalid');
  await db.prepare('UPDATE admin_invitations SET expires_at = ? WHERE id = ?').bind(Date.now() - 1, invitation.id).run();
  assert.equal((await request('/admin/invitations/accept', { body: activation(invitation.token) })).status, 404);
  invitation = await invite('revoked@example.invalid');
  await request(`/admin/invitations/${invitation.id}/revoke`, { body: {}, cookie: owner });
  assert.equal((await request('/admin/invitations/accept', { body: activation(invitation.token) })).status, 404);
  invitation = await invite('replaced@example.invalid');
  await invite('replaced@example.invalid');
  assert.equal((await request('/admin/invitations/inspect', { body: { token: invitation.token } })).status, 404);
  invitation = await invite('collision@example.invalid');
  await register('collision');
  assert.equal((await request('/admin/invitations/accept', { body: activation(invitation.token) })).status, 409, 'never overwrite a newly registered member');
  assert.equal((await db.prepare("SELECT is_admin FROM users WHERE email = 'collision@example.invalid'").first()).is_admin, 0);
  invitation = await invite('demoted@example.invalid');
  await db.prepare("UPDATE users SET is_admin = 0 WHERE username = 'owner'").run();
  assert.equal((await request('/admin/invitations/accept', { body: activation(invitation.token) })).status, 404);
  passed += 6;
  console.log(`PASS: ${passed} invitation authorization, CSRF, validation, expiry, single-use concurrency, password login and account preservation checks`);
} finally { await runtime.dispose(); }
