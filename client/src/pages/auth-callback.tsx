import { useEffect } from "react";
import { useLocation } from "wouter";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Since we removed Google OAuth for now, just redirect to home
    // In the future, this page can handle OAuth callbacks if implemented via backend
    console.log("Auth callback hit, redirecting home");
    setLocation("/");
  }, [setLocation]);

  return <LoadingScreen text="Redirecting..." />;
}
