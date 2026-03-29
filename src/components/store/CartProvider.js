"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const CartContext = createContext(null);

function clampQty(quantity, stockCap) {
  const cap = typeof stockCap === "number" && stockCap >= 0 ? stockCap : Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(quantity, cap));
}

function normalizeStorage(raw) {
  if (!raw) return { cart: [], savedForLater: [], appliedCoupon: null };
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) {
      return { cart: p, savedForLater: [], appliedCoupon: null };
    }
    return {
      cart: Array.isArray(p.cart) ? p.cart : [],
      savedForLater: Array.isArray(p.savedForLater) ? p.savedForLater : [],
      appliedCoupon:
        p.appliedCoupon &&
        typeof p.appliedCoupon === "object" &&
        typeof p.appliedCoupon.code === "string" &&
        typeof p.appliedCoupon.percentOff === "number"
          ? { code: p.appliedCoupon.code, percentOff: p.appliedCoupon.percentOff }
          : null,
    };
  } catch {
    return { cart: [], savedForLater: [], appliedCoupon: null };
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [savedForLater, setSavedForLater] = useState([]);
  const [appliedCoupon, setAppliedCouponState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const { data: session, status } = useSession();
  const storageKey = session?.user?.id
    ? `powerstore_cart_${session.user.id}`
    : "powerstore_cart_guest";

  useEffect(() => {
    if (status === "loading") return;
    try {
      let raw = localStorage.getItem(storageKey);
      if (!raw && storageKey === "powerstore_cart_guest") {
        raw = localStorage.getItem("powerstore_cart");
      }
      const s = normalizeStorage(raw);
      setCart(s.cart);
      setSavedForLater(s.savedForLater);
      setAppliedCouponState(s.appliedCoupon);
    } catch {
      setCart([]);
      setSavedForLater([]);
      setAppliedCouponState(null);
    }
    setLoaded(true);
  }, [storageKey, status]);

  useEffect(() => {
    if (loaded && status !== "loading") {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ cart, savedForLater, appliedCoupon })
      );
    }
  }, [cart, savedForLater, appliedCoupon, loaded, storageKey, status]);

  const setAppliedCoupon = useCallback((c) => {
    if (!c) {
      setAppliedCouponState(null);
      return;
    }
    if (typeof c.code === "string" && typeof c.percentOff === "number") {
      setAppliedCouponState({ code: c.code, percentOff: c.percentOff });
    }
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const stock =
      typeof product?.stock === "number" && product.stock >= 0 ? product.stock : null;
    if (stock !== null && stock <= 0) return;

    const addQty = Math.max(1, Math.floor(Number(quantity)) || 1);
    const categoryId = product?.category?.id || product?.categoryId || undefined;
    const categoryName = product?.category?.name || product?.categoryName || undefined;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const cap = stock ?? existing?.stock ?? Number.MAX_SAFE_INTEGER;

      if (existing) {
        const nextQty = clampQty(existing.quantity + addQty, cap);
        if (nextQty <= 0) return prev.filter((item) => item.id !== product.id);
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: nextQty,
                stock: stock ?? item.stock ?? undefined,
                ...(categoryId ? { categoryId } : {}),
                ...(categoryName ? { categoryName } : {}),
              }
            : item
        );
      }

      const firstQty = clampQty(addQty, cap);
      if (firstQty <= 0) return prev;

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.sellingPrice),
          image: product.images?.[0] || null,
          quantity: firstQty,
          ...(stock !== null ? { stock } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(categoryName ? { categoryName } : {}),
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (!item) return prev;

      const cap =
        typeof item.stock === "number" && item.stock >= 0
          ? item.stock
          : Number.MAX_SAFE_INTEGER;
      const q = clampQty(Math.floor(Number(quantity)) || 0, cap);

      if (q <= 0) return prev.filter((i) => i.id !== productId);
      return prev.map((i) => (i.id === productId ? { ...i, quantity: q } : i));
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCouponState(null);
  }, []);

  const moveToSavedForLater = useCallback((productId) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (!item) return prev;
      setSavedForLater((s) =>
        s.some((x) => x.id === productId) ? s : [...s, { ...item }]
      );
      return prev.filter((i) => i.id !== productId);
    });
  }, []);

  const restoreFromSavedForLater = useCallback((productId) => {
    setSavedForLater((s) => {
      const item = s.find((i) => i.id === productId);
      if (!item) return s;
      setCart((prev) =>
        prev.some((p) => p.id === productId) ? prev : [...prev, { ...item }]
      );
      return s.filter((i) => i.id !== productId);
    });
  }, []);

  const removeSavedForLater = useCallback((productId) => {
    setSavedForLater((s) => s.filter((i) => i.id !== productId));
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        savedForLater,
        appliedCoupon,
        setAppliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        moveToSavedForLater,
        restoreFromSavedForLater,
        removeSavedForLater,
        cartCount,
        cartTotal,
        loaded,
      }}
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
