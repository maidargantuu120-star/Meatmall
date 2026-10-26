import { D1Database, R2Bucket } from '@cloudflare/workers-types';

export type Bindings = {
    DB: D1Database;
    BUCKET: R2Bucket;
    SESSION_SECRET: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    BASE_URL?: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
    BREVO_API_KEY?: string;
    ORDER_EMAIL_FROM?: string;
    ORDER_EMAIL_REPLY_TO?: string;
    PASSWORD_RESET_EMAIL_FROM?: string;
    // "true" only in local .env: enables POST /api/dev/login (test user, no Google). Never set in Cloudflare.
    DEV_LOGIN?: string;
    // Web Push (VAPID). Push is silently off when any of these is missing.
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
    ASSETS: Fetcher;
};
