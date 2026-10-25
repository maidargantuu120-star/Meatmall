import { useEffect, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { cn } from "@/lib/utils";

// Delivery-app style alert: bell jingle + "Мийт Мол! Захиалга орж ирлээ!"
// (male voice, Microsoft mn-MN-BataaNeural via edge-tts, built by design/sounds/build_alert.py).
// Alternatives in design/sounds: new-order-mn-female.mp3, new-order-mn-plain.mp3
const SOUND_URL = "/sounds/new-order-mn.mp3";
const PREF_KEY = "mm-admin-order-sound";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

// Small shared store: the watcher (App level) and the switch (sidebar) both use it
type SoundState = { enabled: boolean; blocked: boolean };
let state: SoundState = { enabled: readEnabled(), blocked: false };
const listeners = new Set<() => void>();

function setState(partial: Partial<SoundState>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function useSoundState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

let audio: HTMLAudioElement | null = null;

// Short two-tone chime, used if the MP3 can't be played
function playChime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch {
    // No Web Audio support
  }
}

async function playOrderSound() {
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = "auto";
  }
  try {
    audio.currentTime = 0;
    await audio.play();
    setState({ blocked: false });
  } catch (error) {
    // Browsers block audio until the page has been clicked once
    if ((error as DOMException)?.name === "NotAllowedError") {
      setState({ blocked: true });
    } else {
      playChime();
    }
  }
}

// Kept at module level so moving between admin pages doesn't reset the baseline
let lastSeenOrderId: number | null = null;

// Watches for new orders on every admin page and plays the Mongolian voice.
// Renders nothing; mounted once in App (polling only runs for admin users).
export function NewOrderSoundWatcher() {
  const [location] = useLocation();
  const onAdminPage = location.startsWith("/admin") && location !== "/admin/login";
  const { latestOrderId } = useOrderNotifications();
  const { enabled } = useSoundState();

  useEffect(() => {
    if (!onAdminPage || latestOrderId === undefined) return;
    if (lastSeenOrderId === null) {
      // First load: remember the newest order, don't announce existing ones
      lastSeenOrderId = latestOrderId;
      return;
    }
    if (latestOrderId > lastSeenOrderId) {
      lastSeenOrderId = latestOrderId;
      if (enabled) playOrderSound();
    }
  }, [onAdminPage, latestOrderId, enabled]);

  // Preload, and on the first tap/click silently play once so later announcements
  // are allowed (autoplay rules; iOS Safari needs the same element unlocked in a gesture)
  useEffect(() => {
    if (!onAdminPage) return;
    if (!audio) {
      audio = new Audio(SOUND_URL);
      audio.preload = "auto";
    }
    const unlock = () => {
      if (!audio) return;
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio!.pause();
          audio!.currentTime = 0;
          setState({ blocked: false });
        })
        .catch(() => {})
        .finally(() => {
          audio!.muted = false;
        });
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [onAdminPage]);

  return null;
}

// Sound on/off switch for the admin sidebar
export function OrderSoundToggle({ className }: { className?: string }) {
  const { enabled, blocked } = useSoundState();

  const toggle = () => {
    const next = !enabled;
    setState({ enabled: next });
    try {
      localStorage.setItem(PREF_KEY, next ? "on" : "off");
    } catch {
      // Storage unavailable: the choice only lasts for this page view
    }
    // The click itself unlocks audio; play once so the admin hears what it sounds like
    if (next) playOrderSound();
  };

  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center w-full rounded-lg px-3 py-3 md:py-2.5 text-left transition-colors duration-200",
        enabled && blocked
          ? "bg-brand/25 text-white animate-pulse"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        className,
      )}
      aria-pressed={enabled}
      data-testid="order-sound-toggle"
    >
      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-sm">
        Дуут мэдэгдэл
        {enabled && blocked && (
          <span className="block text-[11px] text-white/80">
            Идэвхжүүлэхийн тулд энд дарна уу
          </span>
        )}
      </span>
      <span
        className={cn(
          "ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
          enabled ? "bg-brand text-white" : "bg-white/10 text-white/60",
        )}
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
