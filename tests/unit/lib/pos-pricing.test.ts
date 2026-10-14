import {
  CASHIER_MAX_DISCOUNT_PERCENT,
  isPosPaymentMethod,
  previewSale,
  priceSale,
  PosPricingError,
} from "@/lib/pos-pricing";

const lines = [
  { price: 1000, quantity: 2 },
  { price: 500, quantity: 1 },
];

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof PosPricingError) return e.code;
    throw e;
  }
  return null;
}

describe("priceSale", () => {
  it("adds no tax: total is items minus discount", () => {
    expect(priceSale({ lines, role: "CASHIER" })).toEqual({ subtotal: 2500, discount: 0, total: 2500 });
  });

  it("applies a fixed or percent discount", () => {
    expect(priceSale({ lines, role: "CASHIER", discountType: "fixed", discountValue: 100 }).total).toBe(2400);
    expect(priceSale({ lines, role: "CASHIER", discountType: "percent", discountValue: 10 })).toEqual({
      subtotal: 2500,
      discount: 250,
      total: 2250,
    });
  });

  it("rounds a percent discount to 2 decimals", () => {
    const r = priceSale({ lines: [{ price: 333.33, quantity: 1 }], role: "ADMIN", discountType: "percent", discountValue: 7 });
    expect(r.discount).toBe(23.33);
    expect(r.total).toBe(310);
  });

  it(`caps a cashier at ${CASHIER_MAX_DISCOUNT_PERCENT}%`, () => {
    expect(codeOf(() => priceSale({ lines, role: "CASHIER", discountType: "percent", discountValue: 11 }))).toBe(
      "DISCOUNT_LIMIT"
    );
    expect(codeOf(() => priceSale({ lines, role: "CASHIER", discountType: "fixed", discountValue: 251 }))).toBe(
      "DISCOUNT_LIMIT"
    );
  });

  it("lets managers and admins discount without the cap, but not below zero", () => {
    expect(priceSale({ lines, role: "MANAGER", discountType: "percent", discountValue: 50 }).total).toBe(1250);
    expect(priceSale({ lines, role: "ADMIN", discountType: "fixed", discountValue: 2500 }).total).toBe(0);
    expect(codeOf(() => priceSale({ lines, role: "ADMIN", discountType: "fixed", discountValue: 2501 }))).toBe(
      "BAD_DISCOUNT"
    );
    expect(codeOf(() => priceSale({ lines, role: "ADMIN", discountType: "percent", discountValue: -1 }))).toBe(
      "BAD_DISCOUNT"
    );
  });

  it("refuses an empty cart, bad quantities and zero-price items", () => {
    expect(codeOf(() => priceSale({ lines: [], role: "ADMIN" }))).toBe("EMPTY");
    expect(codeOf(() => priceSale({ lines: [{ price: 10, quantity: 1.5 }], role: "ADMIN" }))).toBe("BAD_QTY");
    expect(codeOf(() => priceSale({ lines: [{ price: 0, quantity: 1 }], role: "ADMIN" }))).toBe("ZERO_PRICE");
  });

  it("refuses an unknown discount type", () => {
    expect(codeOf(() => priceSale({ lines, role: "ADMIN", discountType: "magic", discountValue: 5 }))).toBe(
      "BAD_DISCOUNT"
    );
  });
});

describe("previewSale", () => {
  it("returns the error code instead of throwing, keeping the undiscounted total", () => {
    expect(previewSale({ lines, role: "CASHIER", discountType: "percent", discountValue: 20 })).toEqual({
      subtotal: 2500,
      discount: 0,
      total: 2500,
      error: "DISCOUNT_LIMIT",
    });
  });

  it("treats an empty discount box as no discount", () => {
    expect(previewSale({ lines, role: "CASHIER", discountType: "fixed", discountValue: "" }).error).toBeNull();
  });
});

describe("isPosPaymentMethod", () => {
  it("accepts cash, card, bank transfer and pay later only", () => {
    expect(["CASH", "CARD", "BANK_TRANSFER", "CREDIT"].every(isPosPaymentMethod)).toBe(true);
    expect(isPosPaymentMethod("STORE_CREDIT")).toBe(false);
    expect(isPosPaymentMethod("anything")).toBe(false);
  });
});
