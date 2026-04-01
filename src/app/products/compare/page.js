import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCatalogProductsByIds } from "@/app/actions/catalog";
import ComparePageClient from "@/components/store/ComparePageClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: `${t.catalogComparePage} | ${b.brandName}`,
    description: t.allProductsDesc,
  };
}

export default async function ComparePage({ searchParams }) {
  const params = await searchParams;
  const ids = String(params?.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const products = ids.length ? await getCatalogProductsByIds(ids) : [];

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  return (
    <main
      className={`min-h-screen bg-background ${lang === "ar" ? "text-right" : "text-left"}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-foreground">
          {translations[lang].catalogComparePage}
        </h1>
        <ComparePageClient products={products} />
      </div>
      <Footer />
    </main>
  );
}
