import { useEffect, useRef } from "react";
import { useCart } from "@/hooks/use-cart";
import { CartItemComponent } from "@/components/ui/cart-item";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalPrice } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEmpty = items.length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 transition-all duration-300">
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right"
        style={{ maxWidth: "85vw" }}
      >
        {/* Basic header bar */}
        <div className="bg-brand p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center">
            <span className="material-icons mr-2">shopping_cart</span>
            Таны сагс
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-all duration-300"
            aria-label="Хаах"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="cart-items flex-grow overflow-y-auto p-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-20 h-20 rounded-full gradient-card flex items-center justify-center mb-6 shadow-md">
                <span className="material-icons text-5xl text-brand">
                  shopping_cart
                </span>
              </div>
              <p className="text-lg font-medium">Таны сагс хоосон байна</p>
              <p className="mt-2 text-sm text-center">
                Бүтээгдэхүүн сонгоод "Сагсанд нэмэх" товчийг дарна уу.
              </p>
              <Button
                className="mt-6 bg-brand hover:bg-brand/90 text-white transition-all duration-300 shadow-md hover:shadow-lg"
                onClick={onClose}
              >
                Бүтээгдэхүүн харах
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemComponent key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t">
          <div className="flex justify-between mb-4">
            <span className="text-lg">Нийт дүн:</span>
            <span className="font-bold text-lg text-brand">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <Button
            className="w-full bg-brand hover:brightness-105 text-white font-medium py-6 transition-all duration-300 shadow-md hover:shadow-lg"
            disabled={isEmpty}
            asChild
          >
            <Link href="/checkout">Захиалга хийх</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
