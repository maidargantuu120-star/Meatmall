import { getOrderStatusColor, translateOrderStatus } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import { useLanguage } from "@/contexts/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface OrderStatusBadgeProps {
  status: string;
  orderId: number;
  isEditable?: boolean;
  forceLanguage?: "mn" | "ru" | "en"; // 강제로 특정 언어 사용
}

export function OrderStatusBadge({
  status,
  orderId,
  isEditable = false,
  forceLanguage,
}: OrderStatusBadgeProps) {
  const { t, language } = useLanguage();
  const statusColor = getOrderStatusColor(status);

  // 몽골어 번역 정의
  const mongolianOrderStatus = {
    pending: "Төлбөр төлөлт хүлээгдэж байна",
    processing: "Төлбөр төлөгдсөн",
    completed: "Хүргэгдсэн",
    cancelled: "Цуцлагдсан",
  };

  // forceLanguage가 있으면 해당 언어 사용, 없으면 현재 언어 사용
  const translatedStatus =
    forceLanguage === "mn"
      ? mongolianOrderStatus[status as keyof typeof mongolianOrderStatus] ||
        status
      : t.orderStatus[status as keyof typeof t.orderStatus] || status;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    // Snapshot previous data for rollback
    const previousOrders = queryClient.getQueriesData({
      queryKey: ["/api/orders"],
    });

    try {
      // 1. Optimistic Update (Update UI immediately)
      console.log(
        "🔄 Optimistic Update Started for Order:",
        orderId,
        "New Status:",
        newStatus,
      );

      await queryClient.cancelQueries({ queryKey: ["/api/orders"] });

      queryClient.setQueriesData(
        { queryKey: ["/api/orders"] },
        (oldData: any) => {
          if (!oldData) {
            console.log("⚠️ No old data found for query");
            return oldData;
          }
          if (!Array.isArray(oldData)) {
            console.log("⚠️ Old data is not an array:", oldData);
            return oldData;
          }

          console.log(`✅ Updating ${oldData.length} orders in cache`);
          return oldData.map((order: any) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
          );
        },
      );

      // 2. Perform API Call
      await apiRequest("PATCH", `/api/orders/${orderId}/status`, {
        status: newStatus,
      });

      const statusText =
        forceLanguage === "mn"
          ? mongolianOrderStatus[
              newStatus as keyof typeof mongolianOrderStatus
            ] || newStatus
          : t.orderStatus[newStatus as keyof typeof t.orderStatus] || newStatus;

      logger.custom("🔄", "주문 상태 변경 성공:", {
        orderId: orderId,
        newStatus: newStatus,
      });

      toast({
        title: "Төлөв шинэчлэгдлээ",
        description: `Захиалгын төлөв '${statusText}' болж шинэчлэгдлээ.`,
      });

      // 3. Invalidate to ensure consistency (background refetch)
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (error: any) {
      console.error("❌ Failed to update status", error);

      // Rollback on error
      queryClient.setQueriesData(
        { queryKey: ["/api/orders"] },
        (oldData: any) => {
          // Ideally restore from previousOrders, but simple refetch is often enough
          return oldData;
        },
      );
      // Restore specific queries
      previousOrders.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      logger.error("주문 상태 변경 실패:", {
        orderId: orderId,
        targetStatus: newStatus,
        error: error.message || error,
      });

      toast({
        title: "Алдаа гарлаа",
        description:
          "Захиалгын төлөв шинэчлэх үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isEditable) {
    return (
      <span
        className={cn(
          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
          statusColor,
        )}
      >
        {translatedStatus}
      </span>
    );
  }

  return (
    <div className="relative">
      <Select
        defaultValue={status}
        onValueChange={handleUpdateStatus}
        disabled={isUpdating}
      >
        <SelectTrigger
          className={cn("h-7 text-xs font-semibold border-none", statusColor)}
        >
          <SelectValue>{translatedStatus}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map((statusOption) => (
            <SelectItem key={statusOption.value} value={statusOption.value}>
              {forceLanguage === "mn"
                ? mongolianOrderStatus[
                    statusOption.value as keyof typeof mongolianOrderStatus
                  ] || statusOption.label
                : t.orderStatus[
                    statusOption.value as keyof typeof t.orderStatus
                  ] || statusOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-full">
          <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
