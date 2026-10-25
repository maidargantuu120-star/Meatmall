import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { getInstallPlatform, getInstallUrl, getAndroidBrowserIntent } from '@/lib/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const DISMISS_KEY = "mm-install-dismissed-at";
const DISMISS_DAYS = 7;
function isDismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_DAYS * 86400000; }
  catch { return false; }
}

// Compact banner only. Installation guidance no longer opens a blocking sheet.
export function InstallBanner() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    if (import.meta.env.VITE_API_BASE_URL) return;
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) return;
    setVisible(!isDismissedRecently());
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as BeforeInstallPromptEvent); };
    const onInstalled = () => { setVisible(false); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!visible || location.startsWith('/admin')) return null;

  const handleOpen = async () => {
    const platform = getInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    if (deferred && !platform.isInApp) {
      try {
        await deferred.prompt();
        if ((await deferred.userChoice).outcome === 'accepted') setVisible(false);
      } catch { toast({ title: t.install.title, description: t.install.androidAdd }); }
      finally { setDeferred(null); }
      return;
    }
    if (platform.isInApp && platform.isAndroid) {
      // Keep the external navigation inside the user's click gesture.
      window.location.assign(getAndroidBrowserIntent(getInstallUrl(window.location.origin)));
      toast({ title: t.install.openBrowser, description: t.install.inAppBrowser });
      return;
    }
    toast({
      title: t.install.title,
      description: platform.isInApp
        ? `${t.install.inAppMenu} ${platform.isIOS ? t.install.inAppSafari : t.install.inAppBrowser}`
        : platform.isIOS ? `${t.install.iosShare} ${t.install.iosAdd}` : `${t.install.androidMenu} ${t.install.androidAdd}`,
    });
  };
  return (
    <div className="bg-ink text-white md:hidden" data-testid="install-banner">
      <div className="flex items-center gap-2.5 py-2.5 pl-1.5 pr-3">
        <button type="button" aria-label={t.install.close} className="flex-shrink-0 p-1 text-white/50 hover:text-white"
          onClick={() => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {} setVisible(false); }}>
          <X className="h-4 w-4" />
        </button>
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 flex-shrink-0 rounded-[9px]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11px] text-white/60">{t.install.line1}</p>
          <p className="mt-0.5 truncate text-[13px] font-bold">{t.install.line2}</p>
        </div>
        <button type="button" onClick={handleOpen} data-testid="install-banner-open"
          className="flex-shrink-0 rounded-full bg-white px-3.5 py-2 font-display text-xs font-bold text-ink active:scale-95">
          {t.install.open}
        </button>
      </div>
    </div>
  );
}
