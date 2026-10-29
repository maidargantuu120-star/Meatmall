import { Hono } from 'hono';
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from '../types';
import { UserWithNullablePhone } from '@shared/schema';
import { D1Storage, IStorage } from '../storage';
import { hashPassword, comparePasswords, ADMIN_PASSWORD_PREFIX, isManagedAdminPassword, sessionSigningSecret } from '../utils';
import { requireAdmin } from '../middleware';
import { adminPasswordChangeSchema } from '../../shared/admin-password';
import { signToken } from '../token';
import { beginGoogleOAuth, consumeGoogleOAuth, googleAuthOrigin } from '../google-oauth';
import { LOGIN_FAILED_MESSAGE, LOGIN_LOCKED_MESSAGE, loginAccountKey, loginLocked, recordLoginFailure } from '../login-limit';
// import { sendWelcomeEmail } from '../../server/email'; // Removed currently incompatible import
// validated: server/email uses nodemailer which uses 'net' etc. Might work with nodejs_compat.
// If it fails, we'll need to stub it or use an email service API (MailChannels is standard for Cloudflare).
// For now, I'll comment out email sending or stub it to avoid runtime errors if nodemailer fails.

type Env = {
    Bindings: Bindings;
    Variables: {
        user: UserWithNullablePhone | null;
        storage: IStorage;
    };
};

const app = new Hono<Env>();

const clientIp = (c: any): string => c.req.header('CF-Connecting-IP') || 'local';

// Input with "@" is an email first (new usernames cannot contain "@"); older usernames may still have one
async function findLoginUser(storage: IStorage, login: string) {
    if (login.includes('@')) return (await storage.getUserByEmail(login)) ?? (await storage.getUserByUsername(login));
    return storage.getUserByUsername(login);
}

// Helper to set session cookie
async function setUserSession(c: any, userId: number) {
    const user = await c.get('storage').getUser(userId);
    if (!user) throw new Error('Session user missing');
    const secret = sessionSigningSecret(c.env.SESSION_SECRET, user.password);
    const isSecure = c.req.url.startsWith("https://");
    // 네이티브 앱(origin https://localhost)에서 보낸 cross-site 요청에도 쿠키가 전송되도록
    // HTTPS에서는 SameSite=None을 사용. (None은 반드시 Secure 필요 → HTTPS 전제)
    // 로컬 개발(http)에서는 브라우저가 None+비Secure를 거부하므로 Lax로 폴백.
    const crossSite = isSecure ? 'None' : 'Lax';
    await setSignedCookie(c, 'auth_user_id', userId.toString(), secret, {
        path: '/',
        secure: isSecure, // Only secure in HTTPS
        domain: undefined,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: crossSite,
    });

    // Non-httpOnly cookie for frontend to know we're logged in (optional, matching existing behavior)
    const secureAttr = isSecure ? '; Secure' : '';
    c.header('Set-Cookie', `sessionActive=true; Path=/; Max-Age=${60 * 60 * 24}; SameSite=${crossSite}${secureAttr}`, { append: true });
}

app.post('/login', async (c) => {
    try {
        const storage = c.get('storage');
        const body = await c.req.json().catch(e => null); // Catch JSON parse errors

        if (!body) {
            return c.json({ success: false, message: "Invalid JSON body" }, 400);
        }

        const { username, password } = body;

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return c.json({ success: false, message: "Username and password are required" }, 400);
        }

        const ip = clientIp(c);
        const account = loginAccountKey(username);
        if (await loginLocked(c.env, ip, account)) {
            return c.json({ success: false, message: LOGIN_LOCKED_MESSAGE }, 429);
        }

        const user = await findLoginUser(storage, username);
        if (!user || !await comparePasswords(password, user.password)) {
            await recordLoginFailure(c.env, ip, account);
            return c.json({ success: false, message: LOGIN_FAILED_MESSAGE }, 401);
        }

        // Set session (cookie for web) + token (for native app)
        await setUserSession(c, user.id);
        const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, user.password));

        // Return user without password + auth token
        const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
        return c.json({ ...userWithoutPassword, token });
    } catch (error: any) {
        console.error('[Login] Unexpected error:', error);
        return c.json({ success: false, message: "Internal Server Error" }, 500);
    }
});

