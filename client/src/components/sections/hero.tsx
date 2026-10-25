import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function Hero() {
  const { t } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Fetch hero content
  const { data: heroData } = useQuery<any>({
    queryKey: ["/api/settings/hero"],
    queryFn: () => apiRequest("GET", "/api/settings/hero"),
    staleTime: 60000,
  });

  // Custom Autoplay with API
  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    const autoPlayInterval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => {
      clearInterval(autoPlayInterval);
      api.off("select", onSelect);
    };
  }, [api]);

  // Prepare slides data; only slides with an image go into the banner
  const slides = React.useMemo(() => {
    if (!heroData) return [];

    // New format
    if (
      heroData.slides &&
      Array.isArray(heroData.slides) &&
      heroData.slides.length > 0
    ) {
      return heroData.slides.filter((slide: any) => slide.imageUrl);
    }

    // Legacy format
    if (!heroData.imageUrl) return [];
    return [
      {
        title: heroData.title,
        text: heroData.text,
        imageUrl: heroData.imageUrl,
      },
    ];
  }, [heroData]);

  // The delivery message is stored as a repeated string; take one copy for the ticker
  const notice = t.delivery.scrolling.split("●")[0].trim();

  return (
    <section>
      {/* Notice ticker: two identical halves so the -50% loop is seamless */}
      <div className="overflow-hidden bg-ink py-2 text-xs font-medium text-white md:text-[13px]">
        <div
          className="flex w-max animate-scroll-x"
          style={{ animationDuration: "30s" }}
        >
          {[0, 1].map((half) => (
            <div key={half} aria-hidden={half === 1} className="flex shrink-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="flex items-center whitespace-nowrap">
                  <span className="px-6">{notice}</span>
                  <span className="text-brand">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 0 ? (
        // Full-bleed banner slider
        <div className="relative">
          <Carousel
            setApi={setApi}
            className="w-full"
            opts={{ align: "start", loop: true }}
          >
            <CarouselContent className="ml-0">
              {slides.map((slide: any, index: number) => (
                <CarouselItem key={index} className="pl-0">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface md:aspect-[12/5]">
                    <img
                      src={getFullImageUrl(slide.imageUrl)}
                      alt={slide.title || t.siteTitle}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: "center 35%" }}
                      onError={(e) => handleImageError(e, slide.imageUrl)}
                      loading="eager"
                    />
                    {(slide.title || slide.text) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pb-10 pt-20 text-white">
                        <div className="mx-auto max-w-6xl px-4 md:px-8">
                          {slide.title && (
                            <p className="line-clamp-1 font-display text-xl font-black uppercase leading-tight md:text-3xl">
                              {slide.title}
                            </p>
                          )}
                          {slide.text && (
                            <p className="mt-1 line-clamp-1 text-sm text-white/85 md:text-base">
                              {slide.text}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_: any, index: number) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Slide ${index + 1}`}
                  onClick={() => api?.scrollTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === current ? "w-6 bg-brand" : "w-2 bg-white/70",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // No banner images configured: brand promo hero with a meat photo
        <div className="relative overflow-hidden bg-brand text-white">
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-10 md:px-8 md:py-20 lg:py-24">
            <motion.div
              className="md:max-w-[46%]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-display text-[clamp(2.5rem,7vw,4.75rem)] font-black uppercase italic leading-[1] tracking-tight">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-md text-base text-white/85 md:text-lg">
                {t.heroSubtitle}
              </p>
              <a
                href="#products"
                className="mt-7 inline-flex items-center gap-2 rounded bg-ink px-6 py-3.5 font-display text-base font-bold transition-colors hover:bg-black"
              >
                {t.viewProducts}
                <ArrowRight className="h-5 w-5" />
              </a>
            </motion.div>
          </div>

          {/* Meat photo: under the text on mobile, diagonal right half from md */}
          <div className="relative h-56 [clip-path:polygon(0_12%,100%_0,100%_100%,0_100%)] sm:h-72 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[56%] md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]">
            <img
              src="/hero-meat.webp"
              alt=""
              className="h-full w-full object-cover object-[50%_65%]"
              loading="eager"
            />
          </div>

          {/* Logo as a sticker on the photo corner */}
          <BrandLogo className="absolute bottom-4 right-4 z-10 w-28 drop-shadow-xl sm:w-32 md:bottom-6 md:right-8 md:w-40 lg:w-48" />
        </div>
      )}
    </section>
  );
}
