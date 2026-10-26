import { useEffect, useState, type ReactNode } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Beef,
  Check,
  Copy,
  Drumstick,
  Ham,
  Handshake,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Quote,
  Scale,
  ShoppingBasket,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer, useFooterSettings } from "@/components/footer";
import { SectionTitle } from "@/components/section-title";
import { BrandLogo } from "@/components/brand-logo";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Link } from "wouter";
import { BRAND, telHref } from "@/lib/brand";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

// Company introduction copy (Mongolian only: the storefront language is fixed to mn).
const ABOUT = {
  title: "Бидний тухай",
  intro:
    "Бид чанартай, шинэхэн, шалгалт баталгаажсан мах, махан бүтээгдэхүүнийг хэрэглэгчдэд шууд санал болгож, ил тод мэдээлэл, шударга жин, найдвартай үйлчилгээ дээр суурилсан урт хугацааны харилцааг эрхэмлэн ажилладаг.",
  purpose:
    "нь зөвхөн мах худалдах бус, хэрэглэгчдэд эрүүл, аюулгүй, итгэлтэй хүнс сонгох боломжийг бүрдүүлж, ил тод, найдвартай махны худалдааны соёлыг түгээх зорилготой.",
  overview:
    "Манайх чанартай, шинэхэн мах, махан бүтээгдэхүүнийг боломжийн үнээр санал болгож, БНСУ-ын аль ч бүс нутагт хурдан, найдвартай хүргэлтээр хэрэглэгчдэд хүргэж үйлчилдэг.",
  missionHeadline: "Тогтвортой өсөлт, урт хугацааны хамтын ажиллагаа",
  mission:
    "Солонгосын чанартай, шалгалт баталгаажсан мах, махан бүтээгдэхүүнийг хэрэглэгчдэд танилцуулж, найдвартай нийлүүлэлт, ил тод худалдаа, чанарт суурилсан үйлчилгээ дээр тулгуурлан тогтвортой өсөлт, урт хугацааны хамтын ажиллагааг бий болгохыг зорьдог.",
};

// Keywords for the scrolling band between the hero and the purpose statement.
const KEYWORDS = ["Чанартай", "Шинэхэн", "Шударга жин", "Ил тод", "Найдвартай", "БНСУ даяар хүргэлт"];

const HIGHLIGHTS = [
  { icon: Sparkles, label: "Чанартай, шинэхэн мах" },
  { icon: Tag, label: "Боломжийн үнэ" },
  { icon: Truck, label: "БНСУ даяар хүргэлт" },
];

// Photos for the company overview slider (files in client/public).
const MEAT_SLIDES = [
  { src: "/about/beef-gift-set.webp", alt: "Үхрийн махны бэлгийн багц" },
  { src: "/about/beef-steak.webp", alt: "Үхрийн махны стейк" },
  { src: "/about/beef-short-ribs.webp", alt: "Үхрийн хавирга" },
  { src: "/about/pork-belly.webp", alt: "Гахайн гэдэсний мах" },
];

// Bento tiles: photo tiles where we have a photo, brand-color tiles otherwise.
// `span` places the tile in the 2-column (mobile) / 4-column, 2-row (md+) grid.
const SERVICES = [
  {
    icon: Beef,
    label: "Үхрийн мах",
    image: "/about/beef-steak.webp",
    tone: "photo",
    span: "col-span-2 h-56 sm:h-64 md:row-span-2 md:h-auto",
  },
  {
    icon: Drumstick,
    label: "Гахай, тахианы мах",
    image: "/about/pork-belly.webp",
    tone: "photo",
    span: "col-span-2 h-44 sm:h-48 md:h-auto",
  },
  { icon: Ham, label: "Хонины мах", tone: "ink", span: "h-40 sm:h-44 md:h-auto" },
  { icon: ShoppingBasket, label: "Монгол, орос хүнс", tone: "brand", span: "h-40 sm:h-44 md:h-auto" },
] as const;

// The three foundations named in the mission statement.
const MISSION_PILLARS = [
  { icon: PackageCheck, label: "Найдвартай нийлүүлэлт" },
  { icon: Scale, label: "Ил тод худалдаа" },
  { icon: BadgeCheck, label: "Чанарт суурилсан үйлчилгээ" },
];

