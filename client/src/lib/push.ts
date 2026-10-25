import { apiRequest } from "@/lib/queryClient";

// Web Push on the website / home-screen app (server side: worker/push.ts).
// The Capacitor Android build would need FCM instead, so push is off there.

export type PushState =
  | "unsupported" // browser has no Web Push (or native app build)
  | "needs-install" // iPhone/iPad: push only works after "Add to Home Screen"
  | "denied" // the user blocked notifications in browser/OS settings
  | "off"
  | "on";

const isNativeBuild = !!import.meta.env.VITE_API_BASE_URL;

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hasPushApi() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (isNativeBuild) return "unsupported";
  // iOS Safari only exposes PushManager inside an installed home-screen app
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!hasPushApi()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

// Must be called from a tap/click: browsers only show the permission prompt for user gestures
export async function enablePush(): Promise<PushState> {
  const state = await getPushState();
  if (state === "unsupported" || state === "needs-install" || state === "denied") return state;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const { publicKey } = await apiRequest("GET", "/api/push/public-key");
  if (!publicKey) throw new Error("Push is not configured on the server");

  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    }));

  await apiRequest("POST", "/api/push/subscribe", { subscription: subscription.toJSON() });
  return "on";
}

export async function disablePush(): Promise<void> {
  if (isNativeBuild || !hasPushApi()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  // Server first (needs the login session), then the browser side
  await apiRequest("POST", "/api/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}

// Re-send the device to the server, e.g. after logging in as another account on the same phone
export async function syncPushSubscription(): Promise<void> {
  if ((await getPushState()) !== "on") return;
  const subscription = await currentSubscription();
  if (subscription) {
    await apiRequest("POST", "/api/push/subscribe", { subscription: subscription.toJSON() });
  }
}

export function sendTestPush() {
  return apiRequest("POST", "/api/push/test");
}
