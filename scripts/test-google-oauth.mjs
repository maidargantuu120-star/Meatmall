import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, createFetchMock } from 'miniflare';
import { generateSignedCookie } from 'hono/cookie';

const secret = 'local-google-oauth-test-secret-at-least-32';
const upstream = createFetchMock();
upstream.disableNetConnect();
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'],
  r2Buckets: ['BUCKET'],
  fetchMock: upstream,
  bindings: {
    SESSION_SECRET: secret,
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'local-test-client-secret',
  },
  serviceBindings: { ASSETS: () => new Response('local test') },
});
const request = (path, options = {}) => runtime.dispatchFetch(`https://meatmall.kr${path}`, {
  redirect: 'manual', ...options,
});
const cookies = response => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
async function begin(client = 'web') {
  const response = await request(`/api/auth/google?client=${client}`);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const url = new URL(response.headers.get('location'));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://meatmall.kr/api/auth/google/callback');
  const cookie = response.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  return { state: url.searchParams.get('state'), cookie: cookies(response) };
}
function mockGoogle({ sub = 'google-test-sub', email = 'oauth-test@example.invalid', verified = true } = {}) {
  upstream.get('https://oauth2.googleapis.com').intercept({
    path: '/token', method: 'POST',
  }).reply(200, { access_token: 'local-test-google-token', token_type: 'Bearer' });
  upstream.get('https://openidconnect.googleapis.com').intercept({
    path: '/v1/userinfo', headers: { authorization: 'Bearer local-test-google-token' },
  }).reply(200, { sub, email, email_verified: verified, name: 'OAuth Test' });
}

try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(sql => sql.trim())) {
    await db.prepare(sql).run();
  }
  const first = await begin();
  const second = await begin();
  assert.notEqual(first.state, second.state, 'each login needs an unpredictable state');

  for (const [state, cookie] of [[first.state, ''], ['app', first.cookie], ['wrong', first.cookie]]) {
    const response = await request(`/api/auth/google/callback?code=forged&state=${state}`, { headers: { cookie } });
    assert.equal(response.headers.get('location'), '/auth?error=invalid_oauth_state');
    assert.ok(!cookies(response).includes('auth_user_id='));
  }
  const expired = await generateSignedCookie('google_oauth_state', JSON.stringify({
    nonce: 'expired', client: 'web', expiresAt: Date.now() - 1000,
    redirectUri: 'https://meatmall.kr/api/auth/google/callback',
  }), secret);
  let response = await request('/api/auth/google/callback?code=forged&state=expired', { headers: { cookie: expired.split(';')[0] } });
  assert.equal(response.headers.get('location'), '/auth?error=invalid_oauth_state');

  mockGoogle();
  response = await request(`/api/auth/google/callback?code=valid&state=${first.state}`, { headers: { cookie: first.cookie } });
  assert.equal(response.headers.get('location'), '/');
  const session = cookies(response);
  assert.ok(session.includes('auth_user_id='));
  const user = await (await request('/api/user', { headers: { cookie: session } })).json();
  assert.equal(user.email, 'oauth-test@example.invalid');
  assert.equal(user.googleId, 'google-test-sub');
  assert.equal(user.isAdmin, false);
  assert.ok(!('password' in user));

  const unverified = await begin();
  mockGoogle({ sub: 'unverified-sub', email: 'unverified@example.invalid', verified: false });
  response = await request(`/api/auth/google/callback?code=unverified&state=${unverified.state}`, { headers: { cookie: unverified.cookie } });
  assert.equal(response.headers.get('location'), '/auth?error=verified_email_required');
  assert.ok(!cookies(response).includes('auth_user_id='));

  const mismatch = await begin();
  mockGoogle({ sub: 'different-google-sub' });
  response = await request(`/api/auth/google/callback?code=mismatch&state=${mismatch.state}`, { headers: { cookie: mismatch.cookie } });
  assert.equal(response.headers.get('location'), '/auth?error=google_account_mismatch');

  const app = await begin('app');
  response = await request(`/api/auth/google/callback?error=access_denied&state=${app.state}`, { headers: { cookie: app.cookie } });
  assert.equal(response.headers.get('location'), 'mn.elbeg.meat://auth?error=google_failed');
  response = await runtime.dispatchFetch('https://www.meatmall.kr/api/auth/google?client=app', { redirect: 'manual' });
  assert.equal(response.headers.get('location'), 'https://meatmall.kr/api/auth/google?client=app');
  upstream.assertNoPendingInterceptors();
  console.log('Google OAuth checks passed: nonce/cookie binding, expiration, canonical callback, verified email, session creation, account mismatch and native error handling.');
} finally {
  await runtime.dispose();
  await upstream.close();
}
