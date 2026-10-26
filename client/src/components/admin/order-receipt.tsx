import { format } from "date-fns";
import { Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { BRAND } from "@/lib/brand";
import { formatOrderId, formatPrice, isBulkyMeat, normalizeDate } from "@/lib/utils";
import { DEFAULT_SHIPPING_RATES, shippingQuote } from '@shared/shipping';

export interface ReceiptOrderItem {
  id: number;
  quantity: number;
  price: string | number;
  product: { name: string; category?: string };
}

export interface ReceiptOrder {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  items: ReceiptOrderItem[];
}

// "Хонины хаа" style packages are priced per 4kg; everything else per kg
export function lineTotal(item: ReceiptOrderItem): number {
  const price = parseFloat(item.price.toString());
  return isBulkyMeat(item.product.name) ? price * (item.quantity / 4) : price * item.quantity;
}

const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: "Дансаар шилжүүлэг",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Төлбөр хүлээгдэж байна",
  processing: "Төлбөр төлөгдсөн",
  completed: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

function Dashed() {
  return <hr className="my-4 border-0 border-t-2 border-dashed border-ink/15" />;
}

// Admin order detail styled as an e-receipt (paper) + admin actions under it
export function OrderReceipt({
  order,
  onSms,
  onDelete,
}: {
  order: ReceiptOrder;
  onSms: () => void;
  onDelete: () => void;
}) {
  const placed = normalizeDate(order.createdAt);
  const validDate = !Number.isNaN(placed.getTime());
  // Same cutoff rule as before: ordered by 18:30 -> delivered next day
  const beforeCutoff =
    validDate &&
    (placed.getHours() < 18 || (placed.getHours() === 18 && placed.getMinutes() <= 30));
  const payment = PAYMENT_LABELS[order.paymentMethod || "bank_transfer"] || order.paymentMethod;
  // The order total includes delivery; show the difference as its own line
  const itemsTotal = order.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const deliveryFee = Math.round(parseFloat(order.totalAmount.toString()) - itemsTotal);

  return (
    <div className="text-ink">
      {/* Status (editable) and SMS at the top of the receipt */}
      <div className="space-y-2.5 border-b border-ink/10 bg-surface px-5 py-3 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink/60">Төлөв</span>
          <OrderStatusBadge status={order.status} orderId={order.id} isEditable={true} forceLanguage="mn" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink/60">SMS</span>
          <button
            type="button"
            onClick={onSms}
            className="flex h-8 items-center gap-1 rounded-full border border-ink/15 bg-white px-3 text-xs font-semibold hover:border-ink/40"
          >
            <span className="material-icons text-base">sms</span>
            SMS илгээх
          </button>
        </div>
      </div>

      {/* Paper */}
      <div className="bg-white px-5 pb-6 pt-5 sm:px-7">
        <BrandLogo className="mx-auto h-16 w-auto" />
        <p className="mt-3 text-center font-display text-xl font-black">{payment}</p>

        <div className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-ink/70">
          <span>{BRAND.name}</span>
          <span className="text-right">T: {BRAND.phone}</span>
          <span>{formatOrderId(order.id)}</span>
          <span className="text-right tabular-nums">
            {validDate ? format(placed, "yyyy-MM-dd HH:mm") : "-"}
          </span>
        </div>

        {/* Delivery day - the key fact for packing, so it sits up top */}
        {validDate && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-2.5 font-display text-sm font-extrabold text-brand">
            <Truck className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            {beforeCutoff
              ? "18:30-аас өмнө захиалсан → Маргааш хүргэнэ"
              : "18:30-аас хойш захиалсан → Нөгөөдөр хүргэнэ"}
          </p>
        )}

        <Dashed />
        <p className="text-center font-display text-2xl font-black leading-tight">
          {order.customerName}
          <span className="block text-base font-extrabold text-ink/60">
            ({formatOrderId(order.id)})
          </span>
        </p>
        <Dashed />

        {/* Items: name / unit price / qty / amount */}
        <div className="space-y-2.5 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-x-3">
              <span className="font-semibold">{item.product.name}</span>
              <span className="text-right font-semibold tabular-nums">
                {formatPrice(lineTotal(item))}
              </span>
              <span className="text-xs text-ink/50 tabular-nums">
                {formatPrice(item.price)} × {item.quantity} кг
              </span>
            </div>
          ))}
        </div>

        <Dashed />
        <div className="space-y-1.5 text-sm">
          {deliveryFee > 0 && (
            <>
              <div className="flex justify-between text-ink/60">
                <span>Бүтээгдэхүүн</span>
                <span className="tabular-nums">{formatPrice(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>Хүргэлтийн төлбөр</span>
                <span className="tabular-nums">{formatPrice(deliveryFee)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span>Нийт</span>
            <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
        <Dashed />
        <div className="flex items-end justify-between">
          <span className="font-display text-lg font-black">Төлөх дүн</span>
          <span className="font-display text-2xl font-black tabular-nums text-brand">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
        <Dashed />

        {/* Delivery */}
        {shippingQuote(DEFAULT_SHIPPING_RATES, order.customerAddress).region === 'jeju' && (
          <p className="mb-2 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">Чэжү · 제주</p>
        )}
        <dl className="space-y-1.5 text-sm">
          {[
            ["Утас", order.customerPhone],
            ["И-мэйл", order.customerEmail],
            ["Хаяг", order.customerAddress],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[4.5rem_1fr] gap-2">
              <dt className="text-ink/50">{label}</dt>
              <dd className="break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-center text-xs text-ink/40">Баярлалаа · {BRAND.name}</p>
      </div>

      {/* Admin actions */}
      <div className="flex items-center gap-2 border-t border-ink/10 bg-surface px-5 py-4 sm:px-7">
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/60 hover:border-brand hover:text-brand"
            title="Устгах"
            aria-label="Устгах"
          >
            <span className="material-icons text-base">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
