// Products sold only in fixed-weight packs (for example a 4kg box). The product price is
// the price of one pack; cart and order quantities stay in kg and move in whole packs.
export const PRODUCT_MAX_PACK_KG = 50;

// Before products had a pack size, lamb leg ("Хонины хаа") was the only 4kg-pack product and
// was recognised by its name. Still used for products and orders saved without a pack size.
export function isLegacyPackName(name?: string | null): boolean {
  if (!name) return false;

  // Lowercase and map common latin lookalikes to cyrillic, then strip spaces and punctuation
  const clean = name.toLowerCase()
    .replace(/a/g, 'а')
    .replace(/o/g, 'о')
    .replace(/x/g, 'х')
    .replace(/e/g, 'е')
    .replace(/[\s\W_]+/g, '');

  return clean.includes('хониныхаа') ||
    clean.includes('хонинхаа') ||
    (clean.includes('хонин') && clean.includes('хаа'));
}

// kg in one pack of a product or cart line; 1 means it is sold by the kg
export function packKgOf(item: { packKg?: number | null; name?: string | null }): number {
  if (item.packKg != null) return validPackKg(item.packKg) ?? 1;
  return isLegacyPackName(item.name) ? 4 : 1;
}

// Pack size of an order line: the size recorded with the order, else the product's
export function orderItemPackKg(item: {
  packKg?: number | null;
  product?: { packKg?: number | null; name?: string | null } | null;
}): number {
  return packKgOf({ packKg: item.packKg ?? item.product?.packKg, name: item.product?.name });
}

// Admin input → stored pack size (1 = by the kg, so an explicit 1 also overrides the legacy name rule)
export function cleanPackKg(value: unknown): number {
  return validPackKg(Number(value)) ?? 1;
}

function validPackKg(value: number): number | null {
  return Number.isInteger(value) && value >= 2 && value <= PRODUCT_MAX_PACK_KG ? value : null;
}

// Price of `quantityKg`: whole packs for pack products, per kg otherwise
export function linePrice(price: number, quantityKg: number, packKg: number): number {
  return price * (quantityKg / packKg);
}

// Quantity next to a unit price: "3 кг", or for pack products "2 багц (8 кг)"
export function packQuantityText(quantityKg: number, packKg: number): string {
  return packKg > 1 ? `${quantityKg / packKg} багц (${quantityKg} кг)` : `${quantityKg} кг`;
}

// Short unit label next to a price: "/ кг" or "/ 4кг"
export function priceUnitLabel(packKg: number): string {
  return packKg > 1 ? `/ ${packKg}кг` : '/ кг';
}
