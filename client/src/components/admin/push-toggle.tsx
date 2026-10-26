import { BellRing, BellOff, Loader2 } from "lucide-react";
import { usePushState } from "@/components/push-card";
import { disablePush, enablePush } from "@/lib/push";
import { cn } from "@/lib/utils";

const HINTS: Record<string, string> = {
  "needs-install": "iPhone: эхлээд нүүр дэлгэц рүү нэмнэ үү",
  denied: "Утасны тохиргооноос мэдэгдэл зөвшөөрнө үү",
  unsupported: "Энэ хөтөч дэмжихгүй",
  unconfigured: "Мэдэгдлийн серверийн тохиргоо хийгдээгүй байна",
  error: "Холболт амжилтгүй. Дахин дарж оролдоно уу",
};

// Push on/off for the admin sidebar: new orders arrive on this phone even when the page is closed
export function AdminPushToggle() {
  const { state, busy, run } = usePushState();

  if (state === null) return null;
  const on = state === "on";
  const hint = HINTS[state];

  const toggle = () => run(on ? disablePush : enablePush);

  const Icon = busy ? Loader2 : on ? BellRing : BellOff;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || state === "needs-install" || state === "denied" || state === "unsupported"}
      className="flex w-full items-center rounded-lg px-3 py-3 text-left text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:hover:bg-transparent md:py-2.5"
      aria-pressed={on}
      data-testid="admin-push-toggle"
    >
      <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", busy && "animate-spin")} />
      <span className="flex-1 text-sm">
        Утасны мэдэгдэл
        {hint && <span className="block text-[11px] text-white/50">{hint}</span>}
      </span>
      <span
        className={cn(
          "ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
          on ? "bg-brand text-white" : "bg-white/10 text-white/60",
        )}
      >
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}