app.post('/admin/login', async (c) => {
    try {
        const storage = c.get('storage');
        const body = await c.req.json().catch(e => null);

        if (!body) {
            return c.json({ success: false, message: "Invalid JSON body" }, 400);
        }

        const { username, password } = body;

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return c.json({ success: false, message: "Username and password are required" }, 400);
        }

        const ip = clientIp(c);
        const account = loginAccountKey(username);
        if (await loginLocked(c.env, ip, account)) {
            return c.json({ success: false, message: LOGIN_LOCKED_MESSAGE }, 429);
        }

        // Admin accounts only: a member account never answers an admin sign-in
        let user = await storage.getAdminByLogin(username);

        const envAdminUsername = c.env.ADMIN_USERNAME || 'admin';
        // No built-in fallback password: without ADMIN_PASSWORD set, this shortcut is off
        const envAdminPassword = c.env.ADMIN_PASSWORD;

        const bootstrapMatches = envAdminPassword && username === envAdminUsername
            && password === envAdminPassword && (!user || (user.isAdmin && !isManagedAdminPassword(user.password)));
        if (bootstrapMatches) {
            // Environment variables matched!
            if (!user) {
                // Auto-create in DB if doesn't exist so session works
                const hashedPassword = await hashPassword(envAdminPassword);
                await c.env.DB.prepare(
                    "INSERT INTO users (username, email, password, is_admin, name, created_at) VALUES (?, ?, ?, 1, 'Admin', ?)"
                ).bind(username, 'maidargantuu120@gmail.com', hashedPassword, Date.now()).run();
                user = await storage.getUserByUsername(username);
                if (!user) {
                    return c.json({ success: false, message: "Could not create admin user" }, 500);
                }
            }
        } else if (!user || !await comparePasswords(password, user.password)) {
            await recordLoginFailure(c.env, ip, account);
            return c.json({ success: false, message: LOGIN_FAILED_MESSAGE }, 401);
        }

        // Set session (cookie for web) + token (for native app)
        await setUserSession(c, user.id);
        const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, user.password));

        // Return user without password + auth token
        const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
        return c.json({ ...userWithoutPassword, token });
    } catch (error: any) {
        console.error('[Admin Login] Unexpected error:', error);
        return c.json({ success: false, message: "Internal Server Error" }, 500);
    }
});

app.post('/admin/change-password', requireAdmin, async (c) => {
    c.header('Cache-Control', 'no-store');
    if (c.req.header('Origin') !== new URL(c.req.url).origin
        || c.req.header('Sec-Fetch-Site') === 'cross-site') {
        return c.json({ message: 'Origin not allowed' }, 403);
    }
    if (c.req.header('Content-Type')?.split(';')[0].trim() !== 'application/json') {
        return c.json({ message: 'JSON request required' }, 415);
    }
    const parsed = adminPasswordChangeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ message: 'Нууц үгийн мэдээллийг шалгана уу.', errors: parsed.error.flatten().fieldErrors }, 400);
    const user = c.get('user')!;
    const { currentPassword, newPassword } = parsed.data;
    const bootstrapMatches = !isManagedAdminPassword(user.password)
        && user.username === (c.env.ADMIN_USERNAME || 'admin')
        && !!c.env.ADMIN_PASSWORD && currentPassword === c.env.ADMIN_PASSWORD;
    if (!bootstrapMatches && !await comparePasswords(currentPassword, user.password)) {
        return c.json({ message: 'Одоогийн нууц үг буруу байна.' }, 400);
    }
    const newHash = ADMIN_PASSWORD_PREFIX + await hashPassword(newPassword);
    const result = await c.env.DB.prepare(
        'UPDATE users SET password = ? WHERE id = ? AND password = ? AND is_admin = 1',
    ).bind(newHash, user.id, user.password).run();
    if (result.meta.changes !== 1) return c.json({ message: 'Мэдээлэл өөрчлөгдсөн байна. Дахин нэвтэрч оролдоно уу.' }, 409);
    // Preserve this browser's session; all older cookies and bearer tokens are
    // invalidated because managed admin sessions are bound to the password hash.
    await setUserSession(c, user.id);
    const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, newHash));
    return c.json({ success: true, token });
});

