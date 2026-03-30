import Link from "next/link";
import { cookies } from "next/headers";

export default async function OfflinePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const isRTL = lang === "ar";

  return (
    <main className={`min-h-screen bg-background px-4 py-16 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.02] p-8">
        <h1 className="text-2xl font-black">{lang === "ar" ? "أنت غير متصل بالإنترنت" : "You are offline"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ar" ? "تحقق من الاتصال ثم أعد المحاولة." : "Please check your connection and try again."}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-black"
          >
            {lang === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
          <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold">
            {lang === "ar" ? "الصفحة الرئيسية" : "Home"}
          </Link>
        </div>
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "صفحات يمكن الوصول لها من الكاش:" : "Cached pages you can still access:"}</p>
          <ul className="mt-2 text-sm">
            <li>/</li>
            <li>/products</li>
            <li>/about</li>
            <li>/contact</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
