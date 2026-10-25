import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { formatPrice, getCategoryColor } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { getFullImageUrl } from "@/lib/image-utils";
import { SectionTitle } from "@/components/section-title";
import { CartActions } from "@/components/cart-actions";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const numericId = parseInt(id);
  const [quantity, setQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery<Product>({
    queryKey: [`products`, numericId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/products/${numericId}`);
    },
    enabled: !isNaN(numericId),
  });

  // 모든 제품 데이터를 가져옵니다
  const { data: allProducts = [], isLoading: isAllProductsLoading } = useQuery<
    Product[]
  >({
    queryKey: ["products"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/products");
    },
    enabled: !!product,
  });

  // 선택된 카테고리 또는 현재 제품의 카테고리에 따라 제품을 필터링합니다
  const filteredProducts = allProducts
    .filter((p) => {
      if (selectedCategory) {
        return p.category === selectedCategory && p.id !== numericId;
      }
      return p.category === product?.category && p.id !== numericId;
    })
    .slice(0, 4);

  // 제품이 로드되면 기본적으로 해당 제품의 카테고리를 선택합니다
  useEffect(() => {
    if (product && !selectedCategory) {
      setSelectedCategory(product.category);
    }
  }, [product, selectedCategory]);

  // 상품 ID가 변경될 때마다 수량을 1로 초기화합니다
  useEffect(() => {
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [numericId]);

  // 사용 가능한 모든 카테고리를 가져옵니다
  // 중복 제거를 위해 객체를 사용합니다
  const categoryMap: Record<string, boolean> = {};
  allProducts.forEach((p) => {
    if (p.category) {
      categoryMap[p.category] = true;
    }
  });
  const categories = Object.keys(categoryMap);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  };

  const handleAddToCart = () => {
    if (!product) return;

    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
        quantity,
        imageUrl: product.imageUrl,
      });

      // 트렌디한 토스트 메시지
      toast({
        title: "🛒 Сагсанд нэмлээ",
        description: `${quantity}× ${product.name}`,
        variant: "default",
        className: "animate-bounceInUp", // 애니메이션 추가
      });
    } catch (error) {
      toast({
        title: "❌ Алдаа гарлаа",
        description: "Сагсанд нэмэх үед алдаа гарлаа",
        variant: "destructive",
      });
    }
  };

  if (isProductLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Бүтээгдэхүүн олдсонгүй
            </h2>
            <p className="text-gray-500 mb-6">
              Энэхүү бүтээгдэхүүн байхгүй байна эсвэл устгагдсан байна.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="rounded bg-ink hover:bg-brand text-white font-display text-sm font-bold h-12 px-8"
            >
              Нүүр хуудас руу буцах
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryColors = getCategoryColor(product.category);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Product Detail Section - stacked on mobile, two columns from md */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12 grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14 items-start">
          {/* Product Image */}
          <div className="md:sticky md:top-24 overflow-hidden rounded-2xl bg-ink/5 shadow-card">
            <img
              src={getFullImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-auto object-cover aspect-[4/3] md:aspect-square"
            />
          </div>

          {/* Product Info */}
          <div className="md:py-2">
            {product.category && (
              <p className="font-display text-xs md:text-sm font-extrabold uppercase text-brand">
                {product.category}
              </p>
            )}
            <h1 className="mt-1 text-2xl md:text-4xl font-bold leading-tight text-ink">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-3 inline-block rounded-full bg-ink px-3 py-1 text-xs md:text-sm font-semibold text-white whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Price */}
            <div className="mt-5 md:mt-6 flex items-center gap-2">
              <span className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-brand text-xs md:text-sm font-bold text-white">
                ₩
              </span>
              <span className="font-display text-[28px] md:text-4xl font-extrabold leading-none text-brand">
                {parseFloat(product.price.toString()).toLocaleString()}
              </span>
            </div>

            <div className="my-6 md:my-8 h-px bg-ink/10" />

            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base font-semibold text-ink">
                Тоо хэмжээ (кг):
              </span>
              <div className="flex items-center rounded border border-ink/15">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-lg text-ink hover:bg-surface disabled:text-ink/25 disabled:hover:bg-transparent"
                  disabled={quantity <= 1}
                  aria-label="-"
                >
                  -
                </button>
                <span className="w-10 md:w-12 text-center font-display text-lg font-extrabold text-ink">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-lg text-ink hover:bg-surface"
                  aria-label="+"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 flex items-end justify-between rounded-xl bg-surface px-4 py-3 md:py-4">
              <span className="text-xs md:text-sm text-ink/60">
                {quantity} × {formatPrice(parseFloat(product.price.toString()))}
              </span>
              <span className="font-display text-xl md:text-2xl font-extrabold leading-none text-ink">
                {formatPrice(parseFloat(product.price.toString()) * quantity)}
              </span>
            </div>

            {/* Cart icon + buy now */}
            <CartActions
              size="lg"
              className="mt-4"
              onAddToCart={handleAddToCart}
              onBuyNow={() => {
                handleAddToCart();
                setLocation("/checkout");
              }}
            />
          </div>
        </div>
      </section>

      {/* Products in the same category */}
      <section className="bg-surface py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionTitle title="Ангилал бүтээгдэхүүн" className="mb-4 md:mb-5" />

          {/* Category chips */}
          <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                className={`flex-shrink-0 rounded-full border-2 px-4 py-1.5 font-display text-[13px] md:text-sm font-bold transition-colors ${
                  selectedCategory === category
                    ? "border-ink bg-ink text-white"
                    : "border-ink/15 bg-white text-ink hover:border-ink/40"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Products By Category */}
          {isAllProductsLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-ink/50 py-4 text-sm">
              Энэ ангилалд бүтээгдэхүүн олдсонгүй
            </p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
            >
              {filteredProducts.map((filteredProduct) => (
                <button
                  key={filteredProduct.id}
                  type="button"
                  className="group text-left bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  onClick={() =>
                    setLocation(`/products/${filteredProduct.id}`)
                  }
                >
                  <div className="aspect-square overflow-hidden bg-ink/5">
                    <img
                      src={getFullImageUrl(filteredProduct.imageUrl)}
                      alt={filteredProduct.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="font-bold text-sm md:text-base text-ink truncate">
                      {filteredProduct.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                        ₩
                      </span>
                      <span className="font-display text-base md:text-lg font-extrabold leading-none text-brand">
                        {parseFloat(
                          filteredProduct.price.toString(),
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
