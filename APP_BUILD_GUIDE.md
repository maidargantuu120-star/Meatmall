# 📱 안드로이드 앱 빌드 가이드 (Capacitor)

이 문서는 기존 Cloudflare 기반 웹앱을 **Cloudflare 백엔드를 그대로 유지한 채**
안드로이드 앱으로 빌드/출시하는 방법을 정리합니다.

## 구조

```
[ 안드로이드 앱 (Capacitor) ] --HTTPS--> [ Cloudflare (Workers/D1/R2/Pages) ]
   └ React 프론트엔드 번들 탑재              └ 백엔드는 변경 없음
```

- 앱은 React 프론트엔드를 네이티브 껍데기로 감싼 것이며, API는 Cloudflare 도메인을 호출합니다.
- 웹 버전(Cloudflare Pages)은 기존과 동일하게 운영됩니다.

---

## 1. 사전 준비 (최초 1회)

1. **Android Studio 설치** — https://developer.android.com/studio
   - 설치 시 JDK, Android SDK가 함께 설치됩니다.
2. (선택) Google Play 개발자 계정 등록 — $25 (1회)

## 2. 운영 도메인 설정

`.env.capacitor` 파일의 `VITE_API_BASE_URL`을 실제 Cloudflare 운영 도메인으로 변경하세요.

```
VITE_API_BASE_URL=https://<실제-도메인>.pages.dev
```

> 네이티브 앱은 상대경로(`/api`)를 쓸 수 없으므로 절대 URL이 필수입니다.

## 3. Cloudflare 백엔드 재배포 (중요)

앱 로그인이 동작하려면 인증 쿠키가 cross-site로 전송되어야 합니다.
`worker/api/auth.ts`의 쿠키 설정을 `SameSite=None; Secure`로 변경해 두었으니,
**Cloudflare에 한 번 재배포**해야 적용됩니다.

```bash
npm run build      # 웹 + worker 빌드
npx wrangler pages deploy dist/public   # (실제 배포 명령은 기존 워크플로우에 맞게)
```

## 4. 앱 빌드 & 실행

```bash
# 프론트엔드를 앱 모드로 빌드 + 안드로이드 프로젝트에 동기화 + Android Studio 열기
npm run app:open
```

또는 단계별로:

```bash
npm run build:app          # vite build --mode capacitor
npx cap sync android       # 빌드 결과를 네이티브 프로젝트에 복사
npx cap open android       # Android Studio에서 열기
```

Android Studio가 열리면:
- **Run ▶** 버튼으로 에뮬레이터/실기기에서 테스트
- **Build > Generate Signed Bundle / APK** 로 출시용 AAB 생성

---

## 5. 출시 전 체크리스트

- [ ] `.env.capacitor`의 도메인을 실제 운영 도메인으로 변경
- [ ] Cloudflare에 쿠키 변경(worker) 재배포
- [ ] 앱 아이콘 / 스플래시 교체 (현재 기본 아이콘 — `@capacitor/assets` 사용 권장)
- [ ] `capacitor.config.ts`의 `appId`(mn.elbeg.meat) 최종 확정 — **출시 후 변경 불가**
- [ ] 앱 로그인/주문/결제(Stripe) 실기기 테스트
- [ ] 개인정보처리방침 URL 준비 (스토어 등록 필수)
- [ ] 스토어용 스크린샷, 설명, 아이콘(512px) 준비
- [ ] 서명 키(keystore) 생성 및 안전하게 보관

## 6. 보안 주의 (별도)

저장소에 `.env`, `cookies.txt`, `login.json` 등 민감 파일이 커밋되어 있습니다.
출시 전 키 교체 및 git 기록 정리를 권장합니다.

## 7. 인증 구조 (앱)

앱은 쿠키 대신 **토큰 인증**을 쓴다 (origin `https://localhost` → `arvijix.kr` cross-site).
- 로그인 응답의 토큰을 localStorage에 저장, 모든 API 요청에 `Authorization: Bearer` + `X-Client: capacitor` 헤더 첨부.
- 서버는 `X-Client: capacitor`면 쿠키를 무시하고 토큰만 사용 → 로그아웃이 확실히 동작.
- 웹(Cloudflare Pages)은 기존 쿠키 방식 그대로.

### 구글 로그인 (네이티브, 딥링크)

구글은 WebView 안 OAuth를 차단하므로, 시스템 브라우저(Custom Tabs)로 로그인 후
딥링크 `mn.elbeg.meat://auth?token=...` 로 앱에 복귀한다. 기존 구글 OAuth 클라이언트를
재사용하므로 Google Cloud Console 추가 설정은 불필요.

> ⚠️ **android/ 는 .gitignore 처리됨.** 만약 `npx cap add android`로 네이티브 프로젝트를
> 다시 생성하면 아래 딥링크 intent-filter를 `android/app/src/main/AndroidManifest.xml`의
> `.MainActivity` 안에 다시 넣어야 한다:
>
> ```xml
> <intent-filter>
>     <action android:name="android.intent.action.VIEW" />
>     <category android:name="android.intent.category.DEFAULT" />
>     <category android:name="android.intent.category.BROWSABLE" />
>     <data android:scheme="mn.elbeg.meat" />
> </intent-filter>
> ```

### 아이콘 / 스플래시 (브랜드 색 #3c8fb8)

로고가 흰색이라 배경을 브랜드 청록색(#3c8fb8)으로 둬야 보인다. 재생성 명령:

```bash
npx @capacitor/assets generate --android \
  --iconBackgroundColor "#3c8fb8" --iconBackgroundColorDark "#3c8fb8" \
  --splashBackgroundColor "#3c8fb8" --splashBackgroundColorDark "#3c8fb8"
```

> ⚠️ android/ 재생성 시 `android/app/src/main/res/values/styles.xml`의
> `AppTheme.NoActionBarLaunch`에 Android 12+ 스플래시 배경을 다시 넣어야 한다:
>
> ```xml
> <item name="windowSplashScreenBackground">#3c8fb8</item>
> <item name="android:windowSplashScreenBackground">#3c8fb8</item>
> <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
> ```
