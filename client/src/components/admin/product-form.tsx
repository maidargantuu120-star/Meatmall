import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAT_CATEGORIES } from "@/lib/constants";
import { Product, insertProductSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "lucide-react";
import {
  getFullImageUrl,
  handleImageError,
  compressImage,
  generateThumbnail,
  uploadMedia,
} from "@/lib/image-utils";
import { logger } from "@/lib/logger";

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

// Extend the product schema for form validation with multilingual fields
const productFormSchema = insertProductSchema.extend({
  price: z.string().min(1, "Үнэ ору울на уу"),
  minOrderQuantity: z
    .string()
    .min(1, "Хамгийн бага захиалгын хэмжээ оруулна уу")
    .default("1"),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),
  thumbnailUrl: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories from categories management
  const { data: categoryItems = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/categories");
        return res;
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },
  });

  // Set default values including multilingual fields
  const defaultValues: Partial<ProductFormValues> = {
    name: product?.name || "",
    nameRu: product?.nameRu || "",
    nameEn: product?.nameEn || "",
    description: product?.description || "",
    descriptionRu: product?.descriptionRu || "",
    descriptionEn: product?.descriptionEn || "",
    category: product?.category || "Үхрийн мах",
    price: product ? product.price.toString() : "",
    imageUrl: product?.imageUrl || "",
    stock: 999, // Үлдэгдлийг үргэлж 999-өөр тохируулах - 2025-05-04
    minOrderQuantity: product
      ? product.minOrderQuantity?.toString() || "1"
      : "1",
  };

  // Set image preview if product has an image
  useEffect(() => {
    if (product?.imageUrl) {
      console.log(
        "Setting product image preview:",
        getFullImageUrl(product.imageUrl),
      );
      setImagePreview(product.imageUrl); // 원본 경로를 저장하고 렌더링 시 getFullImageUrl로 변환
    }
  }, [product]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
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
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    logger.custom("⏳", "Бүтээгдэхүүн хадгалж эхэллээ...");

    // Log data to be saved
    logger.custom("📦", "Хадгалах өгөгдөл:", {
      name: data.name,
      price: data.price,
      category: data.category,
      hasImage: !!selectedFile || !!data.imageUrl,
    });

    try {
      // Ensure we have required fields
      if (!data.name || !data.category || !data.price) {
        throw new Error("Бүтээгдэхүүний нэр, ангилал, үнэ заавал оруулна уу");
      }

      let imageUrl = data.imageUrl;
      let thumbnailUrl = product?.thumbnailUrl || null;

      // Upload image if selected
      if (selectedFile) {
        try {
          logger.custom("🖼️", "Compressing and generating thumbnail...");

          // 1. Compress original to WebP
          const compressedFile = await compressImage(selectedFile, 1200); // 1200px is enough for product details

          // 2. Generate thumbnail WebP
          const thumbnailFile = await generateThumbnail(selectedFile, 300);

          logger.custom("📤", "Uploading images...");

          // 3. Upload both
          const [imageResult, thumbnailResult] = await Promise.all([
            uploadMedia(compressedFile),
            uploadMedia(thumbnailFile),
          ]);

          imageUrl = imageResult.url;
          thumbnailUrl = thumbnailResult.url;

          logger.info("이미지 업로드 완료:", { imageUrl, thumbnailUrl });
        } catch (uploadError) {
          console.error("Image processing/upload failed:", uploadError);
          throw uploadError;
        }
      }

      // Prepare the product data in camelCase for the API
      const productData = {
        name: data.name,
        nameRu: data.nameRu || null,
        nameEn: data.nameEn || null,
        description: data.description || "",
        descriptionRu: data.descriptionRu || null,
        descriptionEn: data.descriptionEn || null,
        category: data.category,
        price: parseFloat(data.price),
        stock: data.stock ?? 999,
        minOrderQuantity: parseFloat(data.minOrderQuantity || "1"),
        imageUrl: imageUrl || "",
        thumbnailUrl: thumbnailUrl,
      };

      if (product) {
        console.log("Updating product ID via Worker:", product.id);
        await apiRequest("PUT", `/api/products/${product.id}`, productData);

        toast({
          title: "Бүтээгдэхүүн шинэчлэгдлээ",
          description: "Бүтээгдэхүүний мэдээлэл амжилттай шинэчлэгдлээ.",
        });

        logger.success("Бүтээгдэхүүн амжилттай засагдлаа:", {
          productId: product.id,
          changes: productData,
        });
      } else {
        // Create new product via Worker
        console.log("Creating product via Worker");

        // Send JSON data directly
        const newProduct = await apiRequest(
          "POST",
          "/api/products",
          productData,
        );

        toast({
          title: "Бүтээгдэхүүн нэмэгдлээ",
          description: "Шинэ бүтээгдэхүүн амжилттай нэмэгдлээ.",
        });

        logger.success("Бүтээгдэхүүн амжилттай хадгалагдлаа:", {
          // @ts-ignore
          productId: newProduct?.id,
          productName: productData.name,
          imageUrl: productData.imageUrl,
          price: productData.price,
        });
      }

      // Invalidate queries to reload product list
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Clear filtering
      setSelectedFile(null);
      if (!product) {
        setImagePreview(null);
        // Reset the file input
        const fileInput = document.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error submitting product form:", error);

      logger.error("Бүтээгдэхүүн хадгалахад алдаа гарлаа:", {
        formData: data,
        error: error.message,
        details: error,
      });

      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Бүтээгдэхүүн хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
        {/* Product Name Field */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Бүтээгдэхүүний нэр *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Үхрийн мах"
                    {...field}
                    className="text-base md:text-normal p-2 h-11 md:h-10"
                  />
                </FormControl>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />
        </div>

        {/* Description Field */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Тайлбар *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Бүтээгдэхүүний тайлбар"
                    className="resize-none min-h-[80px] text-base p-2"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />
        </div>

        {/* Category, Price, and Min Order Quantity - Grid for tablet and up, stack for mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Ангилал</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-11 md:h-10 text-base md:text-normal">
                      <SelectValue placeholder="Ангилал сонгоно уу" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[50vh]">
                    {/* Use categories from category management */}
                    {categoryItems.length > 0
                      ? categoryItems.map((category: any) => (
                          <SelectItem
                            key={`cat-${category.id}`}
                            value={category.name}
                            className="text-base py-2.5 md:py-2"
                          >
                            {category.name}
                          </SelectItem>
                        ))
                      : // Fallback to default categories only if no categories exist
                        MEAT_CATEGORIES.filter(
                          (cat) => cat.value !== "all",
                        ).map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                            className="text-base py-2.5 md:py-2"
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Үнэ (₩)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="15000"
                    {...field}
                    className="text-base md:text-normal p-2 h-11 md:h-10"
                  />
                </FormControl>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minOrderQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Хамгийн бага захиалга (кг)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="0.1"
                    min="0.1"
                    placeholder="1"
                    {...field}
                    className="text-base md:text-normal p-2 h-11 md:h-10"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Анхдагч: 1кг (4кг-аас дээш захиалах боломжтой болгохын тулд 4
                  гэж оруулна)
                </FormDescription>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />
        </div>

        {/* Image URL and Upload - Stack on mobile, grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Зурагны URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      disabled={!!selectedFile}
                      className="text-base md:text-normal p-2 h-11 md:h-10"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Зурагны холбоос оруулна уу эсвэл доор файл оруулна уу
                  </FormDescription>
                  <FormMessage className="text-xs md:text-sm" />
                </FormItem>
              )}
            />

            {/* Mobile-optimized Image upload component */}
            <div className="mt-2">
              <div className="flex items-center mb-1 md:mb-2">
                <span className="text-xs md:text-sm font-medium">
                  Зураг оруулах
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 md:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors touch-manipulation"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center py-2">
                    <Image className="h-6 w-6 md:h-8 md:w-8 text-gray-400 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm text-center text-gray-500 dark:text-gray-400">
                      Зураг оруулахын тулд энд дарна уу
                    </span>
                    <span className="text-2xs md:text-xs text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1">
                      (JPEG, PNG, GIF, WEBP)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                {/* Image preview - Mobile optimized */}
                {imagePreview && (
                  <div className="mt-2 relative">
                    <img
                      src={getFullImageUrl(imagePreview)}
                      alt="Урьдчилсан харагдац"
                      className="max-h-32 md:max-h-40 w-full rounded-md object-contain bg-gray-100"
                      onError={(e) => handleImageError(e, imagePreview)}
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-2.5 md:p-1 shadow-md hover:bg-red-600 transition-colors"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      aria-label="Зураг устгах"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Үлдэгдлийн талбар устгагдсан - 2025-05-04 */}
          <div className="hidden">
            <input type="hidden" name="stock" value="999" />
          </div>
        </div>

        {/* Action buttons - Full width on mobile, right-aligned on desktop */}
        <div className="flex flex-col md:flex-row md:justify-end gap-2 md:gap-3 pt-2 md:pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full md:w-auto order-2 md:order-1 h-11 md:h-10"
          >
            Цуцлах
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto order-1 md:order-2 bg-brand hover:bg-brand/90 text-white h-11 md:h-10"
          >
            {isSubmitting && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
            )}
            {product ? "Шинэчлэх" : "Хадгалах"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
