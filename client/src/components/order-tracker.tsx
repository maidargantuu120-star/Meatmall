import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import {
  calculateDeliveryDate,
  formatDeliveryDate,
  type DeliverySettings,
  type NonDeliveryDay,
} from "@/lib/delivery-date";
import { cn, normalizeDate } from "@/lib/utils";

// Delivery-app style order status for My Page.
// Design: design/illustrations/delivery-rider.svg, motion spec: design/motion/order-tracker.html

type TrackedStatus = "pending" | "processing" | "completed";
type RiderState = "idle" | "moving" | "arrived";

// Where the bar fills to, which stop is current, and what the rider does
const PROGRESS: Record<TrackedStatus, { fill: number; stop: number; rider: RiderState }> = {
  pending: { fill: 6, stop: 0, rider: "idle" },
  processing: { fill: 72, stop: 1, rider: "moving" },
  completed: { fill: 100, stop: 2, rider: "arrived" },
};

const STOP_POSITIONS = [0, 50, 100];

// Meat Mall rider - copy of design/illustrations/delivery-rider.svg
function DeliveryRider({ state }: { state: RiderState }) {
  return (
    <svg
      viewBox="0 0 140 100"
      aria-hidden="true"
      className={cn("block h-auto w-full overflow-visible", "mm-rider", `mm-rider--${state}`)}
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* No ground shadow here: the progress bar is the road */}
        <g className="mm-speed" stroke="#141414" strokeOpacity="0.35" strokeWidth="3">
          <path d="M2 46 H20" />
          <path d="M8 58 H24" />
          <path d="M0 70 H18" />
        </g>
        <g className="mm-puff" fill="#d4d4d4">
          <circle cx="22" cy="82" r="4" />
          <circle cx="14" cy="78" r="3" />
        </g>
        {[40, 112].map((cx) => (
          <g key={cx} className="mm-wheel">
            <circle cx={cx} cy="80" r="12" fill="#141414" />
            <circle cx={cx} cy="80" r="7" fill="#e5e5e5" />
            <path
              d={`M${cx} 73 V87 M${cx - 6.1} 76.5 L${cx + 6.1} 83.5 M${cx - 6.1} 83.5 L${cx + 6.1} 76.5`}
              stroke="#141414"
              strokeWidth="1.6"
            />
            <circle cx={cx} cy="80" r="2.2" fill="#141414" />
          </g>
        ))}
        <g className="mm-bob">
          {/* Delivery box */}
          <rect x="22" y="28" width="36" height="30" rx="5" fill="#ffffff" stroke="#141414" strokeWidth="3" />
          <rect x="23.5" y="39" width="33" height="8" fill="#e4002b" />
          <ellipse cx="40" cy="43" rx="5.5" ry="2.8" fill="#ffffff" stroke="#141414" strokeWidth="1.5" />
          <path d="M22 35 H58" stroke="#141414" strokeWidth="2" />
          {/* Scooter */}
          <path
            d="M24 74 C24 62 34 58 46 58 L66 58 C72 58 74 64 72 70 L70 76 L28 76 C25 76 24 75 24 74 Z"
            fill="#e4002b"
            stroke="#141414"
            strokeWidth="3"
          />
          <rect x="46" y="53" width="24" height="6" rx="3" fill="#141414" />
          <path d="M68 74 H94" stroke="#141414" strokeWidth="6" />
          <path d="M93 76 L103 38" stroke="#141414" strokeWidth="6" />
          <path
            d="M90 76 L98 46 C99 41 105 41 105 46 L103 60 C102 70 98 76 90 76 Z"
            fill="#e4002b"
            stroke="#141414"
            strokeWidth="3"
          />
          <path d="M100 78 C100 65 124 65 124 78" fill="#e4002b" stroke="#141414" strokeWidth="3" />
          <circle cx="108" cy="48" r="4.5" fill="#ffd34d" stroke="#141414" strokeWidth="2.5" />
          <path d="M96 36 L112 34" stroke="#141414" strokeWidth="5" />
          {/* Rider: steak character */}
          <path
            d="M52 44 C50 28 64 18 78 22 C90 25 92 38 86 48 C80 58 56 58 52 44 Z"
            fill="#e4002b"
            stroke="#141414"
            strokeWidth="3"
          />
          <path d="M58 46 C64 42 70 46 76 42" fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="2.5" />
          <path d="M84 41 Q91 37 99 36" fill="none" stroke="#141414" strokeWidth="4" />
          <circle cx="71" cy="34" r="2.3" fill="#141414" />
          <circle cx="80" cy="33" r="2.3" fill="#141414" />
          <circle cx="71.7" cy="33.2" r="0.8" fill="#ffffff" />
          <circle cx="80.7" cy="32.2" r="0.8" fill="#ffffff" />
          <path d="M72 40 Q76 43.5 80 39.5" fill="none" stroke="#141414" strokeWidth="2" />
          <ellipse cx="68.5" cy="39" rx="2.2" ry="1.3" fill="#ff8fa0" />
          {/* Helmet */}
          <path d="M60 29 C59 14 86 9 91 26 C84 24 70 25 60 29 Z" fill="#ffffff" stroke="#141414" strokeWidth="3" />
          <path d="M74.5 17 C75.8 20 76 22.5 75.6 25" fill="none" stroke="#e4002b" strokeWidth="3.5" />
        </g>
      </g>
    </svg>
  );
}

