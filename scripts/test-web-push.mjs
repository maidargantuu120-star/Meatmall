// Permission flows are simulated; push delivery uses a disposable DB and an in-process push service.
// Never requests real browser permission, contacts a push provider or changes production accounts.
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const { outputFiles } = await build({
  entryPoints: ['client/src/lib/push.ts'], bundle: true, write: false, format: 'iife', globalName: 'push',
  define: { 'import.meta.env.VITE_API_BASE_URL': 'undefined' },
  plugins: [{ name: 'fake-api', setup(build) {
    build.onResolve({ filter: /^@\/lib\/queryClient$/ }, () => ({ path: 'api', namespace: 'test' }));
    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const apiRequest = (...args) => globalThis.api(...args);' }));
  } }],
});
function browser({ permission = 'default', ios = false, installed = false, subscribed = false, configured = true, failSave = false } = {}) {
  const calls = [];
  const storage = new Map();
  let subscription = subscribed ? makeSubscription() : null;
  function makeSubscription() { return { endpoint: 'https://push.example.invalid/test', toJSON: () => ({ endpoint: 'fixture' }), unsubscribe: async () => { calls.push('unsubscribe'); subscription = null; return true; } }; }
  const registration = { pushManager: {
    getSubscription: async () => { calls.push('getSubscription'); return subscription; },
    subscribe: async () => { calls.push('subscribe'); subscription = makeSubscription(); return subscription; },
  } };
  const events = new EventTarget();
  const window = { Notification: true, PushManager: true, matchMedia: () => ({ matches: installed }),
    dispatchEvent: events.dispatchEvent.bind(events) };
  const context = vm.createContext({
    window, Event, CustomEvent, Uint8Array, atob, setTimeout, clearTimeout,
    navigator: { userAgent: ios ? 'iPhone' : 'Chrome', platform: ios ? 'iPhone' : 'Win32', maxTouchPoints: ios ? 5 : 0,
      serviceWorker: { getRegistration: async () => registration, register: async () => { calls.push('register'); return { installing: true }; }, ready: Promise.resolve(registration) } },
    Notification: { get permission() { return permission; }, requestPermission: async () => { calls.push('permission'); permission = 'granted'; return permission; } },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    api: async (method, url) => { calls.push(url); if (url.endsWith('public-key')) return { publicKey: configured ? 'BAECAw' : null }; if (failSave && url.endsWith('/subscribe')) throw new Error('offline'); return { ok: true }; },
  });
  vm.runInContext(outputFiles[0].text, context);
  return { push: context.push, calls, storage, window, context };
}
let b = browser();
const enabling = b.push.enablePush();
assert.deepEqual(b.calls, ['permission'], 'Safari permission must be requested before any async worker/subscription lookup');
assert.equal(await enabling, 'on');
assert(b.calls.includes('subscribe'));
b = browser({ permission: 'granted' });
assert.equal(await b.push.syncPushSubscription(), 'on', 'previous permission automatically completes subscription');
assert(!b.calls.includes('permission'));
await b.push.disablePush();
b.calls.length = 0;
assert.equal(await b.push.syncPushSubscription(), 'off', 'explicit opt-out survives automatic sync');
assert(!b.calls.includes('subscribe'));
assert.equal(await b.push.enablePush(), 'on', 'explicit re-enable clears opt-out');
b = browser({ permission: 'granted', subscribed: true });
await b.push.syncPushSubscription();
assert(!b.calls.includes('subscribe'), 'reuse the existing subscription');
assert(b.calls.includes('/api/push/subscribe'), 'bind it to the current signed-in account');
b = browser({ permission: 'granted' });
await Promise.all([b.push.syncPushSubscription(), b.push.enablePush()]);
assert.equal(b.calls.filter(c => c === 'subscribe').length, 1, 'deduplicate concurrent mount and click');
b = browser({ permission: 'denied' });
assert.equal(await b.push.enablePush(), 'denied');
assert.equal(b.calls.length, 0);
b = browser({ ios: true });
assert.equal(await b.push.enablePush(), 'needs-install');
assert.equal(b.calls.length, 0);
b = browser({ ios: true, installed: true, permission: 'granted' });
assert.equal(await b.push.syncPushSubscription(), 'on');
b = browser();
assert.equal(await b.push.syncPushSubscription(), 'off');
assert.equal(b.calls.length, 0, 'never prompt automatically on first visit');
b = browser({ permission: 'granted', configured: false });
assert.equal(await b.push.syncPushSubscription(), 'unconfigured');
assert(!b.calls.includes('subscribe'));
b = browser({ permission: 'granted', failSave: true });
await assert.rejects(b.push.syncPushSubscription());
console.log('PASS: permission timing, automatic reconnect, opt-out, denial, iOS install, concurrency and failure states');

