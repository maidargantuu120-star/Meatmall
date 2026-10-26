import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { SITE_ORIGIN } from '../shared/seo';

const COOKIE_NAME = 'google_oauth_state';
const COOKIE_PATH = '/api/auth/google';
const TTL_MS = 10 * 60 * 1000;

type GoogleOAuthState = {
  nonce: string;
  client: 'web' | 'app';
  expiresAt: number;
  redirectUri: string;
};

export function googleAuthOrigin(requestUrl: string): string {
  const url = new URL(requestUrl);
  return ['localhost', '127.0.0.1'].includes(url.hostname) ? url.origin : SITE_ORIGIN;
}

export async function beginGoogleOAuth(c: Context, secret: string): Promise<GoogleOAuthState> {
  const state: GoogleOAuthState = {
    nonce: crypto.randomUUID(),
    client: c.req.query('client') === 'app' ? 'app' : 'web',
    expiresAt: Date.now() + TTL_MS,
    redirectUri: `${googleAuthOrigin(c.req.url)}/api/auth/google/callback`,
  };
  await setSignedCookie(c, COOKIE_NAME, JSON.stringify(state), secret, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: c.req.url.startsWith('https:'),
    sameSite: 'Lax',
    maxAge: TTL_MS / 1000,
  });
  return state;
}

// The callback is bound to the browser that initiated login. Never trust the
// incoming state parameter to choose an app deep link or establish a session.
export async function consumeGoogleOAuth(c: Context, secret: string): Promise<GoogleOAuthState | null> {
  const cookie = await getSignedCookie(c, secret, COOKIE_NAME);
  deleteCookie(c, COOKIE_NAME, { path: COOKIE_PATH, secure: c.req.url.startsWith('https:') });
  if (!cookie) return null;
  try {
    const state = JSON.parse(cookie) as GoogleOAuthState;
    if (!state.nonce || state.nonce !== c.req.query('state')
      || !Number.isFinite(state.expiresAt) || state.expiresAt < Date.now()
      || state.expiresAt > Date.now() + TTL_MS
      || !['app', 'web'].includes(state.client)
      || state.redirectUri !== `${new URL(c.req.url).origin}/api/auth/google/callback`) return null;
    return state;
  } catch {
    return null;
  }
}
