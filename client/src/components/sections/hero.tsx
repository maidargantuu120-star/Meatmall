import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { BrandHeroSlide, type HeroSlideContent } from "./brand-hero-slide";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";

type HeroSettings = HeroSlideContent & { slides?: HeroSlideContent[] };

export function Hero() {
  const { t } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { data: heroData } = useQuery<HeroSettings>({
    queryKey: ["/api/settings/hero"], queryFn: () => apiRequest("GET", "/api/settings/hero"), staleTime: 60000,
  });
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    const interval = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext(); else api.scrollTo(0);
    }, 5000);
    return () => { clearInterval(interval); api.off("select", onSelect); };
  }, [api]);

  const slides = useMemo(() => {
    const configured = Array.isArray(heroData?.slides) ? heroData.slides : heroData ? [heroData] : [];
    // A text-only slide still uses the same layout and the default meat photo.
    const content = configured.filter(slide => slide && (slide.imageUrl || slide.title || slide.text));
    return content.length ? content : [{}];
  }, [heroData]);
  const notice = t.delivery.scrolling.split("●")[0].trim();

  return (
    <section>
      <div className="overflow-hidden bg-ink py-2 text-xs font-medium text-white md:text-[13px]">
        <div className="flex w-max animate-scroll-x" style={{ animationDuration: "30s" }}>
          {[0, 1].map(half => <div key={half} aria-hidden={half === 1} className="flex shrink-0">
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="flex items-center whitespace-nowrap">
              <span className="px-6">{notice}</span><span className="text-brand">●</span>
            </span>)}
          </div>)}
        </div>
      </div>
      <div className="relative">
        <Carousel setApi={setApi} className="w-full" opts={{ align: "start", loop: true }}>
          <CarouselContent className="ml-0">
            {slides.map((slide, index) => <CarouselItem key={index} className="pl-0">
              <BrandHeroSlide {...slide} heading={index === 0 ? 'h1' : 'h2'} />
            </CarouselItem>)}
          </CarouselContent>
        </Carousel>
        {slides.length > 1 && <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, index) => <button key={index} type="button" aria-label={`Slide ${index + 1}`}
            aria-current={index === current ? 'true' : undefined} onClick={() => api?.scrollTo(index)}
            className={cn("h-2 rounded-full transition-all", index === current ? "w-6 bg-white" : "w-2 bg-white/60")} />)}
        </div>}
      </div>
    </section>
  );
}
