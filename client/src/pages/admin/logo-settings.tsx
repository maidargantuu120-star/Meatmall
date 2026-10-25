import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image } from "lucide-react";

// Create form schema
const logoFormSchema = z.object({
  logoUrl: z.string().optional(),
});

type LogoFormValues = z.infer<typeof logoFormSchema>;

interface LogoSettings {
  logoUrl: string;
}

export default function LogoSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current logo settings
  const { data: logoSettings, isLoading } = useQuery<LogoSettings>({
    queryKey: ["/api/settings/logo"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/settings/logo");
      } catch (error) {
        console.error("Error fetching logo settings:", error);
        return {
          logoUrl: "/logo-new.png", // Default logo
        };
      }
    },
  });

  // Set default form values and image preview when data loads
  useEffect(() => {
    if (logoSettings) {
      form.reset({
        logoUrl: logoSettings.logoUrl,
      });

      if (logoSettings.logoUrl) {
        setImagePreview(logoSettings.logoUrl);
      }
    }
  }, [logoSettings]);

  const form = useForm<LogoFormValues>({
    resolver: zodResolver(logoFormSchema),
    defaultValues: {
      logoUrl: "",
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Clear logoUrl field when uploading a new file
      form.setValue("logoUrl", "");
    }
  };

  const onSubmit = async (data: LogoFormValues) => {
    setIsSubmitting(true);
    try {
      // Create FormData object for file upload
      const formData = new FormData();

      // Add the file if one was selected
      if (selectedFile) {
        formData.append("logo", selectedFile);
      }

      // Only add logoUrl if no file is selected
      if (!selectedFile && data.logoUrl) {
        formData.append("logoUrl", data.logoUrl);
      }

      // Send request to update logo settings
      const response = await fetch("/api/settings/logo", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update logo settings");
      }

      const updatedSettings = await response.json();

      // Show success toast
      toast({
        title: "Амжилттай шинэчлэгдлээ",
        description: "Логог амжилттай хадгалагдлаа",
      });

      // Invalidate logo settings cache
      queryClient.invalidateQueries({ queryKey: ["/api/settings/logo"] });
    } catch (error) {
      console.error("Error updating logo settings:", error);
      toast({
        title: "Алдаа гарлаа",
        description: "Логог шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex">
      <AdminSidebar />

      <div className="flex-1 overflow-hidden">
        <AdminHeader title="Лого тохиргоо" />

        <div
          className="p-6 overflow-auto"
          style={{ height: "calc(100vh - 70px)" }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Вебсайт лого</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Лого URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/logo-new.png"
                                  {...field}
                                  disabled={!!selectedFile}
                                />
                              </FormControl>
                              <FormDescription>
                                Лого зурагны URL хаяг эсвэл доор шинэ лого файл
                                оруулна уу
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Logo upload component */}
                        <div className="mt-4">
                          <div className="flex items-center mb-2">
                            <span className="text-sm font-medium">
                              Лого оруулах
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div
                              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <div className="flex flex-col items-center justify-center py-4">
                                <Image className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Лого оруулахын тулд энд дарна уу
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  (PNG, JPG, SVG)
                                </span>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/svg+xml"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Logo preview */}
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Лого урьдчилсан харагдац
                        </div>
                        {imagePreview ? (
                          <div className="relative bg-gray-100 dark:bg-gray-800 p-4 rounded-md flex items-center justify-center">
                            <img
                              src={imagePreview}
                              alt="Logo Preview"
                              className="max-h-32 max-w-full object-contain"
                            />
                            {selectedFile && (
                              <button
                                type="button"
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                onClick={() => {
                                  setSelectedFile(null);
                                  setImagePreview(
                                    logoSettings?.logoUrl || null,
                                  );
                                  form.setValue(
                                    "logoUrl",
                                    logoSettings?.logoUrl || "",
                                  );
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-300 rounded-md p-4 h-40 flex items-center justify-center">
                            <span className="text-gray-400">
                              Лого байхгүй байна
                            </span>
                          </div>
                        )}

                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Зөвлөмж:</h4>
                          <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                            <li>Хамгийн сайн харагдах хэмжээ: 200x60 пиксел</li>
                            <li>
                              Дэвсгэр нь тунгалаг байх нь зүйтэй (PNG эсвэл SVG
                              зураг)
                            </li>
                            <li>Файлын хэмжээ: 2MB-с бага байх</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          (!form.getValues("logoUrl") && !selectedFile)
                        }
                      >
                        {isSubmitting && (
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                        )}
                        Хадгалах
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Usage in Navbar preview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Логоны харагдац</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Navbar light mode preview */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">
                  Цайвар өнгөтэй дэвсгэр:
                </h3>
                <div className="bg-gray-100 p-4 rounded-md">
                  <div className="flex items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview || logoSettings?.logoUrl}
                        alt="Logo"
                        className="h-10 mr-2"
                      />
                    ) : (
                      <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
                    )}
                    <div className="ml-auto flex space-x-4">
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navbar dark mode preview */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Харанхуй өнгөтэй дэвсгэр:
                </h3>
                <div className="bg-gray-800 p-4 rounded-md">
                  <div className="flex items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview || logoSettings?.logoUrl}
                        alt="Logo"
                        className="h-10 mr-2"
                      />
                    ) : (
                      <div className="h-10 w-32 bg-gray-700 animate-pulse rounded"></div>
                    )}
                    <div className="ml-auto flex space-x-4">
                      <div className="w-12 h-4 bg-gray-600 rounded"></div>
                      <div className="w-12 h-4 bg-gray-600 rounded"></div>
                      <div className="w-12 h-4 bg-gray-600 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
