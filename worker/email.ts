import type { Bindings } from './types';
import type { OrderEmailReceipt } from '../shared/order-email';
import { orderNo, won } from './push';
import { ensureOrderEmailStore } from './order-email-store';
import { packQuantityText } from '../shared/pack';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
// "₩50,000 × 3 кг", or for pack products "₩120,000 × 2 багц (8 кг)"
const quantityLine = (item: OrderEmailReceipt['items'][number]) =>
  `${won(item.price)} × ${packQuantityText(item.quantity, item.packKg ?? 1)}`;
const SUPPORT = 'meatmall2021@naver.com';

export function renderOrderEmail(id: number, receipt: OrderEmailReceipt, origin: string, supportEmail = SUPPORT) {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid site origin');
  const number = orderNo(id);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.placedAt));
  const account = receipt.paymentAccount;
  const paymentInstruction = account
    ? `Доорх дансанд нийт ${won(receipt.totalAmount)} шилжүүлнэ үү.`
    : 'Төлбөр шилжүүлэхээс өмнө дэлгүүртэй холбогдож дансны мэдээллээ авна уу.';
  const payment = account
    ? `<p style="margin:0 0 8px;font-size:18px;font-weight:bold">${escape(account.bankName)}</p><p style="margin:0 0 8px;font-size:22px;font-weight:bold;letter-spacing:1px">${escape(account.accountNumber)}</p><p style="margin:0">Данс эзэмшигч: ${escape(account.accountHolder)}</p>`
    : '<p>Дансны мэдээллийг авахын тулд дэлгүүртэй холбогдоно уу.</p>';
  const rows = receipt.items.map(item => `<tr><td style="padding:12px 0;border-bottom:1px solid #eee"><b>${escape(item.name)}</b><br><span style="font-size:12px;color:#777">${escape(quantityLine(item))}</span></td><td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${escape(won(item.amount))}</td></tr>`).join('');
  const subject = `Meat Mall ${number} — Захиалга хүлээн авлаа`;
  const shippingDetail = receipt.shippingRegion === 'jeju' && receipt.shippingBaseFee !== undefined && receipt.shippingSurcharge !== undefined
    ? `Үндсэн хүргэлт ${won(receipt.shippingBaseFee)} + Чэжү (제주) ${won(receipt.shippingSurcharge)} = ${won(receipt.shippingFee)}` : '';
  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f4f3f1;font-family:Arial,Helvetica,sans-serif;color:#161616"><div style="display:none;max-height:0;overflow:hidden">${escape(number)} · Нийт ${escape(won(receipt.totalAmount))} · Шилжүүлэг хийх дансны мэдээлэл</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:white;border-radius:16px"><tr><td style="padding:28px 24px">
  <p style="text-align:center;margin:0"><img src="${escape(new URL('/icons/icon-192.png', base).href)}" width="110" alt="Meat Mall" style="max-width:110px;height:auto"></p>
  <h1 style="text-align:center;font-size:24px;margin:16px 0 8px">Захиалга хүлээн авлаа</h1><p style="text-align:center;color:#777;margin:0 0 24px">Дансаар шилжүүлэг · Төлбөр хүлээгдэж байна</p>
  <table width="100%" role="presentation"><tr><td style="font-size:12px">Meat Mall<br>${escape(number)}</td><td style="font-size:12px;text-align:right">T: 010-8082-9929<br>${escape(date)} (KST)</td></tr></table>
  <div style="border-top:2px dashed #ddd;border-bottom:2px dashed #ddd;text-align:center;margin:20px 0;padding:20px 0"><h2 style="margin:0;font-size:24px">${escape(receipt.customerName)}</h2><p style="margin:6px 0 0;color:#777">${escape(number)}</p></div>
  <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${rows}</table>
  <table width="100%" role="presentation" style="margin:16px 0;font-size:14px"><tr><td style="padding:5px 0">Бүтээгдэхүүний дүн</td><td align="right">${escape(won(receipt.subtotal))}</td></tr><tr><td style="padding:5px 0">Хүргэлтийн төлбөр</td><td align="right">${escape(won(receipt.shippingFee))}</td></tr><tr><td style="padding-top:14px;font-size:20px;font-weight:bold">Нийт төлөх</td><td align="right" style="padding-top:14px;font-size:24px;font-weight:bold;color:#e4002b">${escape(won(receipt.totalAmount))}</td></tr></table>
  ${shippingDetail ? `<p style="font-size:12px;color:#777">${escape(shippingDetail)}</p>` : ''}
  <div style="margin-top:24px;padding:20px;border-radius:12px;background:#fff1f3;border:1px solid #ffd6dd"><h2 style="margin:0 0 12px;font-size:18px">Төлбөр шилжүүлэх данс</h2><p style="margin:0 0 16px;line-height:1.6">${escape(paymentInstruction)}</p>${payment}<p style="margin:16px 0 0;font-size:13px">Шилжүүлэх дүн: <b>${escape(won(receipt.totalAmount))}</b><br>Шилжүүлэгчийн нэр: <b>${escape(receipt.transferAccountHolder)}</b><br>Гүйлгээний утга: <b>${escape(number)}</b></p></div>
  <p style="font-size:13px;line-height:1.6;color:#555">Төлбөрөө шилжүүлсний дараа захиалгыг баталгаажуулж бэлтгэнэ. Энэ имэйл нь төлбөр төлөгдсөнийг батлах баримт биш болно.</p>
  <div style="border-top:2px dashed #ddd;padding-top:18px;font-size:14px;line-height:1.7"><b>Хүргэлтийн мэдээлэл</b><br>${escape(receipt.customerName)} · ${escape(receipt.customerPhone)}<br>${escape(receipt.customerAddress).replace(/\n/g, '<br>')}</div>
  <p style="text-align:center;margin:24px 0"><a href="${escape(new URL('/my-page', base).href)}" style="display:inline-block;padding:14px 22px;background:#161616;border-radius:8px;color:white;text-decoration:none;font-weight:bold">Миний захиалгууд</a></p>
  <p style="text-align:center;font-size:12px;color:#777;line-height:1.7">Асуух зүйл байвал энэ имэйлд хариу илгээнэ үү.<br><a href="mailto:${escape(supportEmail)}" style="color:#777">${escape(supportEmail)}</a><br>Meat Mall · 010-8082-9929</p>
  </td></tr></table></td></tr></table></body></html>`;
  const text = `${subject}\n${receipt.customerName}\n${date} (KST)\n\n${receipt.items.map(i => `${i.name} · ${quantityLine(i)} · ${won(i.amount)}`).join('\n')}\nБүтээгдэхүүн: ${won(receipt.subtotal)}\nХүргэлт: ${won(receipt.shippingFee)}\nНийт төлөх: ${won(receipt.totalAmount)}\n\n${paymentInstruction}\nТөлбөр шилжүүлэх данс:\n${account ? `${account.bankName}\n${account.accountNumber}\nДанс эзэмшигч: ${account.accountHolder}` : 'Дансны мэдээллийг дэлгүүрээс авна уу.'}\nШилжүүлэгчийн нэр: ${receipt.transferAccountHolder}\nГүйлгээний утга: ${number}\n\nХаяг: ${receipt.customerAddress}\nУтас: ${receipt.customerPhone}\nТөлбөр төлөгдсөнийг батлах баримт биш болно.\n${supportEmail}`;
  return { subject, html, text: shippingDetail ? text + '\n' + shippingDetail : text };
}

export function emailConfigured(env: Bindings) {
  return !!(env.BREVO_API_KEY && env.ORDER_EMAIL_FROM);
}

/** Claim once. An ambiguous network failure is held for review, never blindly resent. */
export async function deliverOrderEmail(env: Bindings, orderId: number) {
  if (!emailConfigured(env)) return { status: 'not_configured' };
  await ensureOrderEmailStore(env.DB);
  const now = Date.now();
  const row = await env.DB.prepare(`UPDATE order_emails SET status='sending', attempts=attempts+1, locked_until=?, updated_at=?
    WHERE order_id=? AND status IN ('pending','failed') RETURNING payload`).bind(now + 60000, now, orderId).first<{ payload: string }>();
  if (!row) return { status: 'not_claimed' };
  let accepted = false;
  try {
    const receipt = JSON.parse(row.payload) as OrderEmailReceipt;
    const message = renderOrderEmail(orderId, receipt, env.BASE_URL || 'https://meatmall.kr', env.ORDER_EMAIL_REPLY_TO || SUPPORT);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Meat Mall', email: env.ORDER_EMAIL_FROM },
        replyTo: { name: 'Meat Mall', email: env.ORDER_EMAIL_REPLY_TO || SUPPORT },
        to: [{ email: receipt.customerEmail, name: receipt.customerName }],
        subject: message.subject, htmlContent: message.html, textContent: message.text,
        tags: ['order-confirmation'],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      await env.DB.prepare("UPDATE order_emails SET status='failed', last_error=?, locked_until=0, updated_at=? WHERE order_id=?")
        .bind(`Brevo HTTP ${response.status}`, Date.now(), orderId).run();
      return { status: 'failed' };
    }
    accepted = true;
    const result = await response.json() as { messageId?: string };
    await env.DB.prepare("UPDATE order_emails SET status='sent', provider_message_id=?, last_error=NULL, locked_until=0, updated_at=? WHERE order_id=?")
      .bind(result.messageId || null, Date.now(), orderId).run();
    return { status: 'sent' };
  } catch {
    await env.DB.prepare("UPDATE order_emails SET status='uncertain', last_error=?, updated_at=? WHERE order_id=?")
      .bind(accepted ? 'Provider accepted; confirm delivery in Brevo' : 'Delivery uncertain; check Brevo before retry', Date.now(), orderId).run();
    return { status: 'uncertain' };
  }
}
