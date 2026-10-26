import React, { useEffect, useState, memo, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/sections/hero";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  useLanguage,
  getLocalizedProductName,
  getLocalizedProductDescription,
} from "@/contexts/language-context";
import { QuantityModal } from "@/components/quantity-modal";
import { useImagePreloader } from "@/hooks/use-image-preloader";
import { logMobileCookieDebug } from "@/utils/cookieUtils";
import {
  calculateDeliveryDate,
  formatDeliveryDate,
  getDeliveryMessage,
  DeliverySettings,
  NonDeliveryDay,
} from "@/lib/delivery-date";
import { Truck, Star } from "lucide-react";
import { Review } from "@shared/schema";
import { getFullImageUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/section-title";
import { BrandLogo } from "@/components/brand-logo";
import { CartActions } from "@/components/cart-actions";

function ReviewCard({
  review,
  testId,
  className,
}: {
  review: Review;
  testId: string;
  className?: string;
}) {
  return (
    <div
      className={cn("bg-white rounded-2xl shadow-card p-5", className)}
      data-testid={testId}
    >
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < review.rating ? "text-brand fill-brand" : "text-ink/15"}`}
          />
        ))}
      </div>
      <p className="text-ink/70 text-sm leading-relaxed line-clamp-3 min-h-[4.5em]">
        {review.content}
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-ink/10 pt-4">
        <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-white font-display font-extrabold flex-shrink-0">
          {review.customerName.charAt(0).toUpperCase()}
        </div>
        <span className="font-bold text-sm text-ink">
          {review.customerName}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [displayedCount, setDisplayedCount] = useState(12); // Initial display count
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Fetch service categories for the homepage
  const { data: serviceCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/service-categories");
      if (!Array.isArray(data)) return [];
      return data.filter((cat: any) => cat.isActive);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch featured products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/products");
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch delivery settings and non-delivery days
  const { data: deliverySettings } = useQuery<DeliverySettings>({
    queryKey: ["delivery-settings"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/delivery-settings");
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: nonDeliveryDays = [] } = useQuery<NonDeliveryDay[]>({
    queryKey: ["non-delivery-days"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/non-delivery-days");
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch approved reviews
  const { data: reviewsData = [] } = useQuery<Review[]>({
    queryKey: ["reviews"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/reviews");
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch product categories from category management
  const { data: productCategories = [] } = useQuery<any[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate delivery date
  const deliveryDate = useMemo(() => {
    if (!deliverySettings) return null;
    return calculateDeliveryDate(deliverySettings, nonDeliveryDays);
  }, [deliverySettings, nonDeliveryDays]);
  // Filter products based on selected category
  const filteredProducts = React.useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    if (selectedCategory === "all") {
      return products;
    }

    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  // Products to display (with pagination)
  const displayedProducts = React.useMemo(() => {
    return filteredProducts.slice(0, displayedCount);
  }, [filteredProducts, displayedCount]);

  // Preload product images for faster display
  const productImageUrls = useMemo(() => {
    return displayedProducts.map((product) => product.imageUrl);
  }, [displayedProducts]);

  const { loadedImages, isLoading: imagesLoading } =
    useImagePreloader(productImageUrls);

  // Reset displayed count when category changes
  useEffect(() => {
    setDisplayedCount(12);
  }, [selectedCategory]);

  // Mobile cookie debugging - run once on mount
  useEffect(() => {
    // Only run on mobile browsers
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    if (isMobile) {
      setTimeout(() => {
        logMobileCookieDebug();
      }, 2000); // Wait 2 seconds for page to fully load
    }
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (displayedCount < filteredProducts.length) {
          setDisplayedCount((prev) =>
            Math.min(prev + 8, filteredProducts.length),
          );
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [displayedCount, filteredProducts.length]);

  // Handle category click to navigate to the service category page
  const handleServiceCategoryClick = (slug: string) => {
    setLocation(`/service-categories/${slug}`);
  };

  // Memoize event handlers
  const handleAddToCartClick = useCallback(
    (product: Product, buyNow = false) => {
      if (!user) {
        toast({
          title: t.toast.loginRequired,
          description: t.toast.loginRequiredDesc,
          variant: "default",
        });
        setLocation("/auth?tab=signup");
        return;
      }

      setSelectedProduct(product);
      setIsBuyNow(buyNow);
      setIsQuantityModalOpen(true);
    },
    [user, toast, setLocation],
  );

  const handleCloseModal = useCallback(() => {
    setIsQuantityModalOpen(false);
    setSelectedProduct(null);
  }, []);

  // Check for upcoming non-delivery days to show warning banner
  const upcomingNonDeliveryDays = useMemo(() => {
    if (!nonDeliveryDays || nonDeliveryDays.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return nonDeliveryDays.filter((day) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate >= today && dayDate <= nextWeek;
    });
  }, [nonDeliveryDays]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Non-delivery Days Warning Banner */}
      {upcomingNonDeliveryDays.length > 0 && (
        <div className="bg-red-50 border-b-2 border-red-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-600 flex-shrink-0">
                warning
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Хүргэлтийн тухай:
                </p>
                <p className="text-xs text-red-700">
                  {upcomingNonDeliveryDays.map((day, idx) => (
                    <span key={day.id}>
                      {idx > 0 && ", "}
                      {new Date(day.date).toLocaleDateString("mn-MN")} (
                      {day.reason})
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow">
        <Hero />

        {/* Reviews Section */}
        {reviewsData.length > 0 && (
          <section className="py-12 md:py-16 bg-white">
            <div className="container mx-auto max-w-6xl px-4 md:px-8">
              <SectionTitle
                title="Хэрэглэгчдийн сэтгэгдэл"
                description="Чанар баталгааг амлая"
              />
              {/* Desktop: Grid layout */}
              <div className="hidden md:grid grid-cols-3 gap-6">
                {(Array.isArray(reviewsData) ? reviewsData : [])
                  .slice(0, 3)
                  .map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      testId={`review-card-${review.id}`}
                    />
                  ))}
              </div>
              {/* Mobile: Horizontal auto-scrolling carousel */}
              <div className="md:hidden overflow-hidden -mx-4 px-4 pb-6">
                <div className="flex gap-4 animate-scroll-x">
                  {(() => {
                    const safeReviews = Array.isArray(reviewsData)
                      ? reviewsData
                      : [];
                    return [
                      ...safeReviews.slice(0, 3),
                      ...safeReviews.slice(0, 3),
                    ].map((review, index) => (
                      <ReviewCard
                        key={`${review.id}-${index}`}
                        review={review}
                        testId={`review-card-mobile-${review.id}-${index}`}
                        className="flex-shrink-0 w-[280px]"
                      />
                    ));
                  })()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Featured Products Section */}
        <section id="products" className="py-12 md:py-16 bg-surface scroll-mt-16 md:scroll-mt-[72px]">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle
                title={t.featuredProducts}
                description={t.featuredProductsDesc}
                className="mb-4 md:mb-5"
              />
            </motion.div>

            {/* Category chips - stick under the header */}
            <div className="sticky top-16 md:top-[72px] z-30 mb-6 -mx-4 px-4 py-3 md:-mx-8 md:px-8 bg-surface/95 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { key: "all", label: t.categories.all, value: "all" },
                  ...(Array.isArray(productCategories)
                    ? productCategories
                        .filter((cat: any) => cat.isActive !== false)
                        .sort(
                          (a: any, b: any) => (a.order || 0) - (b.order || 0),
                        )
                        .map((cat: any) => ({
                          key: cat.id,
                          label: cat.name,
                          value: cat.name,
                        }))
                    : []),
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setSelectedCategory(chip.value)}
                    className={cn(
                      "flex-shrink-0 rounded-full border-2 px-4 py-1.5 font-display text-[13px] md:text-sm font-bold transition-colors",
                      selectedCategory === chip.value
                        ? "border-ink bg-ink text-white"
                        : "border-ink/15 bg-white text-ink hover:border-ink/40",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product display section */}
            <div>
              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl shadow-card overflow-hidden animate-pulse"
                      >
                        <div className="aspect-square bg-ink/5"></div>
                        <div className="p-3 md:p-4 space-y-2">
                          <div className="h-4 bg-ink/5 rounded w-3/4"></div>
                          <div className="h-5 bg-ink/5 rounded w-1/2"></div>
                          <div className="h-10 bg-ink/5 rounded w-full"></div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : displayedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                    {displayedProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        className="group bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover h-full flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.05 }}
                      >
                        {/* Photo and name open the product detail page; the buttons below stay quick actions */}
                        <Link
                          href={`/products/${product.id}`}
                          className="block aspect-square relative overflow-hidden bg-ink/5"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <img
                            src={getFullImageUrl(
                              product.thumbnailUrl || product.imageUrl,
                            )}
                            alt={getLocalizedProductName(product, language)}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (
                                parent &&
                                !parent.querySelector(".fallback-bg")
                              ) {
                                const fallback = document.createElement("div");
                                fallback.className =
                                  "fallback-bg absolute inset-0 bg-brand flex items-center justify-center";
                                fallback.innerHTML = `<span class="text-white font-bold text-xs text-center px-2">${product.name}</span>`;
                                parent.appendChild(fallback);
                              }
                            }}
                          />

                          {/* Description Badge */}
                          {product.description && (
                            <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-20px)]">
                              <div className="bg-ink text-white font-semibold text-[11px] md:text-xs px-2.5 py-1 rounded-full w-fit">
                                <span className="block truncate">
                                  {getLocalizedProductDescription(
                                    product,
                                    language,
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </Link>

                        <div className="p-3 md:p-4 flex-1 flex flex-col">
                          <h3 className="font-bold text-[15px] md:text-lg text-ink leading-snug">
                            {/* line-clamp makes the link a box, so the whole name area is tappable */}
                            <Link
                              href={`/products/${product.id}`}
                              className="line-clamp-2 transition-colors hover:text-brand focus-visible:text-brand focus-visible:outline-none"
                            >
                              {getLocalizedProductName(product, language)}
                            </Link>
                          </h3>

                          <div className="mt-auto pt-2">
                            {/* Price with won chip; shown as stored (already calculated for packages) */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                                ₩
                              </span>
                              <span className="font-display text-lg md:text-xl font-extrabold leading-none text-brand">
                                {parseFloat(product.price.toString()).toLocaleString()}
                              </span>
                            </div>

                            {/* Cart icon + buy now */}
                            <CartActions
                              onAddToCart={() => handleAddToCartClick(product)}
                              onBuyNow={() => handleAddToCartClick(product, true)}
                            />

                            {/* Delivery date line */}
                            {deliveryDate && (
                              <div
                                className="mt-2 text-[10px] sm:text-xs text-ink/50 text-center leading-snug"
                                data-testid={`delivery-badge-${product.id}`}
                              >
                                <Truck className="inline h-3 w-3 mr-1 -mt-0.5" />
                                <span className="font-semibold text-ink/70">
                                  {formatDeliveryDate(deliveryDate, language)}
                                </span>{" "}
                                {getDeliveryMessage(language)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Load More Indicator */}
                  {displayedCount < filteredProducts.length && (
                    <div className="text-center mt-8">
                      <div className="inline-flex items-center gap-2 text-ink/50">
                        <div className="w-4 h-4 border-2 border-ink/10 border-t-brand rounded-full animate-spin"></div>
                        {t.loading}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-white shadow-card mb-4">
                    <span className="material-icons text-brand text-3xl">
                      inventory_2
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-ink mb-2">
                    Бүтээгдэхүүн олдсонгүй
                  </h3>
                  <p className="text-ink/60 max-w-md mx-auto mb-5">
                    Таны сонгосон ангилалд одоогоор бүтээгдэхүүн байхгүй байна.
                  </p>
                  <Button
                    onClick={() => setSelectedCategory("all")}
                    className="rounded bg-ink hover:bg-brand text-white font-display text-sm font-bold h-12 px-8"
                  >
                    Бүх бүтээгдэхүүн үзэх
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Promo block */}
        <section className="overflow-hidden bg-brand text-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex items-center justify-between gap-8">
            <div>
              <h2 className="font-display text-[clamp(1.75rem,5vw,3.25rem)] font-black uppercase leading-[1.1] tracking-tight max-w-2xl">
                {t.delivery.scrolling.split("●")[0].trim()}
              </h2>
              <Link
                href="/contact"
                className="mt-6 inline-flex items-center rounded-full bg-ink px-7 py-3.5 font-display text-base font-bold transition-colors hover:bg-black"
              >
                {t.contact}
              </Link>
            </div>
            <BrandLogo className="hidden md:block w-64 lg:w-80 flex-shrink-0 drop-shadow-xl" />
          </div>
        </section>
      </main>
      <Footer />
      {/* Quantity Modal */}
      <QuantityModal
        isOpen={isQuantityModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        buyNow={isBuyNow}
      />
    </div>
  );
}
