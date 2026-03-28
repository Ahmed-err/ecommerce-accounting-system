import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartClient from "@/components/store/CartClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export const metadata = {
  title: "Shopping Cart | Essam Nasreddin Electrical Tools",
};

export default async function CartPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  return (
    <main className={`min-h-screen bg-background ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">{t.shoppingCart}</h1>
        <CartClient />
      </div>
      <Footer />
    </main>
  );
}
