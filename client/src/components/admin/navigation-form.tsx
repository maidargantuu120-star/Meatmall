import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertNavigationItemSchema } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

// Extend the schema for form validation
const navigationFormSchema = insertNavigationItemSchema.extend({
  id: z.number().optional(),
});

type NavigationFormValues = z.infer<typeof navigationFormSchema>;

interface NavigationFormProps {
  navigationItem?: any; // Use NavigationItem type from schema
  onSuccess: () => void;
  onCancel: () => void;
}

export function NavigationForm({
  navigationItem,
  onSuccess,
  onCancel,
}: NavigationFormProps) {
  const { toast } = useToast();
  const isEditing = !!navigationItem;
  const [navigationItems, setNavigationItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchNavigationItems = async () => {
      try {
        const items = await apiRequest("GET", "/api/navigation");
        // Filter out current item from parent options to prevent circular references
        const filteredItems = isEditing
          ? items.filter((item: any) => item.id !== navigationItem.id)
          : items;
        setNavigationItems(filteredItems);
      } catch (error) {
        console.error("Error fetching navigation items:", error);
      }
    };

    fetchNavigationItems();
  }, [isEditing, navigationItem]);

  const form = useForm<NavigationFormValues>({
    resolver: zodResolver(navigationFormSchema),
    defaultValues: {
      title: navigationItem?.title || "",
      url: navigationItem?.url || "",
      order: navigationItem?.order || 0,
      parentId: navigationItem?.parentId || null,
      isActive: navigationItem?.isActive ?? true,
    },
  });

  const onSubmit = async (data: NavigationFormValues) => {
    try {
      if (isEditing && navigationItem.id) {
        await apiRequest("PUT", `/api/navigation/${navigationItem.id}`, data);
        toast({
          title: "Цэс шинэчлэгдлээ",
          description: "Цэсний бүтэц амжилттай шинэчлэгдлээ.",
        });
      } else {
        await apiRequest("POST", "/api/navigation", data);
        toast({
          title: "Цэс үүсгэгдлээ",
          description: "Шинэ цэсний бүтэц амжилттай нэмэгдлээ.",
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Цэс хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Цэс засах" : "Шинэ цэс нэмэх"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гарчиг</FormLabel>
                    <FormControl>
                      <Input placeholder="Цэсний нэр" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL (Холбоос)</FormLabel>
                    <FormControl>
                      <Input placeholder="/page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эцэг цэс</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "0" ? null : Number(value))
                      }
                      defaultValue={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Эцэг цэс сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Үндсэн цэс</SelectItem>
                        {navigationItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Идэвхтэй</FormLabel>
                    <div className="text-sm text-gray-500">
                      Энэ цэсийг сайт дээр харуулах эсэх
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

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Цуцлах
              </Button>
              <Button type="submit" variant="default">
                {isEditing ? "Хадгалах" : "Үүсгэх"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
