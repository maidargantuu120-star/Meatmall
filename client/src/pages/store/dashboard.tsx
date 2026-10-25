import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Store, Product, Order } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function StoreDashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      toast({
        title: "Нэвтрэх шаардлагатай",
        description:
          "Дэлгүүрийн удирдлагын самбар руу хандахын тулд та эхлээд системд нэвтрэх шаардлагатай.",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, setLocation, toast]);

  // Fetch user's stores
  const { data: myStores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores/my-stores"],
    enabled: !!user,
  });

  // Get first store for now (in the future we can add store switcher)
  const currentStore = myStores?.[0];

  // Fetch store products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", currentStore?.id, "products"],
    enabled: !!currentStore,
  });

  // Fetch store orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/stores", currentStore?.id, "orders"],
    enabled: !!currentStore,
  });

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const isLoading = storesLoading || (!myStores && !storesLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-10">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-16">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Бүртгэлтэй дэлгүүр олдсонгүй</CardTitle>
              <CardDescription>
                Танд одоогоор бүртгэлтэй дэлгүүр байхгүй байна. Та шинэ дэлгүүр
                үүсгэх боломжтой.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                className="bg-brand text-white"
                onClick={() => setLocation("/store/register")}
              >
                Шинэ дэлгүүр бүртгүүлэх
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{currentStore.name}</h1>
            <p className="text-gray-500">{currentStore.description}</p>
          </div>
          <Button
            onClick={() => setLocation(`/stores/${currentStore.id}`)}
            variant="outline"
          >
            Дэлгүүрийн хуудас харах
          </Button>
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="overview">Ерөнхий мэдээлэл</TabsTrigger>
            <TabsTrigger value="products">Бүтээгдэхүүнүүд</TabsTrigger>
            <TabsTrigger value="orders">Захиалгууд</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Нийт бүтээгдэхүүн
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {productsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        products?.length || 0
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Нийт захиалга
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {ordersLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        orders?.length || 0
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Дэлгүүрийн төлөв
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-md font-medium">
                      {currentStore.isActive ? (
                        <span className="text-green-600 flex items-center">
                          <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                          Идэвхтэй
                        </span>
                      ) : (
                        <span className="text-gray-500 flex items-center">
                          <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                          Идэвхгүй
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Дэлгүүрийн мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Үйлчилгээний ангилал
                      </dt>
                      <dd className="mt-1">{currentStore.categoryId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Утасны дугаар
                      </dt>
                      <dd className="mt-1">{currentStore.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        И-мэйл
                      </dt>
                      <dd className="mt-1">{currentStore.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Хаяг
                      </dt>
                      <dd className="mt-1">{currentStore.address}</dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Үүсгэсэн огноо
                      </dt>
                      <dd className="mt-1">
                        {currentStore.createdAt &&
                          new Date(currentStore.createdAt).toLocaleDateString(
                            "mn-MN",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <Button
                      onClick={() =>
                        setLocation(`/store/edit/${currentStore.id}`)
                      }
                      variant="outline"
                      className="mr-2"
                    >
                      Мэдээлэл засах
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Бүтээгдэхүүнүүд</CardTitle>
                    <CardDescription>
                      Таны дэлгүүрийн бүтээгдэхүүнүүдийн жагсаалт
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setLocation(`/store/products/add`)}
                    className="bg-brand text-white"
                  >
                    Бүтээгдэхүүн нэмэх
                  </Button>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : products && products.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Нэр</TableHead>
                          <TableHead>Үнэ</TableHead>
                          <TableHead>Нөөц</TableHead>
                          <TableHead>Үйлдэл</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <div>{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {product.category}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {Number(product.price).toLocaleString("mn-MN")}₩
                            </TableCell>
                            <TableCell>
                              {product.stock > 0 ? (
                                <span className="text-green-600">
                                  {product.stock}
                                </span>
                              ) : (
                                <span className="text-red-600">Дууссан</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLocation(
                                    `/store/products/edit/${product.id}`,
                                  )
                                }
                              >
                                Засах
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <span className="material-icons text-gray-400 text-3xl">
                          inventory_2
                        </span>
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        Бүтээгдэхүүн байхгүй
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Таны дэлгүүрт одоогоор бүртгэлтэй бүтээгдэхүүн байхгүй
                        байна. Шинэ бүтээгдэхүүн нэмж эхлээрэй.
                      </p>
                      <Button
                        onClick={() => setLocation(`/store/products/add`)}
                        className="bg-brand text-white"
                      >
                        Бүтээгдэхүүн нэмэх
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Захиалгууд</CardTitle>
                  <CardDescription>
                    Таны дэлгүүрийн захиалгуудын жагсаалт
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Захиалгын №</TableHead>
                          <TableHead>Үнэ</TableHead>
                          <TableHead>Төлөв</TableHead>
                          <TableHead>Огноо</TableHead>
                          <TableHead>Үйлдэл</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              #{order.id}
                            </TableCell>
                            <TableCell>
                              {Number(order.totalAmount).toLocaleString(
                                "mn-MN",
                              )}
                              ₩
                            </TableCell>
                            <TableCell>
                              {order.status === "pending" && (
                                <span className="text-yellow-600 flex items-center">
                                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                                  Хүлээгдэж буй
                                </span>
                              )}
                              {order.status === "processing" && (
                                <span className="text-blue-600 flex items-center">
                                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                                  Боловсруулж буй
                                </span>
                              )}
                              {order.status === "completed" && (
                                <span className="text-green-600 flex items-center">
                                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                                  Биелсэн
                                </span>
                              )}
                              {order.status === "cancelled" && (
                                <span className="text-red-600 flex items-center">
                                  <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                                  Цуцлагдсан
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.createdAt &&
                                new Date(order.createdAt).toLocaleDateString(
                                  "mn-MN",
                                )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLocation(`/store/orders/${order.id}`)
                                }
                              >
                                Дэлгэрэнгүй
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <span className="material-icons text-gray-400 text-3xl">
                          receipt_long
                        </span>
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        Захиалга байхгүй
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Таны дэлгүүрт одоогоор захиалга байхгүй байна.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
