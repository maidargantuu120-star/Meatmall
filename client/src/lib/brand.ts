// Brand identity and contact channels used across the storefront
export const BRAND = {
  name: "Meat Mall",
  email: "maidargantuu120@gmail.com",
  phone: "010-8082-9929",
  address: "경기 고양시 일산동구 고봉로 703, 1층 미트몰",
  facebookUrl: "https://www.facebook.com/meatmall.mahnii.delguur",
  messengerUrl: "https://m.me/meatmall.mahnii.delguur",
} as const;

// tel: link for a display-formatted phone number
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
