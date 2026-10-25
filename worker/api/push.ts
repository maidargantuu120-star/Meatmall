import { Hono } from 'hono';
import { Bindings } from '../types';
import { requireAuth } from '../middleware';
import { UserWithNullablePhone } from '@shared/schema';
import { IStorage } from '../storage';
import { deleteSubscription, notifyUser, pushConfigured, saveSubscription } from '../push';

type Env = {
    Bindings: Bindings;
    Variables: {
        user: UserWithNullablePhone | null;
        storage: IStorage;
    };
};

const app = new Hono<Env>();

// Public key the browser needs for PushManager.subscribe(); null when push is not set up
app.get('/push/public-key', (c) => {
    return c.json({ publicKey: pushConfigured(c.env) ? c.env.VAPID_PUBLIC_KEY : null });
});

app.post('/push/subscribe', requireAuth, async (c) => {
    if (!pushConfigured(c.env)) return c.json({ message: 'Push is not configured' }, 503);
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => null);
    const sub = body?.subscription;
    const valid =
        typeof sub?.endpoint === 'string' && sub.endpoint.startsWith('https://') &&
        typeof sub?.keys?.p256dh === 'string' && typeof sub?.keys?.auth === 'string';
    if (!valid) return c.json({ message: 'Invalid subscription' }, 400);

    await saveSubscription(c.env, { id: user.id, isAdmin: !!user.isAdmin }, sub);
    return c.json({ ok: true });
});

app.post('/push/unsubscribe', requireAuth, async (c) => {
    const user = c.get('user')!;
    const body = await c.req.json().catch(() => null);
    if (typeof body?.endpoint !== 'string') return c.json({ message: 'Invalid endpoint' }, 400);
    await deleteSubscription(c.env, body.endpoint, user.id);
    return c.json({ ok: true });
});

// "Send me a test" button: only ever reaches the caller's own devices
app.post('/push/test', requireAuth, async (c) => {
    const user = c.get('user')!;
    await notifyUser(c.env, user.id, {
        title: 'Meat Mall',
        body: 'Мэдэгдэл амжилттай идэвхжлээ 🔔',
        url: user.isAdmin ? '/admin' : '/my-page',
        tag: 'test',
    });
    return c.json({ ok: true });
});

export default app;
