import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Store, ServiceCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getFullImageUrl } from "@/lib/image-utils";

// Interface for the route parameters
interface ServiceCategoryParams {
  slug: string;
}

export default function ServiceCategoryPage() {
  const params = useParams<ServiceCategoryParams>();
  const [location, setLocation] = useLocation();
  const categorySlug = params?.slug;

  // Fetch service category
  const { data: category, isLoading: categoryLoading } =
    useQuery<ServiceCategory | null>({
      queryKey: ["/api/service-categories", categorySlug],
      queryFn: async () => {
        if (!categorySlug) return null;
        try {
          const data = await apiRequest(
            "GET",
            `/api/service-categories/${categorySlug}`,
          );
          return data;
        } catch (e) {
          return null; // Handle 404 naturally
        }
      },
      enabled: !!categorySlug,
    });

  // Fetch stores in this category
  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores", category?.id],
    queryFn: async () => {
      if (!category?.id) return [];
      const data = await apiRequest(
        "GET",
        `/api/stores?categoryId=${category.id}`,
      );
      return data;
    },
    enabled: !!category?.id,
  });

  const isLoading = categoryLoading || storesLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Category Header */}
        <section className="bg-brand text-white py-8">
          <div className="container mx-auto px-4">
            {categoryLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 bg-white/30 rounded" />
                <Skeleton className="h-5 w-1/2 bg-white/30 rounded" />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2">
                  {category?.name || ""}
                </h1>
                <p className="text-white/90 max-w-3xl">
                  {category?.description || ""}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Stores List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">
              Бүртгэлтэй үйлчилгээ үзүүлэгчид
            </h2>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : stores && stores.length > 0 ? (
              <div className="space-y-6">
                {stores.map((store) => (
                  <Card
                    key={store.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/stores/${store.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-40 h-40 bg-gray-100">
                        {store.logoUrl ? (
                          <img
                            src={getFullImageUrl(store.logoUrl)}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="material-icons text-gray-400 text-5xl">
                              store
                            </span>
                          </div>
                        )}
                      </div>
                      <CardContent className="flex-1 p-6">
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <h3 className="text-xl font-bold mb-1">
                              {store.name}
                            </h3>
                            <p className="text-gray-500 mb-4">
                              {store.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="material-icons text-gray-400 text-base">
                                place
                              </span>
                              <span>{store.address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <span className="material-icons text-gray-400 text-base">
                                phone
                              </span>
                              <span>{store.phone}</span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Button
                              size="sm"
                              className="bg-brand text-white"
                            >
                              Дэлгэрэнгүй үзэх
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <span className="material-icons text-gray-400 text-3xl">
                    store_mall_directory
                  </span>
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Үйлчилгээ үзүүлэгч олдсонгүй
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Энэ ангилалд одоогоор бүртгэлтэй үйлчилгээ үзүүлэгч байхгүй
                  байна.
                </p>
                <Button onClick={() => setLocation("/")} variant="outline">
                  Нүүр хуудас руу буцах
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Registration CTA */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Та энэ ангилалд өөрийн үйлчилгээгээ бүртгүүлмээр байна уу?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Өөрийн үйлчилгээг бүртгүүлснээр Солонгост амьдарч буй монголчуудад
              хүрч, үйлчилгээгээ өргөжүүлэх боломжтой.
            </p>
            <Button
              size="lg"
              className="bg-brand text-white"
              onClick={() => setLocation("/store/register")}
            >
              Одоо бүртгүүлэх
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
