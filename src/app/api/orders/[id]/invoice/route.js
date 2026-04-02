import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import PDFDocument from "pdfkit";
import { STORE_VAT_NUMBER } from "@/lib/constants";
import { ensureOrderInvoice } from "@/lib/orders";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { buildReceiptData, pickPrinterFieldsFromStore } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const ip = await getClientIP();
  const allowed = await checkRateLimit(`invoice:${ip}`, 20, 60 * 60 * 1000, { failClosed: true });
  if (!allowed) return new Response("Rate limited", { status: 429 });

  const { id } = await params;
  const url = new URL(_req.url);
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const order = await db.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } }, invoice: true, user: true },
  });
  if (!order) return new Response("Not found", { status: 404 });
  const invoice = await ensureOrderInvoice(order);
  const store = await getOrCreateStoreSettings();
  const printerStore = pickPrinterFieldsFromStore(store) || {};
  const lineSubtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const receipt = buildReceiptData({
    receiptFromServer: {
      orderId: order.id,
      orderRef: `#${order.id.slice(-8).toUpperCase()}`,
      createdAt: invoice.issuedAt || order.createdAt,
      invoiceNumber: invoice.invoiceNumber,
      paymentMethod: order.paymentMethod,
      guestName: order.guestName || order.user?.name || "",
      guestPhone: order.guestPhone || "",
      totalAmount: Number(invoice.totalAmount || order.totalAmount || 0),
      taxAmount: Number(invoice.taxAmount || 0),
      discountAmount: Number(invoice.discountAmount || 0),
      shippingAmount: Number(order.shippingCost || 0),
      vatNumber: STORE_VAT_NUMBER,
      qrImage: invoice.qrCode || "",
      documentLabel: lang === "ar" ? "فاتورة ضريبية" : "Tax Invoice",
      items: order.items.map((item) => ({
        name: item.product?.name || "Item",
        sku: item.product?.sku || "",
        qty: item.quantity,
        unitPrice: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
      })),
    },
    store: {
      ...printerStore,
      currency: store.currency || "SDG",
    },
    cashier: { name: lang === "ar" ? "النظام" : "System" },
    lang,
    subtotalBeforeDiscount: lineSubtotal,
    discountType: "fixed",
    amountTendered: null,
    change: null,
  });

  const chunks = [];
  const doc = new PDFDocument({ size: [226, 900], margin: 12 });
  doc.on("data", (c) => chunks.push(c));

  const money = (n) =>
    `${Number(n).toLocaleString(lang === "ar" ? "ar-SD" : "en-US", { maximumFractionDigits: 2 })} ${receipt.currency}`;
  const line = () => doc.moveTo(12, doc.y).lineTo(214, doc.y).dash(2, { space: 2 }).stroke().undash();
  const row = (left, right) => {
    doc.fontSize(9).text(left, 12, doc.y, { width: 120, align: "left" });
    doc.text(String(right), 132, doc.y - 11, { width: 82, align: "right" });
    doc.moveDown(0.2);
  };

  doc.fontSize(12).text(receipt.storeName, { align: "center" });
  doc.fontSize(8).fillColor("#555").text(receipt.documentLabel, { align: "center" }).fillColor("#000");
  if (receipt.storeAddress) doc.fontSize(8).fillColor("#555").text(receipt.storeAddress, { align: "center" }).fillColor("#000");
  if (receipt.storePhone) doc.fontSize(8).fillColor("#555").text(receipt.storePhone, { align: "center" }).fillColor("#000");
  if (receipt.vatNumber) doc.fontSize(8).fillColor("#555").text(`VAT: ${receipt.vatNumber}`, { align: "center" }).fillColor("#000");
  doc.moveDown(0.4);
  line();
  doc.moveDown(0.4);
  row(lang === "ar" ? "الفاتورة" : "Invoice", receipt.invoiceNumber);
  row(lang === "ar" ? "مرجع الطلب" : "Order Ref", receipt.orderRef || "-");
  row(lang === "ar" ? "التاريخ" : "Date", `${receipt.date} ${receipt.time}`);
  row(lang === "ar" ? "العميل" : "Customer", receipt.customerName || "-");
  doc.moveDown(0.3);
  line();
  doc.moveDown(0.4);
  doc.fontSize(9).text(lang === "ar" ? "المنتج" : "Item", 12, doc.y, { width: 120 });
  doc.text(lang === "ar" ? "الإجمالي" : "Total", 132, doc.y - 11, { width: 82, align: "right" });
  doc.moveDown(0.2);
  line();
  doc.moveDown(0.4);
  for (const it of receipt.items) {
    const itemName = `${it.name}${it.sku ? ` (${it.sku})` : ""}`;
    doc.fontSize(8).text(itemName, 12, doc.y, { width: 140 });
    doc.text(`x${it.qty}`, 132, doc.y - 10, { width: 20, align: "left" });
    doc.text(money(it.subtotal), 152, doc.y - 10, { width: 62, align: "right" });
    doc.moveDown(0.1);
  }
  doc.moveDown(0.3);
  line();
  doc.moveDown(0.4);
  row(lang === "ar" ? "المجموع الفرعي" : "Subtotal", money(receipt.subtotal));
  if (receipt.discount > 0) row(lang === "ar" ? "الخصم" : "Discount", `- ${money(receipt.discount)}`);
  if (receipt.shipping > 0) row(lang === "ar" ? "الشحن" : "Shipping", money(receipt.shipping));
  if (receipt.tax > 0) row(receipt.taxLabel, money(receipt.tax));
  doc.moveDown(0.2);
  doc.fontSize(10).text(lang === "ar" ? "الإجمالي" : "TOTAL", 12, doc.y, { width: 120 });
  doc.text(money(receipt.total), 132, doc.y - 12, { width: 82, align: "right" });
  doc.moveDown(0.4);
  line();
  doc.moveDown(0.4);
  row(lang === "ar" ? "الدفع" : "Payment", receipt.paymentMethod);
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor("#444").text(receipt.footerTextEn, { align: "center" });
  doc.text(receipt.footerTextAr, { align: "center" }).fillColor("#000");
  doc.end();

  const buffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.id.slice(-8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
