import { format } from "date-fns";
import { Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { BRAND } from "@/lib/brand";
import { cn, formatOrderId, formatPrice, isBulkyMeat, normalizeDate } from "@/lib/utils";
import { DEFAULT_SHIPPING_RATES, shippingQuote } from '@shared/shipping';
import { OrderEmailStatus } from './order-email-status';

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

function Dashed({ className }: { className?: string }) {
  return <hr className={cn("my-4 border-0 border-t-2 border-dashed border-ink/15", className)} />;
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

  // Phone: one column (status → e-mail → paper → actions), as before.
  // PC (md+): paper on the left over a grey desk, admin panel on the right.
  // Each block renders once and only moves, so status/e-mail hooks never run twice.
  return (
    <div className="text-ink md:grid md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-[auto_auto_1fr] md:bg-surface">
      {/* Status (editable) and SMS */}
      <div className="space-y-2.5 border-b border-ink/10 bg-surface px-5 py-3 sm:px-7 md:col-start-2 md:row-start-1 md:space-y-4 md:border-l md:bg-white md:px-6 md:pb-5 md:pt-6">
        <p className="hidden font-display text-sm font-extrabold uppercase tracking-wide text-ink/40 md:block">Удирдлага</p>
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-1.5">
          <span className="text-xs font-semibold text-ink/60">Төлөв</span>
          <OrderStatusBadge status={order.status} orderId={order.id} isEditable={true} forceLanguage="mn" />
        </div>
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-1.5">
          <span className="text-xs font-semibold text-ink/60">SMS</span>
          <button
            type="button"
            onClick={onSms}
            className="flex h-8 items-center gap-1 rounded-full border border-ink/15 bg-white px-3 text-xs font-semibold hover:border-ink/40 md:h-10 md:justify-center md:text-sm"
          >
            <span className="material-icons text-base">sms</span>
            SMS илгээх
          </button>
        </div>
      </div>

      <div className="border-b border-ink/10 bg-white px-5 py-3 sm:px-7 md:col-start-2 md:row-start-2 md:border-l md:px-6 md:py-5">
        <OrderEmailStatus key={order.id} orderId={order.id} />
      </div>

      {/* Paper: full width on phones; a landscape receipt card on the desk on PC */}
      <div className="md:col-start-1 md:row-span-3 md:row-start-1 md:p-6 lg:p-8">
      <div className="bg-white px-5 pb-6 pt-5 sm:px-7 md:rounded-2xl md:px-8 md:pb-6 md:pt-6 md:shadow-card">
        {/* Head: centred stack on phones, one row (logo + payment | shop/order meta) on PC */}
        <div className="md:flex md:items-center md:justify-between md:gap-6">
          <div className="md:flex md:items-center md:gap-4">
            <BrandLogo className="mx-auto h-16 w-auto md:mx-0 md:h-12" />
            <p className="mt-3 text-center font-display text-xl font-black md:mt-0 md:text-left">{payment}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-ink/70 md:mt-0 md:min-w-[260px] md:gap-x-6">
            <span>{BRAND.name}</span>
            <span className="text-right">T: {BRAND.phone}</span>
            <span>{formatOrderId(order.id)}</span>
            <span className="text-right tabular-nums">
              {validDate ? format(placed, "yyyy-MM-dd HH:mm") : "-"}
            </span>
          </div>
        </div>
        <Dashed className="hidden md:block md:my-5" />

        {/* Body. Phones: one column in the original order (flex `order-*`; the column
            wrappers are `display: contents`). PC: customer & delivery on the left,
            items & amounts on the right. */}
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-x-10">
        <div className="contents md:block">
        {/* Delivery day - the key fact for packing, so it sits up top */}
        {validDate && (
          <p className="order-1 mt-3 flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-2.5 font-display text-sm font-extrabold text-brand md:mt-0">
            <Truck className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            {beforeCutoff
              ? "18:30-аас өмнө захиалсан → Маргааш хүргэнэ"
              : "18:30-аас хойш захиалсан → Нөгөөдөр хүргэнэ"}
          </p>
        )}

        <Dashed className="order-2" />
        <p className="order-3 text-center font-display text-2xl font-black leading-tight">
          {order.customerName}
          <span className="block text-base font-extrabold text-ink/60">
            ({formatOrderId(order.id)})
          </span>
        </p>
        <Dashed className="order-4" />

        {/* Delivery contact (last on phones, under the customer on PC) */}
        <div className="order-11">
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
        </div>
        </div>

        <div className="contents md:block md:border-l-2 md:border-dashed md:border-ink/15 md:pl-10">
        {/* Items: name / unit price / qty / amount */}
        <div className="order-5 space-y-2.5 text-sm">
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

        <Dashed className="order-6" />
        <div className="order-7 space-y-1.5 text-sm">
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
        <Dashed className="order-8" />
        <div className="order-9 flex items-end justify-between">
          <span className="font-display text-lg font-black">Төлөх дүн</span>
          <span className="font-display text-2xl font-black tabular-nums text-brand">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
        <Dashed className="order-10 md:hidden" />
        </div>
        </div>
        <p className="mt-5 text-center text-xs text-ink/40">Баярлалаа · {BRAND.name}</p>
      </div>
      </div>

      {/* Admin actions: bottom bar on phones, under the e-mail block in the PC side panel */}
      <div className="flex items-center gap-2 border-t border-ink/10 bg-surface px-5 py-4 sm:px-7 md:col-start-2 md:row-start-3 md:items-start md:border-l md:border-t-0 md:bg-white md:px-6 md:py-5">
        <div className="ml-auto flex gap-2 md:ml-0 md:w-full">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/60 hover:border-brand hover:text-brand md:h-10 md:w-full md:gap-1.5 md:rounded-full md:text-sm md:font-semibold"
            title="Устгах"
            aria-label="Устгах"
          >
            <span className="material-icons text-base">delete</span>
            <span className="hidden md:inline">Захиалга устгах</span>
          </button>
        </div>
      </div>
    </div>
  );
}
