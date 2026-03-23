import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCatalogProducts, getCatalogCategories } from "@/app/actions/catalog";
import ProductGrid from "@/components/store/ProductGrid";

export const metadata = {
  title: "Products | PowerStore",
  description: "Browse our full catalog of electrical supplies.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const category = params?.category || "all";
  const sort = params?.sort || "newest";

  const [{ products, total }, categories] = await Promise.all([
    getCatalogProducts({ search, category, sort, page }),
    getCatalogCategories(),
  ]);

  return (
    <main className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">All Products</h1>
          <p className="text-gray-400 mt-1">Browse our full catalog of electrical supplies</p>
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
