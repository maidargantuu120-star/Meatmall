import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

  const test = () =>
    run(async () => {
      await sendTestPush();
      toast({ title: t.push.testSent });
    });

  const on = state === "on";
  // The switch only works where the browser can still ask for (or drop) permission
  const canToggle = on || state === "off" || state === "error" || state === "unconfigured";
  const toggle = (checked: boolean) => run(checked ? enablePush : async () => disablePush());

  return (
    <div
      className={cn("rounded-2xl border border-ink/10 bg-white p-3.5 text-ink shadow-card sm:p-4", className)}
      data-testid="push-card"
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand sm:h-11 sm:w-11">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p id="push-card-title" className="font-display text-base font-extrabold">{t.push.title}</p>
          <p className="mt-0.5 truncate text-xs leading-snug text-ink/60 sm:text-[13px]">{t.push.short}</p>
        </div>
        <Switch
          checked={on}
          onCheckedChange={toggle}
          disabled={busy || !canToggle}
          aria-labelledby="push-card-title"
          className="data-[state=unchecked]:bg-ink/15"
          data-testid="push-toggle"
        />
      </div>

      {on && (
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="ml-14 mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 transition-colors hover:text-brand disabled:opacity-60"
          data-testid="push-test"
        >
          <BellRing className="h-3.5 w-3.5" />
          {t.push.test}
        </button>
      )}

      {state === "needs-install" && (
        <div className="ml-14 mt-2 text-xs leading-relaxed text-ink/60">
          <p className="font-semibold text-ink/80">{t.push.needsInstall}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>{t.install.iosShare}</li>
            <li>{t.install.iosAdd}</li>
            <li>{t.install.iosConfirm}</li>
          </ol>
        </div>
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
