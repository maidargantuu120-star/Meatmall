// Deterministic browser recovery and disposable worker asset tests; no production data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { Miniflare } from 'miniflare';

const script = await readFile('client/public/app-recovery.js', 'utf8');
function browser({ online = true, storage = new Map(), blocked = false, now = 100000 } = {}) {
  const events = {};
  let reloads = 0;
  function element() {
    return { children: [], style: {}, textContent: '', attributes: {}, listeners: {},
      get childElementCount() { return this.children.length; },
      append(...nodes) { this.children.push(...nodes); },
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(name, handler) { this.listeners[name] = handler; } };
  }
  const root = element();
  const context = { navigator: { onLine: online }, Date: { now: () => now },
    sessionStorage: { getItem: key => { if (blocked) throw new Error('Storage blocked'); return storage.get(key); },
      setItem: (key, value) => { if (blocked) throw new Error('Storage blocked'); storage.set(key, value); } },
    document: { getElementById: () => root, createElement: element },
    window: { location: { reload: () => reloads++ }, addEventListener: (name, handler) => { events[name] = handler; } } };
  runInNewContext(script, context);
  return { recovery: context.window.meatmallRecovery, events, root, reloads: () => reloads, storage };
}
const failure = new TypeError('Failed to fetch dynamically imported module: https://meatmall.kr/assets/terms-old.js');
const storage = new Map([['cart', 'keep cart'], ['auth_token', 'keep login'], ['checkout', 'keep draft']]);
let page = browser({ storage });
assert(!page.recovery.tryReload(new Error('A rendering bug')));
assert(!page.recovery.tryReload(new TypeError('Failed to fetch')));
page.events['vite:preloadError']({ payload: failure });
assert.equal(page.reloads(), 1);
page.recovery.tryReload(failure);
assert.equal(page.reloads(), 1, 'multiple errors in one page reload only once');
page = browser({ storage });
assert(!page.recovery.tryReload(failure), 'the guard survives full reloads');
assert.equal(page.reloads(), 0);
assert.equal(storage.get('cart'), 'keep cart');
assert.equal(storage.get('auth_token'), 'keep login');
assert.equal(storage.get('checkout'), 'keep draft');
page.events.unhandledrejection({ reason: failure });
assert.equal(page.root.children[0].attributes.role, 'alert');
assert.equal(page.root.children[0].children[0].textContent, 'Хуудас ачаалж чадсангүй');
assert(!JSON.stringify(page.root).includes('terms-old.js'), 'do not show technical asset URLs');
page.root.children[0].children[2].listeners.click();
assert.equal(page.reloads(), 1, 'manual retry remains available');
assert(browser({ storage, now: 161000 }).recovery.tryReload(failure), 'a later independent failure can recover');
assert(!browser({ online: false }).recovery.tryReload(failure));
page = browser({ blocked: true });
page.events.error({ target: { tagName: 'SCRIPT', type: 'module' } });
assert.equal(page.reloads(), 0, 'storage denial must not cause infinite reloads');
assert.equal(page.root.children.length, 1, 'missing entry bundle has a fallback without React');
for (const message of ['Importing a module script failed.', 'error loading dynamically imported module', 'Loading chunk 4 failed', 'Unable to preload CSS for /assets/style.css']) assert(browser().recovery.isChunkError(new Error(message)));
assert(!/localStorage\.clear|sessionStorage\.clear/.test(await readFile('client/src/components/ui/error-boundary.tsx', 'utf8')));
console.log('PASS: stale chunks, Safari/CSS errors, single automatic recovery, offline/storage denial, startup fallback and cart/auth/draft preservation');

const html = await readFile('dist/public/index.html', 'utf8');
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  serviceBindings: { ASSETS(request) {
    const path = new URL(request.url).pathname;
    if (path === '/assets/present.js') return new Response('export default 1', { headers: { 'Content-Type': 'text/javascript', 'Cache-Control': 'public,max-age=31536000,immutable' } });
    if (path === '/sw.js' || path === '/app-recovery.js') return new Response('// local fixture', { headers: { 'Content-Type': 'text/javascript' } });
    return new Response(html, { headers: { 'Content-Type': 'text/html' } }); // emulate Pages SPA fallback
  } },
});
try {
  for (const path of ['/', '/terms', '/privacy', '/contact', '/products', '/my-page', '/cart', '/checkout', '/admin/login', '/admin/orders', '/admin/security', '/sw.js', '/app-recovery.js']) {
    const response = await runtime.dispatchFetch('https://meatmall.kr' + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store', path);
    assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store', path);
  }
  let response = await runtime.dispatchFetch('https://meatmall.kr/assets/terms-old.js');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert(!response.headers.get('Content-Type').includes('text/html'));
  response = await runtime.dispatchFetch('https://meatmall.kr/assets/present.js');
  assert.equal(response.status, 200);
  assert(response.headers.get('Cache-Control').includes('immutable'));
  assert(html.indexOf('/app-recovery.js') < html.indexOf('type="module"'), 'recovery must load before the entry module');
  console.log('PASS: public/admin HTML cache headers, uncached recovery/service worker, missing-asset 404 and immutable versioned JS');
} finally { await runtime.dispose(); }
