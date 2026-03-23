import Link from "next/link";
import { getFeaturedProducts } from "@/app/actions/catalog";
import ProductCard from "@/components/store/ProductCard";

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts(8);

  if (!products || products.length === 0) {
    return null; // or empty state
  }

  return (
    <section className="py-20 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* === SECTION HEADER === */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Featured Products
            </h2>
            <p className="text-gray-400 text-lg">
              Top picks from our electrical supplies catalog
            </p>
          </div>
          <Link
            href="/products"
            className="mt-4 sm:mt-0 text-amber-500 hover:text-amber-400 font-medium transition-colors"
          >
            View All Products →
          </Link>
        </div>

        {/* === PRODUCTS GRID === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