export function OrderTracker({
  status,
  createdAt,
}: {
  status: string;
  createdAt?: string | Date | null;
}) {
  const { t, language } = useLanguage();
  const tracked = status in PROGRESS ? (status as TrackedStatus) : null;
  const progress = tracked ? PROGRESS[tracked] : null;

  // Same queries (and cache) as the home page delivery line
  const { data: deliverySettings } = useQuery<DeliverySettings>({
    queryKey: ["delivery-settings"],
    queryFn: () => apiRequest("GET", "/api/delivery-settings"),
    staleTime: 5 * 60 * 1000,
    enabled: tracked === "pending" || tracked === "processing",
  });
  const { data: nonDeliveryDays = [] } = useQuery<NonDeliveryDay[]>({
    queryKey: ["non-delivery-days"],
    queryFn: () => apiRequest("GET", "/api/non-delivery-days"),
    staleTime: 5 * 60 * 1000,
    enabled: tracked === "pending" || tracked === "processing",
  });

  // Estimated delivery day, counted from when the order was placed
  const eta = useMemo(() => {
    if (!deliverySettings || !createdAt) return null;
    if (tracked !== "pending" && tracked !== "processing") return null;
    const placed = normalizeDate(createdAt);
    if (Number.isNaN(placed.getTime())) return null;
    return calculateDeliveryDate(deliverySettings, nonDeliveryDays, placed);
  }, [deliverySettings, nonDeliveryDays, createdAt, tracked]);

  // Fill from 0 on mount so the rider "drives" to the current position
  const [fill, setFill] = useState(0);
  useEffect(() => {
    if (!progress) return;
    const timer = setTimeout(() => setFill(progress.fill), 120);
    return () => clearTimeout(timer);
  }, [progress?.fill]);

  if (status === "cancelled") {
    const copy = t.orderTracker.cancelled;
    return (
      <div data-testid="order-tracker">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">
              {copy.title}
            </h3>
            <p className="mt-1 text-sm text-ink/60">{copy.sub}</p>
          </div>
          <span className="flex h-12 min-w-14 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-2xl bg-ink/5 px-2.5 font-display text-[11px] sm:h-14 sm:px-3 sm:text-xs font-extrabold text-ink/50">
            {copy.chip}
          </span>
        </div>
        <p className="mt-4 rounded-xl bg-surface p-3.5 text-sm text-ink/60">{copy.note}</p>
      </div>
    );
  }

  // Unknown status values (older data): leave it to the order card's badge
  if (!tracked || !progress) return null;
  const copy = t.orderTracker[tracked];

  return (
    <div data-testid="order-tracker">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">
            {copy.title}
          </h3>
          <p className="mt-1 text-sm text-ink/60">{copy.sub}</p>
          {eta && (
            <span className="mt-2 inline-block rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
              {t.orderTracker.eta} · {formatDeliveryDate(eta, language)}
            </span>
          )}
        </div>
        <span className="flex h-12 min-w-14 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-2xl bg-brand/10 px-2.5 font-display text-[11px] sm:h-14 sm:px-3 sm:text-xs font-extrabold text-brand">
          {copy.chip}
        </span>
      </div>

      {/* Bar with stops; the rider rides on top of it */}
      <div className="pt-16">
        <div className="relative h-2.5 rounded-full bg-ink/10">
          <div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-brand transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
            style={{ width: `${fill}%` }}
          >
            {progress.rider === "moving" && <div className="mm-stripes absolute inset-0" />}
          </div>
          {STOP_POSITIONS.map((at, i) => (
            <span
              key={at}
              className={cn(
                "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white",
                i <= progress.stop ? "border-brand" : "border-ink/15",
              )}
              style={{ left: `${at}%` }}
            />
          ))}
          {/* Rider rides on the bar: the drawing's wheels end ~5px above its bottom edge,
              so lower it 6px to put the tyres on the line. -80% puts the front wheel at `left`. */}
          <div
            className="absolute bottom-[calc(100%-6px)] w-[88px] -translate-x-[80%] transition-[left] duration-[1400ms] ease-out motion-reduce:transition-none"
            style={{ left: `clamp(74px, ${fill}%, 100%)` }}
          >
            <DeliveryRider state={progress.rider} />
            {progress.rider === "arrived" && (
              <span className="mm-check absolute right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 text-[13px] font-bold">
          {t.orderTracker.stops.map((label, i) => (
            <span
              key={label}
              className={cn(
                i === 1 && "text-center",
                i === 2 && "text-right",
                i < progress.stop
                  ? "text-brand/70"
                  : i === progress.stop
                    ? "text-brand"
                    : "text-ink/35",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
