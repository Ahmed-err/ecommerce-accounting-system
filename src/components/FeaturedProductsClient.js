"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ProductCard from "@/components/store/ProductCard";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function FeaturedProductsClient({ products, lang: initialLang }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations['ar'];

  if (!products || products.length === 0) {
    return null; // or empty state
  }

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* === SECTION HEADER === */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {t.featuredProducts}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t.featuredProductsDesc}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              href="/products"
              className="mt-4 sm:mt-0 group flex items-center gap-2 text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              {t.viewAllProducts}
              <ArrowRight className={`h-4 w-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </motion.div>
        </div>

        {/* === PRODUCTS GRID === */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
