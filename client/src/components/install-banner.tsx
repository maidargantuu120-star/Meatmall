import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getInstallPlatform, getInstallUrl, getAndroidBrowserIntent } from '@/lib/install';

// Chrome / Samsung Internet event fired when the site is installable
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mm-install-dismissed-at";
const DISMISS_DAYS = 7;

function isDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode): the banner just shows again next visit
  }
}

function detectPlatform() {
  const platform = getInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  return { ...platform, isStandalone };
}

type Guide = "ios" | "android" | "inapp" | null;

// "Add to home screen" banner for phones (top of the page), plus a how-to sheet
// for browsers that can't show the install prompt themselves (iOS Safari, in-app browsers).
export function InstallBanner() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [guide, setGuide] = useState<Guide>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const platform = detectPlatform();
  const installUrl = getInstallUrl(window.location.origin);

  useEffect(() => {
    // The Capacitor app build is already a native app
    if (import.meta.env.VITE_API_BASE_URL) return;
    const { isStandalone } = detectPlatform();
    if (isStandalone) return;
    const requested = new URLSearchParams(window.location.search).get('install') === '1';
    setVisible(requested || !isDismissedRecently());
    if (requested) {
      const { isIOS, isInApp } = detectPlatform();
      setGuide(isInApp ? 'inapp' : isIOS ? 'ios' : 'android');
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      setGuide(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || location.startsWith("/admin")) return null;

  const handleOpen = async () => {
    if (deferred && !platform.isInApp) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") { setVisible(false); setGuide(null); }
      } catch {
        setGuide(platform.isIOS ? 'ios' : 'android');
      } finally {
        setDeferred(null);
      }
      return;
    }
    const { isIOS, isInApp } = detectPlatform();
    setGuide(isInApp ? "inapp" : isIOS ? "ios" : "android");
  };

  const handleClose = () => {
    rememberDismiss();
    setVisible(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  const steps =
    guide === "ios"
      ? [
          { icon: <Share className="h-5 w-5" />, text: t.install.iosShare },
          { icon: <PlusSquare className="h-5 w-5" />, text: t.install.iosAdd },
          { icon: <Check className="h-5 w-5" />, text: t.install.iosConfirm },
        ]
      : guide === "android"
        ? [
            { icon: <MoreVertical className="h-5 w-5" />, text: t.install.androidMenu },
            { icon: <PlusSquare className="h-5 w-5" />, text: t.install.androidAdd },
          ]
        : [];

  return (
    <>
      {/* Banner: phones only, scrolls away with the page */}
      <div className="bg-ink text-white md:hidden" data-testid="install-banner">
        <div className="flex items-center gap-2.5 py-2.5 pl-1.5 pr-3">
          <button
            type="button"
            onClick={handleClose}
            aria-label={t.install.close}
            className="flex-shrink-0 p-1 text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-[9px]"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] text-white/60">{t.install.line1}</p>
            <p className="mt-0.5 truncate text-[13px] font-bold">{t.install.line2}</p>
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="flex-shrink-0 rounded-full bg-white px-3.5 py-2 font-display text-xs font-bold text-ink active:scale-95"
            data-testid="install-banner-open"
          >
            {t.install.open}
          </button>
        </div>
      </div>

      {/* How-to sheet */}
      {guide && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/50 md:hidden"
          onClick={() => setGuide(null)}
        >
          <div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-5 text-ink"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t.install.title}
            aria-modal="true"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15" />
            <div className="flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
              <div>
                <p className="font-display text-lg font-extrabold">{t.install.title}</p>
                <p className="text-sm text-ink/60">{t.install.line2}</p>
              </div>
            </div>

            {guide === "inapp" ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm leading-relaxed text-ink/80">{t.install.inApp}</p>
                {platform.isAndroid && (
                  <a href={getAndroidBrowserIntent(installUrl)}
                    className="flex min-h-12 items-center justify-center rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white"
                    data-testid="install-external-browser">
                    {t.install.openBrowser}
                  </a>
                )}
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
                  <li>{t.install.inAppMenu}</li>
                  <li>{platform.isIOS ? t.install.inAppSafari : t.install.inAppBrowser}</li>
                  <li>{platform.isIOS ? t.install.iosAdd : t.install.androidAdd}</li>
                </ol>
                <div className="flex items-center gap-2 rounded-xl bg-surface p-2 pl-3">
                  <input readOnly value={installUrl} aria-label={t.install.copyLink}
                    onFocus={event => event.target.select()}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink/70" />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-bold text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t.install.copied : t.install.copyLink}
                  </button>
                </div>
                {copyFailed && <p role="status" className="text-sm text-ink/70">{t.install.copyManually}</p>}
              </div>
            ) : (
              <ol className="mt-5 space-y-3">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-extrabold text-white">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm leading-snug">{step.text}</span>
                    <span className="flex-shrink-0 text-ink/60">{step.icon}</span>
                  </li>
                ))}
              </ol>
            )}

            {guide !== 'inapp' && deferred && (
              <button type="button" onClick={handleOpen}
                className="mt-5 h-12 w-full rounded-xl bg-brand font-bold text-white"
                data-testid="install-native-prompt">{t.install.open}</button>
            )}

            <button
              type="button"
              onClick={() => setGuide(null)}
              className="mt-5 h-12 w-full rounded bg-ink font-display font-bold text-white"
            >
              {t.install.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
