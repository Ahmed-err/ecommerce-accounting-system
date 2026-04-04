import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { translations } from "@/lib/translations";
import { getUserOrderById } from "@/lib/user-orders";
import AccountOrderActions from "@/components/account/AccountOrderActions";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({ params }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";

  const order = await getUserOrderById(session.user.id, id);
  if (!order) notFound();

  const returnOpen = order.status === "DELIVERED" && (Date.now() - new Date(order.updatedAt).getTime()) <= 14 * 24 * 60 * 60 * 1000;
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discount = order.invoice?.discountAmount || 0;
  const tax = order.invoice?.taxAmount || 0;

  return (
    <main className={`min-h-screen bg-background ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">#{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">{order.status}</span>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <p className="text-sm text-foreground">{item.product?.name || t.deletedProduct} x {item.quantity}</p>
              <p className="text-sm text-foreground">{(item.price * item.quantity).toLocaleString()} {t.currency}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded-xl border border-border p-4 text-sm text-foreground">
          <div className="flex justify-between"><span>{t.subtotal}</span><span>{subtotal.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{lang === "ar" ? "الخصم" : "Discount"}</span><span>{discount.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{t.delivery}</span><span>{order.shippingCost.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{t.estimatedTax}</span><span>{tax.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between font-bold"><span>{t.grandTotal}</span><span>{order.totalAmount.toLocaleString()} {t.currency}</span></div>
        </div>

        <AccountOrderActions
          orderId={order.id}
          status={order.status}
          returnOpen={returnOpen}
          lines={order.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            name: it.product?.name || t.deletedProduct,
            isActive: it.product != null && it.product.isActive !== false,
          }))}
        />
      </div>
      <Footer />
    </main>
  );
}
