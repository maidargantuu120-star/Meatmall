import { z } from 'zod';

export const shippingRatesSchema = z.object({
  fee: z.number().int().min(0).max(1000000),
  jejuSurcharge: z.number().int().min(0).max(1000000),
});
export type ShippingRates = z.infer<typeof shippingRatesSchema>;
export const DEFAULT_SHIPPING_RATES: ShippingRates = { fee: 6000, jejuSurcharge: 6000 };

// Preserve the existing array-based setting; older settings have no Jeju field.
export function readShippingRates(value?: string | null): ShippingRates {
  if (!value) return { ...DEFAULT_SHIPPING_RATES };
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.length) return { ...DEFAULT_SHIPPING_RATES };
  return shippingRatesSchema.parse({ fee: parsed[0].fee, jejuSurcharge: parsed[0].jejuSurcharge ?? 6000 });
}
export function serializeShippingRates(rates: ShippingRates) {
  return JSON.stringify([{ min: 0, max: 999999, ...shippingRatesSchema.parse(rates) }]);
}
export function destinationParts(address: string, postcode = '') {
  const embedded = address.trim().match(/^\(?([0-9]{5})\)?\s+/);
  const postalCode = postcode.trim() || embedded?.[1] || '';
  const street = address.trim().replace(/^\(?[0-9]{5}\)?\s+/, '');
  return { postalCode, street };
}
export function shippingQuote(rates: ShippingRates, address = '', postcode = '') {
  const { postalCode, street } = destinationParts(address, postcode);
  const validPostcode = /^(?!00000)[0-9]{5}$/.test(postalCode);
  // Korea's current five-digit Jeju delivery range, including the offshore islands.
  const postalJeju = validPostcode && Number(postalCode) >= 63000 && Number(postalCode) <= 63644;
  const addressJeju = /^(?:제주특별자치도|제주도|제주시|서귀포시|제주)(?=\s|$)/.test(street) ||
    /(?:^|[,\s])(?:jeju(?:-do)?|seogwipo(?:-si)?)(?=[,\s]|$)/i.test(street);
  const addressMainland = /^(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남)/.test(street);
  const mismatch = validPostcode && ((addressJeju && !postalJeju) || (addressMainland && postalJeju));
  const isJeju = addressJeju || postalJeju;
  return { region: isJeju ? 'jeju' as const : 'mainland' as const, baseFee: rates.fee,
    surcharge: isJeju ? rates.jejuSurcharge : 0, total: rates.fee + (isJeju ? rates.jejuSurcharge : 0), mismatch };
}
