import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { cn, formatPrice, getCategoryColor } from "@/lib/utils";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { packKgOf, priceUnitLabel } from "@shared/pack";
import { motion } from "framer-motion";
import { getFullImageUrl } from "@/lib/image-utils";
import { SectionTitle } from "@/components/section-title";
import { CartActions } from "@/components/cart-actions";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const numericId = parseInt(id);
  const [quantity, setQuantity] = useState(1);
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

  // Similar products: same category first, then other products to fill up to 4
  const otherProducts = allProducts.filter((p) => p.id !== numericId);
  const similarProducts = [
    ...otherProducts.filter((p) => p.category === product?.category),
    ...otherProducts.filter((p) => p.category !== product?.category),
  ].slice(0, 4);

  // 상품 ID가 변경될 때마다 수량을 1로 초기화합니다
  useEffect(() => {
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [numericId]);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  };

  // Pack products (e.g. 4kg boxes): the counter counts packs, the cart stores kg
  const packKg = product ? packKgOf(product) : 1;

  const handleAddToCart = () => {
    if (!product) return;

    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
        quantity: quantity * packKg,
        imageUrl: product.imageUrl,
        packKg,
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
          {/* Product photos: main image + gallery (slider when there is more than one) */}
          <ProductGallery
            name={product.name}
            images={[product.imageUrl, ...(product.galleryImages ?? [])].filter(Boolean)}
          />

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

            {/* Description from the admin: a soft box so longer, multi-line text reads well */}
            {product.description && (
              <div className="mt-4 rounded-2xl bg-surface p-4 md:p-5">
                <p className="font-display text-xs font-extrabold uppercase tracking-wide text-ink/45">
                  Тайлбар
                </p>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink/80 md:text-base">
                  {product.description}
                </p>
              </div>
            )}

            {/* Price */}
            <div className="mt-5 md:mt-6 flex items-center gap-2">
              <span className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-brand text-xs md:text-sm font-bold text-white">
                ₩
              </span>
              <span className="font-display text-[28px] md:text-4xl font-extrabold leading-none text-brand">
                {parseFloat(product.price.toString()).toLocaleString()}
              </span>
              <span className="text-sm md:text-base font-semibold text-ink/50">
                {priceUnitLabel(packKg)}
              </span>
            </div>

            <div className="my-6 md:my-8 h-px bg-ink/10" />

            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base font-semibold text-ink">
                Тоо хэмжээ ({packKg > 1 ? `${packKg}кг багц` : "кг"}):
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

      {/* Similar products (hidden when the shop has no other products) */}
      {(isAllProductsLoading || similarProducts.length > 0) && (
      <section className="bg-surface py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionTitle title="Төстэй бүтээгдэхүүн" className="mb-5 md:mb-6" />

          {isAllProductsLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
            >
              {similarProducts.map((filteredProduct) => (
                <Link
                  key={filteredProduct.id}
                  href={`/products/${filteredProduct.id}`}
                  className="group block text-left bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
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
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </section>
      )}

      <Footer />
    </div>
  );
}

// Main photo + gallery. One photo: a plain image as before. Several: swipeable slider with
// dots on the photo and a thumbnail row underneath (tap a thumbnail to jump to it).
function ProductGallery({ name, images }: { name: string; images: string[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const imageClass = "w-full h-auto object-cover aspect-[4/3] md:aspect-square";

  if (images.length <= 1) {
    return (
      <div className="md:sticky md:top-24 overflow-hidden rounded-2xl bg-ink/5 shadow-card">
        <img src={getFullImageUrl(images[0] ?? "")} alt={name} className={imageClass} />
      </div>
    );
  }

  return (
    <div className="md:sticky md:top-24">
      <div className="relative overflow-hidden rounded-2xl bg-ink/5 shadow-card">
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <CarouselContent className="ml-0">
            {images.map((src, index) => (
              <CarouselItem key={src} className="pl-0">
                <img
                  src={getFullImageUrl(src)}
                  alt={`${name} ${index + 1}`}
                  className={imageClass}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((src, index) => (
            <span
              key={src}
              aria-hidden="true"
              className={cn("h-2 rounded-full transition-all", index === current ? "w-6 bg-brand" : "w-2 bg-white/80")}
            />
          ))}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
          {current + 1}/{images.length}
        </span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => api?.scrollTo(index)}
            aria-label={`Зураг ${index + 1}`}
            aria-current={index === current ? "true" : undefined}
            className={cn(
              "h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-ink/5 transition-opacity md:h-20 md:w-20",
              index === current ? "ring-2 ring-brand" : "opacity-60 hover:opacity-100",
            )}
          >
            <img src={getFullImageUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