const STRENGTHS = [
  { icon: Award, title: "Олон жилийн туршлагатай хамт олон" },
  { icon: Truck, title: "Солонгосын бүх хот руу хүргэлт үйлчилгээтэй" },
  { icon: Handshake, title: "Найдвартай хамт олон танд үйлчилнэ" },
];

// Motion presets. MotionConfig reducedMotion="user" drops the movement (keeps fades)
// for visitors who ask for reduced motion (design-system.md §5).
const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};
const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.4, rotate: -20 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 16 } },
};
const growX: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
};
const growY: Variants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.6, ease: EASE } },
};

// Plays its children's variants in sequence when it scrolls into view.
function Stagger({
  children,
  className,
  gap = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

// Brand-red reading progress bar pinned to the top of the viewport.
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-brand"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

// Title words rise out of a mask one after another.
function MaskedTitle({ text }: { text: string }) {
  return (
    <motion.h1
      className="font-display text-[clamp(2.25rem,6vw,4rem)] font-black uppercase leading-[1.1] tracking-tight"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
    >
      {text.split(" ").map((word, index) => (
        <span key={index} className="mr-[0.25em] inline-block overflow-hidden py-[0.08em] align-bottom last:mr-0">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%" },
              show: { y: "0%", transition: { duration: 0.8, ease: EASE } },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

// Endless keyword band (same marquee as the home notice bar; static under reduced motion).
function KeywordBand() {
  return (
    <div className="overflow-hidden border-y border-white/10 bg-ink py-4 text-white md:py-5" aria-hidden="true">
      <div className="flex w-max animate-scroll-x" style={{ animationDuration: "40s" }}>
        {[0, 1].map(half => (
          <div key={half} className="flex shrink-0">
            {[...KEYWORDS, ...KEYWORDS].map((word, i) => (
              <span key={i} className="flex items-center whitespace-nowrap">
                <span
                  className={cn(
                    "px-6 font-display text-xl font-black uppercase tracking-tight md:px-8 md:text-3xl",
                    i % 2 === 1 && "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.7)]",
                  )}
                >
                  {word}
                </span>
                <span className="text-brand">●</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Auto-advancing photo slider (5s, like the home hero). Pauses on hover/focus;
// no autoplay under reduced motion.
function MeatSlider() {
  const reduceMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  useEffect(() => {
    if (!api || paused || reduceMotion || MEAT_SLIDES.length < 2) return;
    const interval = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [api, paused, reduceMotion]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-ink shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Carousel setApi={setApi} className="w-full" opts={{ align: "start", loop: true }}>
        <CarouselContent className="ml-0">
          {MEAT_SLIDES.map((slide, index) => (
            <CarouselItem key={slide.src} className="pl-0">
              <img
                src={slide.src}
                alt={slide.alt}
                className="aspect-[3/2] w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/50 to-transparent" aria-hidden="true" />
      <BrandLogo className="pointer-events-none absolute bottom-3 right-3 w-20 drop-shadow-xl md:w-24" />
      {MEAT_SLIDES.length > 1 && (
        <div className="absolute bottom-4 left-4 flex gap-1.5">
          {MEAT_SLIDES.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Slide ${index + 1}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
              className={cn("h-2 rounded-full transition-all", index === current ? "w-6 bg-brand" : "w-2 bg-white/70")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children, className = "text-brand" }: { children: ReactNode; className?: string }) {
  return (
    <motion.p
      variants={fadeUp}
      className={`mb-2 font-display text-xs font-extrabold uppercase tracking-[0.2em] md:text-sm ${className}`}
    >
      {children}
    </motion.p>
  );
}

// Small pill used for the actions on each contact row.
const ACTION_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-[13px] font-bold transition-colors";

// Contact panel: one row per channel, each with a direct action.
function ContactSection({
  title,
  addressLabel,
  address,
  phone,
}: {
  title: string;
  addressLabel: string;
  address: string;
  phone: string;
}) {
  const [copied, setCopied] = useState(false);
  const singleLineAddress = address.replace(/\s+/g, " ").trim();

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(singleLineAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the address stays selectable.
    }
  };

  const rows = [
    {
      icon: MapPin,
      label: addressLabel,
      value: (
        <address className="not-italic whitespace-pre-line break-words">{address}</address>
      ),
      actions: (
        <>
          <button
            type="button"
            onClick={copyAddress}
            className={cn(ACTION_PILL, "border border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-white")}
          >
            {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
            {copied ? "Хуулагдлаа" : "Хуулах"}
          </button>
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(singleLineAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ACTION_PILL, "bg-ink text-white hover:bg-brand")}
          >
            <MapIcon className="h-4 w-4" />
            Газрын зураг
          </a>
        </>
      ),
    },
    {
      icon: Phone,
      label: "Утас",
      value: <span className="font-display">{phone}</span>,
      actions: (
        <a href={telHref(phone)} className={cn(ACTION_PILL, "bg-brand text-white hover:bg-brand-deep")}>
          <Phone className="h-4 w-4" />
          Залгах
        </a>
      ),
    },
    {
      icon: MessageCircle,
      label: "Messenger",
      value: <span className="font-display">meatmall.mahnii.delguur</span>,
      actions: (
        <a
          href={BRAND.messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ACTION_PILL, "bg-ink text-white hover:bg-brand")}
        >
          <MessageCircle className="h-4 w-4" />
          Чатлах
        </a>
      ),
    },
  ];

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1fr_1.5fr] md:gap-12 md:px-8">
        <Stagger>
          <Eyebrow>Contact</Eyebrow>
          <motion.div variants={fadeUp}>
            <SectionTitle title={title} className="mb-4" />
          </motion.div>
          <motion.p variants={fadeUp} className="max-w-sm text-base leading-relaxed text-ink/70">
            Захиалга, хүргэлт, бүтээгдэхүүний талаар асуух зүйл байвал бидэнтэй холбогдоорой.
          </motion.p>
          <motion.span variants={growX} className="mt-6 block h-1 w-16 origin-left bg-brand" aria-hidden="true" />
        </Stagger>

        <Stagger className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card" gap={0.12}>
          {rows.map(({ icon: Icon, label, value, actions }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 p-5 transition-colors hover:bg-surface md:p-6"
            >
              <motion.span
                variants={popIn}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </motion.span>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</span>
                <div className="mt-0.5 text-base font-bold leading-snug text-ink md:text-lg">{value}</div>
              </div>
              <div className="flex w-full flex-wrap gap-2 pl-16 sm:w-auto sm:pl-0">{actions}</div>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export default function Contact() {
  const { data: footerSettings } = useFooterSettings();
  const { t } = useLanguage();
  const address = footerSettings?.address || BRAND.address;
  const phone = footerSettings?.phone || BRAND.phone;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-white flex flex-col">
        <ScrollProgress />
        <Navbar />

        <main className="flex-1 overflow-x-hidden">
          {/* Hero: ink block with the meat photo cut on a diagonal, like the home hero */}
          <section className="relative overflow-hidden bg-ink text-white">
            <motion.div
              className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-8 md:pb-24 md:pt-8"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.div variants={fadeLeft}>
                <Link
                  href="/"
                  className="group inline-flex items-center rounded bg-white/10 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Буцах
                </Link>
              </motion.div>
              <motion.div
                className="mt-8 md:mt-16 md:max-w-[48%]"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } } }}
              >
                <Eyebrow>About Meat Mall</Eyebrow>
                <MaskedTitle text={ABOUT.title} />
                <motion.span variants={growX} className="mt-5 block h-1 w-16 origin-left bg-brand" aria-hidden="true" />
                <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
                  {ABOUT.intro}
                </motion.p>
              </motion.div>
            </motion.div>
            <div className="relative h-56 overflow-hidden [clip-path:polygon(0_12%,100%_0,100%_100%,0_100%)] sm:h-72 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[46%] md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]">
              <motion.img
                src="/hero-meat.webp"
                alt=""
                className="h-full w-full object-cover object-[50%_65%]"
                loading="eager"
                initial={{ scale: 1.18 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.8, ease: EASE }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" aria-hidden="true" />
              {/* Brand-red panel wipes away to reveal the photo */}
              <motion.div
                className="absolute inset-0 origin-right bg-brand"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 0.9, delay: 0.35, ease: [0.76, 0, 0.24, 1] }}
                aria-hidden="true"
              />
            </div>
          </section>

          <KeywordBand />

          {/* Purpose statement */}
          <section className="py-12 md:py-16">
            <Stagger className="mx-auto max-w-4xl px-4 text-center md:px-8" gap={0.15}>
              <motion.div variants={popIn} className="inline-block">
                <Quote className="h-10 w-10 fill-brand text-brand" aria-hidden="true" />
              </motion.div>
              <motion.p variants={fadeUp} className="mt-5 text-xl font-bold leading-snug text-ink md:text-[28px] md:leading-[1.4]">
                <span className="relative inline-block text-brand">
                  {BRAND.name}
                  <motion.span
                    variants={growX}
                    className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left bg-brand"
                    aria-hidden="true"
                  />
                </span>{" "}
                {ABOUT.purpose}
              </motion.p>
            </Stagger>
          </section>

          {/* Company overview */}
          <section className="bg-surface py-12 md:py-16">
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2 md:gap-12 md:px-8">
              <Stagger>
                <Eyebrow>Company overview</Eyebrow>
                <motion.div variants={fadeUp}>
                  <SectionTitle title="Компанийн танилцуулга" className="mb-4 md:mb-5" />
                </motion.div>
                <motion.p variants={fadeUp} className="max-w-2xl text-base leading-relaxed text-ink/70 md:text-lg">
                  {ABOUT.overview}
                </motion.p>
                <motion.ul
                  className="mt-6 flex flex-wrap gap-2"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                >
                  {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                    <motion.li
                      key={label}
                      variants={fadeUp}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-[13px] font-bold text-ink shadow-card md:text-sm"
                    >
                      <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
                      {label}
                    </motion.li>
                  ))}
                </motion.ul>
              </Stagger>
              <Stagger>
                <motion.div variants={fadeRight}>
                  <MeatSlider />
                </motion.div>
              </Stagger>
            </div>
          </section>

          {/* Services */}
          <section className="py-12 md:py-16">
            <div className="mx-auto max-w-6xl px-4 md:px-8">
              <Stagger>
                <motion.div variants={fadeUp}>
                  <SectionTitle
                    title="Бид дараах үйлчилгээг үзүүлдэг"
                    action={
                      <Link
                        href="/"
                        className="group hidden shrink-0 items-center gap-1.5 font-display text-sm font-bold text-ink transition-colors hover:text-brand sm:inline-flex"
                      >
                        {t.viewProducts}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    }
                  />
                </motion.div>
              </Stagger>
              <Stagger
                className="grid grid-cols-2 gap-3 md:h-[440px] md:grid-cols-4 md:grid-rows-2 md:gap-4 lg:h-[480px]"
                gap={0.12}
              >
                {SERVICES.map((service, index) => {
                  const Icon = service.icon;
                  const isPhoto = service.tone === "photo";
                  return (
                    <motion.div
                      key={service.label}
                      variants={fadeUp}
                      className={cn(
                        "group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl p-5 text-white shadow-card md:p-6",
                        service.tone === "ink" && "bg-ink",
                        service.tone === "brand" && "bg-brand",
                        service.span,
                      )}
                    >
                      {isPhoto ? (
                        <>
                          <img
                            src={"image" in service ? service.image : undefined}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          />
                          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
                        </>
                      ) : (
                        // Oversized icon as a graphic on colour tiles
                        <Icon
                          className="absolute -right-4 -top-4 -z-10 h-28 w-28 text-white/15 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 md:h-36 md:w-36"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                      <motion.span
                        variants={popIn}
                        className={cn(
                          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl md:h-12 md:w-12",
                          isPhoto ? "bg-brand text-white" : "bg-white/15 text-white",
                        )}
                      >
                        <Icon className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
                      </motion.span>
                      <span className="font-display text-xs font-bold text-white/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "mt-1 font-display font-black uppercase leading-[1.15] tracking-tight",
                          index === 0 ? "text-2xl md:text-4xl" : "text-lg md:text-2xl",
                        )}
                      >
                        {service.label}
                      </span>
                      {/* Brand underline grows on hover */}
                      <span
                        className={cn(
                          "mt-3 block h-1 w-10 origin-left scale-x-50 transition-transform duration-300 group-hover:scale-x-100",
                          service.tone === "brand" ? "bg-white" : "bg-brand",
                        )}
                        aria-hidden="true"
                      />
                    </motion.div>
                  );
                })}
              </Stagger>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded bg-ink px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-brand sm:hidden"
              >
                {t.viewProducts}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* Strengths */}
          <section className="bg-surface py-12 md:py-16">
            <div className="mx-auto max-w-6xl px-4 md:px-8">
              <Stagger>
                <motion.div variants={fadeUp}>
                  <SectionTitle title="Бидний давуу тал" description="Хамгийн найдвартай хамт олон" />
                </motion.div>
              </Stagger>
              <Stagger className="grid gap-4 md:grid-cols-3 md:gap-5" gap={0.18}>
                {STRENGTHS.map(({ icon: Icon, title }, index) => (
                  <motion.div
                    key={title}
                    variants={fadeLeft}
                    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-card md:p-7"
                  >
                    {/* Brand edge draws down, the big number slides in */}
                    <motion.span
                      variants={growY}
                      className="absolute inset-y-0 left-0 w-1 origin-top bg-brand"
                      aria-hidden="true"
                    />
                    <motion.span
                      variants={fadeRight}
                      className="absolute right-4 top-2 font-display text-6xl font-black text-ink/[0.06] md:text-7xl"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </motion.span>
                    <motion.div variants={popIn} className="inline-block">
                      <Icon className="h-8 w-8 text-brand" aria-hidden="true" />
                    </motion.div>
                    <h3 className="relative mt-4 font-display text-lg font-extrabold leading-snug text-ink md:text-xl">
                      {title}
                    </h3>
                  </motion.div>
                ))}
              </Stagger>
            </div>
          </section>

          {/* Mission: full-bleed brand block (same pattern as the home promo block) */}
          <section className="relative overflow-hidden bg-brand text-white">
            {/* Light sweep across the block when it enters */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10"
              initial={{ x: "0%" }}
              whileInView={{ x: "450%" }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
              aria-hidden="true"
            />
            <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:px-8 md:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              <Stagger gap={0.15}>
                <Eyebrow className="text-white/70">Бидний зорилго</Eyebrow>
                <motion.h2
                  variants={fadeUp}
                  className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-black uppercase leading-[1.15] tracking-tight"
                >
                  {ABOUT.missionHeadline}
                </motion.h2>
                <motion.span variants={growX} className="mt-5 block h-1 w-16 origin-left bg-white" aria-hidden="true" />
                <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
                  {ABOUT.mission}
                </motion.p>
                <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                  <motion.a
                    href={telHref(phone)}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-display text-base font-bold transition-colors hover:bg-black"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Phone className="h-5 w-5" aria-hidden="true" />
                    {phone}
                  </motion.a>
                  <motion.a
                    href={BRAND.messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-white px-6 py-3 font-display text-base font-bold transition-colors hover:bg-white hover:text-brand"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    Messenger
                  </motion.a>
                </motion.div>
              </Stagger>
              {/* Mission pillars */}
              <Stagger className="grid gap-3 md:gap-4" gap={0.15} delay={0.2}>
                {MISSION_PILLARS.map(({ icon: Icon, label }, index) => (
                  <motion.div
                    key={label}
                    variants={fadeRight}
                    className="group flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white hover:text-brand md:p-5"
                  >
                    <motion.span
                      variants={popIn}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand transition-colors group-hover:bg-brand group-hover:text-white md:h-14 md:w-14"
                    >
                      <Icon className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />
                    </motion.span>
                    <span className="font-display text-base font-extrabold leading-snug md:text-lg">{label}</span>
                    <span className="ml-auto font-display text-2xl font-black text-white/30 transition-colors group-hover:text-brand/30 md:text-3xl" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </motion.div>
                ))}
              </Stagger>
            </div>
          </section>

          <ContactSection title={t.contact} addressLabel={t.address} address={address} phone={phone} />
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
}
