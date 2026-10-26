# Meat Mall Storefront - Design System

Reference feel: **kfckorea.com** - clean fast-food commerce. White header, full-bleed photo
banners, heavy italic condensed section titles, light-grey product area with white shadowed
cards, black rectangular CTAs, a solid brand-color promo block, and a two-tier footer.

We take KFC's *structure, tone and red-black-white palette*, not its brand assets: no KFC
logo, stripes, colonel, slogans or copy. The brand color lives in `--brand` / `--brand-deep`
(and `--primary`) in `client/src/index.css`; customer pages use the `brand` token instead of
hardcoded hex. The app icon/splash (`capacitor.config.ts`, Android resources) are still the old
blue `#3c8fb8` and old name.

Visual preview of everything below: open `design/preview.html` in a browser.

## 0. Brand
| Item | Value | Source of truth |
|------|-------|-----------------|
| Name | **Meat Mall** | `client/src/lib/brand.ts` (`BRAND.name`) |
| Phone | 010-8082-9929 | `BRAND.phone` (admin footer setting overrides when set) |
| Facebook page | https://www.facebook.com/meatmall.mahnii.delguur | `BRAND.facebookUrl` |
| Messenger | https://m.me/meatmall.mahnii.delguur | `BRAND.messengerUrl` |

### Logo
Recolored redraw of the original Meat Mall badge (est. 2014) in the site palette.

