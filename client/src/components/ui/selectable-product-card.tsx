import { useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import { Product } from "@shared/schema";
import { CheckCircle } from "lucide-react";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";

interface SelectableProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: number) => void;
  onDeselect: (productId: number) => void;
  quantity: number;
  onQuantityChange: (productId: number, quantity: number) => void;
}

export function SelectableProductCard({
  product,
  isSelected,
  onSelect,
  onDeselect,
  quantity,
  onQuantityChange,
}: SelectableProductCardProps) {
  const { id, name, category, price, imageUrl, description } = product;
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isSelected) {
      onDeselect(id);
    } else {
      onSelect(id);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    if (newQuantity > 0) {
      onQuantityChange(id, newQuantity);
    }
  };

  return (
    <motion.div
      className={`bg-white rounded-lg overflow-hidden transition-all duration-300 border-2 ${
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-transparent shadow-md hover:shadow-xl hover:border-primary/10"
      }`}
      initial={{ scale: 1 }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.3, type: "spring", stiffness: 300 },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative cursor-pointer" onClick={handleClick}>
        <div className="relative overflow-hidden group">
          <motion.img
            src={getFullImageUrl(imageUrl)}
            alt={name}
            className="w-full h-48 object-cover"
            animate={
              isHovered
                ? { scale: 1.1, filter: "brightness(1.1)" }
                : { scale: 1, filter: "brightness(1)" }
            }
            transition={{ duration: 0.5 }}
            onError={(e) => handleImageError(e, imageUrl || undefined)}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-brand/70 via-transparent to-brand/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          />

          {isSelected && (
            <motion.div
              className="absolute top-3 right-3 bg-white p-1 rounded-full shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <CheckCircle className="h-7 w-7 text-primary" />
            </motion.div>
          )}
        </div>

        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg mb-1">{name}</h3>
              <motion.span className="inline-block bg-brand/10 text-xs px-2 py-1 rounded-full mb-2 border border-brand/20 text-brand">
                {category}
              </motion.span>
            </div>
            <motion.span
              className="font-bold text-lg text-brand"
              animate={
                isHovered
                  ? {
                      scale: 1.1,
                    }
                  : {
                      scale: 1,
                    }
              }
            >
              {formatPrice(price)}
            </motion.span>
          </div>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {isSelected && (
        <div className="p-4 pt-0">
          <div className="flex items-center">
            <label className="text-sm mr-2 text-brand font-medium">
              Хэмжээ:
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityChange}
              className="border border-gray-300 focus:border-primary rounded-md px-2 py-1 w-16 text-center bg-transparent"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
