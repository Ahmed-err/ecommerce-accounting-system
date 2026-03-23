"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const hasDiscount = product.purchasePrice && product.sellingPrice < product.purchasePrice * 1.5;
  const imageUrl = product.images?.[0];

  return (
    <div className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col">
      {/* Image */}
      <Link href={`/products/${product.id}`} className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <span className="text-4xl opacity-30">📦</span>
        )}
        {product.stock <= 0 && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            نفذت الكمية
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1 text-right">
        <span className="text-amber-500 text-xs font-medium uppercase tracking-wider">
          {product.category?.name}
        </span>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-white font-semibold mt-1 mb-2 group-hover:text-amber-500 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-xl font-bold">{product.sellingPrice.toLocaleString()} ج.س</span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); addToCart(product); }}
            disabled={product.stock <= 0}
            className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-600 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="أضف إلى السلة"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
