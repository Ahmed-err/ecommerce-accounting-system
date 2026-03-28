"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";

export default function ProductCard({ product, index = 0 }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const { addToCart } = useCart();

  const hasDiscount = product.purchasePrice && product.sellingPrice < product.purchasePrice * 1.5;
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.images?.[0];
  const isOutOfStock = product.stock <= 0;

  return (
    <motion.div 
      className="group bg-card border border-foreground/5 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-500 flex flex-col relative shadow-premium hover:shadow-2xl"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3 }
      }}
    >
      {/* Animated gradient border on hover */}
      <motion.div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(234,88,12,0.1) 100%)",
          zIndex: -1
        }}
      />

      {/* Image */}
      <Link href={`/products/${product.id}`} className="relative h-64 bg-muted/30 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {imageUrl && !imgError ? (
          <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-110">
            <Image 
              src={imageUrl} 
              alt={product.name} 
              fill
              className="object-cover"
              sizes="(max-w-768px) 100vw, (max-w-1200px) 50vw, 25vw"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/20">
            <motion.span 
              className="text-6xl"
              animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              📦
            </motion.span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.noImage}</span>
          </div>
        )}
        
        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <motion.span 
            className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t.outOfStock}
          </motion.span>
        )}
        
        {/* Quick View Overlay */}
        <motion.div 
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={false}
        >
          <motion.span 
            className="text-white text-sm font-medium px-4 py-2 border border-white/30 rounded-full backdrop-blur-sm"
            initial={{ y: 10, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
          >
            {lang === "ar" ? "عرض سريع" : "Quick View"}
          </motion.span>
        </motion.div>
      </Link>

      {/* Info */}
      <div className={`p-5 flex flex-col flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        <motion.span 
          className="text-amber-500 text-xs font-medium uppercase tracking-wider"
          initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {translateCategory(product.category?.name, t)}
        </motion.span>
        
        <Link href={`/products/${product.id}`}>
          <motion.h3 
            className="text-foreground font-bold text-lg mt-1 mb-2 group-hover:text-amber-500 transition-colors line-clamp-2"
            whileHover={{ x: isRTL ? 2 : -2 }}
            transition={{ duration: 0.2 }}
          >
            {product.name}
          </motion.h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-foreground text-xl font-bold"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              {product.sellingPrice.toLocaleString()} {t.currency}
            </motion.span>
          </div>
          
          <motion.button
            onClick={(e) => { e.preventDefault(); addToCart(product); }}
            disabled={isOutOfStock}
            className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden"
            whileHover={!isOutOfStock ? { scale: 1.1 } : {}}
            whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
            title={t.addToCart}
          >
            {/* Ripple effect on hover */}
            <motion.div
              className="absolute inset-0 bg-amber-500 rounded-xl"
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ zIndex: -1 }}
            />
            <ShoppingCart className="h-4 w-4 relative z-10" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
