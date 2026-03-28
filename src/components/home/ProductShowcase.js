"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductCard from "@/components/store/ProductCard";
import { ArrowRight, Sparkles, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductShowcase({ products }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;

  if (!products || products.length === 0) return null;

  // Simulate different categories of products for the tabs
  const bestSellers = products.slice(0, 4);
  const newArrivals = [...products].reverse().slice(0, 4);
  const topRated = [products[0], products[1], products[2], products[3]].filter(Boolean);

  const tabs = [
    { value: "best-sellers", label: t.bestSellers || "Best Sellers", icon: TrendingUp, data: bestSellers },
    { value: "new-arrivals", label: t.newArrivals || "New Arrivals", icon: Sparkles, data: newArrivals },
    { value: "top-rated", label: t.topRated || "Top Rated", icon: Star, data: topRated },
  ];

  return (
    <section className="py-24 md:py-32 bg-background overflow-hidden relative border-t border-foreground/5">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Tabs defaultValue="best-sellers" id="homepage-product-showcase" className="w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <motion.div
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-amber-500/10 text-amber-500 text-xs font-black uppercase tracking-widest border border-amber-500/20">
                    <Star className="h-4 w-4" />
                    {t.featuredProducts || "Featured"}
                </div>
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-foreground leading-[0.95]">
                    {t.popularProducts || "TOP PRODUCTS"}<br />
                    <span className="text-amber-500 underline decoration-8 decoration-amber-500/20 underline-offset-8">
                      {isRTL ? "لهذا الشهر" : "THIS MONTH"}
                    </span>
                </h2>
              </motion.div>
            </div>
            
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="flex items-center"
            >
              <TabsList className="bg-foreground/5 p-1.5 rounded-2xl border border-foreground/10 flex-wrap sm:flex-nowrap shadow-inner">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value}
                    className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl data-active:bg-background data-active:text-amber-500 data-active:shadow-premium font-bold tracking-widest uppercase text-[10px] sm:text-xs transition-all w-full sm:w-auto"
                  >
                    <tab.icon className={cn("w-4 h-4 shrink-0", isRTL ? "ml-2" : "mr-2")} />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>
          </div>

          <div className="relative">
             {tabs.map((tab) => (
               <TabsContent key={tab.value} value={tab.value} className="mt-0 outline-none">
                 <motion.div 
                   initial={{ opacity: 0, y: 30 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.4 }}
                   className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8"
                 >
                   {tab.data.map((product) => (
                     <ProductCard key={product.id} product={product} />
                   ))}
                   
                   {/* View All Card */}
                   <Link href="/products" className="group relative flex flex-col items-center justify-center p-8 rounded-3xl bg-amber-500 hover:bg-amber-600 transition-all duration-500 transform hover:-translate-y-2 shadow-premium hover:shadow-2xl hover:shadow-amber-500/30 active:scale-95 text-center overflow-hidden h-full min-h-[350px]">
                     <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none group-hover:scale-150 transition-transform duration-700">
                       <Sparkles className="h-32 w-32 text-black" />
                     </div>
                     <div className="h-16 w-16 bg-black/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                         <ArrowRight className={cn("h-8 w-8 text-black transition-transform duration-500 group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")} />
                     </div>
                     <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-4 italic leading-tight">
                         {isRTL ? "اكتشف مجموعتنا الكاملة" : "EXPLORE ENTIRE COLLECTION"}
                     </h3>
                     <p className="text-black/70 text-[10px] font-black uppercase tracking-widest mb-8">
                         {products.length}+ {isRTL ? "منتجات جاهزة لك" : "PRODUCTS READY FOR YOU"}
                     </p>
                     <div className="inline-flex h-12 items-center justify-center px-8 rounded-xl bg-black text-white group-hover:bg-black/80 font-black uppercase tracking-widest text-xs shadow-xl transition-colors">
                         {t.shopNow || "Shop Now"}
                     </div>
                   </Link>
                 </motion.div>
               </TabsContent>
             ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
