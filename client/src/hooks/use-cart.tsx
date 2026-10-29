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
import { linePrice, packKgOf } from "@shared/pack";

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

// Saved cart from localStorage, read once when the provider starts. Reading it in the
// initial state (instead of an effect) means the save effect below can never write an
// empty cart over the saved one before it has been loaded.
function readSavedCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem("cart");
    if (!savedCart) return [];
    const result = z.array(cartItemSchema).safeParse(JSON.parse(savedCart));
    return result.success ? result.data : [];
  } catch (error) {
    console.error("Failed to parse cart from localStorage:", error);
    try { localStorage.removeItem("cart"); } catch { /* storage blocked */ }
    return [];
  }
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(readSavedCart);

  // Pack products (e.g. 4kg boxes) are priced per pack; the rest per kg
  const totalPrice = useMemo(
    () => items.reduce((total, item) => total + linePrice(item.price, item.quantity, packKgOf(item)), 0),
    [items],
  );

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items));
    } catch {
      // Storage full or blocked (private mode): the cart still works for this visit
    }
  }, [items]);

  // Keep other tabs of the shop in step: a cart change in one tab shows up in the others
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "cart") setItems(readSavedCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
