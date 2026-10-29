import { formatPrice } from "@/lib/utils";
import { CartItem } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useLanguage } from "@/contexts/language-context";
import { getFullImageUrl } from "@/lib/image-utils";
import { linePrice, packKgOf, priceUnitLabel } from "@shared/pack";

interface CartItemProps {
  item: CartItem;
}

export function CartItemComponent({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { t } = useLanguage();
  // Pack products move one pack (packKg kg) per step
  const step = packKgOf(item);

  const handleIncrement = () => {
    updateQuantity(item.productId, item.quantity + step);
  };

  const handleDecrement = () => {
    if (item.quantity > step) {
      updateQuantity(item.productId, item.quantity - step);
    } else {
      removeItem(item.productId);
    }
  };

  const handleRemove = () => {
    removeItem(item.productId);
  };

  return (
    <div className="flex items-center py-4 border-b group hover:shadow-sm hover:bg-secondary/10 rounded-lg px-2 transition-all duration-300">
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={getFullImageUrl(item.imageUrl)}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105 shadow-sm"
        />
      </div>
      <div className="ml-4 flex-grow">
        <h3 className="font-medium text-foreground">{item.name}</h3>
        <p className="text-muted-foreground text-sm">
          {formatPrice(item.price)} {priceUnitLabel(step)}
        </p>
        <p className="text-brand font-medium text-sm mt-1">
          {t.total}: {formatPrice(linePrice(item.price, item.quantity, step))}
        </p>
      </div>
      <div className="flex flex-col items-end space-y-2">
        <div className="flex items-center border rounded-full overflow-hidden shadow-sm bg-white">
          <button
            onClick={handleDecrement}
            className="p-1 hover:bg-secondary/10 transition-colors text-foreground"
            aria-label={t.decrease}
          >
            <span className="material-icons text-sm">remove</span>
          </button>
          <span className="mx-2 min-w-[20px] text-center font-medium text-sm">
            {item.quantity}
          </span>
          <button
            onClick={handleIncrement}
            className="p-1 hover:bg-secondary/10 transition-colors text-foreground"
            aria-label={t.increase}
          >
            <span className="material-icons text-sm">add</span>
          </button>
        </div>
        <button
          onClick={handleRemove}
          className="hover:opacity-80 transition-colors flex items-center text-xs font-medium"
          aria-label={t.remove}
        >
          <span className="material-icons text-xl mr-1 text-brand">
            delete
          </span>
          <span className="text-brand">{t.remove}</span>
        </button>
      </div>
    </div>
  );
}
