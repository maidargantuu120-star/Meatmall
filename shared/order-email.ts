export type PaymentAccountSnapshot = { bankName: string; accountNumber: string; accountHolder: string };
export type OrderEmailReceipt = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  transferAccountHolder: string;
  placedAt: string;
  // packKg > 1: price is per pack of that many kg (quantity is still in kg)
  items: { name: string; quantity: number; price: number; amount: number; packKg?: number }[];
  subtotal: number;
  shippingFee: number;
  shippingBaseFee?: number;
  shippingSurcharge?: number;
  shippingRegion?: 'mainland' | 'jeju';
  totalAmount: number;
  paymentAccount: PaymentAccountSnapshot | null;
};
