import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { formatPrice, getCategoryColor } from "@/lib/utils";
import { Product } from "@shared/schema";
import { packKgOf } from "@shared/pack";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { id, name, category, price, description, imageUrl, minOrderQuantity } =
    product;
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const categoryColors = getCategoryColor(category);

  const handleAddToCart = () => {
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
        className: "animate-bounceInUp",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
      initial={{ scale: 1 }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2, type: "spring", stiffness: 300 },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link href={`/products/${id}`}>
        <div className="relative overflow-hidden group">
          <motion.img
            src={getFullImageUrl(product.thumbnailUrl || imageUrl)}
            alt={name}
            className="w-full h-48 object-cover cursor-pointer transition-all duration-300"
            loading="lazy"
            animate={
              isHovered
                ? { scale: 1.05, filter: "brightness(1.05)" }
                : { scale: 1, filter: "brightness(1)" }
            }
            transition={{ duration: 0.3 }}
            onError={(e) =>
              handleImageError(e, product.thumbnailUrl || imageUrl || undefined)
            }
          />
          {/* Discount badge removed */}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link href={`/products/${id}`}>
              <div className="cursor-pointer">
                <h3 className="font-bold text-lg mb-3 text-gray-800">{name}</h3>
              </div>
            </Link>
          </div>
          <span className="font-bold text-lg text-brand">
            {formatPrice(price)}
          </span>
        </div>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{description}</p>
        {name === "Хонины хаа" ? (
          <div className="mb-3">
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              4кг багц - ₩50,000
            </span>
          </div>
        ) : (
          minOrderQuantity &&
          parseFloat(minOrderQuantity.toString()) > 1 && (
            <div className="mb-3">
              <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-full">
                Хамгийн багадаа {parseFloat(minOrderQuantity.toString())}кг
              </span>
            </div>
          )
        )}
        <button
          className="w-full text-white py-3 px-4 rounded-lg flex items-center justify-center bg-brand hover:brightness-105 transition-all duration-200 shadow-sm font-bold"
          onClick={handleAddToCart}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <span>Сагсанд хийх</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
