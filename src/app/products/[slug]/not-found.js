import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export default async function ProductNotFound() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  return (
    <main
      className="min-h-screen bg-background"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t.pdpNotFoundTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.pdpNotFoundDesc}</p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black hover:bg-amber-400"
        >
          {t.pdpBackToShop}
        </Link>
      </div>
      <Footer />
    </main>
  );
}
