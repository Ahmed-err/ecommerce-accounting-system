import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { STORE_VAT_NUMBER } from "@/lib/constants";
import { ensureOrderInvoice } from "@/lib/orders";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { buildReceiptData, pickPrinterFieldsFromStore } from "@/lib/receipt";
import { generateInvoicePdfBuffer } from "@/lib/invoice-pdf";

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
      guestEmail: order.guestEmail || order.user?.email || "",
      guestAddress: order.guestAddress || "",
      guestCity: order.guestCity || "",
      totalAmount: Number(invoice.totalAmount || order.totalAmount || 0),
      taxAmount: Number(invoice.taxAmount || 0),
      discountAmount: Number(invoice.discountAmount || 0),
      shippingAmount: Number(order.shippingCost || 0),
      vatNumber: STORE_VAT_NUMBER,
      qrImage: invoice.qrCode || "",
      documentLabel: lang === "ar" ? "فاتورة ضريبية" : "Tax invoice",
      items: order.items.map((item) => ({
        name: item.product?.name || "Item",
        nameAr: item.product?.nameAr || item.product?.name || "",
        nameEn: item.product?.nameEn || item.product?.name || "",
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

  const buffer = await generateInvoicePdfBuffer(receipt);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.id.slice(-8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
