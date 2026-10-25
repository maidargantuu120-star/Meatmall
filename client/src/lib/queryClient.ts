import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<any> {
  try {
    // Handle overloaded function signature to support both usage patterns:
    // 1. apiRequest('GET', '/api/endpoint')
    // 2. apiRequest('/api/endpoint', 'GET')
    // 3. apiRequest('/api/endpoint', { data })
    let method: string;
    let url: string;
    let requestData: unknown | undefined;

    // Use environment variable for API base URL or default to empty (relative)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

    if (urlOrData === undefined) {
      // Pattern: apiRequest('/api/endpoint')
      method = "GET";
      url = apiBaseUrl + methodOrUrl;
      requestData = undefined;
    } else if (typeof urlOrData === "string") {
      // Pattern: apiRequest('GET', '/api/endpoint', data)
      method = methodOrUrl;
      url = apiBaseUrl + urlOrData;
      requestData = data;
    } else {
      // Pattern: apiRequest('/api/endpoint', data)
      method = "POST";
      url = apiBaseUrl + methodOrUrl;
      requestData = urlOrData;
    }

    console.log(`API Request: ${method} ${url}`);
    if (requestData) {
      console.log("Request data:", requestData);
    }

    const headers: Record<string, string> = requestData
      ? { "Content-Type": "application/json" }
      : {};

    // Enhanced mobile cookie handling for API requests
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
      headers["X-Requested-With"] = "XMLHttpRequest";
    }

    // Add explicit cookie header if available for mobile compatibility
    if (typeof document !== "undefined" && document.cookie) {
      headers["Cookie"] = document.cookie;
    }

    const options: RequestInit = {
      method,
      headers,
      body: requestData ? JSON.stringify(requestData) : undefined,
      credentials: "include", // Important for cookies/session
      cache: "no-cache", // Prevent caching issues
      // "cors" allows cross-origin calls from the native app (origin https://localhost)
      // to the Cloudflare API domain. Same-origin web requests still work under "cors".
      mode: "cors",
    };

    console.log("Sending fetch request with options:", options);
    const res = await fetch(url, options);
    console.log(`Response status: ${res.status}`);

    // Log cookies and headers for debugging
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => (resHeaders[k] = v));
    console.log("Response headers:", resHeaders);

    await throwIfResNotOk(res);

    // If status is 204 No Content, return undefined
    if (res.status === 204) {
      console.log("Received 204 No Content");
      return undefined;
    }

    // Check content type to determine how to parse the response
    const contentType = res.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      // If it's JSON, parse it as JSON
      try {
        const jsonResponse = await res.json();
        console.log("Response data:", jsonResponse);
        return jsonResponse;
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        throw parseError;
      }
    } else {
      // If it's not JSON (e.g., HTML), return success object
      const text = await res.text();
      console.log(
        "Non-JSON response:",
        text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      );
      return { success: true, status: res.status };
    }
  } catch (error) {
    console.error("API Request error:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Querying: ${queryKey[0]}`);

    const headers: Record<string, string> = {};

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    // Only prepend if it's a relative path starting with /
    const key = queryKey[0] as string;
    const url = key.startsWith("/") ? apiBaseUrl + key : key;

    // Enhanced mobile cookie handling
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
      headers["X-Requested-With"] = "XMLHttpRequest";
    }

    // Add explicit cookie header if available for mobile compatibility
    if (typeof document !== "undefined" && document.cookie) {
      headers["Cookie"] = document.cookie;
    }

    const options: RequestInit = {
      headers,
      credentials: "include", // Important for cookies/session
      cache: "no-cache", // Prevent caching issues
      // "cors" allows cross-origin calls from the native app to the Cloudflare API domain.
      mode: "cors",
    };

    console.log("Query fetch options:", options);
    const res = await fetch(url, options);
    console.log(`Query response status: ${res.status}`);

    // Log headers for debugging
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => (resHeaders[k] = v));
    console.log("Query response headers:", resHeaders);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("401 Unauthorized - returning null as specified");
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log("Query response data:", data);
    return data as any;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch when window regains focus
      staleTime: 30000, // Set stale time to 30 seconds instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
