import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  getCatalogProducts,
  getCatalogCategories,
  getCatalogPriceBounds,
} from "@/app/actions/catalog";
import ProductGrid from "@/components/store/ProductGrid";
import { cookies, headers } from "next/headers";
import { translations, translateCategory } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  const category = params?.category;
  const titleBase =
    category && category !== "all"
      ? `${translateCategory(category, t)} | ${t.catalog}`
      : `${t.allProducts} | ${b.brandName}`;

  let ogImage;
  try {
    const { products } = await getCatalogProducts({
      search: params?.search || "",
      category: category || "all",
      sort: params?.sort || "newest",
      page: 1,
      limit: 1,
      minPrice: params?.minPrice,
      maxPrice: params?.maxPrice,
      inStockOnly: params?.inStock,
    });
    ogImage = products[0]?.images?.[0];
  } catch {
    ogImage = undefined;
  }

  return {
    title: titleBase,
    description: t.allProductsDesc,
    openGraph: ogImage
      ? { images: [{ url: ogImage, alt: titleBase }] }
      : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const category = params?.category || "all";
  const sort = params?.sort || "newest";
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;
  const inStockOnly = params?.inStock;

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  const [{ products, total }, categories, priceBounds] = await Promise.all([
    getCatalogProducts({
      search,
      category,
      sort,
      page,
      minPrice,
      maxPrice,
      inStockOnly,
    }),
    getCatalogCategories(),
    getCatalogPriceBounds(),
  ]);

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : "";

  const itemListJson = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: total,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: (page - 1) * 12 + i + 1,
      ...(origin ? { url: `${origin}/products/${p.id}` } : {}),
      name: p.name,
    })),
  };

  return (
    <main
      className={`min-h-screen bg-background ${lang === "ar" ? "text-right" : "text-left"}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJson) }}
      />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t.allProducts}</h1>
          <p className="mt-1 text-muted-foreground">{t.allProductsDesc}</p>
        </div>

        <ProductGrid
          initialProducts={products}
          total={total}
          categories={categories}
          priceBounds={priceBounds}
        />
      </div>
      <Footer />
    </main>
  );
}
