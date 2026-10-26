export type PaymentAccountSnapshot = { bankName: string; accountNumber: string; accountHolder: string };
export type OrderEmailReceipt = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  transferAccountHolder: string;
  placedAt: string;
  items: { name: string; quantity: number; price: number; amount: number }[];
  subtotal: number;
  shippingFee: number;
  shippingBaseFee?: number;
  shippingSurcharge?: number;
  shippingRegion?: 'mainland' | 'jeju';
  totalAmount: number;
  paymentAccount: PaymentAccountSnapshot | null;
};
