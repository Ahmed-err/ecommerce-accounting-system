import { n, isPosOrder } from "@/lib/orders";

const calculateOrderTotal = ({ subtotal, shipping, tax, discount }: any) =>
  subtotal + shipping + tax - discount;

const validateCoupon = (coupon: any, subtotal: number) => {
  if (!coupon?.isActive) return false;
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return false;
  if (coupon.minAmount && subtotal < coupon.minAmount) return false;
  if (coupon.usageLimit && coupon.used >= coupon.usageLimit) return false;
  return true;
};

const generateOrderNumber = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

describe("orders helpers", () => {
  it("calculates order total", () => {
    expect(calculateOrderTotal({ subtotal: 100, shipping: 10, tax: 14, discount: 5 })).toBe(119);
  });

  it("validates coupon scenarios", () => {
    expect(validateCoupon({ isActive: true, expiresAt: null }, 100)).toBe(true);
    expect(validateCoupon({ isActive: true, expiresAt: new Date(0) }, 100)).toBe(false);
    expect(validateCoupon({ isActive: true, usageLimit: 1, used: 1 }, 100)).toBe(false);
    expect(validateCoupon({ isActive: true, minAmount: 200 }, 100)).toBe(false);
  });

  it("generates unique order number", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a.startsWith("ORD-")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("maps numeric decimals", () => {
    expect(n("10.5")).toBe(10.5);
    expect(isPosOrder({ guestCity: "POS Station" } as any)).toBe(true);
  });
});
