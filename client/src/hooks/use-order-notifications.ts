import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

/**
 * Custom hook for managing order notifications
 * Monitors pending order count using polling
 */
let observedLatestId: number | undefined;
export function useOrderNotifications() {
  const { user } = useAuth();
  // Ensure we only poll for admins
  const isAdmin = user?.isAdmin || false;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/orders/pending-count"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orders/pending-count");
      return response;
    },
    // Only fetch if user is admin
    enabled: !!user && isAdmin,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
  // The periodic check reads only the indexed newest ID, never order history.
  const { data: latest } = useQuery<{ latestOrderId: number }>({
    queryKey: ['/api/orders/latest-id'],
    queryFn: () => apiRequest('GET', '/api/orders/latest-id'),
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });
  useEffect(() => {
    if (latest?.latestOrderId === undefined) return;
    if (observedLatestId !== undefined && observedLatestId !== latest.latestOrderId) {
      void queryClient.invalidateQueries({ queryKey: ['/api/orders/pending-count'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
    observedLatestId = latest.latestOrderId;
  }, [latest?.latestOrderId, queryClient]);

  return {
    pendingCount: data?.count || 0,
    // Newest order id (undefined until loaded); grows when a new order is placed
    latestOrderId: latest?.latestOrderId ?? data?.latestOrderId as number | undefined,
    isLoading,
  };
}
