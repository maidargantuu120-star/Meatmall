import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { Product } from "@shared/schema";
import { packKgOf } from "@shared/pack";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Eye } from "lucide-react";
import { motion, useAnimation } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";

interface ProductCardMobileProps {
  product: Product;
}

export function ProductCardMobile({ product }: ProductCardMobileProps) {
  const { id, name, price, imageUrl } = product;
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (isPressed) {
      controls.start({ color: "#e4002b" }); // --brand
    } else {
      controls.start({ color: "#333333" });
    }
  }, [isPressed, controls]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      // 로그인한 사용자가 아닌 경우 회원가입/로그인 페이지로 이동
      if (!user) {
        toast({
          title: t.toast.loginRequired,
          description: t.toast.loginRequiredDesc,
          variant: "default",
        });

        // 회원가입 탭을 먼저 보여줌
        setLocation("/auth?tab=signup");
        setIsLoading(false);
        return;
      }

      // 로그인한 사용자라면 정상적으로 장바구니에 추가
      addItem({
        productId: id,
        name,
        price: parseFloat(price.toString()),
        // One pack for pack products (quantity is in kg), else 1kg
        quantity: packKgOf(product),
        imageUrl,
        packKg: packKgOf(product),
      });

      toast({
        title: t.toast.cartAdded,
        description: `${name}`,
        variant: "default",
        className: "animate-bounceInUp",
      });
    } catch (error) {
      toast({
        title: t.toast.addToCartError,
        description: t.toast.addToCartErrorDesc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    setIsPressed(true);

    // Reset after a short delay
    setTimeout(() => {
      setIsPressed(false);
    }, 300);
  };

  return (
    <Link href={`/products/${id}`}>
      <motion.div
        className="bg-white rounded-lg shadow-sm overflow-hidden relative"
        initial={{ opacity: 0.95, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={handlePress}
        onTouchStart={handlePress}
        whileHover={{
          scale: 1.01,
          boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="relative overflow-hidden">
          <img
            src={getFullImageUrl(imageUrl)}
            alt={name}
            className="w-full h-32 object-cover"
            onError={(e) => handleImageError(e, imageUrl || undefined)}
          />

          {/* Popular badge removed */}

          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 flex items-end justify-end">
            <button
              className="m-2 bg-brand text-white text-xs py-1.5 px-3 rounded-md flex items-center justify-center shadow-md font-bold"
              onClick={handleAddToCart}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <span>Сагсанд хийх</span>
              )}
            </button>
          </div>
        </div>
        <div className="p-2.5">
          <h3 className="font-medium text-sm line-clamp-1 text-gray-800">
            {name}
          </h3>
          <div className="flex justify-end items-center mt-1">
            <p className="font-bold text-sm text-brand">
              {formatPrice(price)}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
