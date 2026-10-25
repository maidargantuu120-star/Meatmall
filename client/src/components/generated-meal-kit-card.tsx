import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getFullImageUrl } from "@/lib/image-utils";

interface GeneratedMealKitComponent {
  id: number;
  generatedMealKitId: number;
  productId: number;
  quantity: string;
  price: string;
  product: {
    id: number;
    name: string;
    category: string;
    price: string;
    imageUrl: string;
    description: string;
  };
}

interface GeneratedMealKit {
  id: number;
  userId: number | null;
  sessionId: string | null;
  name: string;
  totalPrice: string;
  isAddedToCart: boolean;
  createdAt: string;
  components: GeneratedMealKitComponent[];
}

interface GeneratedMealKitCardProps {
  mealKit: GeneratedMealKit;
}

export function GeneratedMealKitCard({ mealKit }: GeneratedMealKitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State to track loading for different actions
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Add meal kit to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const { apiRequest } = await import("@/lib/queryClient");
      const res = await apiRequest(
        "PATCH",
        `/api/generated-meal-kits/${mealKit.id}`,
        { isAddedToCart: true },
      );
      return res;
    },
    onSuccess: () => {
      // Add all products to cart
      mealKit.components.forEach((component) => {
        addItem({
          productId: component.product.id,
          name: component.product.name,
          price: parseFloat(component.product.price),
          quantity: parseInt(component.quantity),
          imageUrl: component.product.imageUrl,
        });
      });

      toast({
        title: "Сагсанд нэмлээ",
        description: `"${mealKit.name}" багцыг сагсанд нэмлээ.`,
      });

      queryClient.invalidateQueries({ queryKey: ["generated-meal-kits"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Хоолны багцыг сагсанд нэмэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsAddingToCart(false);
    },
  });

  // Delete meal kit mutation
  const deleteMealKitMutation = useMutation({
    mutationFn: async () => {
      const { apiRequest } = await import("@/lib/queryClient");
      await apiRequest("DELETE", `/api/generated-meal-kits/${mealKit.id}`);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Амжилттай устгалаа",
        description: `"${mealKit.name}" багцыг устгалаа.`,
      });

      queryClient.invalidateQueries({ queryKey: ["generated-meal-kits"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Хоолны багцыг устгахад алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  // Handle add to cart
  const handleAddToCart = () => {
    setIsAddingToCart(true);
    addToCartMutation.mutate();
  };

  // Handle delete
  const handleDelete = () => {
    if (confirm("Та энэ хоолны багцыг устгахдаа итгэлтэй байна уу?")) {
      deleteMealKitMutation.mutate();
    }
  };

  // Calculate total quantity of items
  const totalItems = mealKit.components.reduce(
    (sum, component) => sum + parseInt(component.quantity),
    0,
  );

  // Format created date
  const formattedDate = new Date(mealKit.createdAt).toLocaleDateString(
    "mn-MN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  return (
    <motion.div
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold gradient-text">{mealKit.name}</h3>
            <p className="text-sm text-gray-500">
              {formattedDate} - {totalItems} ширхэг
            </p>
          </div>
          <div className="text-xl font-bold gradient-text">
            {formatPrice(mealKit.totalPrice)}
          </div>
        </div>
      </div>

      {/* Preview of meal kit contents */}
      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center -space-x-2">
            {mealKit.components.slice(0, 3).map((component) => (
              <div
                key={component.id}
                className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm"
              >
                <img
                  src={getFullImageUrl(component.product.imageUrl)}
                  alt={component.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {mealKit.components.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center text-xs font-medium">
                +{mealKit.components.length - 3}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded meal kit details */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          <h4 className="font-medium mb-2 text-gray-700">
            Багцын бүрэлдэхүүн:
          </h4>
          <ul className="space-y-2">
            {mealKit.components.map((component) => (
              <li
                key={component.id}
                className="flex justify-between items-center p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <img
                    src={getFullImageUrl(component.product.imageUrl)}
                    alt={component.product.name}
                    className="w-8 h-8 rounded object-cover mr-2"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {component.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {component.product.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm mr-2">{component.quantity}x</span>
                  <span className="text-sm font-medium">
                    {formatPrice(component.price)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleteMealKitMutation.isPending}
          className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          {deleteMealKitMutation.isPending ? (
            <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full mr-1"></div>
          ) : (
            <Trash2 className="h-4 w-4 mr-1" />
          )}
          Устгах
        </Button>

        <div className="flex space-x-2">
          <Link href={`/meal-kit-generator`}>
            <Button variant="outline" size="sm">
              Шинэ багц үүсгэх
            </Button>
          </Link>

          <Button
            variant="default"
            size="sm"
            onClick={handleAddToCart}
            disabled={isAddingToCart || mealKit.isAddedToCart}
            className={`${mealKit.isAddedToCart ? "bg-green-600 hover:bg-green-700" : "btn-gradient"}`}
          >
            {isAddingToCart ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></div>
            ) : (
              <ShoppingCart className="h-4 w-4 mr-1" />
            )}
            {mealKit.isAddedToCart ? "Сагсанд нэмсэн" : "Сагсанд нэмэх"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
