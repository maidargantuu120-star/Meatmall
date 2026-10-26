import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { BrandLogo } from "@/components/brand-logo";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export type HeroSlideContent = { title?: string; text?: string; imageUrl?: string };

// Images replace the photo inside this layout; they never replace the branded design.
// The editor uses compact mode to preview the phone layout at any viewport width.
export function BrandHeroSlide({ title, text, imageUrl, compact = false, heading = 'h1' }: HeroSlideContent & {
  compact?: boolean; heading?: 'h1' | 'h2' | 'h3';
}) {
  const { t } = useLanguage();
  const Heading = heading;
  const image = imageUrl?.trim() || '/hero-meat.webp';
  return (
    <div className="relative h-full overflow-hidden bg-brand text-white" data-testid="brand-hero-slide">
      <div className={cn("relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-10", !compact && "md:px-8 md:py-20 lg:py-24")}>
        <motion.div
          className={cn(!compact && "md:max-w-[46%]")}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        >
          <Heading className={cn("break-words font-display font-black uppercase italic leading-[1] tracking-tight", compact ? "text-[2.5rem]" : "text-[clamp(2.5rem,7vw,4.75rem)]")}>
            {title?.trim() || t.heroTitle}
          </Heading>
          <p className={cn("mt-4 max-w-md break-words text-base text-white/85", !compact && "md:text-lg")}>{text?.trim() || t.heroSubtitle}</p>
          <a href="#products" tabIndex={compact ? -1 : undefined}
            className="mt-7 inline-flex items-center gap-2 rounded bg-ink px-6 py-3.5 font-display text-base font-bold transition-colors hover:bg-black">
            {t.viewProducts}<ArrowRight className="h-5 w-5" />
          </a>
        </motion.div>
      </div>
      <div className={cn("relative h-56 [clip-path:polygon(0_12%,100%_0,100%_100%,0_100%)]", !compact && "sm:h-72 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[56%] md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]")}>
        <img key={image} src={getFullImageUrl(image)} alt="" className="h-full w-full object-cover object-[50%_65%]" loading="eager"
          onError={event => {
            if (image !== '/hero-meat.webp' && event.currentTarget.dataset.fallback !== 'true') {
              event.currentTarget.dataset.fallback = 'true';
              event.currentTarget.src = getFullImageUrl('/hero-meat.webp');
            } else handleImageError(event, image);
          }} />
      </div>
      <BrandLogo className={cn("absolute bottom-4 right-4 z-10 w-28 drop-shadow-xl", !compact && "sm:w-32 md:bottom-6 md:right-8 md:w-40 lg:w-48")} />
    </div>
  );
}
