import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { CartDrawer } from "@/components/cart-drawer";
import { MiniCart } from "@/components/mini-cart";
import { cn } from "@/lib/utils";
import { UserIcon, ShoppingCartIcon, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BrandLogo } from "@/components/brand-logo";

export function Navbar() {
  const [location] = useLocation();
  const { items } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch navigation items from API
  const { data: navigationItems = [] } = useQuery({
    queryKey: ["navigation"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/navigation");
        return res;
      } catch (error) {
        console.error("Error fetching navigation:", error);
        return [];
      }
    },
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Default nav links as fallback with translations
  const defaultNavLinks = [
    { href: "/", label: t.home, id: "home" },
    { href: "/contact", label: t.contact, id: "contact" },
  ];

  // Use navigation items from API if available, otherwise use default links
  const navLinks =
    navigationItems.length > 0
      ? navigationItems.map((item: any) => ({
        href: item.url || `/#${item.title.toLowerCase()}`, // Use title as fallback if URL is empty
        label: item.title,
        id: item.id, // Add ID to ensure unique keys
      }))
      : defaultNavLinks;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ink/10">
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex justify-between h-16 md:h-[72px]">
            {/* Site Logo + wordmark */}
            <Link href="/">
              <div className="flex h-full items-center gap-2.5 cursor-pointer">
                <BrandLogo className="h-12 md:h-14 w-auto flex-shrink-0" />
                <span className="font-slab text-xl md:text-2xl text-ink whitespace-nowrap">
                  Meat <span className="text-brand">Mall</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-stretch gap-7 ml-auto mr-6">
              {navLinks.map((link: any) => (
                <Link key={link.id || link.href} href={link.href}>
                  <div
                    className={cn(
                      "flex h-full items-center border-b-[3px] pt-[3px] font-display text-sm font-extrabold uppercase cursor-pointer transition-colors duration-200",
                      location === link.href
                        ? "border-brand text-brand"
                        : "border-transparent text-ink hover:text-brand",
                    )}
                  >
                    {link.label}
                  </div>
                </Link>
              ))}
            </nav>

            {/* Desktop: User, Cart | Mobile: Menu Button */}
            <div className="flex items-center gap-2">
              {/* User Button - Desktop only */}
              <Link
                href={user ? "/my-page" : "/auth"}
                className="hidden md:block"
              >
                <div className="p-2 rounded hover:bg-surface transition-colors duration-200">
                  <UserIcon
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      user ? "text-brand" : "text-ink",
                    )}
                  />
                </div>
              </Link>

              {/* Cart Button with Mini Cart - Desktop only */}
              <div className="relative group hidden md:block">
                <Link href="/cart">
                  <div
                    className="h-9 min-w-9 px-2 rounded-md bg-ink hover:bg-brand flex items-center justify-center gap-1.5 text-white transition-colors duration-200 cursor-pointer"
                    aria-label={t.cart}
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span className="font-display text-sm font-extrabold leading-none">
                      {cartItemCount}
                    </span>
                  </div>
                </Link>

                {/* Mini Cart - only visible on hover and if cart has items */}
                <div className="hidden md:group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 group-hover:delay-150 group-hover:transition-all">
                  <MiniCart isVisible={cartItemCount > 0} />
                </div>
              </div>

              {/* Mobile: Language Switcher Removed */}

              {/* Mobile: Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded hover:bg-surface transition-colors duration-200"
                  aria-label={t.menu}
                >
                  <Menu className="h-6 w-6 text-ink" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden bg-white border-t border-gray-100 shadow-sm transition-all duration-200 overflow-y-auto",
          isMenuOpen ? "max-h-[70vh]" : "max-h-0",
        )}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navLinks.map((link: any) => (
            <Link
              key={link.id || `mobile-${link.href}`}
              href={link.href}
              className={cn(
                "block px-4 py-2.5 rounded-xl font-display text-[15px] font-bold transition-colors duration-200",
                location === link.href
                  ? "bg-surface text-brand"
                  : "text-ink hover:bg-surface",
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {/* Cart nav link for mobile */}
          <Link href="/cart">
            <div
              className="flex items-center px-4 py-2.5 rounded-xl font-display text-[15px] font-bold text-ink hover:bg-surface transition-colors duration-200 cursor-pointer"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingCartIcon className="h-5 w-5 mr-2" />
              {t.cart}
              {cartItemCount > 0 && (
                <span className="ml-2 bg-brand text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </div>
          </Link>

          {/* User nav link for mobile */}
          <Link href={user ? "/my-page" : "/auth"}>
            <div
              className="flex items-center px-4 py-2.5 rounded-xl font-display text-[15px] font-bold text-ink hover:bg-surface transition-colors duration-200 cursor-pointer"
              onClick={() => setIsMenuOpen(false)}
            >
              <UserIcon className="h-5 w-5 mr-2" />
              {user ? t.profile : t.login}
            </div>
          </Link>
        </div>
      </div>

      {/* Shopping Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
