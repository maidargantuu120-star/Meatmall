import { Route, Switch, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/language-context";
import { ProtectedRoute } from "@/lib/protected-route";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { lazy, Suspense } from "react";

// Eagerly loaded pages (customer-facing, critical path)
import Home from "@/pages/home";
import ProductDetails from "@/pages/product-details";
import CartPage from "@/pages/cart-page";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order-confirmation";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";

// Lazy loaded pages (less critical, loaded on demand)
const ProductsPage = lazy(() => import("@/pages/products"));
const ServiceCategoryPage = lazy(() => import("@/pages/service-category"));
const StoreRegister = lazy(() => import("@/pages/store/register"));
const StoreDashboard = lazy(() => import("@/pages/store/dashboard"));
const MyPage = lazy(() => import("@/pages/my-page"));
const Contact = lazy(() => import("@/pages/contact"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));

// Admin pages - all lazy loaded (loaded only when admin accesses them)
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminNavigation = lazy(() => import("@/pages/admin/navigation"));
const AdminMedia = lazy(() => import("@/pages/admin/media"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminBankAccounts = lazy(() => import("@/pages/admin/bank-accounts"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminSecurity = lazy(() => import("@/pages/admin/security"));
const AdminActivate = lazy(() => import("@/pages/admin/activate"));
const AdminHeroSettings = lazy(() => import("@/pages/admin/hero-settings"));
const AdminLogoSettings = lazy(() => import("@/pages/admin/logo-settings"));
const AdminFooterSettings = lazy(() => import("@/pages/admin/footer-settings"));
const AdminSiteSettings = lazy(() => import("@/pages/admin/site-settings"));
const AdminLoginSettings = lazy(() => import("@/pages/admin/login-settings"));
const AdminDeliverySettings = lazy(
  () => import("@/pages/admin/delivery-settings"),
);
const AdminReviews = lazy(() => import("@/pages/admin/reviews"));
const NotFound = lazy(() => import("@/pages/not-found"));

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { QuickMenu } from "@/components/quick-menu";
import { InstallBanner } from "@/components/install-banner";
import { NewOrderSoundWatcher } from "@/components/admin/new-order-sound";
import { PushSync } from "@/components/push-card";
import { installAuthDeepLinkHandler } from "@/lib/native-auth";
import { useToast } from "@/hooks/use-toast";
import { canonicalUrl, isPublicPage } from "@shared/seo";

// Define type for the auth response
interface AuthCheckResponse {
  authenticated: boolean;
}

// Enhanced AdminRoute component to check admin authentication
// Enhanced AdminRoute component to check admin authentication
function AdminRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return <LoadingScreen text="Verifying admin access..." />;
  }

  if (user && user.isAdmin) {
    return <Component {...rest} />;
  }

  // Redirect to login if not authenticated or not admin
  return <Redirect to="/admin/login?redirect=true" />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const [pagePath] = useLocation();
  useEffect(() => {
    const canonical = canonicalUrl(pagePath.split('?')[0]);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
    document.querySelector('meta[name="robots"]')?.setAttribute(
      'content', isPublicPage(pagePath.split('?')[0]) ? 'index, follow' : 'noindex, follow',
    );
  }, [pagePath]);

  const { isLoading } = useAuth();
  const { items } = useCart();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  console.log("AppContent rendering immediately, isLoading:", isLoading); // Debug log

  // 네이티브 앱: 구글 로그인 딥링크(mn.elbeg.meat://auth?token=...) 수신 처리
  useEffect(() => {
    const cleanup = installAuthDeepLinkHandler(
      () => {
        // 토큰은 이미 저장됨. 앱을 홈으로 새로고침하면 저장된 토큰으로
        // /api/user를 다시 불러와 로그인 상태가 확실히 반영된다.
        window.location.href = "/";
      },
      () => {
        toast({
          title: "Google нэвтрэлт амжилтгүй",
          variant: "destructive",
        });
      },
    );
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  /* Global loading removed to improve perceived performance */

  return (
    <TooltipProvider>
      <Toaster />
      <div className="pb-16 md:pb-0">
        {" "}
        {/* Add bottom padding for mobile nav */}
        <InstallBanner />
        <Suspense fallback={<LoadingScreen text="Loading..." />}>
          <Switch>
            {/* Customer-facing routes */}
            <Route path="/" component={Home} />
            <Route path="/products/:id" component={ProductDetails} />

            <Route
              path="/service-category/:slug"
              component={ServiceCategoryPage}
            />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/order-confirmation" component={OrderConfirmation} />
            <Route path="/contact" component={Contact} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/auth/callback" component={AuthCallback} />

            {/* Store routes */}
            <Route path="/store/register" component={StoreRegister} />
            <ProtectedRoute
              path="/store/dashboard"
              component={StoreDashboard}
            />

            {/* User protected routes */}
            <ProtectedRoute path="/my-page" component={MyPage} />

            {/* Admin routes */}
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/activate" component={AdminActivate} />
            <Route path="/admin">
              {() => <AdminRoute component={AdminDashboard} />}
            </Route>
            <Route path="/admin/products">
              {() => <AdminRoute component={AdminProducts} />}
            </Route>
            <Route path="/admin/orders">
              {() => <AdminRoute component={AdminOrders} />}
            </Route>
            <Route path="/admin/users">
              {(params) => <AdminRoute component={AdminUsers} {...params} />}
            </Route>

            {/* CMS Admin Routes */}
            <Route path="/admin/navigation">
              {() => <AdminRoute component={AdminNavigation} />}
            </Route>
            <Route path="/admin/media">
              {() => <AdminRoute component={AdminMedia} />}
            </Route>
            <Route path="/admin/categories">
              {() => <AdminRoute component={AdminCategories} />}
            </Route>
            <Route path="/admin/bank-accounts">
              {() => <AdminRoute component={AdminBankAccounts} />}
            </Route>
            <Route path="/admin/settings">
              {() => <AdminRoute component={AdminSettings} />}
            </Route>
            <Route path="/admin/security">
              {() => <AdminRoute component={AdminSecurity} />}
            </Route>
            <Route path="/admin/hero-settings">
              {() => <AdminRoute component={AdminHeroSettings} />}
            </Route>
            <Route path="/admin/logo-settings">
              {() => <AdminRoute component={AdminLogoSettings} />}
            </Route>
            <Route path="/admin/site-settings">
              {() => <AdminRoute component={AdminSiteSettings} />}
            </Route>
            <Route path="/admin/footer-settings">
              {() => <AdminRoute component={AdminFooterSettings} />}
            </Route>
            <Route path="/admin/delivery-settings">
              {() => <AdminRoute component={AdminDeliverySettings} />}
            </Route>
            <Route path="/admin/login-settings">
              {() => <AdminRoute component={AdminLoginSettings} />}
            </Route>
            <Route path="/admin/reviews">
              {() => <AdminRoute component={AdminReviews} />}
            </Route>

            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
      <MobileBottomNav
        cartItemCount={cartItemCount}
        onMenuToggle={toggleMenu}
      />
      <QuickMenu />
      {/* Mongolian voice alert for new orders on every admin page */}
      <NewOrderSoundWatcher />
      <PushSync />
    </TooltipProvider>
  );
}

export default App;
