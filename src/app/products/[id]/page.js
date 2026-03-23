import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProductById } from "@/app/actions/catalog";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/store/ProductDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product Not Found" };
  return {
    title: `${product.name} | PowerStore`,
    description: product.description || `Buy ${product.name} from PowerStore.`,
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductDetailClient product={product} />
      </div>
      <Footer />
    </main>
  );
}
