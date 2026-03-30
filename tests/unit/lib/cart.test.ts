type CartItem = { id: string; price: number; quantity: number; stock: number };
const addToCart = (cart: CartItem[], item: CartItem) => {
  const existing = cart.find((c) => c.id === item.id);
  if (!existing) return [...cart, item];
  return cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + item.quantity } : c));
};
const removeFromCart = (cart: CartItem[], id: string) => cart.filter((c) => c.id !== id);
const updateQuantity = (cart: CartItem[], id: string, qty: number) =>
  cart.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, Math.min(qty, c.stock)) } : c));
const calculateTotal = (cart: CartItem[], discountPct = 0) => {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  return subtotal - subtotal * (discountPct / 100);
};
const clearCart = () => [] as CartItem[];

describe("cart helpers", () => {
  it("adds and increments item", () => {
    const base = [{ id: "1", price: 10, quantity: 1, stock: 5 }];
    const withNew = addToCart(base, { id: "2", price: 20, quantity: 1, stock: 5 });
    expect(withNew).toHaveLength(2);
    const inc = addToCart(base, { id: "1", price: 10, quantity: 2, stock: 5 });
    expect(inc[0].quantity).toBe(3);
  });

  it("removes item and ignores missing", () => {
    const base = [{ id: "1", price: 10, quantity: 1, stock: 5 }];
    expect(removeFromCart(base, "1")).toHaveLength(0);
    expect(removeFromCart(base, "x")).toHaveLength(1);
  });

  it("updates quantity with stock cap", () => {
    const base = [{ id: "1", price: 10, quantity: 1, stock: 3 }];
    expect(updateQuantity(base, "1", 2)[0].quantity).toBe(2);
    expect(updateQuantity(base, "1", 10)[0].quantity).toBe(3);
  });

  it("calculates totals and discount", () => {
    const cart = [{ id: "1", price: 100, quantity: 2, stock: 3 }];
    expect(calculateTotal(cart)).toBe(200);
    expect(calculateTotal(cart, 10)).toBe(180);
  });

  it("clears cart", () => {
    expect(clearCart()).toEqual([]);
  });
});
