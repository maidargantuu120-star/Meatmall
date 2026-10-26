import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { containsInlineImage } from './media';
import { Bindings } from './types';
import { authMiddleware } from './middleware';
import { D1Storage } from './storage';
import { getDb } from './db';
import { SITE_ORIGIN } from '../shared/seo';
import { createSitemap, rewritePageSeo } from './seo';

import authApp from './api/auth';
import productsApp from './api/products';
import shopApp from './api/shop';
import ordersApp from './api/orders';
import cmsApp from './api/cms';
import pushApp from './api/push';
import adminInvitationsApp from './api/admin-invitations';
import passwordRecoveryApp from './api/password-recovery';

import { IStorage } from './storage';

type Env = {
    Bindings: Bindings;
    Variables: {
        storage: IStorage;
    };
};

const app = new Hono<Env>();

// Consolidate public www URLs before storage/auth middleware. API calls keep
// their original origin so existing sessions and native clients still work.
app.use('*', async (c, next) => {
    const url = new URL(c.req.url);
    if (url.hostname === 'www.meatmall.kr'
        && ['GET', 'HEAD'].includes(c.req.method)
        && !/^\/api(?:\/|$)/.test(url.pathname)) {
        return c.redirect(SITE_ORIGIN + url.pathname + url.search, 301);
    }
    await next();
});

// Global middleware
app.use('*', async (c, next) => {
    // We need to initialize storage here to have access to DB and BUCKET from env
    if (!c.get('storage')) {
        const db = getDb(c.env.DB);
        // Cast BUCKET to any to avoid type mismatch between different R2Bucket definitions
        const storage = new D1Storage(db, c.env.BUCKET as any);
        c.set('storage', storage);
    }
    await next();
});

// Global middleware
const requestLogger = logger();
app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth/google') || c.req.path.startsWith('/api/admin/password-recovery/')) {
        c.header('Cache-Control', 'no-store');
        c.header('Referrer-Policy', 'no-referrer');
        await next(); // Authentication/recovery codes and request details must not appear in logs.
    } else {
        await requestLogger(c, next);
    }
});
app.use('*', cors({
    origin: (origin, c) => {
        const allowed = [new URL(c.req.url).origin, c.env.BASE_URL, 'https://localhost', 'capacitor://localhost'];
        return allowed.includes(origin) ? origin : '';
    },
    credentials: true,
}));
app.use('/api/*', async (c, next) => {
    if (!c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32) {
        return c.json({ message: 'Session configuration is required' }, 503);
    }
    const origin = c.req.header('Origin');
    const allowed = [new URL(c.req.url).origin, c.env.BASE_URL, 'https://localhost', 'capacitor://localhost'];
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && origin && !allowed.includes(origin)) {
        return c.json({ message: 'Origin not allowed' }, 403);
    }
    await next();
});
app.use('/api/*', authMiddleware);
app.use('/api/*', async (c, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
        const contentType = c.req.header('content-type') || '';
        const body = contentType.includes('application/json')
            ? await c.req.json().catch(() => null)
            : contentType.includes('multipart/form-data') ? await c.req.parseBody() : null;
        if (containsInlineImage(body)) {
            return c.json({ message: 'Inline images are not allowed. Upload a WebP file and save its URL.' }, 400);
        }
    }
    await next();
});

// Routes
app.get('/sitemap.xml', async (c) => {
    try {
        const sitemap = await createSitemap(c.get('storage'));
        return c.body(sitemap, 200, {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        });
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        // Never return a misleading empty/partial sitemap when the DB is down.
        return c.text('Sitemap temporarily unavailable', 503, { 'Retry-After': '300' });
    }
});

app.route('/api', authApp);
app.route('/api/products', productsApp);
app.route('/api', shopApp); // shopApp mounts at root of /api (e.g. /api/categories)
app.route('/api', ordersApp); // ordersApp mounts at root of /api
app.route('/api', cmsApp); // cmsApp mounts at root of /api
app.route('/api', pushApp); // /api/push/*
app.route('/api', adminInvitationsApp);
app.route('/api', passwordRecoveryApp);

app.get('/uploads/*', async (c) => {
    try {
        const key = c.req.path.replace(/^\/uploads\//, '');
        // Decode URI component to handle spaces and special characters
        const decodedKey = decodeURIComponent(key);

        const object = await c.env.BUCKET.get(decodedKey);

        if (!object) {
            return c.text('Object Not Found', 404);
        }

        const headers = new Headers();
        // @ts-ignore - Headers type mismatch between DOM and Workers types
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        // Add Cache-Control for long-term caching (1 year, immutable)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        // Ensure CORS headers are also present on direct R2 responses
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

        return new Response(object.body as any, {
            headers,
        });
    } catch (e) {
        console.error('Error serving file:', e);
        return c.text('Internal Server Error', 500);
    }
});

app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    console.error('Global Error Handler:', err);
    return c.json({
        success: false,
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
});

// Serve static assets (React App)
app.get('*', async (c) => {
    const response = await c.env.ASSETS.fetch(c.req.raw);
    const html = response.headers.get('Content-Type')?.includes('text/html');
    // Pages' SPA fallback must never masquerade as a missing JavaScript chunk.
    if (c.req.path.startsWith('/assets/') && (html || response.status >= 400)) {
        return c.text('Asset not found', 404, { 'Cache-Control': 'no-store' });
    }
    const result = rewritePageSeo(response, c.req.path);
    if (html || ['/sw.js', '/app-recovery.js', '/manifest.webmanifest'].includes(c.req.path)) {
        const headers = new Headers(result.headers);
        headers.set('Cache-Control', 'no-store');
        headers.set('CDN-Cache-Control', 'no-store');
        return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
    }
    return result;
});

export default app;
