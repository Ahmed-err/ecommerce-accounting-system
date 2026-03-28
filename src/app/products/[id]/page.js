import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProductById } from "@/app/actions/catalog";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/store/ProductDetailClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];

  if (!product) return { title: lang === "ar" ? "المنتج غير موجود" : "Product Not Found" };
  const description = lang === "ar"
    ? `اشتري ${product.name} من ${t.brandName}.`
    : `Buy ${product.name} from ${t.brandName}.`;
  return {
    title: `${product.name} | ${t.brandName}`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images?.[0] ? [{ url: product.images[0], alt: product.name }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  return (
    <main className={`min-h-screen bg-background ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductDetailClient product={product} />
      </div>
      <Footer />
    </main>
  );
}
