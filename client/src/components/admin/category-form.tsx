import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCategorySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Textarea,
} from "@/components/ui";

// Extend the schema for form validation
const categoryFormSchema = insertCategorySchema.extend({
  id: z.number().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  category?: any; // Use Category type from schema
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const { toast } = useToast();
  const isEditing = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      imageUrl: category?.imageUrl || "",
      order: category?.order || 0,
      isActive: category?.isActive ?? true,
    },
  });

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\sа-яөү]/g, "") // Remove special characters, keep Mongolian letters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with a single one
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);

    // Only auto-generate slug if we're creating a new category or the slug hasn't been manually edited
    if (
      !isEditing ||
      form.getValues("slug") === generateSlug(category?.name || "")
    ) {
      form.setValue("slug", generateSlug(name));
    }
  };

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        order: data.order,
        isActive: data.isActive,
      };

      if (isEditing && category.id) {
        await apiRequest("PATCH", `/api/categories/${category.id}`, payload);

        toast({
          title: "Ангилал шинэчлэгдлээ",
          description: "Ангилал амжилттай шинэчлэгдлээ.",
        });
      } else {
        await apiRequest("POST", "/api/categories", payload);

        toast({
          title: "Ангилал үүсгэгдлээ",
          description: "Шинэ ангилал амжилттай нэмэгдлээ.",
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting category:", error);
      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Ангилал хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-md:border-0 max-md:shadow-none">
      <CardHeader className="max-md:p-4">
        <CardTitle className="max-md:font-display max-md:text-lg max-md:font-extrabold">
          {isEditing ? "Ангилал засах" : "Шинэ ангилал нэмэх"}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-md:p-4 max-md:pt-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 max-md:space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-md:gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ангилалын нэр"
                        {...field}
                        onChange={handleNameChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="category-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тайлбар</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ангилалын тайлбар..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Зурган хаяг (URL)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-md:gap-4">
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эрэмбэ</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 max-md:gap-3 max-md:space-y-0 max-md:rounded-xl max-md:border-ink/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Идэвхтэй</FormLabel>
                      <div className="text-sm text-gray-500">
                        Энэ ангилалыг сайт дээр харуулах эсэх
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 max-md:flex-col-reverse max-md:gap-2 max-md:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="max-md:h-11 max-md:w-full max-md:rounded-full"
              >
                Цуцлах
              </Button>
              <Button
                type="submit"
                variant="default"
                className="max-md:h-11 max-md:w-full max-md:rounded-full max-md:bg-brand max-md:font-semibold max-md:hover:bg-brand-deep"
              >
                {isEditing ? "Хадгалах" : "Үүсгэх"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
