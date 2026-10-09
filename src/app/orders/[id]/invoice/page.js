import { prisma as db } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import PrintButton from "@/components/common/PrintButton";
import { cookies } from "next/headers";
import { STORE_VAT_NUMBER } from "@/lib/constants";
import { ensureOrderInvoice } from "@/lib/orders";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { buildReceiptData, buildReceiptMarkup, pickPrinterFieldsFromStore } from "@/lib/receipt";
import styles from "./invoice-receipt.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const store = await getOrCreateStoreSettings();
  const brandName = lang === "ar" ? store.nameAr || store.nameEn : store.nameEn || store.nameAr;
  const label = lang === "ar" ? "فاتورة" : "Invoice";
  return { title: `${label} #${id.slice(-8).toUpperCase()} | ${brandName}`, robots: { index: false } };
}

export default async function InvoicePage({ params }) {
  const session = await auth();
  const { id } = await params;
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/orders/${id}/invoice`)}`);

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const store = await getOrCreateStoreSettings();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      invoice: true,
      user: true,
    },
  });

  if (!order) return notFound();

  const isStaff = ["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role);
  const isOwner = order.userId === session.user.id;
  if (!isStaff && !isOwner) return notFound();

  const invoice = await ensureOrderInvoice(order);
  const printerStore = pickPrinterFieldsFromStore(store) || {};
  const lineSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const receiptData = buildReceiptData({
    receiptFromServer: {
      orderId: order.id,
      // Placeholder invoice numbers are replaced by the order ref below, so don't list it twice.
      orderRef: invoice.invoiceNumber?.startsWith("BACKFILL-") ? "" : `#${order.id.slice(-8).toUpperCase()}`,
      createdAt: order.createdAt,
      // Invoices created after the fact carry a "BACKFILL-<order id>" number; show the order ref instead.
      invoiceNumber: invoice.invoiceNumber?.startsWith("BACKFILL-") ? order.id.slice(-8).toUpperCase() : invoice.invoiceNumber,
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
    // Online orders have no cashier; the person viewing the invoice isn't one either.
    cashier: null,
    lang,
    subtotalBeforeDiscount: lineSubtotal,
    discountType: "fixed",
    amountTendered: null,
    change: null,
  });
  const receiptMarkup = buildReceiptMarkup(receiptData, { paper: "a4" });

  const backHref = isStaff ? "/admin/orders" : `/account/orders/${order.id}`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-8 sm:justify-start sm:py-10 p-4 sm:p-6 print:min-h-0 print:justify-start print:p-0 print:bg-white text-foreground print:text-black">
      <div className="flex w-full max-w-[210mm] justify-between items-center mb-6 print:hidden">
        <Link
          href={backHref}
          aria-label={lang === "ar" ? "رجوع" : "Back"}
          className="p-2 bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
        >
          {lang === "ar" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </Link>
        <PrintButton targetId="invoice-print-area" />
      </div>

      <div
        id="invoice-print-area"
        className={`${styles.scope} invoice-print-a4-root receipt-root print-target-fit-content w-full max-w-[210mm] rounded-xl bg-white text-black shadow-2xl print:w-full print:max-w-[210mm] print:rounded-none print:shadow-none`}
      >
        <div dangerouslySetInnerHTML={{ __html: receiptMarkup }} />
      </div>
    </div>
  );
}
