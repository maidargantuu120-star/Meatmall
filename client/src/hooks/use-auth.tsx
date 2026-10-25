import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, loginSchema, signupSchema } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { setAuthToken, clearAuthToken } from "../lib/auth-token";
import { disablePush } from "../lib/push";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { z } from "zod";

// Types for our context
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  logoutMutation: UseMutationResult<void, Error, void>;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  googleLogin: () => Promise<void>;
};

// Types for login and registration data
type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof signupSchema>;

// Create the context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useLanguage();

  // Query to fetch the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        if (res.status === 401) return null; // Not logged in
        if (res.status === 403) return null; // Not authorized
        throw new Error("Failed to fetch user");
      }
      return await res.json();
    },
    retry: false,
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (data: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = (await res.json()) as { message?: string };
        throw new Error(error.message || "Login failed");
      }

      return await res.json();
    },
    onSuccess: (user) => {
      // 네이티브 앱: 응답의 토큰 저장 (이후 요청에 Authorization 헤더로 첨부)
      setAuthToken((user as any)?.token);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: t.toast.loginSuccess,
        description: t.toast.loginSuccessDesc,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.toast.loginFailed,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (data: RegisterData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = (await res.json()) as { message?: string };
        throw new Error(error.message || "Registration failed");
      }

      const result = (await res.json()) as {
        user: User;
        token?: string;
        message?: string;
      };
      // 네이티브 앱: 응답의 토큰 저장
      setAuthToken(result.token);
      return result.user; // API returns { success: true, user: ..., token: ..., message: ... }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: t.toast.registerSuccess,
        description: t.toast.registerSuccessDesc,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.toast.registerFailed,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      // Stop this phone's notifications for the account that is leaving (needs the session)
      await disablePush().catch(() => {});
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      clearAuthToken();
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      toast({
        title: t.toast.logoutSuccess,
        description: t.toast.logoutSuccessDesc,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.toast.logoutFailed,
        description: error.message,
        variant: "default",
        className: "bg-[#02C75A] text-white border-[#02C75A]",
      });
    },
  });

  // Google Login function (Stubbed)
  const googleLogin = async () => {
    toast({
      title: "Not Implemented",
      description: "Google Login is currently disabled in this version.",
      variant: "default",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        logoutMutation,
        loginMutation,
        registerMutation,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
