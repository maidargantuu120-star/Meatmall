import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectableProductCard } from "@/components/ui/selectable-product-card";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Product, CartItem } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import {
  Loader2,
  ShoppingCart,
  CheckCircle2,
  PackageOpen,
  ChefHat,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function MealKitGenerator() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [mealKitName, setMealKitName] = useState("Миний хоолны багц");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [step, setStep] = useState(1);
  const [isNameValid, setIsNameValid] = useState(true);

  // Fetch all meat products
  const {
    data: products,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/products");
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Calculate total price
  const totalPrice = selectedProducts.reduce((total, productId) => {
    const product = products?.find((p) => p.id === productId);
    const quantity = quantities[productId] || 1;

    if (product) {
      return total + Number(product.price) * quantity;
    }
    return total;
  }, 0);

  // Calculate total weight (simplified - assuming 100g per quantity)
  const totalWeight = selectedProducts.reduce((total, productId) => {
    const quantity = quantities[productId] || 1;
    return total + quantity * 100;
  }, 0);

  // Handle product selection
  const handleProductSelect = (productId: number) => {
    setSelectedProducts((prev) => [...prev, productId]);

    // Initialize quantity to 1 if not already set
    if (!quantities[productId]) {
      setQuantities((prev) => ({
        ...prev,
        [productId]: 1,
      }));
    }
  };

  // Handle product deselection
  const handleProductDeselect = (productId: number) => {
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
  };

  // Handle quantity change
  const handleQuantityChange = (productId: number, quantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: quantity,
    }));
  };

  // Next step
  const goToNextStep = () => {
    if (step === 1 && selectedProducts.length === 0) {
      toast({
        title: "Бүтээгдэхүүн сонгоно уу",
        description:
          "Хоолны багц үүсгэхийн тулд дор хаяж нэг бүтээгдэхүүн сонгоно уу.",
        variant: "destructive",
      });
      return;
    }

    if (step === 2 && !mealKitName.trim()) {
      setIsNameValid(false);
      return;
    }

    setStep((current) => current + 1);
  };

  // Previous step
  const goToPreviousStep = () => {
    setStep((current) => current - 1);
  };

  // Reset meal kit
  const resetMealKit = () => {
    setSelectedProducts([]);
    setQuantities({});
    setMealKitName("Миний хоолны багц");
    setStep(1);
  };

  // Generate meal kit mutation
  const generateMealKitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: mealKitName,
        productIds: selectedProducts,
        quantities: quantities,
      };

      const mealKit = await apiRequest(
        "POST",
        "/api/generated-meal-kits/generate",
        payload,
      );
      return mealKit;
    },
    onSuccess: (data) => {
      toast({
        title: "Хоолны багц амжилттай үүслээ!",
        description: `"${data.name}" багцыг амжилттай үүсгэлээ.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/generated-meal-kits"] });
      setStep(3);
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Хоолны багц үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (generatedMealKitId: number) => {
      const data = await apiRequest(
        "PATCH",
        `/api/generated-meal-kits/${generatedMealKitId}`,
        {
          is_added_to_cart: true,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      // Add all products to cart
      selectedProducts.forEach((productId) => {
        const product = products?.find((p) => p.id === productId);
        if (product) {
          addItem({
            productId: product.id,
            name: product.name,
            price: parseFloat(product.price.toString()),
            quantity: quantities[productId] || 1,
            imageUrl: product.imageUrl,
          });
        }
      });

      toast({
        title: "Сагсанд нэмлээ",
        description: `"${data.name}" багцыг сагсанд нэмлээ.`,
      });

      // Redirect to cart page
      setLocation("/cart");
    },
    onError: (error: Error) => {
      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Хоолны багцыг сагсанд нэмэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = () => {
    if (step === 2) {
      generateMealKitMutation.mutate();
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (generateMealKitMutation.data) {
      addToCartMutation.mutate(generateMealKitMutation.data.id);
    }
  };

  // Reset validation state when name changes
  useEffect(() => {
    if (mealKitName.trim()) {
      setIsNameValid(true);
    }
  }, [mealKitName]);

  // Filter products by category (only meat products)
  const filteredProducts =
    products?.filter(
      (product) =>
        product.category === "Үхрийн мах" ||
        product.category === "Хонины мах" ||
        product.category === "Тахианы мах" ||
        product.category === "Гахайн мах" ||
        product.category === "Бусад",
    ) || [];

  // Group products by category
  const productsByCategory: Record<string, Product[]> = {};

  filteredProducts.forEach((product) => {
    if (!productsByCategory[product.category]) {
      productsByCategory[product.category] = [];
    }
    productsByCategory[product.category].push(product);
  });

  // Order categories
  const categoryOrder = [
    "Үхрийн мах",
    "Хонины мах",
    "Тахианы мах",
    "Гахайн мах",
    "Бусад",
  ];

  const orderedCategories = Object.keys(productsByCategory).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="w-full gradient-nav py-8 mb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center">
            Гэрийн Махны Хоолны Багц Үүсгэгч
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-center mt-4">
            Өөрийн дуртай махнуудаа сонгон багц үүсгэж, гэр бүлийнхэнд амттай
            хоол бэлдэнэ үү. Үүсгэсэн багцаа хадгалж, дараа дахин захиалах
            боломжтой.
          </p>
          <div className="w-20 h-1 bg-white/50 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}

          {/* Progress indicators */}
          <div className="mt-8 flex items-center justify-center space-x-4">
            <div
              className={`flex flex-col items-center ${step >= 1 ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 1
                    ? "border-primary gradient-nav text-white"
                    : "border-gray-300"
                }`}
              >
                <PackageOpen className="h-5 w-5" />
              </div>
              <span className="mt-2 text-sm font-medium">Сонголт</span>
            </div>

            <div
              className={`w-16 h-0.5 ${step >= 2 ? "gradient-nav" : "bg-gray-300"}`}
            ></div>

            <div
              className={`flex flex-col items-center ${step >= 2 ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 2
                    ? "border-primary gradient-nav text-white"
                    : "border-gray-300"
                }`}
              >
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="mt-2 text-sm font-medium">Багц Үүсгэх</span>
            </div>

            <div
              className={`w-16 h-0.5 ${step >= 3 ? "gradient-nav" : "bg-gray-300"}`}
            ></div>

            <div
              className={`flex flex-col items-center ${step >= 3 ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 3
                    ? "border-primary gradient-nav text-white"
                    : "border-gray-300"
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="mt-2 text-sm font-medium">Дуусгах</span>
            </div>
          </div>

          {/* Step 1: Product Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold gradient-text">
                  Махнуудаа сонгоно уу
                </h2>

                <div className="flex items-center space-x-2 text-gray-600">
                  <span>Сонгосон:</span>
                  <span className="font-bold text-primary">
                    {selectedProducts.length}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-full gradient-primary opacity-30 animate-ping"></div>
                    <div className="absolute inset-2 rounded-full gradient-primary animate-spin"></div>
                    <div className="absolute inset-5 rounded-full bg-white"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-10 max-w-lg mx-auto">
                  <div className="rounded-lg p-6 bg-red-50 border border-red-100">
                    <span className="material-icons text-4xl text-red-500 mb-3">
                      error_outline
                    </span>
                    <p className="text-red-600 font-medium">
                      Бүтээгдэхүүн ачаалах үед алдаа гарлаа. Дахин оролдоно уу.
                    </p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 max-w-lg mx-auto">
                  <div className="rounded-lg p-8 gradient-card">
                    <span className="material-icons text-4xl text-gray-400 mb-3">
                      inventory_2
                    </span>
                    <p className="text-gray-600">
                      Хоолны багц үүсгэх бүтээгдэхүүн байхгүй байна.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  {orderedCategories.map((category) => (
                    <div key={category}>
                      <h3 className="text-xl font-bold mb-4 gradient-text-reverse">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {productsByCategory[category].map((product) => (
                          <SelectableProductCard
                            key={product.id}
                            product={product}
                            isSelected={selectedProducts.includes(product.id)}
                            onSelect={handleProductSelect}
                            onDeselect={handleProductDeselect}
                            quantity={quantities[product.id] || 1}
                            onQuantityChange={handleQuantityChange}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-12 flex justify-end">
                <Button
                  className="btn-gradient text-white py-2 px-8 rounded-md text-lg font-medium"
                  onClick={goToNextStep}
                  disabled={selectedProducts.length === 0}
                >
                  Цааш
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Meal Kit Customization */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold gradient-text mb-4">
                    Хоолны багц үүсгэх
                  </h2>
                  <p className="text-gray-600">
                    Хоолны багцын нэр болон дэлгэрэнгүй мэдээллийг оруулна уу.
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Хоолны багцын нэр
                    </label>
                    <Input
                      type="text"
                      value={mealKitName}
                      onChange={(e) => setMealKitName(e.target.value)}
                      className={`w-full ${!isNameValid ? "border-red-500" : ""}`}
                      placeholder="Жишээ: Гэр бүлийн хоолны багц, Барбекюны багц, гэх мэт."
                    />
                    {!isNameValid && (
                      <p className="mt-1 text-sm text-red-600">
                        Хоолны багцын нэрийг оруулна уу.
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">
                      Сонгосон бүтээгдэхүүнүүд
                    </h3>

                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedProducts.map((productId) => {
                        const product = products?.find(
                          (p) => p.id === productId,
                        );
                        const quantity = quantities[productId] || 1;

                        if (product) {
                          return (
                            <div
                              key={productId}
                              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                            >
                              <div className="flex items-center">
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-md mr-3"
                                />
                                <div>
                                  <h4 className="font-medium">
                                    {product.name}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {product.category} - {quantity} ш
                                  </p>
                                </div>
                              </div>
                              <div className="font-medium gradient-text">
                                {formatPrice(
                                  parseFloat(product.price.toString()) *
                                    quantity,
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  <div className="mb-8 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Нийт бүтээгдэхүүн:</span>
                      <span className="font-medium">
                        {selectedProducts.length} төрөл
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Ойролцоо жин:</span>
                      <span className="font-medium">
                        {(totalWeight / 1000).toFixed(1)} кг
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="gradient-text">Нийт үнэ:</span>
                      <span className="gradient-text">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-between">
                  <Button
                    className="text-gray-600 font-medium bg-white border border-gray-200 hover:bg-gray-50"
                    onClick={goToPreviousStep}
                  >
                    Буцах
                  </Button>

                  <Button
                    className="btn-gradient text-white"
                    onClick={handleSubmit}
                    disabled={generateMealKitMutation.isPending}
                  >
                    {generateMealKitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Үүсгэж байна...
                      </>
                    ) : (
                      "Багц үүсгэх"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && generateMealKitMutation.data && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg mx-auto"
            >
              <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-green-100 text-center">
                <div className="p-6">
                  <div className="w-20 h-20 rounded-full gradient-nav flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>

                  <h2 className="text-2xl font-bold gradient-text mb-2">
                    Багц амжилттай үүслээ!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    "{generateMealKitMutation.data.name}" хоолны багцыг
                    амжилттай үүсгэлээ. Одоо захиалгаа өгч амттай хоол бэлдэх
                    боломжтой!
                  </p>

                  <div className="flex justify-center space-x-4">
                    <Button
                      className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                      onClick={resetMealKit}
                    >
                      Шинэ багц үүсгэх
                    </Button>

                    <Button
                      className="btn-gradient text-white"
                      onClick={handleAddToCart}
                      disabled={addToCartMutation.isPending}
                    >
                      {addToCartMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Нэмж байна...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Сагсанд нэмэх
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
