"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductCard from "@/components/store/ProductCard";
import { ArrowRight, Sparkles, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductShowcase({ featured }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;

  const catalogActiveCount = featured?.catalogActiveCount ?? 0;

  const tabsConfig = useMemo(() => {
    const bestSellers = featured?.bestSellers ?? [];
    const newArrivals = featured?.newArrivals ?? [];
    const topRated = featured?.topRated ?? [];
    const rows = [
      {
        value: "best-sellers",
        label: t.bestSellers || "Best Sellers",
        icon: TrendingUp,
        data: bestSellers,
      },
      {
        value: "new-arrivals",
        label: t.newArrivals || "New Arrivals",
        icon: Sparkles,
        data: newArrivals,
      },
      {
        value: "top-rated",
        label: t.topRated || "Top Rated",
        icon: Star,
        data: topRated,
      },
    ];
    return rows.filter((tab) => tab.data.length > 0);
  }, [featured, t.bestSellers, t.newArrivals, t.topRated]);

  const featuredMeta = featured?.featuredMeta;
  const firstTab = tabsConfig[0]?.value ?? "best-sellers";
  const [activeTab, setActiveTab] = useState(firstTab);

  useEffect(() => {
    if (!tabsConfig.some((tab) => tab.value === activeTab)) {
      setActiveTab(firstTab);
    }
  }, [tabsConfig, activeTab, firstTab]);

  const activeTabHint = useMemo(() => {
    const meta = featuredMeta ?? {};
    const days = String(meta.newArrivalsWindowDays ?? 120);
    const n = String(meta.topRatedMinReviews ?? 2);
    if (activeTab === "best-sellers") {
      switch (meta.bestSellersPeriod) {
        case "90d":
          return t.showcaseBestSellersHint90d;
        case "all":
          return t.showcaseBestSellersHintAll;
        case "fallback_stock":
          return t.showcaseBestSellersHintFallback;
        case "month":
        default:
          return t.showcaseBestSellersHintMonth;
      }
    }
    if (activeTab === "new-arrivals") {
      const template = meta.newArrivalsFilledOlder
        ? t.showcaseNewArrivalsHintMixed
        : t.showcaseNewArrivalsHint;
      return String(template || "").replace(/\{days\}/g, days);
    }
    if (activeTab === "top-rated") {
      if (meta.topRatedRelaxed) return t.showcaseTopRatedHintRelaxed;
      return String(t.showcaseTopRatedHint || "").replace(/\{n\}/g, n);
    }
    return "";
  }, [activeTab, featuredMeta, t]);

  if (tabsConfig.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background border-t border-foreground/5 py-10 sm:py-12 lg:py-16">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

      <div className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <Tabs
          key={firstTab}
          value={activeTab}
          onValueChange={setActiveTab}
          id="homepage-product-showcase"
          className="w-full min-w-0"
        >
          {/* ── Section header + tabs ── */}
          <div
            className={cn(
              "flex flex-col gap-6 mb-6 sm:mb-8 lg:mb-10",
              "xl:flex-row xl:items-end xl:justify-between",
              isRTL && "xl:flex-row-reverse"
            )}
          >
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className={cn("space-y-3", isRTL ? "text-right" : "text-left")}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 sm:px-4 sm:text-xs">
                <Star className="h-3.5 w-3.5" />
                {t.featuredProducts || "Featured"}
              </div>
              <h2
                className={cn(
                  "font-black uppercase tracking-tighter italic text-foreground leading-[0.95]",
                  "text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl"
                )}
              >
                {t.popularProducts || "TOP PRODUCTS"}
              </h2>
              {activeTabHint ? (
                <p
                  className={cn(
                    "max-w-2xl text-sm font-semibold leading-relaxed text-amber-600/95 sm:text-base",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {activeTabHint}
                </p>
              ) : null}
            </motion.div>

            {/* Tab list */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className={cn("w-full xl:w-auto", isRTL ? "xl:mr-auto" : "xl:ml-auto")}
            >
              <TabsList className="flex w-full flex-wrap justify-center gap-1 rounded-xl border border-foreground/10 bg-foreground/5 p-1 shadow-inner sm:justify-end sm:gap-0 sm:rounded-2xl sm:p-1.5 md:flex-nowrap xl:w-auto">
                {tabsConfig.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl",
                      "px-2.5 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3",
                      "text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all",
                      "data-active:bg-background data-active:text-amber-500 data-active:shadow-premium"
                    )}
                  >
                    <tab.icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
                    <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>
          </div>

          {/* ── Product grids ── */}
          <div>
            {tabsConfig.map((tab) => {
              const exploreHref =
                tab.value === "best-sellers"
                  ? "/products?sort=best_selling"
                  : tab.value === "new-arrivals"
                    ? "/products?sort=newest"
                    : "/products?sort=top_rated";
              return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0 outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38 }}
                  className="grid w-full min-w-0 items-stretch gap-4 sm:gap-5 md:gap-6 lg:gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,clamp(11.25rem,22vw,18.75rem)),1fr))]"
                >
                  {tab.data.map((product, i) => (
                    <div
                      key={product.id}
                      className="flex min-h-0 min-w-0 w-full max-w-full"
                    >
                      <ProductCard product={product} index={i} homeShowcase />
                    </div>
                  ))}

                  {/* View All card */}
                  <Link
                    href={exploreHref}
                    className={cn(
                      "group relative col-span-full flex min-h-[200px] flex-col items-center justify-center overflow-hidden rounded-2xl bg-amber-500 p-4 text-center shadow-lg transition-all duration-500 hover:-translate-y-1 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/25 active:scale-[0.99] sm:min-h-[220px] sm:rounded-3xl sm:p-6 md:min-h-[200px] md:flex-row md:items-center md:justify-between md:gap-8 md:px-10 md:py-6",
                      isRTL && "md:flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute top-0 p-5 opacity-15 transition-transform duration-700 group-hover:scale-150 sm:p-8",
                        isRTL ? "left-0 md:left-auto md:right-0" : "right-0 md:right-auto md:left-0"
                      )}
                    >
                      <Sparkles className="h-20 w-20 text-black sm:h-28 sm:h-28 md:h-32 md:w-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10 shadow-inner transition-transform group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <ArrowRight
                          className={cn(
                            "h-6 w-6 text-black transition-transform duration-500 group-hover:translate-x-1 sm:h-7 sm:w-7 md:h-8 md:w-8",
                            isRTL && "rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0"
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          "flex flex-col items-center text-center",
                          isRTL ? "md:items-end md:text-end" : "md:items-start md:text-start"
                        )}
                      >
                        <h3 className="mb-2 text-base font-black uppercase italic leading-tight tracking-tighter text-black sm:text-lg md:mb-1 md:text-2xl">
                          {isRTL ? "اكتشف المجموعة" : "EXPLORE ALL"}
                        </h3>
                        <p className="hidden text-[9px] font-black uppercase tracking-widest text-black/65 sm:block sm:text-[10px]">
                          {catalogActiveCount}+ {isRTL ? "منتجات" : "PRODUCTS"}
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 mt-5 inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-black px-5 font-black uppercase tracking-widest text-[10px] text-white shadow-xl transition-colors group-hover:bg-black/80 sm:mt-6 sm:h-10 sm:rounded-xl sm:px-7 sm:text-xs md:mt-0 md:h-12 md:px-8">
                      {t.shopNow || "Shop Now"}
                    </div>
                  </Link>
                </motion.div>
              </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
