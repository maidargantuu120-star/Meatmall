// Brand identity and contact channels used across the storefront
export const BRAND = {
  name: "Meat Mall",
  phone: "010-8082-9929",
  facebookUrl: "https://www.facebook.com/meatmall.mahnii.delguur",
  messengerUrl: "https://m.me/meatmall.mahnii.delguur",
} as const;

// tel: link for a display-formatted phone number
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
