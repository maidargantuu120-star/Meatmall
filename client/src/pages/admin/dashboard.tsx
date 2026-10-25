import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { cn, formatOrderId, formatPrice, formatDate, normalizeDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/components/admin/order-receipt";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOrderNotifications } from "@/hooks/use-order-notifications";

// Stat tile: compact (icon over value) on phones, original icon-left row on md+
function StatCard({
  icon,
  label,
  value,
  isLoading,
  skeletonWidth,
  testId,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  isLoading: boolean;
  skeletonWidth: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white md:block md:h-auto md:w-auto md:p-3">
            <span className="material-icons text-xl md:text-2xl">{icon}</span>
          </div>
          <div className="min-w-0 max-w-full md:ml-4">
            <p className="text-ink/60 text-xs md:text-gray-500 md:text-sm">{label}</p>
            <h3 className="font-display font-extrabold text-lg leading-tight break-all md:break-normal md:font-sans md:font-bold md:text-2xl">
              {isLoading ? (
                <div className={`h-6 ${skeletonWidth} bg-gray-200 animate-pulse rounded`}></div>
              ) : (
                value
              )}
            </h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Use order notifications
  const { pendingCount } = useOrderNotifications();

  // Fetch stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/orders/stats");
    },
  });

  // Fetch recent orders
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery<any[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      // We can reuse the orders endpoint, maybe add a limit query param later
      // For now fetching all and slicing is fine for low volume
      return await apiRequest("GET", "/api/orders");
    },
  });

  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  const totalOrders = stats?.totalOrders || 0;
  const totalSales = stats?.totalSales || 0;
  const totalProducts = stats?.totalProducts || 0;
  const totalCustomers = stats?.totalUsers || 0;

  return (
    <div className="min-h-screen bg-white flex">
      <AdminSidebar />

      {/* pt-16 on phones: clears the sidebar's fixed 64px mobile top bar */}
      <div className="flex-1 overflow-hidden pt-16 md:pt-0">
        <AdminHeader title="Хянах самбар" />

        {/* Phones scroll the page itself; md+ keeps the fixed-height inner scroller */}
        <div className="p-3 md:p-6 md:overflow-auto md:h-[calc(100vh-70px)]">
          {/* Stats Cards: compact 2x2 on phones, 4 across on md+ */}
          <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4 md:gap-6 md:mb-6">
            <StatCard
              icon="shopping_basket"
              label="Захиалга"
              isLoading={isStatsLoading}
              skeletonWidth="w-12"
              value={totalOrders}
              testId="stat-orders"
            />
            <StatCard
              icon="receipt_long"
              label="Борлуулалт"
              isLoading={isStatsLoading}
              skeletonWidth="w-20"
              value={formatPrice(totalSales)}
              testId="stat-sales"
            />
            <StatCard
              icon="inventory_2"
              label="Бүтээгдэхүүн"
              isLoading={isStatsLoading}
              skeletonWidth="w-12"
              value={totalProducts}
              testId="stat-products"
            />
            <StatCard
              icon="person"
              label="Хэрэглэгч"
              isLoading={isStatsLoading}
              skeletonWidth="w-12"
              value={totalCustomers}
              testId="stat-users"
            />
          </div>

          {/* Recent Orders */}
          <Card className="mb-4 md:mb-6">
            <div className="px-4 py-2 md:px-6 md:py-4 border-b flex justify-between items-center gap-2">
              <h2 className="font-display font-extrabold text-base md:font-sans md:font-bold md:text-lg">
                Сүүлийн захиалгууд
              </h2>
              <Button
                variant="link"
                className="text-brand font-medium h-11 px-0 md:h-10 md:px-4 flex-shrink-0"
                asChild
              >
                <Link href="/admin/orders">Бүгдийг харах</Link>
              </Button>
            </div>

            {/* Phones: stacked list instead of a sideways-scrolling table */}
            <div className="md:hidden px-4">
              {isOrdersLoading ? (
                <div className="space-y-3 py-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/5" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">
                  Захиалга байхгүй байна
                </p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {recentOrders.map((order) => {
                    const placed = normalizeDate(order.createdAt);
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => setLocation(`/admin/orders?id=${order.id}`)}
                          className="flex w-full items-center gap-3 py-3.5 text-left"
                          data-testid={`dashboard-order-row-${order.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold text-ink">
                              {order.customerName}{" "}
                              <span className="text-xs font-semibold text-ink/40">
                                {formatOrderId(order.id)}
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-ink/50">
                              {Number.isNaN(placed.getTime())
                                ? "-"
                                : format(placed, "yyyy.MM.dd HH:mm")}
                              <span className="mx-1.5 text-ink/20">|</span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  order.status === "pending" && "text-brand",
                                  order.status === "processing" && "text-ink",
                                  order.status === "completed" && "text-ink/50",
                                  order.status === "cancelled" && "text-ink/35",
                                )}
                              >
                                {STATUS_LABELS[order.status] || order.status}
                              </span>
                            </p>
                            <p className="mt-1 font-display text-base font-extrabold text-brand">
                              {formatPrice(order.totalAmount)}
                            </p>
                          </div>
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand/25 text-brand">
                            <ReceiptText className="h-5 w-5" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Захиалгын ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Харилцагч
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Бүтээгдэхүүн
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дүн
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Төлөв
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Огноо
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Үйлдэл
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isOrdersLoading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                          </td>
                        </tr>
                      ))
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        Захиалга байхгүй байна
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatOrderId(order.id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.items
                            ?.map((item: any) => item.product?.name)
                            .join(", ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <OrderStatusBadge
                            status={order.status}
                            orderId={order.id}
                            isEditable={true}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link href={`/admin/orders?id=${order.id}`}>
                            <a className="text-brand hover:brightness-125 mr-3 font-medium">
                              Харах
                            </a>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Product Management Preview */}
          <Card>
            <div className="px-4 py-3 md:px-6 md:py-4 border-b flex flex-col items-stretch gap-3 md:flex-row md:justify-between md:items-center md:gap-0">
              <h2 className="font-display font-extrabold text-base md:font-sans md:font-bold md:text-lg">
                Бүтээгдэхүүний удирдлага
              </h2>
              <Button
                className="bg-brand hover:brightness-105 text-white font-medium py-2 px-4 rounded flex items-center justify-center h-11 md:h-10 md:justify-start"
                asChild
              >
                <Link href="/admin/products?new=true">
                  <span className="material-icons mr-2">add</span>
                  Шинэ бүтээгдэхүүн
                </Link>
              </Button>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <Link href="/admin/products">
                  <Button
                    variant="outline"
                    className="w-full md:w-auto h-11 md:h-10 border-brand hover:border-brand hover:text-brand"
                  >
                    Бүтээгдэхүүний жагсаалт руу очих
                    <span className="material-icons ml-2">arrow_forward</span>
                  </Button>
                </Link>
              </div>

              <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 mb-0 md:p-4 md:mb-4">
                <div className="flex items-start">
                  <span className="material-icons text-brand mr-2">
                    info
                  </span>
                  <div>
                    <h3 className="font-bold text-brand">
                      Өнөөдрийн статистик
                    </h3>
                    <p className="text-sm text-ink/70">
                      Нийт {totalProducts} төрлийн бүтээгдэхүүнтэй,{" "}
                      {totalOrders} захиалга хүлээн авсан. Одоогоор{" "}
                      {totalCustomers} харилцагч бүртгэлтэй байна. Бүх
                      бүтээгдэхүүн, захиалга, хэрэглэгчийн мэдээллийг
                      дэлгэрэнгүй харахыг хүсвэл дээрх цэснээс сонгоно уу.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
