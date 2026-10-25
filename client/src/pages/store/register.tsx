import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertStoreSchema, ServiceCategory } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Extend the store schema for client-side validation
const storeFormSchema = insertStoreSchema.extend({
  categoryId: z.coerce.number().min(1, {
    message: "Үйлчилгээний ангилал сонгоно уу",
  }),
  logoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || ""),
  coverImageUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || ""),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

export default function StoreRegisterPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      toast({
        title: "Нэвтрэх шаардлагатай",
        description:
          "Дэлгүүр бүртгүүлэхийн тулд та эхлээд системд нэвтрэх шаардлагатай.",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, setLocation, toast]);

  // Fetch service categories for dropdown
  const { data: serviceCategories, isLoading: categoriesLoading } = useQuery<
    ServiceCategory[]
  >({
    queryKey: ["/api/service-categories"],
  });

  // Form definition
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      logoUrl: "",
      coverImageUrl: "",
      isActive: true,
      categoryId: 0,
    },
  });

  // Create store mutation
  const createStoreMutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message: string };
        throw new Error(errorData.message || "Дэлгүүр үүсгэх үед алдаа гарлаа");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Амжилттай бүртгэгдлээ",
        description: "Таны дэлгүүр амжилттай бүртгэгдлээ.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setLocation(`/store/dashboard`);
    },
    onError: (error: Error) => {
      toast({
        title: "Алдаа гарлаа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: StoreFormValues) => {
    createStoreMutation.mutate(data);
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">
                  Дэлгүүр бүртгүүлэх
                </CardTitle>
                <CardDescription>
                  Та өөрийн дэлгүүрийн мэдээллийг бөглөнө үү. Таны дэлгүүр
                  баталгаажсны дараа бүтээгдэхүүн нэмэх боломжтой болно.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Үйлчилгээний ангилал</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value?.toString()}
                            disabled={categoriesLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Ангилал сонгоно уу" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {serviceCategories?.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Таны дэлгүүр ямар үйлчилгээ үзүүлдэг вэ?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дэлгүүрийн нэр</FormLabel>
                          <FormControl>
                            <Input placeholder="Жишээ: Зөгийн Мах" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дэлгүүрийн тайлбар</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Таны дэлгүүрийн тухай товч тайлбар..."
                              className="resize-none min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Дэлгүүрийн үйл ажиллагаа, бүтээгдэхүүн, үйлчилгээний
                            талаар дэлгэрэнгүй бичнэ үү.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Утасны дугаар</FormLabel>
                            <FormControl>
                              <Input placeholder="010-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>И-мэйл хаяг</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="info@yourstore.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Хаяг</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Дэлгүүрийн хаяг..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Лого зураг (заавал биш)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/logo.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                name={field.name}
                              />
                            </FormControl>
                            <FormDescription>
                              Лого зургийн URL хаяг
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="coverImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Дэвсгэр зураг (заавал биш)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/cover.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                name={field.name}
                              />
                            </FormControl>
                            <FormDescription>
                              Дэвсгэр зургийн URL хаяг
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/")}
                      >
                        Цуцлах
                      </Button>
                      <Button
                        type="submit"
                        className="bg-brand text-white"
                        disabled={createStoreMutation.isPending}
                      >
                        {createStoreMutation.isPending
                          ? "Бүртгэж байна..."
                          : "Дэлгүүр бүртгүүлэх"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
