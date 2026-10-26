import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, MessageCircle, Phone, X } from "lucide-react";
import { FaFacebookF, FaFacebookMessenger } from "react-icons/fa";
import { useLanguage } from "@/contexts/language-context";
import { useFooterSettings } from "@/components/footer";
import { BRAND, telHref } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface QuickAction {
  key: string;
  href: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  color: string;
  external?: boolean;
}

// Site-wide quick menu: call, Messenger, Facebook page and TOP.
// >=1400px: fixed panel. Below: floating button that expands into the actions.
export function QuickMenu() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { data: footer } = useFooterSettings();
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation
  useEffect(() => setOpen(false), [location]);

  if (location.startsWith("/admin")) return null;

  // Admin footer setting wins when present, like the footer
  const phone = footer?.phone || BRAND.phone;

  const actions: QuickAction[] = [
    {
      key: "call",
      href: telHref(phone),
      label: "Залгах",
      sub: phone,
      icon: <Phone className="h-5 w-5" />,
      color: "bg-brand",
    },
    {
      key: "messenger",
      href: BRAND.messengerUrl,
      label: "Messenger",
      icon: <FaFacebookMessenger className="h-5 w-5" />,
      color: "bg-[#0084ff]",
      external: true,
    },
    {
      key: "facebook",
      href: BRAND.facebookUrl,
      label: "Facebook",
      icon: <FaFacebookF className="h-[18px] w-[18px]" />,
      color: "bg-[#1877f2]",
      external: true,
    },
  ];

  const linkProps = (action: QuickAction) =>
    action.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      {/* Wide PC: fixed panel, only where it fits beside the 6xl content column */}
      <div className="fixed bottom-8 right-6 z-40 hidden w-[84px] flex-col gap-2 min-[1400px]:flex">
        <div className="overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <div className="bg-ink py-1.5 text-center font-display text-xs font-black uppercase italic tracking-wider text-white">
            Quick
          </div>
          {actions.map((action) => (
            <a
              key={action.key}
              href={action.href}
              {...linkProps(action)}
              className="flex flex-col items-center gap-1 border-b border-ink/10 px-1 py-3 text-center transition-colors last:border-b-0 hover:bg-surface"
              data-testid={`quick-${action.key}`}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-white",
                  action.color,
                )}
              >
                {action.icon}
              </span>
              <span className="text-[11px] font-bold leading-tight text-ink">
                {action.label}
              </span>
              {action.sub && (
                <span className="text-[10px] leading-tight text-ink/50">
                  {action.sub}
                </span>
              )}
            </a>
          ))}
        </div>
        <button
          type="button"
          aria-label="Scroll to top"
          onClick={scrollTop}
          className={cn(
            "flex h-[52px] w-full flex-col items-center justify-center rounded-xl bg-brand text-white shadow-lg transition-all hover:bg-brand-deep",
            showTop ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <ChevronUp className="h-5 w-5" strokeWidth={3} />
          <span className="-mt-0.5 font-display text-xs font-black italic leading-none">
            TOP
          </span>
        </button>
      </div>

      {/* Mobile and narrower PCs: floating button that expands into the actions */}
      <div className="min-[1400px]:hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sits above the mobile bottom nav; that nav is gone from md up */}
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-6">
          <AnimatePresence>
            {open &&
              actions.map((action, index) => (
                <motion.a
                  key={action.key}
                  href={action.href}
                  {...linkProps(action)}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.15, delay: (actions.length - 1 - index) * 0.04 }}
                  data-testid={`quick-mobile-${action.key}`}
                >
                  <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-md">
                    {action.sub ? `${action.label} ${action.sub}` : action.label}
                  </span>
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg",
                      action.color,
                    )}
                  >
                    {action.icon}
                  </span>
                </motion.a>
              ))}
          </AnimatePresence>

          {!open && (
            <button
              type="button"
              aria-label="Scroll to top"
              onClick={scrollTop}
              className={cn(
                "mr-1.5 flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-ink text-white shadow-lg ring-1 ring-white/25 transition-all",
                showTop ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
              )}
            >
              <ChevronUp className="h-4 w-4" strokeWidth={3} />
              <span className="-mt-0.5 font-display text-[10px] font-black italic leading-none">
                TOP
              </span>
            </button>
          )}

          <button
            type="button"
            aria-label={t.contact}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl ring-4 ring-white transition-transform active:scale-95"
            data-testid="quick-mobile-toggle"
          >
            {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </>
  );
}
