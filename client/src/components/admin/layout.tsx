import { ReactNode } from "react";
import { Redirect } from "wouter";
import { AdminSidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  // Reuse the storefront identity instead of a second cached authentication
  // result. Protected APIs independently enforce the administrator role.
  if (isLoading) return <LoadingScreen text="Нэвтрэх эрхийг шалгаж байна..." />;
  if (!user?.isAdmin) return <Redirect to="/admin/login?redirect=true" />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-surface relative">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area - Make sure it has a top margin on mobile to account for the fixed mobile header */}
      <div className="flex-1 mt-16 md:mt-0 w-full">
        {/* Content wrapper with padding */}
        <div className="px-3 py-3 md:px-8 md:py-6">{children}</div>
      </div>
    </div>
  );
}