app.get('/admin/check-auth', (c) => {
    const user = c.get('user');
    if (user && user.isAdmin) {
        const { password: _, ...safeUser } = user;
        return c.json({ authenticated: true, user: safeUser });
    }
    return c.json({ authenticated: false }, 401);
});


app.post('/register', async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();

    // Basic validation
    if (!body.username || !body.email || !body.password) {
        return c.json({ success: false, message: "Required fields missing" }, 400);
    }

    // Usernames may repeat (they double as display names), but "@" is reserved for email
    // sign-in and the admin's username is reserved, so no member can shadow the admin login
    const username = String(body.username).trim();
    if (username.includes('@')) {
        return c.json({ success: false, message: "Хэрэглэгчийн нэрэнд @ тэмдэг ашиглах боломжгүй" }, 400);
    }
    if (username.toLowerCase() === (c.env.ADMIN_USERNAME || 'admin').toLowerCase()) {
        return c.json({ success: false, message: "Энэ хэрэглэгчийн нэрийг ашиглах боломжгүй" }, 400);
    }

    // Check existence
    // Username uniqueness check removed to allow duplicate names
    // const existingUser = await storage.getUserByUsername(body.username);
    // if (existingUser) {
    //     return c.json({ success: false, message: "Энэ хэрэглэгчийн нэр аль хэдийн бүртгэгдсэн байна" }, 400);
    // }

    const existingEmail = await storage.getUserByEmail(body.email);
    if (existingEmail) {
        return c.json({ success: false, message: "Энэ и-мэйл хаяг аль хэдийн бүртгэгдсэн байна" }, 400);
    }

    // Create user
    const hashedPassword = await hashPassword(body.password);
    const newUser = await storage.createUser({
        username,
        email: body.email,
        password: hashedPassword,
        name: body.name || "",
        phone: body.phone || null,
    });

    // Login (cookie for web) + token (for native app)
    await setUserSession(c, newUser.id);
    const token = await signToken(newUser.id, sessionSigningSecret(c.env.SESSION_SECRET, newUser.password));

    const { password: _, ...userWithoutPassword } = newUser as UserWithNullablePhone;

    // Send email (stubbed for now to prevent crash on Workers)
    // TODO: Implement Cloudflare-compatible email sending (e.g. MailChannels)
    console.log(`Welcome email would be sent to ${newUser.email}`);

    return c.json({
        success: true,
        user: userWithoutPassword,
        token,
        message: "Бүртгэл амжилттай үүсгэгдлээ"
    }, 201);
});

// --- Local development login ---
// Lets developers reach logged-in pages (e.g. My Page) without Google OAuth, which is
// registered to the production domain. Three guards keep it out of production:
// the DEV_LOGIN flag (local .env only), a localhost hostname, and no Cloudflare edge
// headers (production traffic and the public trycloudflare share link both carry them).
function isLocalDevRequest(c: any): boolean {
    if (c.env.DEV_LOGIN !== 'true') return false;
    const host = new URL(c.req.url).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return false;
    return !c.req.header('cf-ray') && !c.req.header('cf-connecting-ip');
}

const DEV_TEST_EMAIL = 'dev-test@meatmall.local';

app.post('/dev/login', async (c) => {
    if (!isLocalDevRequest(c)) {
        return c.json({ message: 'Not found' }, 404);
    }
    const storage = c.get('storage');

    let user = await storage.getUserByEmail(DEV_TEST_EMAIL);
    if (!user) {
        // Random password nobody knows: this account is only reachable through this route
        user = await storage.createUser({
            username: 'Dev Test',
            email: DEV_TEST_EMAIL,
            password: await hashPassword(crypto.randomUUID()),
            name: 'Dev Test',
            phone: '010-0000-0000',
        });
    }

    await setUserSession(c, user.id);
    const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, user.password));
    const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
    return c.json({ ...userWithoutPassword, token });
});

// Same guards as /dev/login: signs in a local admin so /admin can be developed without
// the production admin password.
const DEV_ADMIN_EMAIL = 'dev-maidargantuu120@gmail.com';

