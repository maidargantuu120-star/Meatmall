import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price in KRW (Korean Won)
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return "₩" + numPrice.toLocaleString("ko-KR");
}

// Generate order id
export function formatOrderId(id: number): string {
  return `#ORD-${id.toString().padStart(4, "0")}`;
}

// Format date to locale string (Korean format)
// Parses DB timestamps into a real Date, undoing the ms-stored-but-read-as-seconds mixup
export function normalizeDate(date: Date | string | number): Date {
  let dateObj: Date;

  if (typeof date === "string") {
    dateObj = new Date(date);
  } else if (typeof date === "number") {
    // Handle case where timestamp might be in seconds instead of milliseconds
    dateObj = date > 10000000000 ? new Date(date) : new Date(date * 1000);
  } else {
    dateObj = date;
  }

  // Check if year is unreasonably large (timestamps stored as ms but interpreted as seconds)
  if (dateObj.getFullYear() > 3000) {
    // Divide by 1000 to get correct date if it's a far-future year
    dateObj = new Date(dateObj.getTime() / 1000);
  }

  return dateObj;
}

export function formatDate(date: Date | string | number): string {
  return normalizeDate(date).toLocaleDateString("ko-KR");
}

// Placeholder image URLs
export const meatImages = {
  beef: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&h=300",
  lamb: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=500&h=300",
  chicken:
    "https://images.unsplash.com/photo-1615887087343-6a32f45ac0f1?auto=format&fit=crop&w=500&h=300",
  pork: "https://images.unsplash.com/photo-1594044152669-0ca46591e90c?auto=format&fit=crop&w=500&h=300",
  other:
    "https://images.unsplash.com/photo-1545155226-61f273e3638a?auto=format&fit=crop&w=500&h=300",
};

// Get color for category badge
export function getCategoryColor(category: string): {
  bg: string;
  text: string;
} {
  switch (category) {
    case "Үхрийн мах":
      return { bg: "bg-red-100", text: "text-red-800" };
    case "Хонины мах":
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case "Тахианы мах":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "Гахайн мах":
      return { bg: "bg-green-100", text: "text-green-800" };
    default:
      return { bg: "bg-purple-100", text: "text-purple-800" };
  }
}

// Get color for order status badge
export function getOrderStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "#F59E0B";
    case "processing":
      return "#3B82F6";
    case "completed":
      return "#10B981";
    case "cancelled":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

// Order status translation (Mongolian)
export function translateOrderStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Төлбөр төлөлт хүлээгдэж байна";
    case "processing":
      return "Төлбөр төлөгдсөн";
    case "completed":
      return "Хүргэлт дууссан";
    case "cancelled":
      return "Цуцалсан";
    default:
      return status;
  }
}

// Multi-language order status translation function
export function getOrderStatusText(status: string, language: string): string {
  const statusMap: { [key: string]: { [lang: string]: string } } = {
    pending: {
      mn: "Хүлээж байна",
      ru: "Ожидание",
      en: "Pending",
    },
    processing: {
      mn: "Боловсруулж байна",
      ru: "Обработка",
      en: "Processing",
    },
    completed: {
      mn: "Дууссан",
      ru: "Завершено",
      en: "Completed",
    },
    cancelled: {
      mn: "Цуцалсан",
      ru: "Отменено",
      en: "Cancelled",
    },
  };

  return statusMap[status]?.[language] || status;
}
