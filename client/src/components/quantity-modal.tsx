import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, X } from "lucide-react";
import { Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { linePrice, packKgOf } from "@shared/pack";
import { useLocation } from "wouter";

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  // "Buy now": add to cart, then go straight to checkout
  buyNow?: boolean;
}

const QuantityModalComponent = ({
  isOpen,
  onClose,
  product,
  buyNow = false,
}: QuantityModalProps) => {
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const { t } = useLanguage();
  // kg per pack: pack products move in whole packs and are priced per pack
  const packKg = product ? packKgOf(product) : 1;

  // Reset quantity when product changes - minimum order quantity, rounded up to whole packs
  useEffect(() => {
    if (product) {
      const minOrderQty = product.minOrderQuantity
        ? parseFloat(product.minOrderQuantity.toString())
        : 1;
      const pack = packKgOf(product);
      setQuantity(pack > 1 ? Math.max(1, Math.ceil(minOrderQty / pack)) * pack : minOrderQty);
    }
  }, [product]);

  // Memoize expensive calculations
  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + linePrice(item.price, item.quantity, packKgOf(item)), 0),
    [items],
  );

  const productPrice = useMemo(
    () => (product ? parseFloat(product.price.toString()) : 0),
    [product?.price],
  );

  // Per pack for pack products, per kg otherwise
  const calculatedPrice = useMemo(
    () => (product ? linePrice(productPrice, quantity, packKg) : 0),
    [product, productPrice, quantity, packKg],
  );

  const totalWithCurrentProduct = useMemo(
    () => cartTotal + calculatedPrice,
    [cartTotal, calculatedPrice],
  );

  // Get minimum order quantity for current product
  const minOrderQuantity = useMemo(
    () =>
      product?.minOrderQuantity
        ? parseFloat(product.minOrderQuantity.toString())
        : 1,
    [product?.minOrderQuantity],
  );

  // One pack per step for pack products, 1kg for others
  const quantityStep = packKg;

  // Memoize event handlers
  const handleQuantityChange = useCallback(
    (change: number) => {
      setQuantity((prev) => {
        const step = change > 0 ? quantityStep : -quantityStep;
        const newQuantity = prev + step;
        return newQuantity >= minOrderQuantity && newQuantity <= 99
          ? newQuantity
          : prev;
      });
    },
    [minOrderQuantity, quantityStep],
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    // Pack products keep the per-pack price; packKg tells the cart how to total it
    addItem({
      productId: product.id,
      name: product.name,
      price: productPrice,
      quantity: quantity,
      imageUrl: product.imageUrl,
      packKg,
    });

    toast({
      title: t.toast.cartAdded,
      description: `${product.name} (${quantity}${t.pieces}) ${t.toast.cartAddedDesc}`,
      variant: "default",
    });

    onClose();
    if (buyNow) setLocation("/checkout");
  }, [product, productPrice, quantity, addItem, toast, onClose, buyNow, setLocation]);

  // Memoize fallback image
  const fallbackImage = useMemo(() => {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#f3f4f6" rx="8"/>
        <text x="32" y="35" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="#6b7280">IMG</text>
      </svg>
    `)}`;
  }, []);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      if (!target.src.includes("data:image/svg")) {
        target.src = fallbackImage;
      }
    },
    [fallbackImage],
  );

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-32px)] max-w-[400px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">
            {t.selectQuantity}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t.quantityModalDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Product Info */}
          <div className="flex items-center space-x-3">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-14 h-14 rounded-lg object-cover"
              loading="lazy"
              onError={handleImageError}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{product.name}</h3>
              <p className="text-sm text-gray-600 truncate">
                {product.description}
              </p>
              <p className="font-bold text-lg text-brand">
                {productPrice.toLocaleString()}₩
              </p>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                {t.quantity}
              </label>
              {packKg > 1 ? (
                <span className="text-xs text-orange-600 font-medium">
                  {t.packageUnit.replace("{kg}", String(packKg))}
                </span>
              ) : (
                minOrderQuantity > 1 && (
                  <span className="text-xs text-orange-600 font-medium">
                    {t.minOrderQuantity.replace(
                      "{min}",
                      minOrderQuantity.toString(),
                    )}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity - quantityStep < minOrderQuantity}
                className="h-9 w-9 rounded-full"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>

              <div className="min-w-[50px] text-center">
                <span className="text-xl font-bold">
                  {packKg > 1 ? `${quantity}кг` : quantity}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                className="h-9 w-9 rounded-full"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Current Order Total */}
          <div className="bg-surface p-3 rounded-lg border border-ink/10">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t.currentOrderTotal.split("{total}")[0]}
                <span className="font-bold text-lg text-brand">
                  {totalWithCurrentProduct.toLocaleString()}
                </span>
                {t.currentOrderTotal.split("{total}")[1]}
              </p>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            className="w-full h-11 rounded bg-brand hover:bg-brand-deep text-white text-base font-display font-bold"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {buyNow ? t.buyNow : t.addToCart} ({quantity}
            {t.pieces})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const QuantityModal = memo(QuantityModalComponent);
