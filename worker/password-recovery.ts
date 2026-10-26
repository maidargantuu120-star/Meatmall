import type { D1Database } from '@cloudflare/workers-types';
import type { Bindings } from './types';
import { SITE_ORIGIN } from '../shared/seo';

export const RECOVERY_TTL_MS = 15 * 60 * 1000;
const ready = new WeakSet<D1Database>();
export async function ensureRecoveryTables(db: D1Database) {
  if (ready.has(db)) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_password_resets (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, email TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE, password_fingerprint TEXT NOT NULL,
      expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'pending'
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_recovery_limits (
      key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL
    )`),
  ]);
  ready.add(db);
}
export async function recoveryDigest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function recoveryLimit(env: Bindings, scope: string, identifier: string, limit: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / RECOVERY_TTL_MS) * RECOVERY_TTL_MS;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(scope + '|' + identifier));
  const rateKey = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
  const result = await env.DB.prepare(`INSERT INTO admin_recovery_limits (key, window_start, hits) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start,
      hits = CASE WHEN admin_recovery_limits.window_start = excluded.window_start THEN admin_recovery_limits.hits + 1 ELSE 1 END
    RETURNING hits`).bind(rateKey, windowStart).first<{ hits: number }>();
  return !!result && result.hits <= limit;
}
export function recoverySender(env: Bindings) {
  return env.PASSWORD_RESET_EMAIL_FROM || env.ORDER_EMAIL_FROM;
}
export function recoveryEmailConfigured(env: Bindings) {
  return !!(env.BREVO_API_KEY && recoverySender(env));
}
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Runs after the generic response, so account existence never changes the HTTP result
// or makes the public request wait for the mail provider. Tokens only leave in email.
export async function deliverPasswordRecovery(env: Bindings, email: string, requestUrl: string): Promise<void> {
  try {
    const { results } = await env.DB.prepare('SELECT id, email, password FROM users WHERE lower(email) = ? AND is_admin = 1 LIMIT 2')
      .bind(email).all<{ id: number; email: string; password: string }>();
    if (results.length !== 1) return; // Never reset a member or an ambiguous legacy email.
    const user = results[0];
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_password_resets WHERE expires_at < ?').bind(now - 24 * 60 * 60 * 1000),
      env.DB.prepare('DELETE FROM admin_recovery_limits WHERE window_start < ?').bind(now - 24 * 60 * 60 * 1000),
      env.DB.prepare('UPDATE admin_password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').bind(now, user.id),
      env.DB.prepare(`INSERT INTO admin_password_resets (id, user_id, email, token_hash, password_fingerprint, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, email, await recoveryDigest(token), await recoveryDigest(user.password), now + RECOVERY_TTL_MS, now),
    ]);
    const requestOrigin = new URL(requestUrl);
    const origin = ['127.0.0.1', 'localhost'].includes(requestOrigin.hostname) ? requestOrigin.origin : SITE_ORIGIN;
    const link = origin + '/admin/reset-password#token=' + token;
    const subject = 'Meat Mall · Админы нууц үг сэргээх';
    const text = `Meat Mall\n\nАдмины нууц үг сэргээх хүсэлт ирлээ.\n\nШинэ нууц үг тохируулах: ${link}\n\nХолбоос 15 минутын хугацаатай, нэг удаа ашиглагдана. Нууц үг солигдсоны дараа бүх төхөөрөмж дээр дахин нэвтэрнэ.\n\nТа энэ хүсэлтийг гаргаагүй бол холбоосыг нээхгүйгээр энэ имэйлийг үл тооно уу. Одоогийн нууц үг өөрчлөгдөхгүй.`;
    const html = `<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;color:#161616"><div style="max-width:520px;margin:auto;background:white;padding:28px;border-radius:16px"><h1 style="font-size:24px">Meat Mall</h1><h2 style="font-size:20px">Админы нууц үг сэргээх</h2><p>Шинэ нууц үгээ тохируулахын тулд доорх товчийг дарна уу.</p><p style="margin:28px 0"><a href="${escape(link)}" rel="noreferrer" style="background:#e4002b;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Шинэ нууц үг тохируулах</a></p><p>Холбоос <b>15 минутын хугацаатай, нэг удаа</b> ашиглагдана. Нууц үг солигдсоны дараа бүх төхөөрөмж дээр дахин нэвтэрнэ.</p><p style="color:#666;font-size:13px">Та энэ хүсэлтийг гаргаагүй бол энэ имэйлийг үл тооно уу. Одоогийн нууц үг өөрчлөгдөхгүй.</p></div></body></html>`;
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: { name: 'Meat Mall', email: recoverySender(env) }, to: [{ email: user.email }],
          subject, htmlContent: html, textContent: text, tags: ['admin-password-reset'] }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        await env.DB.prepare("UPDATE admin_password_resets SET delivery_status = 'failed', used_at = ? WHERE id = ?").bind(Date.now(), id).run();
        console.error('Password recovery email rejected', response.status);
        return;
      }
      await env.DB.prepare("UPDATE admin_password_resets SET delivery_status = 'sent' WHERE id = ?").bind(id).run();
    } catch {
      // An accepted email may still arrive after a timeout; its token remains usable
      // until expiry. Do not blindly retry or log the link/provider response body.
      await env.DB.prepare("UPDATE admin_password_resets SET delivery_status = 'uncertain' WHERE id = ?").bind(id).run();
      console.error('Password recovery email delivery uncertain');
    }
  } catch {
    console.error('Password recovery could not be prepared');
  }
}

