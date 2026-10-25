import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image, Plus, Trash2, Upload } from "lucide-react";
import {
  getFullImageUrl,
  handleImageError,
  compressImage,
} from "@/lib/image-utils";
import { logger } from "@/lib/logger";

// Create form schema
const slideSchema = z.object({
  title: z.string().optional().or(z.literal("")),
  text: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
});

const heroFormSchema = z.object({
  slides: z.array(slideSchema).min(1, "Дор хаяж нэг слайд байх ёстой"),
});

type HeroFormValues = z.infer<typeof heroFormSchema>;

export default function HeroSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // File input refs for each slide
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<HeroFormValues>({
    resolver: zodResolver(heroFormSchema),
    defaultValues: {
      slides: [{ title: "", text: "", imageUrl: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slides",
  });

  // Fetch current hero settings
  const { data: heroSettings, isLoading } = useQuery({
    queryKey: ["/api/settings/hero"],
    queryFn: async () => {
      try {
        const data = (await apiRequest("GET", "/api/settings/hero")) as any;
        // Handle migration from legacy object to array
        if (data.slides && Array.isArray(data.slides)) {
          return data;
        } else if (data.title || data.text || data.imageUrl) {
          // Convert legacy single slide to array
          return {
            slides: [
              {
                title: data.title || "",
                text: data.text || "",
                imageUrl: data.imageUrl || "",
              },
            ],
          };
        }
        return { slides: [{ title: "", text: "", imageUrl: "" }] };
      } catch (error) {
        console.error("Error fetching hero settings:", error);
        return {
          slides: [{ title: "", text: "", imageUrl: "" }],
        };
      }
    },
  });

  // Set default form values when data loads
  useEffect(() => {
    if (heroSettings) {
      form.reset({
        slides: heroSettings.slides,
      });
    }
  }, [heroSettings, form]);

  // Handle file selection and upload
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);

    try {
      logger.custom("🖼️", "Compressing hero image...");
      // Banner images can be large, compress to 1920px max width WebP
      const compressedFile = await compressImage(file, 1920, 0.82);

      const formData = new FormData();
      formData.append("file", compressedFile);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${apiBaseUrl}/api/media`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to upload image");

      const data = (await response.json()) as { url: string };

      // Update the form field with the new image URL
      form.setValue(`slides.${index}.imageUrl`, data.url);
      toast({
        title: "Зураг амжилттай хуулагдлаа",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Алдаа",
        description: "Зураг хуулахад алдаа гарлаа",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
      // Reset file input
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index]!.value = "";
      }
    }
  };

  const onSubmit = async (data: HeroFormValues) => {
    setIsSubmitting(true);
    try {
      // Send JSON request to update hero settings
      await apiRequest("PUT", "/api/settings/hero", data);

      // Show success toast
      toast({
        title: "Амжилттай шинэчлэгдлээ",
        description: "Нүүр хуудасны тохиргоо амжилттай хадгалагдлаа",
      });

      // Invalidate hero settings cache
      queryClient.invalidateQueries({ queryKey: ["/api/settings/hero"] });
    } catch (error) {
      console.error("Error updating hero settings:", error);
      toast({
        title: "Алдаа гарлаа",
        description:
          "Нүүр хуудасны тохиргоо шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex max-md:bg-surface">
      <AdminSidebar />

      {/* Phones: pt-16 clears the sidebar's fixed 64px top bar; overflow stays
          visible so the page scrolls on the window and the sticky save bar works */}
      <div className="flex-1 overflow-hidden flex flex-col max-md:min-w-0 max-md:overflow-visible max-md:pt-16">
        <div className="max-md:px-3 max-md:pt-3 md:contents">
          <AdminHeader
            title="Нүүр хуудас зураг"
            description=""
            icon={<Image className="h-6 w-6" />}
          />
        </div>

        <div className="p-6 overflow-auto flex-1 max-md:overflow-visible max-md:px-3 max-md:py-3">
          <Card className="mb-6 max-md:mb-3 max-md:rounded-2xl max-md:border-ink/10 max-md:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between max-md:gap-3 max-md:space-y-0 max-md:p-4">
              <CardTitle className="max-md:min-w-0 max-md:font-display max-md:text-lg max-md:font-extrabold max-md:leading-snug max-md:text-ink">
                Нүүр хуудасны слайдер
              </CardTitle>
              <Button
                onClick={() => append({ title: "", text: "", imageUrl: "" })}
                variant="outline"
                size="sm"
                className="max-md:h-10 max-md:flex-shrink-0 max-md:rounded-full max-md:border-ink/15 max-md:px-3.5 max-md:text-xs max-md:font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Слайд нэмэх
              </Button>
            </CardHeader>
            <CardContent className="max-md:p-4 max-md:pt-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-60">
                  <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6 max-md:space-y-0"
                  >
                    <Accordion
                      type="single"
                      collapsible
                      defaultValue="item-0"
                      className="w-full"
                    >
                      {fields.map((field, index) => (
                        <AccordionItem
                          key={field.id}
                          value={`item-${index}`}
                          className="max-md:border-ink/10"
                        >
                          <AccordionTrigger className="hover:no-underline max-md:min-h-[48px] max-md:gap-2 max-md:py-3">
                            <div className="flex justify-between items-center w-full pr-4 max-md:min-w-0 max-md:pr-0">
                              <span className="font-medium max-md:truncate max-md:text-left max-md:text-sm max-md:font-semibold max-md:text-ink">
                                Слайд {index + 1}:{" "}
                                {form.watch(`slides.${index}.title`) ||
                                  "(Гарчиггүй)"}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 border rounded-md mt-2 bg-gray-50/50 max-md:mt-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:pb-4 max-md:pt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-md:gap-4">
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name={`slides.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="max-md:text-xs max-md:font-semibold max-md:text-ink/60">
                                        Гарчиг
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          className="max-md:h-11 max-md:rounded-full max-md:border-transparent max-md:bg-surface max-md:px-4"
                                          placeholder="Шинэ, Шинэхэн, Чанартай Мах"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`slides.${index}.text`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="max-md:text-xs max-md:font-semibold max-md:text-ink/60">
                                        Тайлбар
                                      </FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Хамгийн чанартайг хэрэглэгч та бүхэндээ хүргэж байна."
                                          className="resize-none max-md:rounded-2xl max-md:border-transparent max-md:bg-surface max-md:px-4 max-md:py-3"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`slides.${index}.imageUrl`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="max-md:text-xs max-md:font-semibold max-md:text-ink/60">
                                        Зурагны URL
                                      </FormLabel>
                                      <FormControl>
                                        <div className="flex gap-2">
                                          <Input
                                            className="max-md:h-11 max-md:rounded-full max-md:border-transparent max-md:bg-surface max-md:px-4 max-md:min-w-0"
                                            {...field}
                                            placeholder="https://example.com/image.jpg"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormDescription className="max-md:text-xs max-md:text-ink/40">
                                        URL шууд оруулах эсвэл доорх товчийг
                                        ашиглан хуулна уу
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="pt-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={(el) =>
                                      (fileInputRefs.current[index] = el)
                                    }
                                    onChange={(e) => handleFileChange(e, index)}
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full max-md:h-11 max-md:rounded-full max-md:bg-ink max-md:font-semibold max-md:text-white max-md:hover:bg-ink/90"
                                    disabled={uploadingIndex === index}
                                    onClick={() =>
                                      fileInputRefs.current[index]?.click()
                                    }
                                  >
                                    {uploadingIndex === index ? (
                                      <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Зураг хуулах
                                  </Button>
                                </div>

                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    className="w-full mt-4 max-md:mt-3 max-md:h-11 max-md:rounded-full max-md:border max-md:border-brand/30 max-md:bg-white max-md:font-semibold max-md:text-brand max-md:hover:bg-brand/5"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Слайд устгах
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-4 max-md:space-y-2">
                                <div className="text-sm font-medium max-md:text-xs max-md:font-semibold max-md:text-ink/60">
                                  Урьдчилсан харагдац
                                </div>
                                {form.watch(`slides.${index}.imageUrl`) ? (
                                  <div className="relative aspect-video rounded-md overflow-hidden border max-md:rounded-xl max-md:border-ink/10">
                                    <img
                                      src={getFullImageUrl(
                                        form.watch(
                                          `slides.${index}.imageUrl`,
                                        ) || "",
                                      )}
                                      alt="Slide preview"
                                      className="w-full h-full object-cover"
                                      onError={(e) =>
                                        handleImageError(
                                          e,
                                          form.watch(
                                            `slides.${index}.imageUrl`,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video rounded-md border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 max-md:rounded-xl max-md:border-ink/15 max-md:bg-surface">
                                    <span className="text-gray-400 max-md:text-sm max-md:text-ink/40">
                                      Зураг байхгүй байна
                                    </span>
                                  </div>
                                )}

                                <div className="p-4 bg-ink text-white rounded-md mt-4 max-md:mt-2 max-md:rounded-xl">
                                  <h3 className="font-bold text-lg mb-2 max-md:break-words max-md:text-base">
                                    {form.watch(`slides.${index}.title`) ||
                                      "Гарчиг"}
                                  </h3>
                                  <p className="text-sm opacity-80 max-md:break-words">
                                    {form.watch(`slides.${index}.text`) ||
                                      "Тайлбар текст..."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    {/* Phones: save bar sticks to the bottom of the screen while the
                        (possibly long) slide list is scrolled */}
                    <div className="flex justify-end pt-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:border-t max-md:border-ink/10 max-md:bg-white max-md:px-4 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:pt-3">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full md:w-auto max-md:h-11 max-md:rounded-full max-md:bg-brand max-md:font-semibold max-md:text-white max-md:hover:bg-brand-deep"
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
        </div>
      </div>
    </div>
  );
}
