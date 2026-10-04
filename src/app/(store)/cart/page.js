import CartPageClient from "@/components/store/CartPageClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.ar;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: `${t.shoppingCart} | ${b.brandName}`,
  };
}

export default async function CartPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  return (
    <div className={`bg-background ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:mb-8 sm:text-3xl md:text-4xl">
          {t.shoppingCart}
        </h1>
        <CartPageClient />
      </div>
    </div>
  );
}
