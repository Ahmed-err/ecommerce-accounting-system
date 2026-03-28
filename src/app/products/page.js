import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCatalogProducts, getCatalogCategories } from "@/app/actions/catalog";
import ProductGrid from "@/components/store/ProductGrid";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return {
    title: t.catalog + " | " + t.brandName,
    description: t.shopByCategoryDesc,
  };
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const category = params?.category || "all";
  const sort = params?.sort || "newest";

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  const [{ products, total }, categories] = await Promise.all([
    getCatalogProducts({ search, category, sort, page }),
    getCatalogCategories(),
  ]);

  return (
    <main className={`min-h-screen bg-background ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t.allProducts}</h1>
          <p className="text-gray-400 mt-1">{t.allProductsDesc}</p>
        </div>

        <ProductGrid
          initialProducts={products}
          total={total}
          categories={categories}
          searchParams={params}
        />
      </div>
      <Footer />
    </main>
  );
}
