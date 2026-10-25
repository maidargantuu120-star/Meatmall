import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem, Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Global style for all text in My Page
const blackTextStyle = { color: "#000000 !important", fontWeight: 800 };
const blackIconStyle = { color: "#000000" };
import {
  formatPrice,
  formatOrderId,
  formatDate,
  translateOrderStatus,
  getOrderStatusText,
  cn,
} from "@/lib/utils";
import {
  Loader2,
  LogOut,
  ShoppingCart,
  PackageOpen,
  ChefHat,
  ChevronDown,
} from "lucide-react";
import { useLocation } from "wouter";
import { OrderTracker } from "@/components/order-tracker";
import { PushCard } from "@/components/push-card";
import { GeneratedMealKitCard } from "@/components/generated-meal-kit-card";

type OrderWithItems = Order & { items: (OrderItem & { product: Product })[] };

// Interface for meal kit components
interface GeneratedMealKitComponent {
  id: number;
  generatedMealKitId: number;
  productId: number;
  quantity: string;
  price: string;
  product: {
    id: number;
    name: string;
    category: string;
    price: string;
    imageUrl: string;
    description: string;
  };
}

// Interface for meal kits
interface GeneratedMealKit {
  id: number;
  userId: number | null;
  sessionId: string | null;
  name: string;
  totalPrice: string;
  isAddedToCart: boolean;
  createdAt: string;
  components: GeneratedMealKitComponent[];
}

