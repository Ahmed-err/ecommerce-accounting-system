import { describe, expect, it } from "vitest";
import { buildReceiptInnerHtml } from "@/lib/receipt";
import { BOLT_PATH } from "@/components/brand/BoltMark";

const base = {
  isRTL: true, lang: "ar", storeName: "أعمال عصام الدين نصر للأدوات الكهربائية", storeLogo: "",
  items: [], subtotal: 0, total: 0, tax: 0, discount: 0, shipping: 0,
};

describe("A4 invoice header", () => {
  it("shows the Himmat mark and wordmark when no custom logo is set", () => {
    const html = buildReceiptInnerHtml(base, { paper: "a4" });
    expect(html).toContain('class="inv-mark"');
    expect(html).toContain("همّت");
    expect(html).toContain(BOLT_PATH); // receipt.js keeps its own copy of the path
    expect(html).toContain(base.storeName);
  });

  it("keeps an uploaded logo instead of the mark", () => {
    const html = buildReceiptInnerHtml({ ...base, storeLogo: "https://res.cloudinary.com/x/logo.png" }, { paper: "a4" });
    expect(html).toContain("inv-logo");
    expect(html).not.toContain('class="inv-mark"');
  });
});

describe("online invoice without a cashier", () => {
  it("omits the cashier line when cashier is null", async () => {
    const { buildReceiptData, buildReceiptMarkup } = await import("@/lib/receipt");
    const data = buildReceiptData({
      receiptFromServer: { orderId: "o1", items: [], totalAmount: 0 },
      store: {},
      cashier: null,
      lang: "ar",
      subtotalBeforeDiscount: 0,
    });
    expect(data.cashierName).toBe("");
    expect(buildReceiptMarkup(data, { paper: "a4" })).not.toContain("أمين الصندوق");
  });

  it("keeps the cashier line for POS receipts", async () => {
    const { buildReceiptData, buildReceiptMarkup } = await import("@/lib/receipt");
    const data = buildReceiptData({
      receiptFromServer: { orderId: "o1", items: [], totalAmount: 0 },
      store: {},
      cashier: { name: "Sara" },
      lang: "ar",
      subtotalBeforeDiscount: 0,
    });
    expect(buildReceiptMarkup(data, { paper: "a4" })).toContain("Sara");
  });
});
