import { useLocation } from "wouter";
import { Home, ShoppingCart, User, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

interface MobileBottomNavProps {
  cartItemCount?: number;
  onMenuToggle?: () => void;
}

export function MobileBottomNav({
  cartItemCount = 0,
  onMenuToggle,
}: MobileBottomNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, language } = useLanguage();

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Also call the passed onMenuToggle if available
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Don't show on admin pages
  const isAdminPage = location.startsWith("/admin");

  if (!isMobile || isAdminPage) return null;

  const navItems = [
    {
      icon: Home,
      label: t.home,
      path: "/",
      onClick: () => setLocation("/"),
    },
    {
      icon: ShoppingCart,
      label: t.cart,
      path: "/cart",
      onClick: () => setLocation("/cart"),
      badge: cartItemCount > 0 ? cartItemCount : undefined,
    },
    {
      icon: User,
      label: t.myPage,
      path: "/my-page",
      onClick: () => setLocation("/my-page"),
    },
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50 max-h-[70vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-3 space-y-1">
              {/* Contact Link */}
              <button
                onClick={() => {
                  setLocation("/contact");
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brand hover:bg-gray-50 transition-all duration-200 border-l-2 border-transparent hover:border-brand/50"
              >
                {t.contact}
              </button>

              {/* Language Switcher */}
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-gray-500 mb-2">
                  {language === "mn"
                    ? "Хэл сонгох"
                    : language === "ru"
                      ? "Выбор языка"
                      : "Language"}
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50 md:hidden">
        <div className="flex justify-center items-center py-1.5 px-4 w-full">
          <div className="flex justify-evenly items-center w-full">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive =
                location === item.path ||
                (item.path === "#menu" && isMobileMenuOpen);

              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`group flex flex-col items-center justify-center py-2 px-6 relative min-w-0 transition-colors duration-200 active:scale-95 ${
                    isActive ? "text-brand" : "text-ink hover:text-brand"
                  }`}
                >
                  <div className="relative mb-1">
                    <Icon size={22} />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2.5 bg-brand text-white text-[10px] font-bold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight whitespace-nowrap">
                    {item.label}
                  </span>

                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-brand rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
