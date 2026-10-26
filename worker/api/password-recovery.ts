import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../types';
import type { UserWithNullablePhone } from '@shared/schema';
import { passwordRecoveryRequestSchema, passwordRecoveryResetSchema, recoveryTokenSchema } from '../../shared/password-recovery';
import { ADMIN_PASSWORD_PREFIX, hashPassword } from '../utils';
import { deliverPasswordRecovery, ensureRecoveryTables, recoveryDigest, recoveryEmailConfigured, recoveryLimit } from '../password-recovery';

const app = new Hono<{ Bindings: Bindings; Variables: { user: UserWithNullablePhone | null } }>();
const requestGuard = createMiddleware(async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  if (c.req.method !== 'GET') {
    if (c.req.header('Origin') !== new URL(c.req.url).origin || c.req.header('Sec-Fetch-Site') === 'cross-site') return c.json({ message: 'Origin not allowed' }, 403);
    if (c.req.header('Content-Type')?.split(';')[0].trim() !== 'application/json') return c.json({ message: 'JSON request required' }, 415);
  }
  await next();
});
app.use('/admin/password-recovery/*', requestGuard);
const invalid = 'Холбоос хүчингүй эсвэл хугацаа дууссан байна. Шинэ холбоос авна уу.';

app.get('/admin/password-recovery/status', c => c.json({ configured: recoveryEmailConfigured(c.env) }));
app.post('/admin/password-recovery/request', async c => {
  const parsed = passwordRecoveryRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ message: 'И-мэйл хаягаа зөв оруулна уу.' }, 400);
  if (!recoveryEmailConfigured(c.env)) return c.json({ code: 'RECOVERY_UNAVAILABLE', message: 'Нууц үг сэргээх имэйлийн үйлчилгээ хараахан холбогдоогүй байна. Дэлгүүрийн эзэмшигчтэй холбогдоно уу.' }, 503);
  await ensureRecoveryTables(c.env.DB);
  if (!await recoveryLimit(c.env, 'request-ip', c.req.header('CF-Connecting-IP') || 'local', 10)) return c.json({ message: 'Хэт олон хүсэлт ирлээ. 15 минутын дараа дахин оролдоно уу.' }, 429);
  const allowed = await recoveryLimit(c.env, 'request-email', parsed.data.email, 3);
  if (allowed) c.executionCtx.waitUntil(deliverPasswordRecovery(c.env, parsed.data.email, c.req.url));
  return c.json({ message: 'Энэ и-мэйл админ бүртгэлтэй бол сэргээх холбоос илгээнэ. Ирсэн имэйл болон spam хавтсаа шалгана уу.' }, 202);
});

type ResetRow = { id: string; user_id: number; email: string; password_fingerprint: string; expires_at: number; password: string; current_email: string };
async function findReset(env: Bindings, token: string): Promise<ResetRow | null> {
  await ensureRecoveryTables(env.DB);
  const row = await env.DB.prepare(`SELECT r.id, r.user_id, r.email, r.password_fingerprint, r.expires_at,
    u.password, u.email AS current_email FROM admin_password_resets r JOIN users u ON u.id = r.user_id AND u.is_admin = 1
    WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ? AND r.delivery_status <> 'failed'`)
    .bind(await recoveryDigest(token), Date.now()).first<ResetRow>();
  if (!row || row.email !== row.current_email.toLowerCase() || row.password_fingerprint !== await recoveryDigest(row.password)) return null;
  return row;
}
app.post('/admin/password-recovery/inspect', async c => {
  const body = await c.req.json().catch(() => null);
  if (!recoveryTokenSchema.safeParse(body?.token).success) return c.json({ message: invalid }, 400);
  await ensureRecoveryTables(c.env.DB);
  if (!await recoveryLimit(c.env, 'token-ip', c.req.header('CF-Connecting-IP') || 'local', 30)) return c.json({ message: 'Хэт олон хүсэлт ирлээ. Түр хүлээгээд оролдоно уу.' }, 429);
  const row = await findReset(c.env, body.token);
  if (!row) return c.json({ message: invalid }, 400);
  return c.json({ email: row.email, expiresAt: row.expires_at });
});
app.post('/admin/password-recovery/reset', async c => {
  const parsed = passwordRecoveryResetSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ message: 'Шинэ нууц үгээ шалгана уу. 12–128 тэмдэгттэй, давтан оруулсан нууц үгтэй ижил байна.' }, 400);
  await ensureRecoveryTables(c.env.DB);
  if (!await recoveryLimit(c.env, 'token-ip', c.req.header('CF-Connecting-IP') || 'local', 30)) return c.json({ message: 'Хэт олон хүсэлт ирлээ. Түр хүлээгээд оролдоно уу.' }, 429);
  const row = await findReset(c.env, parsed.data.token);
  if (!row) return c.json({ message: invalid }, 400);
  const newHash = ADMIN_PASSWORD_PREFIX + await hashPassword(parsed.data.newPassword);
  const now = Date.now();
  // Both writes commit together. A replay/concurrent claim, demotion, email change
  // or password change cannot overwrite the account or consume a different reset.
  const results = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET password = ? WHERE id = ? AND password = ? AND is_admin = 1 AND lower(email) = ?
      AND EXISTS (SELECT 1 FROM admin_password_resets WHERE id = ? AND used_at IS NULL AND expires_at > ? AND delivery_status <> 'failed')`)
      .bind(newHash, row.user_id, row.password, row.email, row.id, now),
    c.env.DB.prepare(`UPDATE admin_password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL
      AND EXISTS (SELECT 1 FROM users WHERE id = ? AND password = ?)`)
      .bind(now, row.user_id, row.user_id, newHash),
  ]);
  if (results[0].meta.changes !== 1) return c.json({ message: invalid }, 409);
  // No automatic sign-in and no new session token. The hash-bound session scheme
  // rejects every earlier cookie/bearer token, including bootstrap-password access.
  return c.json({ success: true });
});
export default app;
