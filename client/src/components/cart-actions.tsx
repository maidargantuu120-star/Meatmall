import { ShoppingCart } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface CartActionsProps {
  onAddToCart: () => void;
  onBuyNow: () => void;
  size?: "sm" | "lg";
  className?: string;
}

// Outlined pill pair: a cart icon pill tucked under a wider "buy now" pill
export function CartActions({
  onAddToCart,
  onBuyNow,
  size = "sm",
  className,
}: CartActionsProps) {
  const { t } = useLanguage();
  const lg = size === "lg";

  return (
    <div className={cn("flex items-center", className)}>
      <button
        type="button"
        onClick={onAddToCart}
        aria-label={t.addToCart}
        title={t.addToCart}
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-ink transition-colors hover:bg-ink hover:text-white",
          lg ? "h-14 w-20 pr-6" : "h-10 w-14 pr-4",
        )}
        data-testid="cart-actions-add"
      >
        <ShoppingCart
          className={lg ? "h-6 w-6" : "h-[18px] w-[18px]"}
          strokeWidth={1.75}
        />
      </button>
      <button
        type="button"
        onClick={onBuyNow}
        className={cn(
          "relative flex flex-1 items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-ink bg-white font-display font-bold text-ink transition-colors hover:border-brand hover:bg-brand hover:text-white",
          lg ? "-ml-7 h-14 px-6 text-base md:text-lg" : "-ml-5 h-10 px-2 text-xs md:text-sm",
        )}
        data-testid="cart-actions-buy-now"
      >
        {t.buyNow}
      </button>
    </div>
  );
}
