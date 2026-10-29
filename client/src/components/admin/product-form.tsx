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
import { PRODUCT_BADGE_MAX_LENGTH, PRODUCT_MAX_IMAGES, Product, insertProductSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

// One photo in the form: already stored (url) or picked on this device and uploaded on save (file)
type FormImage = {
  key: string;
  url: string | null;
  thumbnailUrl: string | null;
  file: File | null;
  preview: string;
};

let imageKeySeed = 0;
const nextImageKey = () => `img-${++imageKeySeed}`;

// Stored photos of a product: main imageUrl first, then the gallery
function storedImages(product?: Product): FormImage[] {
  if (!product) return [];
  const urls = [product.imageUrl, ...(product.galleryImages ?? [])].filter(Boolean);
  return urls.map((url, index) => ({
    key: nextImageKey(),
    url,
    thumbnailUrl: index === 0 ? product.thumbnailUrl ?? null : null,
    file: null,
    preview: url,
  }));
}
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
  price: z.string().min(1, "Үнэ оруулна уу"),
  minOrderQuantity: z
    .string()
    .min(1, "Хамгийн бага захиалгын хэмжээ оруулна уу")
    .default("1"),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),
  thumbnailUrl: z.string().optional().nullable(),
  // Same limit as the API (shared PRODUCT_BADGE_MAX_LENGTH)
  badge: z.string().max(PRODUCT_BADGE_MAX_LENGTH, `Хамгийн ихдээ ${PRODUCT_BADGE_MAX_LENGTH} тэмдэгт`).optional().nullable(),
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
  // Photos in display order; the first one is the main photo (home card, orders)
  const [images, setImages] = useState<FormImage[]>(() => storedImages(product));
  const [imageUrlDraft, setImageUrlDraft] = useState("");
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
    badge: product?.badge || "",
    category: product?.category || "Үхрийн мах",
    price: product ? product.price.toString() : "",
    imageUrl: product?.imageUrl || "",
    stock: 999, // Үлдэгдлийг үргэлж 999-өөр тохируулах - 2025-05-04
    minOrderQuantity: product
      ? product.minOrderQuantity?.toString() || "1"
      : "1",
  };

  // Load the stored photos when a different product is opened for editing
  useEffect(() => {
    setImages(storedImages(product));
  }, [product]);

  // Free the object URLs of picked files when they leave the list or the form closes
  const previewUrls = useRef(new Set<string>());
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const dropPreview = (image: FormImage) => {
    if (image.file) {
      URL.revokeObjectURL(image.preview);
      previewUrls.current.delete(image.preview);
    }
  };

  const tooMany = () =>
    toast({
      title: `Хамгийн ихдээ ${PRODUCT_MAX_IMAGES} зураг`,
      description: "Илүү зургийг нэмээгүй.",
      variant: "destructive",
    });

  const removeImage = (key: string) =>
    setImages((list) => {
      const image = list.find((item) => item.key === key);
      if (image) dropPreview(image);
      return list.filter((item) => item.key !== key);
    });

  const makeMain = (key: string) =>
    setImages((list) => {
      const image = list.find((item) => item.key === key);
      return image ? [image, ...list.filter((item) => item.key !== key)] : list;
    });

  const addImageUrl = () => {
    const url = imageUrlDraft.trim();
    if (!url) return;
    if (images.length >= PRODUCT_MAX_IMAGES) return tooMany();
    setImages((list) => [...list, { key: nextImageKey(), url, thumbnailUrl: null, file: null, preview: url }]);
    setImageUrlDraft("");
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  // Handle file selection (several files at once; extra files beyond the limit are skipped)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again later
    if (!files.length) return;
    const room = PRODUCT_MAX_IMAGES - images.length;
    if (files.length > room) tooMany();
    const added = files.slice(0, Math.max(0, room)).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { key: nextImageKey(), url: null, thumbnailUrl: null, file, preview };
    });
    setImages((list) => [...list, ...added]);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    logger.custom("⏳", "Бүтээгдэхүүн хадгалж эхэллээ...");

    // Log data to be saved
    logger.custom("📦", "Хадгалах өгөгдөл:", {
      name: data.name,
      price: data.price,
      category: data.category,
      images: images.length,
    });

    try {
      // Ensure we have required fields
      if (!data.name || !data.category || !data.price) {
        throw new Error("Бүтээгдэхүүний нэр, ангилал, үнэ заавал оруулна уу");
      }

      // Upload newly picked photos one by one (WebP compression is heavy on phones).
      // Only the main (first) photo needs a 300px thumbnail for the home card.
      const saved: { url: string; thumbnailUrl: string | null }[] = [];
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        if (!image.file) {
          saved.push({ url: image.url!, thumbnailUrl: image.thumbnailUrl });
          continue;
        }
        try {
          logger.custom("🖼️", `Compressing photo ${index + 1}/${images.length}...`);
          const compressedFile = await compressImage(image.file, 1200); // 1200px is enough for product details
          const [imageResult, thumbnailResult] = await Promise.all([
            uploadMedia(compressedFile, { optimized: true }),
            index === 0
              ? generateThumbnail(compressedFile, 300).then((thumb) => uploadMedia(thumb, { optimized: true }))
              : Promise.resolve(null),
          ]);
          saved.push({ url: imageResult.url, thumbnailUrl: thumbnailResult?.url ?? null });
        } catch (uploadError) {
          console.error("Image processing/upload failed:", uploadError);
          throw uploadError;
        }
      }
      const imageUrl = saved[0]?.url ?? "";
      const thumbnailUrl = saved[0]?.thumbnailUrl ?? null;
      const galleryImages = saved.slice(1).map((image) => image.url);

      // Prepare the product data in camelCase for the API
      const productData = {
        name: data.name,
        nameRu: data.nameRu || null,
        nameEn: data.nameEn || null,
        description: data.description || "",
        descriptionRu: data.descriptionRu || null,
        descriptionEn: data.descriptionEn || null,
        badge: data.badge?.trim() || null,
        category: data.category,
        price: parseFloat(data.price),
        stock: data.stock ?? 999,
        minOrderQuantity: parseFloat(data.minOrderQuantity || "1"),
        imageUrl,
        thumbnailUrl,
        galleryImages,
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

      // A new product form starts empty again
      if (!product) {
        images.forEach(dropPreview);
        setImages([]);
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

        {/* Badge: short label shown on the product photo on the home page */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="badge"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Тэмдэг (badge)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Жишээ: Шинэ, Хямдрал, Хамгийн их зарагдсан"
                    maxLength={PRODUCT_BADGE_MAX_LENGTH}
                    {...field}
                    value={field.value ?? ""}
                    className="text-base md:text-normal p-2 h-11 md:h-10"
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                  <span>Нүүр хуудсанд бүтээгдэхүүний зурган дээр харагдана. Хоосон бол харагдахгүй.</span>
                  <span className="flex-shrink-0 tabular-nums">{(field.value ?? "").length}/{PRODUCT_BADGE_MAX_LENGTH}</span>
                </div>
                {field.value?.trim() && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Урьдчилан харах:
                    <span className="max-w-[220px] truncate rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
                      {field.value.trim()}
                    </span>
                  </div>
                )}
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
          <div className="space-y-4 md:col-span-2">
            {/* Photos: several at once, first = main photo; uploaded when the form is saved */}
            <div>
              <div className="mb-1 flex items-center justify-between md:mb-2">
                <span className="text-xs font-medium md:text-sm">Зураг</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {images.length}/{PRODUCT_MAX_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((image, index) => (
                  <div
                    key={image.key}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg bg-gray-100",
                      index === 0 && "ring-2 ring-brand",
                    )}
                  >
                    <img
                      src={image.file ? image.preview : getFullImageUrl(image.preview)}
                      alt={`Зураг ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => !image.file && handleImageError(e, image.preview)}
                    />
                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                        Үндсэн
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeMain(image.key)}
                        className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink shadow hover:bg-white"
                        aria-label={`Зураг ${index + 1}-ийг үндсэн болгох`}
                      >
                        <Star className="h-3 w-3" />
                        Үндсэн
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(image.key)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600"
                      aria-label={`Зураг ${index + 1} устгах`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {images.length < PRODUCT_MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 touch-manipulation"
                  >
                    <Image className="h-6 w-6 text-gray-400" />
                    <span className="px-1 text-center text-[11px] leading-tight">Зураг нэмэх</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Хэд хэдэн зураг зэрэг сонгож болно (JPEG, PNG, GIF, WEBP). Эхний зураг нь үндсэн зураг -
                нүүр хуудас болон захиалгад харагдана. Хадгалах үед зураг байршуулна.
              </p>
            </div>

            {/* Or add a photo by link */}
            <div>
              <span className="text-xs font-medium md:text-sm">Зурагны URL</span>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrlDraft}
                  onChange={(e) => setImageUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImageUrl();
                    }
                  }}
                  className="text-base md:text-normal p-2 h-11 md:h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addImageUrl}
                  disabled={!imageUrlDraft.trim() || images.length >= PRODUCT_MAX_IMAGES}
                  className="h-11 flex-shrink-0 md:h-10"
                >
                  Нэмэх
                </Button>
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
