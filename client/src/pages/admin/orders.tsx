import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { useLanguage } from "@/contexts/language-context";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { cn, formatOrderId, formatPrice, formatDate, normalizeDate } from "@/lib/utils";
import { OrderReceipt, STATUS_LABELS } from "@/components/admin/order-receipt";
import { ReceiptText } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// SMS message templates based on order status
const SMS_TEMPLATES: Record<string, (amount: string) => string> = {
  pending: (amount) =>
    `[Meat Mall] Таны ${amount} төлбөр төлөгдөөгүй байна. Төлбөрөө баталгаажуулна уу.`,
  payment_confirmed: (amount) =>
    `[Meat Mall] Таны ${amount} төлбөр төлөгдлөө. Захиалга бэлтгэгдэж байна.`,
  processing: (amount) =>
    `[Meat Mall] Таны ${amount} төлбөр төлөгдлөө. Захиалга бэлтгэгдэж байна.`,
  shipped: () => `[Meat Mall] Таны захиалга хүргэлтэд гарлаа.`,
  delivered: () =>
    `[Meat Mall] Таны захиалга амжилттай хүргэгдлээ. Баярлалаа.`,
  cancelled: () => `[Meat Mall] Таны захиалга цуцлагдсан байна.`,
};

export default function AdminOrders() {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Parse URL parameters to see if we need to open a specific order
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const orderIdParam = urlParams.get("id");

  const queryClient = useQueryClient();

  // State for filtering and order details
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(
    orderIdParam ? parseInt(orderIdParam) : null,
  );
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(!!orderIdParam);

  // SMS dialog state
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsOrder, setSmsOrder] = useState<Order | null>(null);

  // Delete dialog state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Format dates for API queries
  const formatDateForQuery = (date?: Date) => {
    return date ? format(date, "yyyy-MM-dd") : undefined;
  };

  // Define types for orders and items
  interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    price: string | number;
    product: {
      id: number;
      name: string;
      description: string;
      category: string;
      price: string | number;
      imageUrl: string;
      stock: number;
    };
  }

  interface Order {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    totalAmount: string | number;
    status: string;
    createdAt: string;
    userId: number | null;
    items: OrderItem[];
  }

  // Fetch orders with date filters and improved refresh settings
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: [
      "/api/orders",
      formatDateForQuery(startDate),
      formatDateForQuery(endDate),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) {
        // Add one day to end date to include the whole day
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        params.append("endDate", nextDay.toISOString());
      }

      const queryString = params.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ""}`;

      return await apiRequest("GET", url);
    },
    refetchInterval: 15000, // Refresh every 15 seconds for orders page
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Амжилттай",
        description: "Захиалга устгагдлаа.",
      });
      setOrderToDelete(null);
    },
    onError: () => {
      toast({
        title: "Алдаа",
        description: "Захиалга устгахад алдаа гарлаа.",
        variant: "destructive",
      });
    },
  });

  // Selected order for detailed view
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  // Filtered orders based on search and status
  const filteredOrders = orders.filter((order) => {
    // Apply status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Apply search filter (on order ID or customer name)
    if (searchQuery) {
      const orderIdString = formatOrderId(order.id);
      const searchLower = searchQuery.toLowerCase();
      return (
        orderIdString.includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Open order details
  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setOrderDetailsOpen(true);

    // Update URL without full navigation
    const newUrl = window.location.pathname + `?id=${orderId}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  // Close order details
  const handleCloseDetails = () => {
    setOrderDetailsOpen(false);

    // Update URL without full navigation
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  return (
    <div className="min-h-screen bg-neutral flex">
      <AdminSidebar />

      <div className="flex-1 overflow-hidden pt-16 md:pt-0">
        <AdminHeader title="Захиалгын удирдлага" />

        {/* PC: own scroll area under the header; phones: the page scrolls naturally */}
        <div className="p-3 md:p-6 md:h-[calc(100vh-70px)] md:overflow-auto">
          <Card>
            <div className="px-4 py-3 md:px-6 md:py-4 border-b flex justify-between items-center">
              <h2 className="font-display font-extrabold text-base md:text-lg">Захиалгын жагсаалт</h2>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-2.5 mb-4 md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:mb-6">
                {/* Search Input */}
                <div className="relative col-span-2 md:col-span-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="material-icons text-xl text-ink/40">search</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="Нэр эсвэл захиалгын дугаар..."
                    className="h-11 w-full rounded-full border-transparent bg-surface pl-11 pr-4 text-sm md:h-10 md:rounded-md md:border-input md:bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Start Date Picker */}
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 w-full justify-start rounded-full px-3 text-left text-xs font-medium md:rounded-md md:px-4 md:text-sm md:font-normal"
                      >
                        <span className="material-icons mr-1.5 text-lg text-ink/40 md:mr-2 md:text-xl">
                          event
                        </span>
                        {startDate
                          ? format(startDate, "yyyy-MM-dd")
                          : "Эхлэх огноо"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date || undefined);
                          // If end date is before start date, reset it
                          if (date && endDate && date > endDate) {
                            setEndDate(undefined);
                          }
                        }}
                        initialFocus
                      />
                      {startDate && (
                        <div className="p-2 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() => setStartDate(undefined)}
                          >
                            Цэвэрлэх
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date Picker */}
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 w-full justify-start rounded-full px-3 text-left text-xs font-medium md:rounded-md md:px-4 md:text-sm md:font-normal"
                      >
                        <span className="material-icons mr-1.5 text-lg text-ink/40 md:mr-2 md:text-xl">
                          event
                        </span>
                        {endDate
                          ? format(endDate, "yyyy-MM-dd")
                          : "Дуусах огноо"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) =>
                          startDate ? date < startDate : false
                        }
                      />
                      {endDate && (
                        <div className="p-2 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() => setEndDate(undefined)}
                          >
                            Цэвэрлэх
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status Filter: chips with counts on phones */}
                <div className="col-span-2 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:hidden">
                  {[
                    { value: "all", label: "Бүгд", count: orders.length },
                    ...ORDER_STATUSES.map((status) => ({
                      value: status.value,
                      label: STATUS_LABELS[status.value] || status.label,
                      count: orders.filter((order) => order.status === status.value).length,
                    })),
                  ].map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setStatusFilter(chip.value)}
                      className={cn(
                        "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                        statusFilter === chip.value
                          ? "border-ink bg-ink text-white"
                          : "border-ink/15 bg-white text-ink",
                      )}
                    >
                      {chip.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[11px] font-bold",
                          statusFilter === chip.value
                            ? "bg-white/20 text-white"
                            : chip.value === "pending" && chip.count > 0
                              ? "bg-brand text-white"
                              : "bg-ink/5 text-ink/50",
                        )}
                      >
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Төлөв сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүгд</SelectItem>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {t.orderStatus[
                            status.value as keyof typeof t.orderStatus
                          ] || status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Phones: receipt-list style instead of a sideways-scrolling table */}
              <div className="md:hidden">
                <div className="mb-1 flex items-baseline justify-between border-b border-ink/10 pb-3 text-sm">
                  <span className="font-semibold text-ink">
                    Нийт{" "}
                    <span className="font-display text-base font-extrabold text-brand">
                      {filteredOrders.length}
                    </span>{" "}
                    захиалга
                  </span>
                  <span className="text-ink/60">
                    Нийт дүн{" "}
                    <span className="font-display text-base font-extrabold text-brand">
                      {formatPrice(
                        filteredOrders.reduce(
                          (sum, order) => sum + parseFloat(order.totalAmount.toString()),
                          0,
                        ),
                      )}
                    </span>
                  </span>
                </div>
                {isLoading ? (
                  <div className="space-y-3 py-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl bg-ink/5" />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink/50">
                    {searchQuery || statusFilter !== "all"
                      ? "Хайлтад тохирох захиалга олдсонгүй"
                      : "Захиалга байхгүй байна"}
                  </p>
                ) : (
                  <ul className="divide-y divide-ink/10">
                    {filteredOrders.map((order) => {
                      const placed = normalizeDate(order.createdAt);
                      return (
                        <li key={order.id}>
                          <button
                            type="button"
                            onClick={() => handleViewOrder(order.id)}
                            className="flex w-full items-center gap-3 py-4 text-left"
                            data-testid={`order-row-${order.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-bold text-ink">
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
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand/25 text-brand">
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
                        Утас
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
                    {isLoading ? (
                      Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <tr key={i}>
                            <td colSpan={7} className="px-6 py-4">
                              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                            </td>
                          </tr>
                        ))
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {searchQuery || statusFilter !== "all"
                            ? "Хайлтад тохирох захиалга олдсонгүй"
                            : "Захиалга байхгүй байна"}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatOrderId(order.id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.customerPhone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(order.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <OrderStatusBadge
                                status={order.status}
                                orderId={order.id}
                                isEditable={true}
                                forceLanguage="mn"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-brand hover:text-brand-deep hover:bg-brand/5"
                                onClick={() => {
                                  setSmsOrder(order);
                                  setSmsDialogOpen(true);
                                }}
                                title="SMS илгээх"
                                data-testid={`button-sms-${order.id}`}
                              >
                                <span className="material-icons text-lg">
                                  sms
                                </span>
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                className="text-primary hover:text-primary-dark"
                                onClick={() => handleViewOrder(order.id)}
                              >
                                Харах
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0 h-8 w-8"
                                onClick={() => setOrderToDelete(order)}
                                title="Устгах"
                              >
                                <span className="material-icons text-lg">delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination (if needed) */}
              {filteredOrders.length > 0 && (
                <div className="mt-4 hidden md:flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Нийт: {filteredOrders.length} захиалга
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Order details as an e-receipt (phone and PC) */}
          <Dialog
            open={orderDetailsOpen}
            onOpenChange={(open) => (open ? setOrderDetailsOpen(true) : handleCloseDetails())}
          >
            <DialogContent className="scrollbar-hide max-h-[92vh] w-[calc(100vw-24px)] max-w-md gap-0 overflow-y-auto rounded-2xl p-0">
              <DialogHeader className="border-b border-ink/10 bg-white px-5 py-4 text-left">
                <DialogTitle className="font-display text-lg font-extrabold">
                  Цахим баримт
                </DialogTitle>
              </DialogHeader>
              {selectedOrder ? (
                <OrderReceipt
                  order={selectedOrder}
                  onSms={() => {
                    setSmsOrder(selectedOrder);
                    setSmsDialogOpen(true);
                  }}
                  onDelete={() => {
                    handleCloseDetails();
                    setOrderToDelete(selectedOrder);
                  }}
                />
              ) : (
                <div className="py-10 text-center text-ink/50">
                  Захиалгын мэдээлэл олдсонгүй
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* SMS Message Dialog */}
          <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
            <DialogContent className="scrollbar-hide max-h-[92vh] w-[calc(100vw-24px)] max-w-md gap-0 overflow-y-auto rounded-2xl p-0">
              <DialogHeader className="border-b border-ink/10 bg-white px-5 py-4 text-left">
                <DialogTitle className="flex items-center gap-2 font-display text-lg font-extrabold">
                  <span className="material-icons text-brand">sms</span>
                  SMS мессеж илгээх
                </DialogTitle>
                <DialogDescription className="text-ink/60">
                  Доорх мессежийг хуулж, харилцагчид илгээнэ үү
                </DialogDescription>
              </DialogHeader>

              {smsOrder && (
                <div className="space-y-4 px-5 py-4 text-ink">
                  {/* Customer Info */}
                  <div className="space-y-1.5 rounded-xl bg-surface p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-base text-ink/40">person</span>
                      <span className="font-semibold">{smsOrder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-base text-ink/40">phone</span>
                      <a
                        href={`tel:${smsOrder.customerPhone}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {smsOrder.customerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink/60">
                      Захиалга: {formatOrderId(smsOrder.id)}
                    </span>
                    <span className="font-display text-base font-extrabold text-brand">
                      {formatPrice(smsOrder.totalAmount)}
                    </span>
                  </div>

                  {/* SMS Message Selection */}
                  <div className="space-y-2.5">
                    <p className="font-display text-sm font-extrabold">Мессеж сонгох</p>
                    {Object.entries(SMS_TEMPLATES).map(([status, getMessage]) => {
                      const message = getMessage(formatPrice(smsOrder.totalAmount));
                      const statusLabels: Record<string, string> = {
                        pending: "Төлбөр хүлээгдэж байна",
                        payment_confirmed: "Төлбөр төлөгдсөн",
                        processing: "Бэлтгэгдэж байна",
                        shipped: "Хүргэлтэд гарсан",
                        delivered: "Хүргэгдсэн",
                        cancelled: "Цуцлагдсан",
                      };
                      // Orders use "completed"; its template is "delivered"
                      const currentKey =
                        smsOrder.status === "completed" ? "delivered" : smsOrder.status;
                      const isCurrent = currentKey === status;

                      return (
                        <div
                          key={status}
                          className={cn(
                            "cursor-pointer rounded-xl border p-3.5 transition-colors",
                            isCurrent
                              ? "border-brand bg-brand/5"
                              : "border-ink/10 bg-white hover:border-brand/40",
                          )}
                          onClick={() => {
                            const encodedMessage = encodeURIComponent(message);
                            // Use different format for iOS vs Android
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            const smsUrl = isIOS
                              ? `sms:${smsOrder.customerPhone}&body=${encodedMessage}`
                              : `sms:${smsOrder.customerPhone}?body=${encodedMessage}`;
                            window.location.href = smsUrl;
                          }}
                          data-testid={`sms-template-${status}`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-ink/50">
                              {statusLabels[status]}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                                Одоогийн төлөв
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{message}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs text-ink/50">
                              <span className="material-icons text-sm">phone_iphone</span>
                              {smsOrder.customerPhone}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-brand">
                              <span className="material-icons text-sm">send</span>
                              Дарж илгээх
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct SMS Link (for mobile) */}
                  <a
                    href={`sms:${smsOrder.customerPhone}`}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded bg-ink font-display font-bold text-white transition-colors hover:bg-brand"
                    data-testid="button-open-sms-app"
                  >
                    <span className="material-icons">message</span>
                    SMS апп нээх
                  </a>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Захиалга устгах</AlertDialogTitle>
                <AlertDialogDescription>
                  {orderToDelete && (
                    <>
                      Та <strong>{formatOrderId(orderToDelete.id)}</strong> дугаартай захиалгыг устгахдаа итгэлтэй байна уу?
                      <br />
                      Энэ үйлдлийг буцаах боломжгүй бөгөөд захиалгын бүх мэдээлэл устах болно.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteOrderMutation.isPending}>Болих</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                  disabled={deleteOrderMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (orderToDelete) {
                      deleteOrderMutation.mutate(orderToDelete.id);
                    }
                  }}
                >
                  {deleteOrderMutation.isPending ? "Устгаж байна..." : "Устгах"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
