import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  disablePush,
  enablePush,
  getPushState,
  sendTestPush,
  syncPushSubscription,
  PUSH_STATE_EVENT,
  type PushState,
} from "@/lib/push";
import { cn } from "@/lib/utils";

// Shared state hook: current push state for this device + busy flag
export function usePushState() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const update = (event: Event) => setState((event as CustomEvent<PushState>).detail);
    window.addEventListener(PUSH_STATE_EVENT, update);
    (user?.id ? syncPushSubscription() : getPushState())
      .then((next) => alive && setState(next))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
      window.removeEventListener(PUSH_STATE_EVENT, update);
    };
  }, [user?.id]);

  const run = async (task: () => Promise<PushState | void>) => {
    setBusy(true);
    try {
      const next = await task();
      setState(next ?? (await getPushState()));
    } catch {
      toast({ title: t.push.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, run };
}

// My Page card: lets a customer get order status notifications on this phone
export function PushCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { state, busy, run } = usePushState();

  if (state === null || (state === "unsupported" && import.meta.env.VITE_API_BASE_URL)) return null;

  const turnOn = () => run(enablePush);

  const test = () =>
    run(async () => {
      await sendTestPush();
      toast({ title: t.push.testSent });
    });

  const on = state === "on";

  return (
    <div
      className={cn("rounded-2xl border border-ink/10 bg-white p-4 text-ink shadow-card", className)}
      data-testid="push-card"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            on ? "bg-brand text-white" : "bg-ink/5 text-ink/60",
          )}
        >
          {on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-extrabold">{t.push.title}</p>
            {on && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                {t.push.on}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{t.push.desc}</p>
        </div>
      </div>

      {(state === "off" || state === "error" || state === "unconfigured") && (
        <>
          <p className="mt-3 text-xs leading-relaxed text-ink/60" role="status">
            {state === "unconfigured" ? t.push.unconfigured : state === "error" ? t.push.error : t.push.permissionNote}
          </p>
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand font-display text-sm font-extrabold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
            data-testid="push-enable"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {state === "off" ? t.push.turnOn : t.push.retry}
          </button>
        </>
      )}

      {on && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/15 text-xs font-semibold hover:border-ink/40 disabled:opacity-60"
            data-testid="push-test"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            {t.push.test}
          </button>
          <button
            type="button"
            onClick={() => run(async () => disablePush())}
            disabled={busy}
            className="flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-ink/50 hover:text-brand disabled:opacity-60"
            data-testid="push-disable"
          >
            <BellOff className="h-4 w-4" />
            {t.push.turnOff}
          </button>
        </div>
      )}

      {state === "needs-install" && (
        <div className="mt-3 rounded-xl bg-surface p-3 text-xs leading-relaxed text-ink/70">
          <p className="font-semibold text-ink">{t.push.needsInstall}</p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
            <li>{t.install.iosShare}</li>
            <li>{t.install.iosAdd}</li>
            <li>{t.install.iosConfirm}</li>
          </ol>
        </div>
      )}

      {state === "denied" && (
        <p className="mt-3 rounded-xl bg-brand/5 p-3 text-xs font-semibold text-brand">{t.push.denied}</p>
      )}

      {state === "unsupported" && (
        <p className="mt-3 rounded-xl bg-surface p-3 text-xs text-ink/60">{t.push.unsupported}</p>
      )}
    </div>
  );
}

// Mounted once in App: when a different account logs in on this phone, move the device to it
export function PushSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const sync = () => { void syncPushSubscription().catch(() => {}); };
    const visible = () => { if (document.visibilityState === "visible") sync(); };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("appinstalled", sync);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("appinstalled", sync);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [user?.id]);
  return null;
}
