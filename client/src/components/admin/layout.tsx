import React, { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "./sidebar";
import { apiRequest } from "@/lib/queryClient";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/check-auth"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/check-auth");
      return response as { authenticated: boolean };
    },
  });

  useEffect(() => {
    if (data && !data.authenticated && !location.includes("/admin/login")) {
      setLocation("/admin/login");
    }
  }, [data, location, setLocation]);

  // Early return for loading state MUST come after all use* hook declarations
  if (isLoading && !location.includes("/admin/login")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <span className="material-icons text-brand text-4xl animate-spin">
            settings
          </span>
          <p className="mt-2 text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  if (data && !data.authenticated && !location.includes("/admin/login")) {
    return null;
  }

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