| File | Use |
|------|-----|
| `design/logo/meat-mall-logo.svg` | Primary badge logo (master). Steak + sausage on fork, ink-outlined badge, red ribbon with "Meat Mall", "• 2014 •". White sticker outline so it works on red/dark backgrounds. |
| `design/logo/meat-mall-mark.svg` | Square mark (white steak with dark grill marks on a red tile) for favicon, app icon, social avatar. No text. |
| `design/logo/make-icons.ps1` | Renders the **badge logo** to PNG app icons on a brand-red square via headless Edge/Chrome (real web font + sticker filter): `icon-192/512.png` (logo 86% wide), `icon-maskable-512.png` (62%, inside Android's safe zone), `apple-touch-icon.png` (180, 84%). Run `powershell -File design/logo/make-icons.ps1 -OutDir client/public/icons`. The steak mark stays the favicon only (logo text is unreadable at 16px). |
| `client/src/components/brand-logo.tsx` | Site copy of the primary logo as inline SVG (`<BrandLogo />`) so the slab web font applies. Keep in sync with the master. |
| `client/public/favicon.svg` | Copy of the mark. |

Color mapping from the original: brown → `ink` #141414, orange-red → `brand` #e4002b,
dark red → #8f0016, beige → white. Wordmark font: **Alfa Slab One** (SIL OFL), loaded from
Google Fonts; Tailwind `font-slab`.

Usage: minimum height 48px (header). On white, red or dark backgrounds use as-is; don't
recolor, stretch, or remove the ribbon. Header pairs the badge with a "Meat **Mall**" slab
wordmark (Mall in brand red) because the ribbon text is small at header size.

## 1. Color tokens
HSL CSS variables in `client/src/index.css`, Tailwind names in `tailwind.config.ts`
(alpha works: `bg-brand/10`).

| Token        | Hex       | Role (KFC equivalent)                                         |
|--------------|-----------|---------------------------------------------------------------|
| `brand`      | `#e4002b` | Brand red: prices, active nav, promo block, TOP button, `--primary` |
| `brand-deep` | `#b5001f` | Hover/pressed brand                                            |
| `ink`        | `#141414` | Headings, primary text, black CTA buttons                      |
| `bark`       | `#2c251e` | Unused (footer band moved to `ink`); kept as a token           |
| `surface`    | `#f8f8f8` | Product section and footer top background                      |

Body text uses `ink/70`, captions `ink/50`. White is the default page background.
Rule: brand color is an accent, never a large text color on white beyond prices/links.
Exception: Messenger (#0084ff) and Facebook (#1877f2) keep their platform colors in the quick
menu so they are instantly recognizable.

## 2. Typography
Most copy is Mongolian Cyrillic (incl. Ү ү Ө ө), so every face must cover it.

- **Display**: **Montserrat** 800/900 (`font-display`) for section titles, promo headline,
  nav links, chips, buttons and prices. Full Mongolian Cyrillic, heavy and very common in
  Mongolian design. Titles are **upright** uppercase: italic Cyrillic reads poorly.
  Italic (Montserrat 900 italic) is kept only for Latin bits: hero "MEAT MALL", "QUICK", "TOP".
- **Body**: **Pretendard** (`font-sans`, default). Pretendard has **no Cyrillic glyphs**, so
  Mongolian body text falls back to **Inter**, which Pretendard's Latin is based on; Latin,
  digits and Korean use Pretendard. Stack: `'Pretendard Variable', Pretendard, Inter, sans-serif`.
- **Slab**: Alfa Slab One, logo wordmark only (`font-slab`, Latin only).
- Do not use Fira Sans Extra Condensed: it lacks these Cyrillic glyphs and rendered as a
  fake-bold/fake-italic fallback.
- Leading: at least 1.1 on uppercase Cyrillic titles so Й/Ү marks don't clip on wrapped lines.

| Use              | Class sketch                                                       |
|------------------|--------------------------------------------------------------------|
| Section title    | `font-display uppercase font-black text-[22px] sm:text-[26px] md:text-[34px] leading-[1.15] tracking-tight` |
| Promo headline   | `font-display uppercase font-black text-[clamp(1.75rem,5vw,3.25rem)] leading-[1.1]` |
| Hero (Latin)     | `font-display uppercase italic font-black text-[clamp(2.5rem,7vw,4.75rem)] leading-none` |
| Card name        | `font-bold text-[15px] md:text-lg text-ink` (body font)            |
| Price            | `font-display font-extrabold text-lg md:text-xl text-brand` + round ₩ chip |
| Nav link         | `font-display font-extrabold uppercase text-sm`                    |
| Chip / button    | `font-display font-bold text-[13px] md:text-sm`                    |

## 3. Shape, spacing, elevation
- Cards: `rounded-2xl` (16px), white, no border, `shadow-card` = `0 10px 20px rgba(0,0,0,.08)`.
- Buttons: rectangular `rounded` (4px) for primary black CTAs; `rounded-full` only for the
  pill CTA inside the promo block and category chips.
- Banners/hero: full-bleed, **no radius**.
- Container `max-w-6xl`, gutters `px-4 md:px-8`. Section padding `py-12 md:py-16`.

## 4. Components
| Component | File | Spec |
|-----------|------|------|
| Header | `components/navbar.tsx` | Sticky white bar, bottom hairline. Left: `<BrandLogo />` + "Meat Mall" slab wordmark. Right: uppercase nav links (ink, hover/active brand with 3px underline), user icon, black cart tile with white count. Mobile: logo + wordmark + menu button. |
| Notice bar | `components/sections/hero.tsx` | Thin `ink` strip above the banner: the delivery message scrolls right-to-left as a ticker (repeated, separated by brand-red ●), 30s loop, pauses on hover, static under reduced motion. |
| Hero banner | `components/sections/hero.tsx` | Full-bleed admin slides, `aspect-[16/10] md:aspect-[12/5]`, object-cover, small dot pagination (active = brand, wider). Slide title/text bottom-left over a dark gradient. With no images: brand-red promo hero (italic headline, subtitle, black CTA) plus a meat photo (`client/public/hero-meat.jpg`): under the text with a slanted top edge on mobile, the right ~56% with a diagonal left edge from md; `<BrandLogo />` sits like a sticker on the photo's bottom-right corner. |
| Section title | `components/section-title.tsx` | Left aligned, italic uppercase black display; optional muted description; optional right-side action. |
| Category chips | `pages/home.tsx` | Horizontal scroll on mobile. Idle: white, `ink/15` border. Active: solid `ink`, white text. |
| Product card | `pages/home.tsx` | White, 16px radius, `shadow-card`, square image, optional description chip (ink, top-left), bold name, brand price with ₩ chip, `<CartActions />`, muted delivery line. Hover: lift 4px + image zoom 1.05. |
| Cart actions | `components/cart-actions.tsx` | Outlined pill pair: small cart-icon pill (add to cart) tucked under a wider "Шууд захиалах" pill (buy now: quantity modal, then `/checkout`). White fill, 1.5px `ink` outline; hover fills cart `ink`, buy-now `brand`. `size="sm"` (40px, cards) / `"lg"` (56px, product detail). |
| Product detail | `pages/product-details.tsx` | md+: two columns (sticky square image / purchase panel). Mobile: stacked. Related products 2 / 4 columns. |
| Promo block | `pages/home.tsx` | Full-bleed `brand` block, white italic uppercase headline (delivery message), black pill CTA to contact, logo on the right. |
| Reviews | `pages/home.tsx` | White section, title left, cards = product-card shell with stars (brand), quote text, name. |
| Footer | `components/footer.tsx` | Top: `surface` with logo, description, contact list (Facebook page, Messenger, phone, address). Bottom: `ink` (black) band with legal links (privacy link bold white), copyright, admin login. |
| Quick menu | `components/quick-menu.tsx` | Site-wide (hidden on /admin), mounted in `App.tsx`. PC: fixed bottom-right white panel, ink "QUICK" header, items Call (brand, shows number) / Messenger (#0084ff) / Facebook (#1877f2), brand TOP button below. Mobile: 56px brand round button above the bottom nav; tap expands the three actions with ink labels and a backdrop; ink TOP button above it after scrolling. |
| Install banner | `components/install-banner.tsx` (mounted in `App.tsx`) | Phones only, top of every customer page, scrolls away. `ink` bar: close ✕, app icon, two lines (`white/60` 11px "Нүүр дэлгэцэнд нэмбэл" / bold 13px "Апп шиг нээгдэнэ"), white pill "Апп шиг нээх". Android/Samsung: native install prompt (`beforeinstallprompt`). Otherwise a bottom sheet with numbered brand steps: iOS Safari (Share → Add to Home Screen → Add), Android menu fallback, or in-app browsers (Facebook etc.: copy link, open in Safari/Chrome). Hidden when already installed, in the Capacitor app, on /admin, and for 7 days after ✕. Installability: `client/public/manifest.webmanifest`, `sw.js` (no caching), `icons/` (badge-logo icons: 192/512, maskable 512, apple-touch 180) rendered by `design/logo/make-icons.ps1`. |
| Order tracker | `components/order-tracker.tsx` (in My Page order cards) | Delivery-app style status. Header: Montserrat headline + muted subline (+ estimated delivery day pill for pending/processing) and a `brand/10` chip. Bar: `ink/10` track, `brand` fill, 3 stops (Захиалга / Төлбөр / Хүргэгдсэн). pending → 6%, rider idle-bobbing; processing → 72%, rider driving (spinning wheels, bounce, speed lines, exhaust) + moving stripes on the fill; completed → 100%, rider hops on arrival + brand check pops; cancelled → no bar, grey chip + note. Fill and rider animate in over 1.4s. Mascot: `design/illustrations/delivery-rider.svg`; motion spec/preview: `design/motion/order-tracker.html`; keyframes `mm-*` in `client/src/index.css`. Order details sit behind a full-width "Дэлгэрэнгүй ⌄" row. |
| Admin shell | `components/admin/sidebar.tsx`, `header.tsx`, `layout.tsx`, `pages/admin/login.tsx` | Page bg `surface`. Sidebar `ink` with `<BrandLogo />` + "Админ удирдлага" label; items `white/70`, active solid `brand` rounded row; pending-orders badge white with brand text; logout hovers `brand`. Mobile: white top bar (logo + "Админ" + menu), sidebar slides in. Page header = white `rounded-2xl shadow-card` card with a 4px `brand` left edge, Montserrat title, bell linking to orders (brand count when pending). Login: logo above a white card with a `brand` top edge, `brand` submit. Action links `text-brand`. |
| Order receipt (admin) | `components/admin/order-receipt.tsx` (used in `pages/admin/orders.tsx`) | "Цахим баримт". **Phone (<md):** opens as a `max-w-md` dialog, one column - `surface` status/SMS strip, e-mail status, white paper (badge logo, payment method, shop/order meta, `brand/10` delivery-day banner, customer name, dashed rules, items, totals, brand "Төлөх дүн", contact), delete bar. **PC (md+):** no dialog - "Харах" expands the receipt inline in a table row under the order (row tinted `brand/5`, 4px `brand` left edge, "Цахим баримт · #ORD-…" bar with ✕; the button becomes "Хаах ⌃"; ?id= links open it and scroll to it). Inside: a `surface` desk with a landscape white `rounded-2xl shadow-card` paper - head row (logo + payment left, shop/order meta right), then two columns split by a dashed rule: customer & delivery (banner, name, contact) left, items & amounts right - and a 300px white side panel ("Удирдлага": stacked status select, full-width SMS button, e-mail status, full-width "Захиалга устгах"). Blocks render once; phone order comes from flex `order-*` with `display: contents` column wrappers. |
| Mobile bottom nav | `components/mobile-bottom-nav.tsx` | White background, `ink/10` top hairline + soft upward shadow. Icons/labels `ink`; active item `brand` with a brand indicator bar on top. |

## 5. Motion
Short and functional only: card lift + image zoom on hover, banner autoplay (5s), fade-up on
section entry, quick-menu items slide up when opened. No floating/bobbing elements. Respect
`prefers-reduced-motion`.

## 6. Scope
Customer-facing pages built on the shared header/footer get the new look automatically.
Home and product detail are fully restyled. Admin uses the same palette through its shell
(sidebar, page header, login); its forms and tables are shadcn components inheriting
`--primary`/`--radius`. Platform colors stay where they identify a platform (Facebook/Twitter
icons in footer settings).
