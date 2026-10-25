import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useOrderNotifications } from "@/hooks/use-order-notifications";

export interface AdminHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  showBackButton?: boolean;
}

export function AdminHeader({
  title,
  description,
  icon,
  showBackButton = true,
}: AdminHeaderProps) {
  // This would come from the admin's session in a real app
  const adminName = "Админ";

  // Use order notifications hook for vibration alerts
  const { pendingCount } = useOrderNotifications();

  // Legacy query for fallback (keeping for compatibility)
  const { data: pendingData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/pending-orders-count"],
    refetchInterval: 30000, // Refresh every 30 seconds - less frequent for better performance
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const pendingOrdersCount = pendingCount || pendingData?.count || 0;

  return (
    <header className="bg-white rounded-2xl shadow-card border-l-4 border-brand">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center min-w-0">
          {showBackButton && (
            <Link
              href="/admin"
              className="mr-3 p-2 rounded-full bg-surface hover:bg-ink/10 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-ink" />
            </Link>
          )}
          <div className="min-w-0">
            <div className="flex items-center">
              {icon && <div className="mr-2 text-brand">{icon}</div>}
              <h1
                className={cn(
                  "font-display font-extrabold text-ink leading-tight",
                  "text-lg md:text-2xl", // Smaller on mobile, larger on desktop
                )}
              >
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-xs md:text-sm text-ink/60 mt-1 line-clamp-2 md:line-clamp-none">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center ml-2 flex-shrink-0">
          {/* Hide admin name on small screens */}
          <span className="hidden md:inline text-sm text-ink/60 mr-4">
            Админ: <span className="font-semibold text-ink">{adminName}</span>
          </span>
          <Link
            href="/admin/orders"
            className="p-2 rounded-full bg-surface hover:bg-ink/10 relative"
            aria-label="Захиалгууд"
          >
            <span className="material-icons text-lg text-ink block">
              notifications
            </span>
            <span
              className={cn(
                "absolute -top-1 -right-1 text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center",
                pendingOrdersCount > 0
                  ? "bg-brand text-white animate-pulse"
                  : "bg-ink/10 text-ink/60",
              )}
            >
              {pendingOrdersCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
