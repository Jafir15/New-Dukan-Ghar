import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  totalWeight: number; // in kg
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("dg_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("dg_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity?: number) => {
    const step = (product.unit === "kg" || product.unit === "liter" || product.unit === "dozen") ? 0.5 : 1;
    const amountToAdd = quantity !== undefined ? quantity : step;

    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.round((item.quantity + amountToAdd) * 10) / 10 }
            : item
        );
      }
      return [...current, { product, quantity: amountToAdd }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.round(quantity * 10) / 10 } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.length;
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalWeight = items.reduce((sum, item) => {
    let weightInKg = 0;
    const q = item.quantity;
    switch (item.product.unit) {
      case "kg":
        weightInKg = q;
        break;
      case "gram":
        weightInKg = q / 1000;
        break;
      case "liter":
        weightInKg = q;
        break;
      case "pound":
        weightInKg = q * 0.453592;
        break;
      case "piece":
        weightInKg = q * 0.1;
        break;
    }
    return sum + weightInKg;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        totalWeight,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
