import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { translations } from "@/lib/translations";
import { getUserOrderById } from "@/lib/user-orders";

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
            <h1 className="text-2xl font-bold text-white">#{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">{order.status}</span>
        </div>

        <div className="border border-white/10 rounded-xl p-4 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <p className="text-sm text-white">{item.product?.name || t.deletedProduct} x {item.quantity}</p>
              <p className="text-sm">{(item.price * item.quantity).toLocaleString()} {t.currency}</p>
            </div>
          ))}
        </div>

        <div className="border border-white/10 rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>{t.subtotal}</span><span>{subtotal.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{lang === "ar" ? "الخصم" : "Discount"}</span><span>{discount.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{t.delivery}</span><span>{order.shippingCost.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between"><span>{t.estimatedTax}</span><span>{tax.toLocaleString()} {t.currency}</span></div>
          <div className="flex justify-between font-bold"><span>{t.grandTotal}</span><span>{order.totalAmount.toLocaleString()} {t.currency}</span></div>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === "DELIVERED" && <Link className="px-3 py-2 rounded-lg bg-white/10" href="/products">{lang === "ar" ? "إعادة الطلب" : "Reorder"}</Link>}
          <Link className="px-3 py-2 rounded-lg bg-white/10" href={`/api/orders/${order.id}/invoice`} target="_blank">{lang === "ar" ? "تحميل الفاتورة PDF" : "Download Invoice PDF"}</Link>
          <button disabled={!returnOpen} className="px-3 py-2 rounded-lg bg-amber-500 text-black disabled:opacity-50">{returnOpen ? (lang === "ar" ? "طلب إرجاع" : "Request Return") : (lang === "ar" ? "انتهت فترة الإرجاع" : "Return period ended")}</button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
