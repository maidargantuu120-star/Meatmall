import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearAuthToken } from "@/lib/auth-token";
import { useToast } from "@/hooks/use-toast";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { OrderSoundToggle } from "@/components/admin/new-order-sound";
import { AdminPushToggle } from "@/components/admin/push-toggle";

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use order notifications hook (browser notifications removed)
  const { pendingCount } = useOrderNotifications();

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Fetch only pending orders count for better performance (legacy)
  const { data: pendingData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/pending-orders-count"],
    refetchInterval: 30000, // Refresh every 30 seconds - less frequent for better performance
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Use count from notification hook for consistency
  const pendingOrdersCount = pendingCount;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout", {});
    } catch (error) {
      // 서버 호출이 실패해도 로컬 세션은 정리한다
      console.error("Admin logout API error:", error);
    } finally {
      // 토큰(앱)·쿠키(웹) 모두 정리 후 클라이언트 라우팅으로 이동 (하드 네비게이션은 앱에서 404)
      clearAuthToken();
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      setLocation("/admin/login");
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const menuItems = [
    { path: "/admin", icon: "dashboard", label: "Хянах самбар" },
    { path: "/admin/products", icon: "inventory", label: "Бүтээгдэхүүн" },
    {
      path: "/admin/orders",
      icon: "shopping_bag",
      label: "Захиалгууд",
      notificationCount: pendingOrdersCount,
    },
    { path: "/admin/users", icon: "people", label: "Хэрэглэгчид" },
    {
      path: "/admin/bank-accounts",
      icon: "account_balance",
      label: "Банкны данс",
    },
    { path: "/admin/settings", icon: "settings", label: "Тохиргоо" },
    { path: "/admin/security", icon: "lock", label: "Нууц үг солих" },
    // CMS sections
    // "Сайтын агуулга" 링크가 제거되었습니다
    {
      path: "/admin/hero-settings",
      icon: "featured_video",
      label: "Нүүр хуудас зураг",
    },
    {
      path: "/admin/login-settings",
      icon: "image",
      label: "Нэвтрэх хэсгийн зураг",
    },

    { path: "/admin/categories", icon: "category", label: "Ангилал" },
    {
      path: "/admin/delivery-settings",
      icon: "local_shipping",
      label: "Хүргэлтийн тохиргоо",
    },
    { path: "/admin/reviews", icon: "reviews", label: "Сэтгэгдлүүд" },
  ];

  // Mobile menu toggle button displayed at the top of the screen
  const mobileMenuToggle = (
    <div className="md:hidden fixed top-0 left-0 z-50 w-full h-16 bg-white border-b border-ink/10 px-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <BrandLogo className="h-11 w-auto" />
        <span className="font-display font-extrabold text-ink">Админ</span>
      </div>
      <button
        onClick={toggleMobileMenu}
        className="p-2 rounded text-ink hover:bg-surface"
        aria-label={isMobileMenuOpen ? "Цэсийг хаах" : "Цэсийг нээх"}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {mobileMenuToggle}

      {/* Mobile Sidebar - Drawer that slides in from left */}
      <div
        className={cn(
          "fixed md:sticky md:top-0 md:self-start inset-y-0 left-0 z-40 w-80 md:w-64 bg-ink text-white shadow-xl transform transition-transform duration-300",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Fixed height for desktop, scrollable for mobile */}
        <div className="flex flex-col h-full md:h-screen">
          {/* Sidebar Header - Only visible on desktop */}
          <div className="hidden md:block px-4 pt-5 pb-4 border-b border-white/10">
            <Link href="/admin" className="block">
              <BrandLogo className="h-16 w-auto" />
              <span className="mt-2 block font-display text-xs font-extrabold uppercase tracking-wider text-white/50">
                Админ удирдлага
              </span>
            </Link>
          </div>

          {/* Mobile header spacer to prevent content from being under the fixed top bar */}
          <div className="h-16 md:hidden"></div>

          {/* Menu Items - Scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3 md:pt-4 space-y-0.5">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-3 md:py-2.5 transition-colors duration-200",
                  location === item.path
                    ? "bg-brand text-white font-semibold"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <div className="flex items-center">
                  <span className="material-icons mr-3 text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.notificationCount !== undefined &&
                  item.notificationCount > 0 && (
                    <span className="bg-white text-brand text-xs font-bold rounded-full h-6 min-w-6 px-1 flex items-center justify-center animate-pulse">
                      {item.notificationCount > 99
                        ? "99+"
                        : item.notificationCount}
                    </span>
                  )}
              </Link>
            ))}
          </nav>

          {/* Navigation and Logout Buttons - Sticky at bottom */}
          <div className="border-t border-white/10 mt-auto px-3 py-3 space-y-0.5">
            <OrderSoundToggle />
            <AdminPushToggle />
            <Link
              href="/"
              className="flex items-center w-full rounded-lg px-3 py-3 md:py-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-200"
            >
              <span className="material-icons mr-3 text-[20px]">home</span>
              <span className="text-sm">Нүүр хуудас руу очих</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full rounded-lg px-3 py-3 md:py-2.5 text-white/70 hover:bg-brand hover:text-white transition-colors duration-200 text-left"
            >
              <span className="material-icons mr-3 text-[20px]">logout</span>
              <span className="text-sm">Гарах</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay - only shown on mobile when sidebar is open */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
