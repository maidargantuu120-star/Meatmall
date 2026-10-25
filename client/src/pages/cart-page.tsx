import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { CartItemComponent } from "@/components/ui/cart-item";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";

export default function CartPage() {
  const { items, totalPrice, updateQuantity, removeItem } = useCart();
  const [location, setLocation] = useLocation();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const isEmpty = items.length === 0;

  // 로그인 상태 확인 및 리다이렉트
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast({
        title: "Нэвтрэх шаардлагатай",
        description:
          "Сагс руу орохын тулд нэвтрэх эсвэл бүртгүүлэх шаардлагатай.",
        variant: "default",
      });
      setLocation("/auth?tab=signup");
    }
  }, [user, isLoadingAuth, setLocation, toast]);

  // Fetch shipping fee rules from the server
  const { data: shippingRulesData, isLoading: isLoadingShippingFee } = useQuery<
    { min: number; max: number; fee: number }[]
  >({
    queryKey: ["shipping-fee"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/settings/shipping-fee");
        if (res && res.value) {
          return JSON.parse(res.value);
        }
      } catch (error) {
        console.error("Error fetching shipping rules:", error);
      }
      return [];
    },
    enabled: !isEmpty && !!user,
  });

  // Calculate fixed shipping fee
  let shippingFee = 0;
  if (shippingRulesData && shippingRulesData.length > 0) {
    shippingFee = shippingRulesData[0].fee;
  } else if (!isLoadingShippingFee) {
    shippingFee = 6000;
  }

  // Calculate final total price
  const finalTotalPrice = totalPrice + shippingFee;

  // Handle checkout action
  const handleCheckout = () => {
    setLocation("/checkout");
  };

  // 로그인 중이거나 로그인 되지 않은 경우 로딩 화면 표시
  if (isLoadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="w-full gradient-nav py-8 mb-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center">
              Таны сагс
            </h1>
            <div className="w-20 h-1 bg-white/50 mx-auto mt-4 rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent border-brand rounded-full"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="w-full gradient-nav py-8 mb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center">
            Таны сагс
          </h1>
          <div className="w-20 h-1 bg-white/50 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-4">
        {isEmpty ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full gradient-nav flex items-center justify-center mx-auto mb-6 shadow-md">
              <span className="material-icons text-5xl text-white">
                shopping_cart
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t.cartEmpty}
            </h2>
            <p className="text-muted-foreground mb-8">{t.cartEmptyDesc}</p>
            <Button
              className="gradient-nav text-white font-medium px-8 py-6 transition-all duration-300 shadow-md hover:shadow-lg"
              onClick={() => setLocation("/")}
            >
              {t.viewProducts}
              <span className="material-icons ml-2">arrow_forward</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-foreground">
                {t.cartItems} ({items.length})
              </h2>

              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-col rounded-lg overflow-hidden"
                  >
                    <CartItemComponent key={item.productId} item={item} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 h-fit border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-foreground">
                {t.orderInfo}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.products}:</span>
                  <span className="font-medium">
                    {items.length} {t.productTypes}
                  </span>
                </div>


              </div>

              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-foreground">{t.products}:</span>
                  <span className="font-bold">{formatPrice(totalPrice)}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-foreground">{t.shippingFee}:</span>
                  <span className="font-bold">
                    {isLoadingShippingFee ? (
                      <span className="h-4 w-16 bg-gray-200 animate-pulse rounded inline-block"></span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t border-gray-100">
                  <span className="text-foreground">{t.totalAmount}:</span>
                  <span className="text-brand font-bold">
                    {formatPrice(finalTotalPrice)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full gradient-nav text-white font-medium py-6 transition-all duration-300 shadow-md hover:shadow-lg"
                onClick={handleCheckout}
              >
                {t.placeOrder}
                <span className="material-icons ml-2">shopping_bag</span>
              </Button>

              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setLocation("/")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-icons mr-1 text-sm">
                    keyboard_backspace
                  </span>
                  {t.continueShopping}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