app.post('/dev/admin-login', async (c) => {
    if (!isLocalDevRequest(c)) {
        return c.json({ message: 'Not found' }, 404);
    }
    const storage = c.get('storage');

    let user = await storage.getUserByEmail(DEV_ADMIN_EMAIL);
    if (!user) {
        user = await storage.createUser({
            username: 'Dev Admin',
            email: DEV_ADMIN_EMAIL,
            password: await hashPassword(crypto.randomUUID()),
            name: 'Dev Admin',
            phone: '010-0000-0000',
        });
    }
    if (!user.isAdmin) {
        await c.env.DB.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(user.id).run();
        user.isAdmin = true;
    }

    await setUserSession(c, user.id);
    const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, user.password));
    const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
    return c.json({ ...userWithoutPassword, token });
});

// --- Google OAuth Implementation ---
app.get('/auth/google', async (c) => {
    // Redirect to Google's OAuth consent screen
    const clientId = c.env.GOOGLE_CLIENT_ID;
    if (!clientId || !c.env.GOOGLE_CLIENT_SECRET) {
        return c.json({ message: "Google Login is not configured." }, 501);
    }

    const origin = (new URL(c.req.url)).origin;
    const authOrigin = googleAuthOrigin(c.req.url);
    if (origin !== authOrigin) {
        const startUrl = new URL('/api/auth/google', authOrigin);
        if (c.req.query('client') === 'app') startUrl.searchParams.set('client', 'app');
        return c.redirect(startUrl.toString());
    }
    const state = await beginGoogleOAuth(c, c.env.SESSION_SECRET);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', state.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'online');
    authUrl.searchParams.append('prompt', 'select_account');
    authUrl.searchParams.append('state', state.nonce);

    return c.redirect(authUrl.toString());
});

app.get('/auth/google/callback', async (c) => {
    const state = await consumeGoogleOAuth(c, c.env.SESSION_SECRET);
    if (!state) return c.redirect('/auth?error=invalid_oauth_state');
    const isApp = state.client === 'app';
    const APP_SCHEME = 'mn.elbeg.meat';
    const fail = (reason: string) =>
        isApp
            ? c.redirect(`${APP_SCHEME}://auth?error=${encodeURIComponent(reason)}`)
            : c.redirect(`/auth?error=${reason}`);

    try {
        const code = c.req.query('code');
        const error = c.req.query('error');

        if (error || !code) {
            console.error("Google OAuth error or no code:", error);
            return fail('google_failed');
        }

        const clientId = c.env.GOOGLE_CLIENT_ID;
        const clientSecret = c.env.GOOGLE_CLIENT_SECRET;

        const redirectUri = state.redirectUri;

        // 1. Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId || '',
                client_secret: clientSecret || '',
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        if (!tokenResponse.ok) {
            console.error("Failed to exchange Google token:", tokenResponse.status);
            return fail('token_exchange_failed');
        }

        const tokenData = await tokenResponse.json() as any;

        // 2. Get user profile from Google
        const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            console.error("Failed to fetch Google profile:", userResponse.status);
            return fail('profile_fetch_failed');
        }

        const profile = await userResponse.json() as any;
        const email = profile.email;
        const googleId = profile.sub;
        const name = profile.name;
        // profile_image is not directly saved in our DB schema currently, but available as profile.picture

        if (typeof email !== 'string' || !email || typeof googleId !== 'string'
            || !googleId || profile.email_verified !== true) {
            return fail('verified_email_required');
        }

        const storage = c.get('storage');

        // 3. User Resolution (Login or Register)
        let user = await storage.getUserByGoogleId(googleId);

        if (!user) {
            user = await storage.getUserByEmail(email);

            if (user) {
                if (user.googleId && user.googleId !== googleId) return fail('google_account_mismatch');
                // Link account
                user = await storage.updateUserGoogleId(user.id, googleId);
            } else {
                // Register new user
                const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);

                // create random password hash
                const randomPasswordHash = await hashPassword(crypto.randomUUID());

                const newUser = await storage.createUser({
                    username,
                    email,
                    password: randomPasswordHash,
                    name: name || '',
                    phone: null,
                });
                // update google id on the new user
                user = await storage.updateUserGoogleId(newUser.id, googleId);
            }
        }

        // 4. Create Session
        if (user) {
            await setUserSession(c, user.id);
            if (isApp) {
                // 앱: 토큰을 딥링크로 전달 → 앱이 받아서 저장
                const token = await signToken(user.id, sessionSigningSecret(c.env.SESSION_SECRET, user.password));
                return c.redirect(`${APP_SCHEME}://auth?token=${encodeURIComponent(token)}`);
            }
            // Redirect to home or callback page on success
            return c.redirect('/');
        } else {
            return fail('user_creation_failed');
        }

    } catch (e: any) {
        console.error("Error in Google Auth Callback:", e);
        return fail('internal_auth_error');
    }
});

