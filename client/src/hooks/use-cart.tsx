import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { CartItem, cartItemSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { isBulkyMeat } from "@/lib/utils";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Memoize total price calculation with special handling for "Хонины хаа"
  const totalPrice = useMemo(
    () =>
      items.reduce((total, item) => {
        if (isBulkyMeat(item.name)) {
          // For "Хонины хаа", price is per 4kg package, so calculate packages
          const packages = item.quantity / 4;
          return total + item.price * packages;
        } else {
          return total + item.price * item.quantity;
        }
      }, 0),
    [items],
  );

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const validationResult = z.array(cartItemSchema).safeParse(parsedCart);
        if (validationResult.success) {
          setItems(validationResult.data);
        }
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
        localStorage.removeItem("cart");
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  // Memoize cart operations
  const addItem = useCallback((newItem: CartItem) => {
    setItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) => item.productId === newItem.productId,
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
        };
        return updatedItems;
      } else {
        return [...prevItems, newItem];
      }
    });

    logger.custom("🛒", "장바구니 추가:", {
      productId: newItem.productId,
      quantity: newItem.quantity,
      name: newItem.name,
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prevItems) =>
      prevItems.filter((item) => item.productId !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      totalPrice,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
