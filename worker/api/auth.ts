import { Hono } from 'hono';
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from '../types';
import { UserWithNullablePhone } from '@shared/schema';
import { D1Storage, IStorage } from '../storage';
import { hashPassword, comparePasswords } from '../utils';
import { signToken } from '../token';
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

// Helper to set session cookie
async function setUserSession(c: any, userId: number) {
    const secret = c.env.SESSION_SECRET || 'gerinmah-secret-key';
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

        console.log(`[Login] Attempt for username: ${username}`);

        if (!username || !password) {
            return c.json({ success: false, message: "Username and password are required" }, 400);
        }

        // Find user
        let user = await storage.getUserByUsername(username);
        if (!user && username.includes('@')) {
            user = await storage.getUserByEmail(username);
        }

        if (!user) {
            return c.json({ success: false, message: "User not found" }, 401);
        }

        // Verify password
        let isValid = false;
        try {
            isValid = await comparePasswords(password, user.password);
        } catch (e: any) {
            return c.json({
                success: false,
                message: "Password verification crashed",
                error: e.message
            }, 500);
        }

        if (!isValid) {
            return c.json({
                success: false,
                message: "Invalid password",
                debug: {
                    storedHashPrefix: user.password.substring(0, 15)
                }
            }, 401);
        }

        // Set session (cookie for web) + token (for native app)
        await setUserSession(c, user.id);
        const token = await signToken(user.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');

        // Return user without password + auth token
        const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
        return c.json({ ...userWithoutPassword, token });
    } catch (error: any) {
        console.error('[Login] Unexpected error:', error);
        return c.json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
            stack: error.stack
        }, 500);
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

        console.log(`[Admin Login] Attempt for username: ${username}`);

        if (!username || !password) {
            return c.json({ success: false, message: "Username and password are required" }, 400);
        }

        // Find user
        let user = await storage.getUserByUsername(username);
        if (!user && username.includes('@')) {
            user = await storage.getUserByEmail(username);
        }

        const envAdminUsername = c.env.ADMIN_USERNAME || 'admin';
        // No built-in fallback password: without ADMIN_PASSWORD set, this shortcut is off
        const envAdminPassword = c.env.ADMIN_PASSWORD;

        if (envAdminPassword && username === envAdminUsername && password === envAdminPassword) {
            // Environment variables matched!
            if (!user) {
                // Auto-create in DB if doesn't exist so session works
                const hashedPassword = await hashPassword(envAdminPassword);
                await c.env.DB.prepare(
                    "INSERT INTO users (username, email, password, is_admin, name, created_at) VALUES (?, ?, ?, 1, 'Admin', ?)"
                ).bind(username, 'admin@arvijix.kr', hashedPassword, new Date().toISOString()).run();
                user = await storage.getUserByUsername(username);
                if (!user) {
                    return c.json({ success: false, message: "Could not create admin user" }, 500);
                }
            } else if (!user.isAdmin) {
                // Ensure they are admin in DB
                await c.env.DB.prepare(
                    "UPDATE users SET is_admin = 1 WHERE id = ?"
                ).bind(user.id).run();
                user.isAdmin = true;
            }
        } else {
            if (!user) {
                return c.json({ success: false, message: "User not found" }, 401);
            }

            // Verify password
            let isValid = false;
            try {
                isValid = await comparePasswords(password, user.password);
            } catch (e: any) {
                return c.json({
                    success: false,
                    message: "Password verification crashed",
                    error: e.message
                }, 500);
            }

            if (!isValid) {
                return c.json({ success: false, message: "Invalid password" }, 401);
            }

            // Check Admin Status
            if (!user.isAdmin) {
                console.log(`[Admin Login] User ${username} is not an admin`);
                return c.json({ success: false, message: "Not authorized as admin" }, 403);
            }
        }

        // Set session (cookie for web) + token (for native app)
        await setUserSession(c, user.id);
        const token = await signToken(user.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');

        // Return user without password + auth token
        const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
        return c.json({ ...userWithoutPassword, token });
    } catch (error: any) {
        console.error('[Admin Login] Unexpected error:', error);
        return c.json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        }, 500);
    }
});

app.get('/admin/check-auth', (c) => {
    const user = c.get('user');
    if (user && user.isAdmin) {
        return c.json({ authenticated: true, user });
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
        username: body.username,
        email: body.email,
        password: hashedPassword,
        name: body.name || "",
        phone: body.phone || null,
    });

    // Login (cookie for web) + token (for native app)
    await setUserSession(c, newUser.id);
    const token = await signToken(newUser.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');

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
    const token = await signToken(user.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');
    const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
    return c.json({ ...userWithoutPassword, token });
});

// Same guards as /dev/login: signs in a local admin so /admin can be developed without
// the production admin password.
const DEV_ADMIN_EMAIL = 'dev-admin@meatmall.local';

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
    const token = await signToken(user.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');
    const { password: _, ...userWithoutPassword } = user as UserWithNullablePhone;
    return c.json({ ...userWithoutPassword, token });
});

// --- Google OAuth Implementation ---
app.get('/auth/google', (c) => {
    // Redirect to Google's OAuth consent screen
    const clientId = c.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return c.json({ message: "Google Login is not configured. Please provide GOOGLE_CLIENT_ID." }, 501);
    }

    // Usually domain is https://arvijix.kr for production
    const origin = (new URL(c.req.url)).origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 네이티브 앱은 ?client=app 으로 호출 → state로 전달해 콜백에서 딥링크로 복귀시킨다
    const client = c.req.query('client');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'email profile');
    authUrl.searchParams.append('access_type', 'online');
    authUrl.searchParams.append('prompt', 'select_account');
    authUrl.searchParams.append('state', client === 'app' ? 'app' : 'web');

    return c.redirect(authUrl.toString());
});

app.get('/auth/google/callback', async (c) => {
    // 앱 플로우 여부 (auth/google에서 넣은 state). 앱이면 결과를 딥링크로 돌려준다.
    const isApp = c.req.query('state') === 'app';
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

        // Origin for redirect URI mismatch check
        const origin = (new URL(c.req.url)).origin;
        const redirectUri = `${origin}/api/auth/google/callback`;

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
            const errBody = await tokenResponse.text();
            console.error("Failed to exchange token:", tokenResponse.status, errBody);
            return fail('token_exchange_failed');
        }

        const tokenData = await tokenResponse.json() as any;

        // 2. Get user profile from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            console.error("Failed to fetch user profile:", await userResponse.text());
            return fail('profile_fetch_failed');
        }

        const profile = await userResponse.json() as any;
        const email = profile.email;
        const googleId = profile.id;
        const name = profile.name;
        // profile_image is not directly saved in our DB schema currently, but available as profile.picture

        if (!email) {
            return fail('no_email_provided');
        }

        const storage = c.get('storage');

        // 3. User Resolution (Login or Register)
        let user = await storage.getUserByGoogleId(googleId);

        if (!user) {
            user = await storage.getUserByEmail(email);

            if (user) {
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
                const token = await signToken(user.id, c.env.SESSION_SECRET || 'gerinmah-secret-key');
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
        const email = c.req.query('email') || 'admin@example.com';
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
            ).bind(username, email, hashedPassword, new Date().toISOString()).run();
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

export default app;
