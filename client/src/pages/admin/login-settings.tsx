import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
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
import { Image as ImageIcon, Loader2, Upload, Trash2 } from "lucide-react";
import { getFullImageUrl, compressImage, uploadMedia } from "@/lib/image-utils";
import { logger } from "@/lib/logger";

export default function LoginSettingsPage() {
  const { toast } = useToast();
  const [loginImages, setLoginImages] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch login images settings
  const { data: loginImagesData, isLoading } = useQuery<{ images: string[] }>({
    queryKey: ["/api/settings/login-images"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/login-images", {
          credentials: "include",
          cache: "no-cache",
          mode: "same-origin",
        });
        if (!response.ok) throw new Error("Failed to fetch login images");
        return await response.json();
      } catch (error) {
        console.error("Error fetching login images:", error);
        return { images: [] };
      }
    },
  });

  // Initialize state once data is loaded
  if (!isInitialized && loginImagesData) {
    setLoginImages(loginImagesData.images.join("\n"));
    setIsInitialized(true);
  }

  // Mutation to update login images
  const updateLoginImagesMutation = useMutation({
    mutationFn: async (images: string[]) => {
      const res = await apiRequest("PUT", "/api/settings/login-images", {
        images,
      });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Амжилттай",
        description: "Нэвтрэх хэсгийн зураг шинэчлэгдлээ",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/settings/login-images"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Алдаа гарлаа",
        description: error.message || "Зураг шинэчлэхэд алдаа гарлаа",
        variant: "destructive",
      });
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      logger.custom("🖼️", "Compressing login background image...");
      const compressedFile = await compressImage(file, 1920, 0.85);

      logger.custom("📤", "Uploading to R2...");
      const result = await uploadMedia(compressedFile, { optimized: true });

      const currentImages = loginImages.trim() ? loginImages.split("\n") : [];
      setLoginImages([...currentImages, result.url].join("\n"));

      toast({
        title: "Амжилттай",
        description: "Зураг амжилттай хуулагдаж, жагсаалтад нэмэгдлээ.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Алдаа",
        description: "Зураг хуулахад алдаа гарлаа",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imagesArray = loginImages
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url !== "");

    updateLoginImagesMutation.mutate(imagesArray);
  };

  return (
    <AdminLayout>
      <div className="flex-1 overflow-hidden flex flex-col">
        <AdminHeader
          title="Нэвтрэх хэсгийн зураг"
          description="Нэвтрэх болон бүртгүүлэх хэсгийн арын дэвсгэр зурагнууд"
          icon={<ImageIcon className="h-6 w-6" />}
        />

        <div className="p-6 overflow-auto flex-1 max-md:overflow-visible max-md:px-0 max-md:pb-0 max-md:pt-3">
          <Card className="shadow-md max-w-4xl max-md:rounded-2xl max-md:border-ink/10 max-md:shadow-none">
            <CardHeader className="max-md:p-4">
              <CardTitle className="text-brand max-md:font-display max-md:text-lg max-md:font-extrabold max-md:leading-snug">
                Нэвтрэх хэсгийн зураг
              </CardTitle>
              <CardDescription className="max-md:text-xs max-md:text-ink/60">
                Cloudflare-т оруулсан зургийнхаа Public link-ийг энд нэг мөрөнд
                нэгийг бичээрэй.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-md:p-4 max-md:pt-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="loginImages"
                      className="max-md:text-xs max-md:font-semibold max-md:text-ink/60"
                    >
                      Зургийн URL-ууд (Мөр бүрт нэг)
                    </Label>
                    <textarea
                      id="loginImages"
                      className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-[220px] max-md:rounded-2xl max-md:border-transparent max-md:bg-surface max-md:px-4 max-md:py-3 max-md:text-base"
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      value={loginImages}
                      onChange={(e) => setLoginImages(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t pt-4 max-sm:items-stretch max-md:gap-3 max-md:border-ink/10">
                    <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-brand text-brand hover:bg-brand/10 max-md:h-11 max-sm:w-full max-md:rounded-full max-md:font-semibold"
                        onClick={() =>
                          document.getElementById("file-upload")?.click()
                        }
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Зураг хуулах (WebP)
                      </Button>
                      <p className="text-[10px] text-gray-500 max-md:px-1 max-md:text-[11px] max-md:text-ink/40">
                        * Автоматаар WebP формат руу хөрвүүлж, хэмжээг оновчтой
                        болгоно.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="bg-brand hover:bg-brand-deep min-w-[120px] max-md:h-11 max-sm:w-full max-md:rounded-full max-md:font-semibold"
                      disabled={updateLoginImagesMutation.isPending}
                    >
                      {updateLoginImagesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Хадгалж байна...
                        </>
                      ) : (
                        "Хадгалах"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Preview Section */}
          {!isLoading && loginImages.trim() && (
            <div className="mt-8 max-md:mt-4 max-md:rounded-2xl max-md:border max-md:border-ink/10 max-md:bg-white max-md:p-4">
              <h3 className="text-lg font-semibold mb-4 text-brand max-md:mb-3 max-md:font-display max-md:text-base max-md:font-extrabold">
                Урьдчилсан харагдац
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-md:gap-2.5">
                {loginImages
                  .split("\n")
                  .filter((url) => url.trim())
                  .map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-[3/4] rounded-lg overflow-hidden border shadow-sm max-md:rounded-xl max-md:border-ink/10 max-md:bg-surface max-md:shadow-none"
                    >
                      <img
                        src={url.trim()}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/600x800?text=Invalid+Image+URL";
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
