import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackGuestOrderAction } from "@/app/actions/user-orders";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({ searchParams }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";
  const params = await searchParams;
  const orderNumber = params?.orderNumber || "";
  const phone = params?.phone || "";
  let result = null;

  if (orderNumber && phone) {
    result = await trackGuestOrderAction({ orderNumber, phone });
  }

  return (
    <main className={`min-h-screen bg-background ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="max-w-xl mx-auto p-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "تتبع الطلب" : "Track Order"}</h1>
        <form className="space-y-2">
          <input name="orderNumber" defaultValue={orderNumber} placeholder={lang === "ar" ? "رقم الطلب" : "Order number"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground" />
          <input name="phone" defaultValue={phone} placeholder={lang === "ar" ? "رقم الهاتف" : "Phone number"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground" />
          <button className="h-10 w-full rounded-lg bg-primary text-primary-foreground">{lang === "ar" ? "بحث" : "Lookup"}</button>
        </form>
        {result && !result.success && <p className="text-red-500 text-sm">{lang === "ar" ? "الطلب غير موجود" : "Order not found"}</p>}
        {result?.success && (
          <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
            <p className="font-mono">#{result.order.id.slice(-8).toUpperCase()}</p>
            <p className="text-sm text-muted-foreground">{result.order.status}</p>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