export default function MyPage() {
  const { user, logoutMutation } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"orders" | "meal-kits">("orders");

  // Fetch user orders
  const {
    data: orders,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/user/orders"], // Changed queryKey to match API endpoint causing automatic invalidation when other components invalidate this key
    queryFn: async () => {
      try {
        if (!user) return [];
        return await apiRequest("GET", "/api/user/orders");
      } catch (err) {
        console.error("Error fetching orders:", err);
        return [];
      }
    },
    enabled: !!user,
    refetchOnMount: true,
  });

  // Fetch user's generated meal kits
  const {
    data: mealKits,
    isLoading: isMealKitsLoading,
    error: mealKitsError,
  } = useQuery<GeneratedMealKit[]>({
    queryKey: ["generated-meal-kits", user?.id],
    queryFn: async () => {
      try {
        if (!user) return [];
        // Note: this endpoint might need to be verified or created if it doesn't exist yet for user-specific fetching
        // Assuming /api/generated-meal-kits filters by user session/id internally as seen in worker/api/shop.ts
        return await apiRequest("GET", "/api/generated-meal-kits");
      } catch (err) {
        console.error("Error fetching meal kits:", err);
        return [];
      }
    },
    enabled: !!user,
    refetchOnMount: true,
  });

  // Fetch bank account settings
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      try {
        const accounts = await apiRequest("GET", "/api/bank-accounts");
        return accounts.map((acc: any) => ({
          bankName: acc.bankName, // API returns camelCase
          accountNumber: acc.accountNumber,
          accountHolder: acc.accountHolder,
        }));
      } catch (err) {
        console.error("Error fetching bank accounts:", err);
        return [];
      }
    },
  });

  const handleLogout = async () => {
    try {
      console.log("Initiating logout from my-page");
      await logoutMutation.mutateAsync();
      console.log("Logout mutation completed, redirecting to home page");

      // Force reload the page instead of just changing location
      // This ensures all React Query cache and state is completely reset
      window.location.href = "/";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Sort orders by date (newest first)
  const sortedOrders = orders
    ? [...orders].sort((a, b) => {
        // Handle null createdAt values gracefully
        const dateA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateA - dateB;
      })
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Page header with Red-Blue gradient */}
      <div className="w-full bg-brand py-8 mb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center drop-shadow-md">
            {t.myPage}
          </h1>
          <div className="w-20 h-1 bg-white/50 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 pb-12 -mt-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* User Profile Section */}
          <div className="w-full space-y-6 md:w-1/3 lg:w-1/4">
            <Card className="gradient-card border-none shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"></div>
              <CardHeader>
                <CardTitle
                  className="relative font-bold"
                  style={blackTextStyle}
                >
                  {t.userInfo}
                </CardTitle>
                <CardDescription className="relative" style={blackTextStyle}>
                  {t.userInfoDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="space-y-4 relative">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="my-page-avatar">
                        {user.name
                          ? user.name.charAt(0)
                          : user.username.charAt(0)}
                      </div>
                      <div>
                        <h3
                          className="text-lg font-medium"
                          style={blackTextStyle}
                        >
                          {user.name || user.username}
                        </h3>
                        <p className="text-sm" style={blackTextStyle}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 bg-white/50 rounded-lg backdrop-blur-sm">
                      <div className="text-sm flex items-start">
                        <span
                          className="font-medium w-1/3"
                          style={blackTextStyle}
                        >
                          {t.name}:
                        </span>
                        <span className="w-2/3" style={blackTextStyle}>
                          {user.username}
                        </span>
                      </div>
                      {user.phone && (
                        <div className="text-sm flex items-start">
                          <span
                            className="font-medium w-1/3"
                            style={blackTextStyle}
                          >
                            {t.phone}:
                          </span>
                          <span className="w-2/3" style={blackTextStyle}>
                            {user.phone}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleLogout}
                      className="my-page-logout-btn"
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      {t.logout}
                    </Button>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
            <PushCard />
          </div>

          {/* Order History Section */}
          <div className="w-full md:w-2/3 lg:w-3/4">
            <Card className="gradient-card border-none shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full"></div>
              <CardHeader>
                <CardTitle
                  className="relative font-bold"
                  style={blackTextStyle}
                >
                  {t.orderHistory}
                </CardTitle>
                <CardDescription className="relative" style={blackTextStyle}>
                  {t.orderHistoryDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOrdersLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4" style={blackTextStyle}>
                      {t.loadingOrderHistory}
                    </p>
                  </div>
                ) : ordersError ? (
                  <div className="py-12 text-center">
                    <p className="text-red-500">
                      {t.error}: {ordersError.message}
                    </p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-4 bg-brand text-white hover:opacity-90"
                    >
                      {t.retry}
                    </Button>
                  </div>
                ) : sortedOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="h-10 w-10 text-white" />
                    </div>
                    <h3
                      className="text-lg font-medium mb-2"
                      style={blackTextStyle}
                    >
                      {t.noOrders}
                    </h3>
                    <p className="mb-4" style={blackTextStyle}>
                      {t.noOrdersDesc}
                    </p>
                    <Button
                      onClick={() => setLocation("/")}
                      className="mt-2 bg-brand text-white hover:brightness-105 transition-all"
                    >
                      {t.viewProducts}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sortedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        bankAccounts={bankAccounts}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Enhanced Order Card Component with detailed information and collapsible view
function OrderCard({
  order,
  bankAccounts,
}: {
  order: OrderWithItems;
  bankAccounts?: any;
}) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // Calculate order summary data
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Toggle expanded view
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const statusText =
    t.orderStatus[order.status as keyof typeof t.orderStatus] || order.status;

  return (
    <Card className="overflow-hidden border-none shadow-md gradient-card">
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-1",
          order.status === "cancelled" ? "bg-ink/15" : "bg-brand",
        )}
      ></div>
      <div className="p-4 sm:p-6 relative">
        {/* Order header with summary information */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg" style={blackTextStyle}>
                {formatOrderId(order.id)}
              </h3>
            </div>
            <p className="text-sm" style={blackTextStyle}>
              {t.orderDate}:{" "}
              {order.createdAt ? formatDate(order.createdAt) : t.orderDate}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={blackTextStyle}>
              {formatPrice(order.totalAmount)}
            </div>
            <p className="text-sm" style={blackTextStyle}>
              {t.totalItems} {totalItems} {t.orderedProducts.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Delivery-app style status tracker */}
        <div className="mb-4 border-y border-ink/10 py-5">
          <OrderTracker status={order.status} createdAt={order.createdAt} />
        </div>

        {/* Order items preview (collapsed view) */}
        {!expanded && (
          <div className="flex flex-wrap gap-2 mb-4">
            {order.items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-white/50 p-1 px-2 rounded"
              >
                <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PackageOpen className="w-6 h-6 m-2 text-gray-400" />
                  )}
                </div>
                <div className="text-sm" style={blackTextStyle}>
                  <span className="font-medium">{item.quantity}x</span>{" "}
                  {item.product.name}
                </div>
              </div>
            ))}
            {order.items.length > 3 && (
              <div
                className="text-sm self-center ml-2 bg-white/30 p-1 px-3 rounded-full"
                style={blackTextStyle}
              >
                +{order.items.length - 3} {t.showMore}
              </div>
            )}
          </div>
        )}

        {/* Expanded order details */}
        {expanded && (
          <div className="mt-2 space-y-6">
            {/* All order items in detail */}
            <section>
              <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <PackageOpen className="h-4 w-4" />
                </span>
                {t.orderedProducts}
              </h4>
              <div className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PackageOpen className="m-3 h-6 w-6 text-ink/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="truncate font-semibold text-ink">
                        {item.product.name}
                      </h5>
                      <p className="text-sm text-ink/60">
                        {item.product.category && `${item.product.category} • `}
                        {formatPrice(Number(item.price))} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex-shrink-0 font-display font-extrabold text-ink">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery and payment details */}
            <div className="grid grid-cols-1 gap-6 border-t border-ink/10 pt-6 md:grid-cols-2">
              <section>
                <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <span className="material-icons text-[16px]">home</span>
                  </span>
                  {t.deliveryInfo}
                </h4>
                <dl className="space-y-2.5 rounded-xl bg-surface p-4 text-sm">
                  {[
                    [t.recipient, order.customerName],
                    [t.phone, order.customerPhone],
                    [t.email, order.customerEmail],
                    [t.address, order.customerAddress],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <dt className="w-24 flex-shrink-0 text-ink/60">{label}</dt>
                      <dd className="min-w-0 flex-1 break-words font-semibold text-ink">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <span className="material-icons text-[16px]">payments</span>
                  </span>
                  {t.paymentInfo}
                </h4>
                <div className="space-y-3 rounded-xl bg-surface p-4 text-sm">
                  {bankAccounts === undefined ? (
                    <p className="text-ink/60">{t.loadingBankInfo}</p>
                  ) : Array.isArray(bankAccounts) && bankAccounts.length > 0 ? (
                    bankAccounts.map((account: any, index: number) => (
                      <dl
                        key={index}
                        className="space-y-1.5 rounded-lg border border-ink/10 bg-white p-3 text-xs"
                      >
                        {[
                          [t.bank, account.bankName],
                          [t.accountHolder, account.accountHolder],
                          [t.accountNumber, account.accountNumber],
                        ].map(([label, value]) => (
                          <div key={label} className="flex gap-3">
                            <dt className="w-24 flex-shrink-0 text-ink/60">{label}</dt>
                            <dd className="min-w-0 flex-1 break-words font-semibold text-ink">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ))
                  ) : (
                    <p className="rounded-lg border border-ink/10 bg-white p-3 text-xs text-ink/60">
                      {t.bankInfoNotFound}
                    </p>
                  )}
                  <dl className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <dt className="w-24 flex-shrink-0 text-ink/60">{t.paymentStatus}</dt>
                      <dd className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            order.status === "cancelled"
                              ? "bg-ink/10 text-ink/50"
                              : "bg-brand/10 text-brand",
                          )}
                        >
                          {statusText}
                        </span>
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 flex-shrink-0 text-ink/60">Захиалгын дугаар</dt>
                      <dd className="min-w-0 flex-1 font-semibold text-ink">
                        {formatOrderId(order.id)}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 flex-shrink-0 text-ink/60">Нийт дүн</dt>
                      <dd className="min-w-0 flex-1 font-display font-extrabold text-ink">
                        {formatPrice(order.totalAmount)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Toggle: "show order details" row, like delivery apps */}
        <button
          type="button"
          onClick={toggleExpand}
          aria-expanded={expanded}
          className="mt-4 -mx-4 -mb-4 flex w-[calc(100%+2rem)] items-center justify-center gap-1 border-t border-ink/10 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-surface sm:-mx-6 sm:-mb-6 sm:w-[calc(100%+3rem)]"
        >
          {expanded ? t.collapse : t.showDetails}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
    </Card>
  );
}
