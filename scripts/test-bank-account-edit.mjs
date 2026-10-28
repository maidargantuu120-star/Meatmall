// Disposable local DB only; never changes real bank details or sends mail.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const runtime = new Miniflare({
  modules: [{ type: 'ESModule', path: 'dist/public/_worker.js' }],
  compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['BUCKET'],
  bindings: { SESSION_SECRET: 'bank-edit-disposable-session-secret-2026' },
  serviceBindings: { ASSETS: () => new Response('local fixture') },
});
try {
  const db = await runtime.getD1Database('DB');
  for (const sql of (await readFile('migrations/0000_meatmall.sql','utf8')).split(';').filter(s=>s.trim())) await db.prepare(sql).run();
  const request = (path, { method='GET', cookie, body }={}) => runtime.dispatchFetch('https://meatmall.kr/api'+path, {
    method, headers: { Origin:'https://meatmall.kr', ...(cookie?{Cookie:cookie}:{}), ...(body?{'Content-Type':'application/json'}:{}) },
    body: body?JSON.stringify(body):undefined,
  });
  async function register(username) {
    const res=await request('/register',{method:'POST',body:{username,email:username+'@example.invalid',password:'Local-bank-test#2026'}});
    assert.equal(res.status,201);
    return res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  }
  const admin=await register('bank-admin'), member=await register('bank-member');
  await db.prepare("UPDATE users SET is_admin=1 WHERE username='bank-admin'").run();
  const create=await request('/bank-accounts',{method:'POST',cookie:admin,body:{bankName:'LOCAL BANK',accountNumber:'LOCAL-ONLY-123',accountHolder:'Local Original',isDefault:true,isActive:true}});
  assert.equal(create.status,201); const original=await create.json();
  for (const method of ['PATCH','PUT']) {
    assert.equal((await request('/bank-accounts/'+original.id,{method,body:{accountHolder:'Denied'}})).status,401);
    assert.equal((await request('/bank-accounts/'+original.id,{method,cookie:member,body:{accountHolder:'Denied'}})).status,403);
    const holder='Local Updated '+method;
    const saved=await request('/bank-accounts/'+original.id,{method,cookie:admin,body:{bankName:'LOCAL EDITED BANK',accountNumber:'LOCAL-ONLY-456',accountHolder:holder,description:null,isDefault:true,isActive:true}});
    assert.equal(saved.status,200); assert.equal((await saved.json()).id,original.id);
    const accounts=await (await request('/bank-accounts')).json();
    assert.equal(accounts.length,1); assert.equal(accounts[0].accountHolder,holder);
    assert.equal(accounts[0].accountNumber,'LOCAL-ONLY-456'); assert.equal(accounts[0].bankName,'LOCAL EDITED BANK');
    const checkoutDefault=await (await request('/bank-accounts/default')).json();
    assert.equal(checkoutDefault.id,original.id); assert.equal(checkoutDefault.accountHolder,holder);
    assert.equal((await request('/bank-accounts/99999',{method,cookie:admin,body:{accountHolder:'Missing'}})).status,404);
  }
  console.log('PASS: administrator PATCH and legacy PUT edits persist with the same account ID; checkout sees edited details; anonymous/member writes blocked. No production changes.');
} finally { await runtime.dispose(); }
