import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const html = await readFile('dist/public/index.html', 'utf8');
const robots = await readFile('dist/public/robots.txt', 'utf8');
const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'],
  r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'local-seo-test-secret-with-32-characters' },
  serviceBindings: {
    ASSETS(request) {
      const isRobots = new URL(request.url).pathname === '/robots.txt';
      return new Response(isRobots ? robots : html, {
        headers: { 'content-type': isRobots ? 'text/plain' : 'text/html; charset=utf-8' },
      });
    },
  },
});

try {
  const db = await runtime.getD1Database('DB');
  const migration = await readFile('migrations/0000_meatmall.sql', 'utf8');
  for (const sql of migration.split(';').filter(sql => sql.trim())) await db.prepare(sql).run();
  await db.prepare("INSERT INTO products (id, name, description, category, price, image_url) VALUES (42, 'SEO test', '', 'beef', 100, '/test.webp')").run();
  await db.prepare("INSERT INTO service_categories (name, slug, description, icon_name, is_active) VALUES ('Active', 'active&test', '', 'Store', 1), ('Hidden', 'hidden', '', 'Store', 0)").run();

  const fetch = path => runtime.dispatchFetch(`https://meatmall.kr${path}`);
  let response = await fetch('/sitemap.xml');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/xml/);
  let xml = await response.text();
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.ok(xml.includes('<loc>https://meatmall.kr/products/42</loc>'));
  assert.ok(xml.includes('/service-category/active%26test'));
  for (const forbidden of ['/admin', '/checkout', '/cart', '/my-page', '/auth', '/hidden', 'pages.dev', 'ibeelmeat.kr']) assert.ok(!xml.includes(forbidden), forbidden);

  response = await fetch('/robots.txt');
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.equal(await response.text(), robots);
  assert.ok(robots.includes('Sitemap: https://meatmall.kr/sitemap.xml'));

  for (const path of ['/', '/products/42', '/contact', '/service-category/active%26test']) {
    response = await fetch(path + '?tracking=test');
    const body = await response.text();
    assert.ok(body.includes(`rel="canonical" href="https://meatmall.kr${path}"`), path);
    assert.ok(body.includes(`property="og:url" content="https://meatmall.kr${path}"`), path);
    assert.ok(body.includes('name="robots" content="index, follow"'), path);
    assert.ok(!body.includes('meatmall.pages.dev'), path);
  }
  for (const path of ['/admin', '/checkout', '/my-page', '/auth', '/cart', '/unknown-route']) {
    response = await fetch(path);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow', path);
    assert.ok((await response.text()).includes('name="robots" content="noindex, follow"'), path);
  }
  response = await runtime.dispatchFetch('https://www.meatmall.kr/products/42?tracking=test', { redirect: 'manual' });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://meatmall.kr/products/42?tracking=test');
  response = await runtime.dispatchFetch('https://www.meatmall.kr/api/products', { redirect: 'manual' });
  assert.equal(response.status, 200, 'API must stay on its original origin');

  await db.prepare('DELETE FROM products WHERE id = 42').run();
  assert.ok(!(await (await fetch('/sitemap.xml')).text()).includes('/products/42'));
  await db.prepare('DROP TABLE products').run();
  response = await fetch('/sitemap.xml');
  assert.equal(response.status, 503, 'DB failures must not publish a partial sitemap');
  console.log('SEO integration checks passed: catalog sitemap, robots, per-page canonical, noindex, www redirect, API compatibility, catalog updates and DB failure.');
} finally {
  await runtime.dispose();
}
