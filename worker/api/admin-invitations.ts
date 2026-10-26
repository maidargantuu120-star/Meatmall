import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../types';
import type { UserWithNullablePhone } from '@shared/schema';
import { requireAdmin } from '../middleware';
import { ADMIN_PASSWORD_PREFIX, hashPassword } from '../utils';
import { adminActivationSchema, adminInvitationSchema } from '../../shared/admin-invitation';

const app = new Hono<{ Bindings: Bindings; Variables: { user: UserWithNullablePhone | null } }>();
const table = `CREATE TABLE IF NOT EXISTS admin_invitations (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  used_at INTEGER, revoked_at INTEGER, created_at INTEGER NOT NULL
)`;
const validToken = (token: unknown): token is string => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
async function digest(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
const invitationRequest = createMiddleware(async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  if (c.req.method !== 'GET' && (c.req.header('Origin') !== new URL(c.req.url).origin || c.req.header('Sec-Fetch-Site') === 'cross-site')) {
    return c.json({ message: 'Origin not allowed' }, 403);
  }
  if (c.req.method !== 'GET' && c.req.header('Content-Type')?.split(';')[0].trim() !== 'application/json') {
    return c.json({ message: 'JSON request required' }, 415);
  }
  await next();
});
app.use('/admin/invitations', invitationRequest);
app.use('/admin/invitations/*', invitationRequest);

app.get('/admin/invitations', requireAdmin, async c => {
  await c.env.DB.prepare(table).run();
  const { results } = await c.env.DB.prepare(
    `SELECT id, email, expires_at AS expiresAt, used_at AS usedAt, revoked_at AS revokedAt
     FROM admin_invitations WHERE created_by = ? ORDER BY created_at DESC LIMIT 30`,
  ).bind(c.get('user')!.id).all();
  return c.json(results);
});

app.post('/admin/invitations', requireAdmin, async c => {
  const parsed = adminInvitationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ message: 'И-мэйл хаягаа зөв оруулна уу.' }, 400);
  const { email } = parsed.data;
  if (await c.env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?').bind(email).first()) {
    return c.json({ message: 'Энэ и-мэйл бүртгэлтэй байна. Өөр хаяг ашиглах эсвэл админтай холбогдоно уу.' }, 409);
  }
  await c.env.DB.prepare(table).run();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;
  const actor = c.get('user')!.id;
  // Replacing an invitation immediately revokes older unused links for this address.
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE admin_invitations SET revoked_at = ? WHERE email = ? AND used_at IS NULL AND revoked_at IS NULL').bind(now, email),
    c.env.DB.prepare('INSERT INTO admin_invitations (id, email, token_hash, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, email, await digest(token), actor, expiresAt, now),
  ]);
  return c.json({ id, email, expiresAt, url: `${new URL(c.req.url).origin}/admin/activate#token=${token}` }, 201);
});

app.post('/admin/invitations/:id/revoke', requireAdmin, async c => {
  await c.env.DB.prepare(table).run();
  await c.env.DB.prepare('UPDATE admin_invitations SET revoked_at = ? WHERE id = ? AND created_by = ? AND used_at IS NULL')
    .bind(Date.now(), c.req.param('id'), c.get('user')!.id).run();
  return c.json({ success: true });
});

app.post('/admin/invitations/inspect', async c => {
  const body = await c.req.json().catch(() => null);
  if (!validToken(body?.token)) return c.json({ message: 'Урилгын холбоос хүчингүй эсвэл хугацаа дууссан байна.' }, 404);
  await c.env.DB.prepare(table).run();
  const invitation = await c.env.DB.prepare(
    `SELECT i.email, i.expires_at AS expiresAt FROM admin_invitations i
     JOIN users u ON u.id = i.created_by AND u.is_admin = 1
     WHERE i.token_hash = ? AND i.expires_at > ? AND i.used_at IS NULL AND i.revoked_at IS NULL`,
  ).bind(await digest(body.token), Date.now()).first();
  if (!invitation) return c.json({ message: 'Урилгын холбоос хүчингүй эсвэл хугацаа дууссан байна.' }, 404);
  return c.json(invitation);
});

app.post('/admin/invitations/accept', async c => {
  const parsed = adminActivationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ message: 'Нэр болон шинэ нууц үгээ шалгана уу.' }, 400);
  const { token, name, newPassword } = parsed.data;
  await c.env.DB.prepare(table).run();
  const tokenHash = await digest(token);
  const now = Date.now();
  // Unknown, expired and revoked tokens never reach the password hashing work.
  const valid = await c.env.DB.prepare(
    `SELECT i.email FROM admin_invitations i JOIN users u ON u.id = i.created_by AND u.is_admin = 1
     WHERE i.token_hash = ? AND i.expires_at > ? AND i.used_at IS NULL AND i.revoked_at IS NULL`,
  ).bind(tokenHash, now).first<{ email: string }>();
  if (!valid) return c.json({ message: 'Урилгын холбоос хүчингүй эсвэл хугацаа дууссан байна.' }, 404);
  const password = ADMIN_PASSWORD_PREFIX + await hashPassword(newPassword);
  const username = `operator_${crypto.randomUUID()}`;
  // D1 batch is transactional: concurrent claims cannot create two accounts or consume
  // a link without creating its account. Never overwrite/promote an existing member.
  const results = await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO users (username, email, password, name, is_admin, created_at)
      SELECT ?, i.email, ?, ?, 1, ? FROM admin_invitations i
      JOIN users u ON u.id = i.created_by AND u.is_admin = 1
      WHERE i.token_hash = ? AND i.expires_at > ? AND i.used_at IS NULL AND i.revoked_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = i.email)`)
      .bind(username, password, name, now, tokenHash, Date.now()),
    c.env.DB.prepare(`UPDATE admin_invitations SET used_at = ? WHERE token_hash = ?
      AND used_at IS NULL AND EXISTS (SELECT 1 FROM users WHERE username = ? AND password = ?)`)
      .bind(now, tokenHash, username, password),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
    return c.json({ message: 'Урилга ашиглагдсан эсвэл энэ и-мэйл бүртгэлтэй байна. Шинэ урилга авна уу.' }, 409);
  }
  return c.json({ success: true, email: valid.email }, 201);
});

export default app;
