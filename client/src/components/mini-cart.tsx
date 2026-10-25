import React from "react";
import { Link } from "wouter";
import { ShoppingCartIcon, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CartItem } from "@shared/schema";
import { getFullImageUrl } from "@/lib/image-utils";

interface MiniCartProps {
  isVisible: boolean;
}

export function MiniCart({ isVisible }: MiniCartProps) {
  const { items, removeItem } = useCart();

  if (!isVisible || items.length === 0) {
    return null;
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  // Show max 3 items and indicate if there are more
  const displayItems = items.slice(0, 3);
  const hasMoreItems = items.length > 3;

  return (
    <div className="absolute right-0 top-12 w-80 bg-secondary rounded-lg shadow-lg border border-black z-50 animate-in fade-in-50 slide-in-from-top-5 duration-300">
      {/* Mini cart header */}
      <div className="p-3 border-b border-sidebar-border flex justify-between items-center">
        <div className="flex items-center">
          <ShoppingCartIcon className="h-4 w-4 text-primary mr-2" />
          <span className="font-medium text-white">{items.length} бараа</span>
        </div>
        <span className="font-medium text-primary">{formatPrice(total)}</span>
      </div>

      {/* Mini cart items */}
      <div className="max-h-60 overflow-y-auto py-2">
        {displayItems.map((item) => (
          <div
            key={`${item.productId}-${item.name}`}
            className="flex items-center py-2 px-3 hover:bg-black transition-colors duration-200"
          >
            <div className="h-10 w-10 rounded overflow-hidden bg-black flex-shrink-0 mr-3">
              {item.imageUrl ? (
                <img
                  src={getFullImageUrl(item.imageUrl)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">
                  <span className="material-icons text-sm">photo</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {item.name}
              </p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-300">
                  {item.quantity} × {formatPrice(Number(item.price))}
                </span>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-gray-300 hover:text-primary transition-colors"
                  aria-label="Устгах"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {hasMoreItems && (
          <div className="px-3 py-2 text-xs text-center text-gray-300">
            ...{items.length - 3} бусад бараа
          </div>
        )}
      </div>

      {/* Mini cart footer */}
      <div className="p-3 border-t border-sidebar-border">
        <Link href="/cart">
          <Button
            className="w-full bg-primary text-black hover:bg-primary/90"
            size="sm"
          >
            Сагс руу очих
          </Button>
        </Link>
      </div>
    </div>
  );
}
