import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
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
  normalizeDate,
  translateOrderStatus,
  getOrderStatusText,
  cn,
  isBulkyMeat,
} from "@/lib/utils";
import {
  Loader2,
  LogOut,
  ShoppingCart,
  PackageOpen,
  ChefHat,
  ChevronDown,
  Check,
  Copy,
} from "lucide-react";
import { useLocation } from "wouter";
import { OrderTracker, useDeliveryEta } from "@/components/order-tracker";
import { formatShortDeliveryDate } from "@/lib/delivery-date";
import { PushCard } from "@/components/push-card";
import { GeneratedMealKitCard } from "@/components/generated-meal-kit-card";

type OrderWithItems = Order & { items: (OrderItem & { product: Product })[] };

// Same rule as the cart and admin receipt: bulky cuts are priced per 4kg package
function lineTotal(item: { price: number | string; quantity: number; product: { name: string } }) {
  const price = Number(item.price);
  return isBulkyMeat(item.product.name) ? price * (item.quantity / 4) : price * item.quantity;
}

// Statuses that have tracker copy (title / sub) in t.orderTracker
const TRACKER_STATUSES = ["pending", "processing", "completed", "cancelled"] as const;

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
  const [profileOpen, setProfileOpen] = useState(false);

  // Fetch user orders
  const {
    data: orderPages,
    isLoading: isOrdersLoading,
    error: ordersError,
    hasNextPage, fetchNextPage, isFetchingNextPage,
  } = useInfiniteQuery<{ orders: OrderWithItems[]; nextBeforeId: number | null }>({
    queryKey: ["/api/user/orders", user?.id],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => apiRequest('GET', '/api/user/orders/page' + (pageParam ? `?before=${pageParam}` : '')),
    getNextPageParam: page => page.nextBeforeId ?? undefined,
    enabled: !!user,
    refetchOnMount: true,
  });
  const orders = orderPages?.pages.flatMap(page => page.orders) || [];

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
            <Card className="relative gradient-card border-none shadow-lg overflow-hidden">
              <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand/10 to-transparent rounded-bl-full"></div>
              {/* Tapping the header expands/collapses the details; the chevron is the accessible control */}
              <div
                onClick={() => setProfileOpen((open) => !open)}
                className="relative flex w-full cursor-pointer select-none items-start justify-between gap-2 transition-colors hover:bg-ink/[0.02]"
              >
                <CardHeader className="min-w-0 flex-1 px-4 sm:px-6">
                  <CardTitle
                    className="relative truncate text-xl font-bold sm:text-2xl"
                    style={blackTextStyle}
                  >
                    {t.userInfo}
                  </CardTitle>
                  <CardDescription className="relative truncate text-xs sm:text-sm" style={blackTextStyle}>
                    {t.userInfoDesc}
                  </CardDescription>
                </CardHeader>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setProfileOpen((open) => !open);
                  }}
                  aria-expanded={profileOpen}
                  aria-controls="my-page-profile-details"
                  aria-label={profileOpen ? t.collapse : t.showDetails}
                  className="mr-4 mt-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10 sm:mr-5"
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform duration-300", profileOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <CardContent className="px-4 sm:px-6">
                {user ? (
                  <div className="relative">
                    <div className="flex items-center space-x-4">
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

                    {/* Collapsible details: grid-rows 0fr → 1fr animates to the content height;
                        `invisible` keeps the hidden logout button out of the tab order */}
                    <div
                      id="my-page-profile-details"
                      className={cn(
                        "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
                        profileOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
                      )}
                    >
                    <div className="min-h-0 overflow-hidden">
                    <div className="space-y-4 pt-6">
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
                    </div>
                    </div>
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
            <Card className="relative gradient-card border-none shadow-lg overflow-hidden">
              <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-brand/10 to-transparent rounded-bl-full"></div>
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
              <CardContent className="px-3 sm:px-6">
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
                      {hasNextPage && <Button variant="outline" className="w-full" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                        {isFetchingNextPage ? 'Ачаалж байна…' : 'Өмнөх захиалгуудыг харах'}
                      </Button>}
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
  // The stored order total includes delivery; the difference to the items is the shipping fee
  const itemsTotal = order.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const shippingFee = Math.max(0, Math.round(Number(order.totalAmount) - itemsTotal));
  const [copiedAccount, setCopiedAccount] = useState<number | null>(null);
  const eta = useDeliveryEta(order.status, order.createdAt);

  const copyAccount = async (index: number, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(index);
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch {
      // Clipboard blocked: the number stays visible and selectable
    }
  };

  // Toggle expanded view
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const statusText =
    t.orderStatus[order.status as keyof typeof t.orderStatus] || order.status;

  // Header copy comes from the tracker strings (title → pill, sub → status line)
  const trackerCopy = (TRACKER_STATUSES as readonly string[]).includes(order.status)
    ? t.orderTracker[order.status as (typeof TRACKER_STATUSES)[number]]
    : null;
  const cancelled = order.status === "cancelled";
  const placed = order.createdAt ? normalizeDate(order.createdAt) : null;
  const placedText =
    placed && !Number.isNaN(placed.getTime())
      ? `${placed.getFullYear()}.${String(placed.getMonth() + 1).padStart(2, "0")}.${String(placed.getDate()).padStart(2, "0")}`
      : null;

  return (
    <Card className="relative overflow-hidden border-none shadow-md gradient-card">
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-1",
          order.status === "cancelled" ? "bg-ink/15" : "bg-brand",
        )}
      ></div>
      <div className="p-4 sm:p-6 relative">
        {/* Header: order number, then date · item count on its own full-width line */}
        <h3 className="whitespace-nowrap font-display text-xl font-extrabold leading-tight text-ink">
          {formatOrderId(order.id)}
        </h3>
        <p className="mt-1 truncate text-sm text-ink/60">
          {[placedText, `${order.items.length} ${t.productUnit}`].filter(Boolean).join(" · ")}
        </p>

        {/* Status: full status label as a pill on its own line (fits one line on phones),
            then the status line and estimated delivery day */}
        <div className="mt-4">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold leading-tight",
              cancelled ? "bg-ink/5 text-ink/50" : "bg-brand/10 text-brand",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cancelled ? "bg-ink/40" : "bg-brand")} aria-hidden="true" />
            {trackerCopy?.title ?? statusText}
          </span>
          {trackerCopy && (
            <>
              <p className="mt-2 truncate text-sm font-semibold text-ink sm:whitespace-normal sm:text-base" title={trackerCopy.sub}>
                {trackerCopy.sub}
              </p>
              {eta && (
                <p className="mt-1 truncate text-sm text-ink/60">
                  {t.orderTracker.eta} · {formatShortDeliveryDate(eta, language)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Delivery-app style status bar */}
        <div className="mb-4 mt-2 border-b border-ink/10 pb-5">
          <OrderTracker status={order.status} createdAt={order.createdAt} bare />
        </div>

        {/* Order items preview (collapsed view): tapping it opens the details too */}
        {!expanded && (
          <button
            type="button"
            onClick={toggleExpand}
            aria-expanded={expanded}
            className="-mx-2 mb-1 flex w-[calc(100%+1rem)] flex-wrap gap-2 rounded-xl p-2 text-left transition-colors hover:bg-ink/[0.03]"
          >
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
          </button>
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
                      {formatPrice(lineTotal(item))}
                    </div>
                  </div>
                ))}
                {/* Subtotal, shipping (order total minus items, as on the admin receipt) and total */}
                <dl className="space-y-2 rounded-b-xl bg-surface/60 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink/60">{t.products}</dt>
                    <dd className="font-semibold text-ink">{formatPrice(itemsTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink/60">{t.shippingFee}</dt>
                    <dd className="font-semibold text-ink">{formatPrice(shippingFee)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-ink/10 pt-2">
                    <dt className="font-display font-extrabold text-ink">{t.totalAmount}</dt>
                    <dd className="font-display text-lg font-black text-brand">{formatPrice(order.totalAmount)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Payment first (what to transfer), then delivery details */}
            <div className="grid grid-cols-1 gap-6 border-t border-ink/10 pt-6 md:grid-cols-2">
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
                        className={cn("space-y-2.5", index > 0 && "border-t border-ink/10 pt-3")}
                      >
                        {[
                          [t.bank, account.bankName],
                          [t.accountHolder, account.accountHolder],
                        ].map(([label, value]) => (
                          <div key={label} className="flex gap-3">
                            <dt className="w-24 flex-shrink-0 text-ink/60">{label}</dt>
                            <dd className="min-w-0 flex-1 break-words font-semibold text-ink">
                              {value}
                            </dd>
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <dt className="w-24 flex-shrink-0 text-ink/60">{t.accountShort}</dt>
                          <dd className="min-w-0 flex-1">
                            <span className="block break-words font-display font-extrabold tracking-wide text-ink">
                              {account.accountNumber}
                            </span>
                            {/* Same value as checkout's copy button: the number as stored */}
                            <button
                              type="button"
                              onClick={() => copyAccount(index, account.accountNumber)}
                              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-white"
                            >
                              {copiedAccount === index ? (
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {copiedAccount === index ? t.install.copied : t.copy}
                            </button>
                          </dd>
                        </div>
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
            </div>
          </div>
        )}

        {/* Full-width "Order details" row at the bottom, like delivery apps */}
        <button
          type="button"
          onClick={toggleExpand}
          aria-expanded={expanded}
          className="-mx-4 -mb-4 mt-4 flex w-[calc(100%+2rem)] items-center justify-center gap-1.5 border-t border-ink/10 py-3.5 font-display text-sm font-extrabold text-ink transition-colors hover:bg-surface hover:text-brand sm:-mx-6 sm:-mb-6 sm:w-[calc(100%+3rem)]"
        >
          {expanded ? t.collapse : t.orderDetails}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>
    </Card>
  );
}
