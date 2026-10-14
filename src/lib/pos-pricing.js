// POS totals, shared by the screen (display) and createPOSOrder (what is saved) so the
// customer pays what the books show (A-27). Owner rules (2026-10-15): no tax; cashiers
// discount at most 10%, managers and admins without a cap; zero-price items can't be sold.
// CREDIT (pay later, P3.5) needs the customer's name and phone and becomes a receivable.

export const POS_PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "CREDIT"];
export const CASHIER_MAX_DISCOUNT_PERCENT = 10;
const UNCAPPED_ROLES = ["ADMIN", "MANAGER"];

export class PosPricingError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;

export function isPosPaymentMethod(method) {
  return POS_PAYMENT_METHODS.includes(method);
}

/** Lines are `{ price, quantity }` with the price from the DB. Throws PosPricingError. */
export function priceSale({ lines, role, discountType = "fixed", discountValue = 0 }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new PosPricingError("EMPTY");
  let subtotal = 0;
  for (const { price, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new PosPricingError("BAD_QTY");
    if (!(Number(price) > 0)) throw new PosPricingError("ZERO_PRICE");
    subtotal += Number(price) * quantity;
  }
  subtotal = round2(subtotal);

  const value = discountValue === "" || discountValue == null ? 0 : Number(discountValue);
  if (!Number.isFinite(value) || value < 0 || !["fixed", "percent"].includes(discountType)) {
    throw new PosPricingError("BAD_DISCOUNT");
  }
  const discount = round2(discountType === "percent" ? (subtotal * value) / 100 : value);
  if (discount > subtotal) throw new PosPricingError("BAD_DISCOUNT");
  if (!UNCAPPED_ROLES.includes(role) && discount > round2((subtotal * CASHIER_MAX_DISCOUNT_PERCENT) / 100)) {
    throw new PosPricingError("DISCOUNT_LIMIT");
  }
  return { subtotal, discount, total: round2(subtotal - discount) };
}

/** For the screen: never throws; on a bad discount shows the total without it. */
export function previewSale(input) {
  try {
    return { ...priceSale(input), error: null };
  } catch (e) {
    if (!(e instanceof PosPricingError)) throw e;
    if (e.code === "EMPTY") return { subtotal: 0, discount: 0, total: 0, error: null };
    try {
      return { ...priceSale({ ...input, discountValue: 0 }), error: e.code };
    } catch (inner) {
      if (!(inner instanceof PosPricingError)) throw inner;
      return { subtotal: 0, discount: 0, total: 0, error: inner.code };
    }
  }
}
