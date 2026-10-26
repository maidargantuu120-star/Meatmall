import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import type { D1Database } from '@cloudflare/workers-types';
import type { Bindings } from './types';

// Web Push for the installed web app (Add to Home Screen) and normal browsers.
// Subscriptions live in their own table so the drizzle schema stays untouched.

export type PushNotice = {
    title: string;
    body: string;
    url: string; // opened when the notification is tapped
    tag?: string; // same tag replaces the previous notification instead of stacking
};

type SubscriptionRow = { id: number; endpoint: string; p256dh: string; auth: string };

// Created lazily so a fresh database (local or Cloudflare) works without a manual migration
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
)`;

const readyTables = new WeakSet<D1Database>();
async function ensureTable(db: D1Database) {
    if (readyTables.has(db)) return;
    await db.prepare(CREATE_TABLE).run();
    readyTables.add(db);
}

export function pushConfigured(env: Bindings): boolean {
    return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export async function saveSubscription(
    env: Bindings,
    user: { id: number; isAdmin: boolean },
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
    await ensureTable(env.DB);
    // One row per device; a device that logs in as someone else moves to that account
    await env.DB.prepare(
        `INSERT INTO push_subscriptions (user_id, is_admin, endpoint, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
            user_id = excluded.user_id, is_admin = excluded.is_admin,
            p256dh = excluded.p256dh, auth = excluded.auth`,
    ).bind(user.id, user.isAdmin ? 1 : 0, sub.endpoint, sub.keys.p256dh, sub.keys.auth, Date.now()).run();
}

export async function deleteSubscription(env: Bindings, endpoint: string, userId: number) {
    await ensureTable(env.DB);
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
        .bind(endpoint, userId).run();
}

async function sendToRows(env: Bindings, rows: SubscriptionRow[], notice: PushNotice) {
    const vapid = {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
    };
    const delivered = await Promise.all(rows.map(async (row) => {
        const subscription: PushSubscription = {
            endpoint: row.endpoint,
            expirationTime: null,
            keys: { p256dh: row.p256dh, auth: row.auth },
        };
        try {
            const payload = await buildPushPayload(
                { data: notice, options: { ttl: 60 * 60 * 24, urgency: 'high' } },
                subscription,
                vapid,
            );
            const res = await fetch(row.endpoint, payload);
            // Gone / not found: the user revoked permission or reinstalled - forget the device
            if (res.status === 404 || res.status === 410) {
                await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(row.id).run();
            } else if (!res.ok) {
                console.error('Push rejected', res.status);
            }
            return res.ok;
        } catch (error) {
            console.error('Push failed', error instanceof Error ? error.name : 'Error');
            return false;
        }
    }));
    return { sent: delivered.filter(Boolean).length, total: rows.length };
}

// Never throws: a failed notification must not fail the order request that triggered it
export async function notifyUser(env: Bindings, userId: number, notice: PushNotice) {
    if (!pushConfigured(env)) return { sent: 0, total: 0 };
    try {
        await ensureTable(env.DB);
        const { results } = await env.DB.prepare(
            'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
        ).bind(userId).all<SubscriptionRow>();
        return await sendToRows(env, results, notice);
    } catch (error) {
        console.error('notifyUser failed', error);
        return { sent: 0, total: 0 };
    }
}

export async function notifyAdmins(env: Bindings, notice: PushNotice) {
    if (!pushConfigured(env)) return;
    try {
        await ensureTable(env.DB);
        const { results } = await env.DB.prepare(
            'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE is_admin = 1',
        ).all<SubscriptionRow>();
        await sendToRows(env, results, notice);
    } catch (error) {
        console.error('notifyAdmins failed', error);
    }
}

// Same formats as the client (lib/utils formatOrderId / formatPrice)
export const orderNo = (id: number) => `#ORD-${id.toString().padStart(4, '0')}`;
export const won = (amount: number) => '₩' + amount.toLocaleString('ko-KR');

// Customer-facing message per order status; pending has none (they get "received" on checkout)
export const STATUS_NOTICES: Record<string, { title: string; body: string }> = {
    processing: {
        title: 'Төлбөр баталгаажлаа ✅',
        body: 'Таны захиалгыг бэлтгэж эхэллээ.',
    },
    completed: {
        title: 'Захиалга хүргэгдлээ 🚚',
        body: 'Шинэхэн махаа хөргөгчиндөө хадгалаарай. Дахин захиалаарай!',
    },
    cancelled: {
        title: 'Захиалга цуцлагдлаа',
        body: 'Асуух зүйл байвал бидэнтэй холбогдоно уу.',
    },
};
