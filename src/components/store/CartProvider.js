"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { data: session, status } = useSession();
  const storageKey = session?.user?.id
    ? `powerstore_cart_${session.user.id}`
    : "powerstore_cart_guest";

  // Load cart per user (or guest) from localStorage
  useEffect(() => {
    if (status === "loading") return;
    try {
      let saved = localStorage.getItem(storageKey);

      // One-time fallback for legacy shared key
      if (!saved && storageKey === "powerstore_cart_guest") {
        saved = localStorage.getItem("powerstore_cart");
      }

      if (saved) {
        setCart(JSON.parse(saved));
      } else {
        setCart([]);
      }
    } catch {
      setCart([]);
    }
    setLoaded(true);
  }, [storageKey, status]);

  // Save cart to localStorage per user/guest key
  useEffect(() => {
    if (loaded && status !== "loading") {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    }
  }, [cart, loaded, storageKey, status]);

  const addToCart = useCallback((product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.sellingPrice,
          image: product.images?.[0] || null,
          quantity,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, loaded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
