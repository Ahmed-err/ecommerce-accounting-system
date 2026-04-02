import { prisma as db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import PrintButton from "@/components/common/PrintButton";
import { cookies } from "next/headers";
import { STORE_VAT_NUMBER } from "@/lib/constants";
import { ensureOrderInvoice } from "@/lib/orders";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { buildReceiptData, buildReceiptMarkup, pickPrinterFieldsFromStore } from "@/lib/receipt";
import styles from "./invoice-receipt.module.css";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const store = await getOrCreateStoreSettings();
  const brandName = lang === "ar" ? store.nameAr || store.nameEn : store.nameEn || store.nameAr;
  return { title: `Invoice - ${id.slice(-8).toUpperCase()} | ${brandName}` };
}

export default async function InvoicePage({ params }) {
  const session = await auth();
  const { id } = await params;

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const store = await getOrCreateStoreSettings();
  
  // Fetch order first to check ownership
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      invoice: true,
      user: true,
    },
  });

  if (!order) return notFound();

  // Auth check: Staff can view any invoice, customers can only view their own
  const isStaff = session && ["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role);
  const isOwner = session && order.userId === session.user.id;

  if (!isStaff && !isOwner) {
    return notFound();
  }

  const invoice = await ensureOrderInvoice(order);
  const printerStore = pickPrinterFieldsFromStore(store) || {};
  const lineSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const receiptData = buildReceiptData({
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
    cashier: {
      name: isStaff ? (session.user?.name || session.user?.email) : (lang === "ar" ? "النظام" : "System"),
    },
    lang,
    subtotalBeforeDiscount: lineSubtotal,
    discountType: "fixed",
    amountTendered: null,
    change: null,
  });
  const receiptMarkup = buildReceiptMarkup(receiptData);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white text-gray-100 print:text-black">
      <div className="w-[80mm] flex justify-between items-center mb-6 print:hidden">
        <Link 
          href="/admin/orders" 
          className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PrintButton targetId="invoice-print-area" />
      </div>

      <div
        id="invoice-print-area"
        className={`${styles.scope} receipt-root w-full rounded-xl bg-white text-black shadow-2xl print:rounded-none print:shadow-none`}
      >
        <div dangerouslySetInnerHTML={{ __html: receiptMarkup }} />
      </div>
    </div>
  );
}
