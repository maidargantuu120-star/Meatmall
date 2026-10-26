import { apiRequest } from "@/lib/queryClient";

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on" | "unconfigured" | "error";
export const PUSH_STATE_EVENT = "meatmall-push-state";
const OPT_OUT_KEY = "meatmall-push-disabled";
const isNativeBuild = !!import.meta.env.VITE_API_BASE_URL;
let connecting: Promise<PushState> | null = null;

function availableState(): PushState | null {
  if (isNativeBuild) return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return null;
}

function optedOut() {
  try { return localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; }
}

function setOptOut(disabled: boolean) {
  try {
    if (disabled) localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch { /* Storage may be unavailable in private browsing. */ }
}

function publish(state: PushState) {
  window.dispatchEvent(new CustomEvent(PUSH_STATE_EVENT, { detail: state }));
  return state;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  const unavailable = availableState();
  if (unavailable) return unavailable;
  if (optedOut() || Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

async function activeRegistration() {
  // Subscribe only on the active worker, not the installing registration.
  await navigator.serviceWorker.register("/sw.js");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Service worker not ready")), 15000); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function connect(): Promise<PushState> {
  if (connecting) return connecting;
  connecting = (async () => {
    const { publicKey } = await apiRequest("GET", "/api/push/public-key");
    if (!publicKey) return publish("unconfigured");
    const registration = await activeRegistration();
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    });
    await apiRequest("POST", "/api/push/subscribe", { subscription: subscription.toJSON() });
    return publish("on");
  })();
  try { return await connecting; }
  catch (error) { publish("error"); throw error; }
  finally { connecting = null; }
}

// Keep requestPermission in the original click handler's synchronous call stack.
// Awaiting getSubscription() first loses Safari's required user activation.
export async function enablePush(): Promise<PushState> {
  const unavailable = availableState();
  if (unavailable) return publish(unavailable);
  const permission = Notification.permission === "granted"
    ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return publish(permission === "denied" ? "denied" : "off");
  setOptOut(false);
  return connect();
}

export async function disablePush(): Promise<PushState> {
  const unavailable = availableState();
  if (unavailable) return publish(unavailable);
  // Prevent a page load/focus from automatically undoing an explicit opt-out.
  if (connecting) await connecting.catch(() => {});
  const subscription = await currentSubscription();
  if (subscription) {
    await apiRequest("POST", "/api/push/unsubscribe", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
  setOptOut(true);
  return publish("off");
}

// Already granted permission needs no extra button press. Never prompt on load.
export async function syncPushSubscription(): Promise<PushState> {
  const unavailable = availableState();
  if (unavailable) return publish(unavailable);
  if (optedOut() || Notification.permission !== "granted") return publish("off");
  return connect();
}

export function sendTestPush() {
  return apiRequest("POST", "/api/push/test");
}
