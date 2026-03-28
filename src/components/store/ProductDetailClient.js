"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Minus, Plus, ArrowLeft, ArrowRight, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function ProductDetailClient({ product }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = product.images || [];
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={isRTL ? "text-right" : "text-left"}>
      <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
        <ArrowRight className={`h-4 w-4 ${isRTL ? "" : "rotate-180"}`} /> {t.backToProducts}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
            {images.length > 0 ? (
              <Image
                src={images[activeImageIndex]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover animate-in fade-in zoom-in-95 duration-300"
                priority
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-8xl opacity-20 text-white">📦</span>
            )}
          </div>
          
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                    activeImageIndex === idx 
                      ? 'border-amber-500 scale-105 shadow-lg shadow-amber-500/20' 
                      : 'border-white/5 opacity-50 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${idx + 1}`} fill sizes="100px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-amber-500 text-xs font-medium uppercase tracking-wider">
              {product.category?.name}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-white">{product.sellingPrice.toLocaleString()} {t.currency}</span>
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="h-3 w-3" /> {t.inStock} ({product.stock})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                {t.outOfStock}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-gray-400 leading-relaxed mb-8">{product.description}</p>
          )}

          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
            <Package className="h-4 w-4" /> {t.productSku}: <span className="text-gray-300 font-mono">{product.sku}</span>
          </div>

          {/* Quantity & Add to Cart */}
          {inStock && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 text-gray-400 hover:text-white transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-white font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="p-3 text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-6 text-base font-semibold rounded-xl transition-all duration-300 ${isRTL ? 'flex-row' : 'flex-row-reverse'} ${
                  added
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-black"
                }`}
              >
                {added ? (
                  <><CheckCircle className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} /> {t.addedToCart}</>
                ) : (
                  <><ShoppingCart className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} /> {t.addToCart} — {(product.sellingPrice * quantity).toLocaleString()} {t.currency}</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
