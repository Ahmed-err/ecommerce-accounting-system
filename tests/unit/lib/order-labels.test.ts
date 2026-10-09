import { ORDER_STATUSES, orderStatusLabel, paymentMethodLabel, orderRef, orderStatusTone } from "@/lib/order-labels";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";

describe("order-labels", () => {
  it("lists only the statuses the database has", () => {
    expect(ORDER_STATUSES).toEqual(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);
  });

  it("gives every status and payment method an Arabic and English label", () => {
    for (const t of [ar, en]) {
      for (const s of ORDER_STATUSES) expect(orderStatusLabel(s, t)).not.toMatch(/^[A-Z_]+$/);
      for (const m of ["CASH_ON_DELIVERY", "BANK_TRANSFER", "CASH", "CARD"]) expect(paymentMethodLabel(m, t)).not.toMatch(/^[A-Z_ ]+$/);
    }
    expect(orderStatusLabel("DELIVERED", ar)).toBe("تم التوصيل");
    expect(paymentMethodLabel("CASH_ON_DELIVERY", ar)).toBe("الدفع عند الاستلام");
  });

  it("falls back to readable text for unknown codes", () => {
    expect(paymentMethodLabel("MOBILE_MONEY", ar)).toBe("MOBILE MONEY");
    expect(orderStatusLabel(undefined, ar)).toBe("");
  });

  it("formats the short order reference and a tone per status", () => {
    expect(orderRef("cmusgyrfx002hapcpeiz5hpd2")).toBe("EIZ5HPD2");
    expect(orderStatusTone("DELIVERED")).toBe("success");
    expect(orderStatusTone("CANCELLED")).toBe("danger");
    expect(orderStatusTone("PENDING")).toBe("warning");
  });
});