app.post('/logout', async (c) => {
    // 쿠키 삭제는 설정 시와 같은 속성(SameSite=None; Secure)을 맞춰야
    // cross-site 환경(앱 origin localhost → arvijix.kr)의 WebView가 삭제용 쿠키를 받아들인다.
    // (Hono deleteCookie는 sameSite를 안 붙여 Lax로 거부되므로 Set-Cookie를 직접 작성)
    const isSecure = c.req.url.startsWith('https://');
    const sameSite = isSecure ? 'None' : 'Lax';
    const secureAttr = isSecure ? '; Secure' : '';
    const expired = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    c.header('Set-Cookie', `auth_user_id=; Path=/; ${expired}; HttpOnly; SameSite=${sameSite}${secureAttr}`, { append: true });
    c.header('Set-Cookie', `sessionActive=; Path=/; ${expired}; SameSite=${sameSite}${secureAttr}`, { append: true });
    // Also clear legacy cookies just in case
    c.header('Set-Cookie', `gerinmah.sid=; Path=/; ${expired}; SameSite=${sameSite}${secureAttr}`, { append: true });

    return c.json({ success: true, message: "Амжилттай гарлаа" });
});

app.get('/user', (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json(null);
    }
    const { password: _, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword);
});

// Get user orders (Ported from server/auth.ts routes that were mixed in)
// Initial Admin Setup Endpoint
// Was open to anyone (any account could be made admin): now local development only,
// with the same guards as /dev/login, and the password must be given explicitly.
app.get('/setup-admin', async (c) => {
    if (!isLocalDevRequest(c)) {
        return c.json({ message: 'Not found' }, 404);
    }
    try {
        const storage = c.get('storage');
        const email = c.req.query('email') || 'maidargantuu120@gmail.com';
        const username = c.req.query('username') || 'admin';
        const password = c.req.query('password');
        if (!password) {
            return c.json({ success: false, message: 'password query parameter is required' }, 400);
        }

        // 1. Check if user exists
        let user = await storage.getUserByEmail(email);
        if (!user) {
            user = await storage.getUserByUsername(username);
        }

        const hashedPassword = await hashPassword(password);

        let result;
        if (user) {
            // Update existing user to be admin and set password
            result = await c.env.DB.prepare(
                "UPDATE users SET password = ?, is_admin = 1 WHERE id = ?"
            ).bind(hashedPassword, user.id).run();
        } else {
            // Create new admin user
            result = await c.env.DB.prepare(
                "INSERT INTO users (username, email, password, is_admin, name, created_at) VALUES (?, ?, ?, 1, 'Admin', ?)"
            ).bind(username, email, hashedPassword, Date.now()).run();
        }

        return c.json({
            success: true,
            message: user ? "Admin Updated" : "Admin Created",
            credentials: {
                username,
                email,
                password: password // meaningful only if they used the default
            }
        });
    } catch (err: any) {
        return c.json({ error: err.message, stack: err.stack }, 500);
    }
});

app.get('/user/orders', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: "Захиалгын түүхийг харахын тулд нэвтрэх шаардлагатай" }, 401);
    }

    const storage = c.get('storage');
    const orders = await storage.getUserOrders(user.id);
    return c.json(orders);
});

app.get('/user/orders/page', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    c.header('Cache-Control', 'no-store');
    const beforeId = c.req.query('before') ? Number(c.req.query('before')) : undefined;
    if (beforeId !== undefined && (!Number.isSafeInteger(beforeId) || beforeId < 1)) return c.json({ message: 'Invalid cursor' }, 400);
    const rows = await c.get('storage').getOrdersWithItems(undefined, undefined, { userId: user.id, limit: 21, beforeId });
    return c.json({ orders: rows.slice(0, 20), nextBeforeId: rows.length > 20 ? rows[19].id : null });
});

export default app;
