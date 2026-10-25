import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️ appId는 스토어 등록 후에는 변경 불가능합니다. 최초 출시 전에 확정하세요.
  appId: 'mn.elbeg.meat',
  appName: 'Арвижих махны дэлгүүр',
  // Vite 빌드 결과물 위치 (vite.config.ts의 build.outDir과 동일)
  webDir: 'dist/public',
  server: {
    // https 스킴으로 실행 → secure context 확보 (Secure 쿠키, Stripe.js 등에 필요)
    androidScheme: 'https',
  },
  android: {
    // 일부 안드로이드 웹뷰에서 쿠키 혼합 차단 방지
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // 네이티브 스플래시 → 앱 로딩 사이 배경을 브랜드 색으로 (흰 화면 깜빡임 방지)
      backgroundColor: "#3c8fb8",
      launchAutoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
