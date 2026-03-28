"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ProductRow({ product, onAddToCart }) {
  const { lang } = useLanguage();
  const currency = lang === "ar" ? "ج.س" : "SDG";

  return (
    <div 
      onClick={() => onAddToCart(product)}
      className={`bg-gray-900 border rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${product.stock === 0 ? 'opacity-50 grayscale border-red-500/30' : 'border-white/5 hover:border-amber-500/50'}`}
    >
      <div className="aspect-square bg-gray-950 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
        ) : (
          <ShoppingCart className="w-8 h-8 text-gray-800" />
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Out of Stock</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col h-16 justify-between">
        <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">{product.name}</h3>
        <div className="flex justify-between items-end">
          <span className="font-mono text-xs text-gray-500">{product.sku}</span>
          <span className="font-bold text-amber-500">{product.sellingPrice.toFixed(2)} {currency}</span>
        </div>
      </div>
    </div>
  );
}