const vapid = createECDH('prime256v1'); vapid.generateKeys();
const device = createECDH('prime256v1'); device.generateKeys();
let deliveryStatus = 201;
let sent = 0;
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'push-test-disposable-session-secret-2026', VAPID_PUBLIC_KEY: vapid.getPublicKey().toString('base64url'), VAPID_PRIVATE_KEY: vapid.getPrivateKey().toString('base64url'), VAPID_SUBJECT: 'mailto:push@example.invalid' },
  serviceBindings: { ASSETS: () => new Response('fixture') },
  outboundService: async request => {
    assert.equal(new URL(request.url).hostname, 'fcm.googleapis.com');
    assert(request.headers.get('Authorization')?.startsWith('vapid '), 'signed VAPID request');
    assert.equal(request.headers.get('Content-Encoding'), 'aes128gcm');
    assert((await request.arrayBuffer()).byteLength > 100, 'encrypted payload');
    sent++;
    return new Response('', { status: deliveryStatus });
  },
});
try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql', 'utf8')).split(';').filter(s => s.trim())) await db.prepare(sql).run();
  const request = (route, body, cookie) => runtime.dispatchFetch('https://meatmall.kr/api' + route, {
    method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  const register = async username => {
    const res = await request('/register', { username, email: username + '@example.invalid', password: 'Local-push-test#2026', confirmPassword: 'Local-push-test#2026' });
    assert.equal(res.status, 201);
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  };
  const cookie = await register('push-test');
  const other = await register('push-other');
  assert.equal((await request('/push/subscribe', { subscription: {} })).status, 401);
  assert.equal((await request('/push/subscribe', { subscription: {} }, cookie)).status, 400);
  assert.equal((await request('/push/public-key')).status, 200);
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/local-fixture', keys: { p256dh: device.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
  assert.equal((await request('/push/subscribe', { subscription }, cookie)).status, 200);
  assert.equal((await request('/push/test', {}, other)).status, 502, 'no success when caller has no devices');
  assert.equal(sent, 0, 'cannot send to another account');
  assert.equal((await request('/push/test', {}, cookie)).status, 200);
  assert.equal(sent, 1);
  deliveryStatus = 500;
  assert.equal((await request('/push/test', {}, cookie)).status, 502, 'provider failure is visible');
  deliveryStatus = 410;
  assert.equal((await request('/push/test', {}, cookie)).status, 502);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions').first()).count, 0, 'remove expired device');
  assert.equal((await request('/push/subscribe', { subscription }, cookie)).status, 200);
  assert.equal((await request('/push/unsubscribe', { endpoint: subscription.endpoint }, other)).status, 200);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions').first()).count, 1, 'cannot remove another account device');
  assert.equal((await request('/push/unsubscribe', { endpoint: subscription.endpoint }, cookie)).status, 200);
  console.log('PASS: authenticated subscription, encrypted VAPID delivery, account isolation, provider failure, expiry and unsubscribe');
} finally { await runtime.dispose(); }
