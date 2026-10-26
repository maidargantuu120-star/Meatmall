import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { renderOrderEmail, deliverOrderEmail } from '../worker/email';
import type { OrderEmailReceipt } from '../shared/order-email';

const receipt: OrderEmailReceipt = {
  customerName: 'Жишээ хэрэглэгч <script>alert(1)</script>', customerEmail: 'test@example.invalid',
  customerPhone: '000-0000-0000', customerAddress: 'Жишээ хүргэлтийн хаяг',
  transferAccountHolder: 'Жишээ хэрэглэгч', placedAt: '2026-10-25T12:00:00Z',
  items: [{ name: 'Үхрийн мах', quantity: 2, price: 15000, amount: 30000 }],
  subtotal: 30000, shippingFee: 6000, totalAmount: 36000,
  paymentAccount: { bankName: 'TEST BANK — ЖИШЭЭ', accountNumber: 'TEST-ACCOUNT', accountHolder: 'Meat Mall (sample)' },
};
const message = renderOrderEmail(42, receipt, 'https://meatmall.pages.dev');
assert.ok(message.html.includes('TEST-ACCOUNT'));
assert.ok(message.html.includes('₩36,000'));
assert.ok(message.html.includes('#ORD-0042'));
assert.ok(message.html.includes('21:00'));
assert.ok(message.html.includes('Доорх дансанд нийт ₩36,000 шилжүүлнэ үү.'));
assert.ok(message.text.includes('Доорх дансанд нийт ₩36,000 шилжүүлнэ үү.'));
assert.ok(message.html.includes('meatmall2021@naver.com'));
assert.ok(renderOrderEmail(42, receipt, 'https://meatmall.kr', 'support@example.invalid').html.includes('mailto:support@example.invalid'));
assert.ok(!message.html.includes('<script>'));
assert.ok(message.html.includes('&lt;script&gt;'));
assert.ok(message.text.includes('test@example.invalid') === false); // recipient is not repeated in content
assert.ok(renderOrderEmail(42, { ...receipt, paymentAccount: null }, 'https://meatmall.pages.dev').html.includes('дэлгүүртэй холбогдоно'));
assert.throws(() => renderOrderEmail(42, receipt, 'javascript:alert(1)'));
await writeFile('.deployment/order-email-preview.html', renderOrderEmail(42, { ...receipt, customerName: 'Бат-Эрдэнэ (жишээ)' }, 'https://meatmall.pages.dev').html);

let status = 'pending';
let calls = 0;
const db = { async batch() { return []; }, prepare(sql: string) { return { bind(...args: unknown[]) { return {
  async first() {
    if (sql.startsWith('UPDATE') && ['pending', 'failed'].includes(status)) {
      status = 'sending'; return { payload: JSON.stringify(receipt) };
    }
    return null;
  },
  async run() {
    if (sql.includes("status='sent'")) status = 'sent';
    if (sql.includes("status='failed'")) status = 'failed';
    if (sql.includes("status='uncertain'")) status = 'uncertain';
    return { success: true };
  },
}; } }; } };
const env = { DB: db, BREVO_API_KEY: 'test-key', ORDER_EMAIL_FROM: 'test@example.invalid', BASE_URL: 'https://meatmall.pages.dev' } as any;
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.to[0].email, receipt.customerEmail);
    assert.equal(body.replyTo.email, 'meatmall2021@naver.com');
    return new Response(JSON.stringify({ messageId: 'test-message' }), { status: 201 });
  };
  const results = await Promise.all([deliverOrderEmail(env, 42), deliverOrderEmail(env, 42)]);
  assert.equal(calls, 1);
  assert.equal(status, 'sent');
  assert.ok(results.some(r => r.status === 'not_claimed'));
  assert.equal((await deliverOrderEmail({ ...env, BREVO_API_KEY: undefined }, 42)).status, 'not_configured');
  status = 'pending';
  globalThis.fetch = async () => new Response('', { status: 429 });
  assert.equal((await deliverOrderEmail(env, 42)).status, 'failed');
  assert.equal(status, 'failed');
  globalThis.fetch = async () => { throw new Error('Connection lost'); };
  assert.equal((await deliverOrderEmail(env, 42)).status, 'uncertain');
  assert.equal((await deliverOrderEmail(env, 42)).status, 'not_claimed');
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: receipt layout/data/escaping, selected account, Seoul time, configuration gate, concurrent claims, provider errors and duplicate-send protection. No real email sent.');
