import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2 } from "lucide-react";

interface SiteNameSettings {
  siteName: string;
}

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch site name settings
  const { data: siteSettings } = useQuery<SiteNameSettings>({
    queryKey: ["/api/settings/site-name"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/site-name", {
          credentials: "include",
          cache: "no-cache",
          mode: "same-origin",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch site name settings");
        }

        return await response.json();
      } catch (error) {
        console.error("Error fetching site name settings:", error);
        return { siteName: "Гэрийн Мах" }; // Default site name
      }
    },
  });

  // Initialize state once data is loaded
  if (!isInitialized && siteSettings) {
    setSiteName(siteSettings.siteName);
    setIsInitialized(true);
  }

  // Mutation to update site name
  const updateSiteNameMutation = useMutation({
    mutationFn: async (data: { siteName: string }) => {
      const res = await apiRequest("PUT", "/api/settings/site-name", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Амжилттай",
        description: "Сайтын нэр шинэчлэгдлээ",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/site-name"] });
    },
  });

  const handleSubmitSiteName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      toast({
        title: "Алдаа",
        description: "Сайтын нэр хоосон байж болохгүй",
        variant: "destructive",
      });
      return;
    }
    updateSiteNameMutation.mutate({ siteName });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-brand to-[#16a34a] inline-block px-4 py-2 rounded-lg shadow-sm">
          Сайтын тохиргоо
        </h1>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-md max-w-2xl">
            <CardHeader>
              <CardTitle className="text-brand">Сайтын нэр</CardTitle>
              <CardDescription>Сайтын дээд хэсэгт харагдах нэр</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitSiteName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Сайтын нэр</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    className="bg-brand hover:bg-[#084130]"
                    disabled={updateSiteNameMutation.isPending}
                  >
                    {updateSiteNameMutation.isPending
                      ? "Хадгалж байна..."
                      : "Хадгалах"}
                  </Button>

                  {updateSiteNameMutation.isSuccess && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
