// 네이티브 앱에서 상대경로 API 호출을 운영 도메인으로 보내는 전역 fetch 래퍼.
// 다른 모듈이 fetch를 쓰기 전에 가장 먼저 설치되어야 하므로 최상단에서 import.
import "./lib/api-base";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { CartProvider } from "@/hooks/use-cart";

import { ErrorBoundary } from "./components/ui/error-boundary";

// Service worker makes the web site installable. Skipped in the Capacitor app build
// (VITE_API_BASE_URL is only set there), which is already a native app.
if ("serviceWorker" in navigator && !import.meta.env.VITE_API_BASE_URL) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'MEATMALL_ORDER_UPDATE') return;
    // A received push immediately refreshes the shared new-order query (and MP3 watcher).
    void queryClient.invalidateQueries({ queryKey: ['/api/orders/pending-count'], exact: true });
    void queryClient.invalidateQueries({ queryKey: ['/api/orders'], exact: true });
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <App />
      </CartProvider>
    </QueryClientProvider>
  </ErrorBoundary>,
);
