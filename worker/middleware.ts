import { createMiddleware } from 'hono/factory';
import { getSignedCookie } from 'hono/cookie';
import { verifyToken } from './token';
import { Bindings } from './types';
import { User, UserWithNullablePhone } from '@shared/schema';
import { IStorage } from './storage';
// import { getDb } from './db';
// import { D1Storage } from './storage';

type Env = {
    Bindings: Bindings;
    Variables: {
        user: UserWithNullablePhone | null;
        storage: IStorage; // Use Interface instead of concrete class
    };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
    // Storage is already initialized in worker/index.ts
    const storage = c.get('storage');

    if (!storage) {
        console.error("Storage not initialized in middleware");
        c.set('user', null);
        await next();
        return;
    }

    const sessionSecret = c.env.SESSION_SECRET || 'gerinmah-secret-key';

    // 네이티브 앱은 X-Client: capacitor 헤더를 보낸다. 이 경우 토큰만 신뢰하고 쿠키는 무시한다.
    // (앱은 cross-site 쿠키 삭제가 불안정하므로, 로그아웃 시 토큰만 지우면 확실히 로그아웃되도록)
    const isAppClient = c.req.header('X-Client') === 'capacitor';

    let userId: number | null = null;

    // 1) 네이티브 앱/웹 공통: Authorization: Bearer <token>
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = await verifyToken(authHeader.slice(7), sessionSecret);
    }

    // 2) 웹: 서명된 세션 쿠키 (폴백). 앱(isAppClient)에서는 쿠키 무시.
    if (userId === null && !isAppClient) {
        const userIdCookie = await getSignedCookie(c, sessionSecret, 'auth_user_id');
        if (userIdCookie) {
            const parsed = parseInt(userIdCookie);
            if (!isNaN(parsed)) userId = parsed;
        }
    }

    if (userId !== null) {
        const user = await storage.getUser(userId);
        if (user) {
            c.set('user', user as UserWithNullablePhone);
            await next();
            return;
        }
    }

    // No authenticated user
    c.set('user', null);
    await next();
});

export const requireAuth = createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: "Үйлдлийг гүйцэтгэхийн тулд нэвтрэх шаардлагатай" }, 401);
    }
    await next();
});

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: "Үйлдлийг гүйцэтгэхийн тулд нэвтрэх шаардлагатай" }, 401);
    }

    if (!user.isAdmin) {
        return c.json({ message: "Зөвхөн админ хандах боломжтой" }, 403);
    }

    await next();
});
