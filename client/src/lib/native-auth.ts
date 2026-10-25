// 네이티브 앱 구글 로그인 (시스템 브라우저 + 딥링크 복귀).
//
// 구글은 WebView 안의 OAuth를 차단하므로, 시스템 브라우저(Custom Tabs)로 로그인하고
// 서버 콜백이 발급한 토큰을 딥링크(mn.elbeg.meat://auth?token=...)로 앱에 돌려준다.
// 웹에서는 기존 리다이렉트 방식을 그대로 쓴다.

import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { usingTokenAuth, setAuthToken } from "./auth-token";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// 구글 로그인 시작
export async function loginWithGoogle(): Promise<void> {
  if (usingTokenAuth) {
    // 앱: 시스템 브라우저로 구글 로그인 (?client=app → 콜백이 딥링크로 복귀)
    await Browser.open({ url: `${API_BASE}/api/auth/google?client=app` });
  } else {
    // 웹: 기존 방식
    window.location.href = "/api/auth/google";
  }
}

// 딥링크 수신 핸들러 설치 (앱 전용). 토큰을 저장하고 onSuccess 콜백 호출.
export function installAuthDeepLinkHandler(
  onSuccess: () => void,
  onError?: (reason: string) => void,
): () => void {
  if (!usingTokenAuth) return () => {};

  const listenerPromise = CapApp.addListener("appUrlOpen", async ({ url }) => {
    // 우리 인증 딥링크만 처리
    if (!url || url.indexOf("://auth") === -1) return;
    try {
      const query = url.split("?")[1] || "";
      const params = new URLSearchParams(query);
      const token = params.get("token");
      const error = params.get("error");

      await Browser.close().catch(() => {});

      if (token) {
        setAuthToken(token);
        onSuccess();
      } else if (error && onError) {
        onError(error);
      }
    } catch {
      /* ignore malformed deep links */
    }
  });

  return () => {
    listenerPromise.then((h) => h.remove()).catch(() => {});
  };
}
