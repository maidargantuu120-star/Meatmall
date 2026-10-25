// 네이티브 앱 로그인 토큰 저장/조회.
//
// 앱(origin https://localhost)은 cross-site 쿠키가 막혀 세션 유지가 안 되므로,
// 로그인 시 받은 토큰을 저장하고 Authorization: Bearer 헤더로 보낸다.
// VITE_API_BASE_URL이 설정된 앱 빌드에서만 동작하고, 웹 빌드에서는 no-op(쿠키 사용).

const STORAGE_KEY = "auth_token";

// 앱 빌드 여부 (api-base.ts와 동일한 신호 사용)
export const usingTokenAuth = !!import.meta.env.VITE_API_BASE_URL;

export function getAuthToken(): string | null {
  if (!usingTokenAuth) return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null | undefined): void {
  if (!usingTokenAuth) return;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}
