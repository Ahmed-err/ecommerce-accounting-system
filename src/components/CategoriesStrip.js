"use client";

import Link from "next/link";
import ProductImage from "@/components/media/ProductImage";
import Tilt3D from "@/components/motion/Tilt3D";
import { useLanguage, useT } from "@/context/LanguageContext";
import { translateCategory } from "@/lib/i18n/translate-category";

// Top categories with a real product photo as the cover (P2.1).
export default function CategoriesStrip({ categories }) {
  const { isRTL } = useLanguage();
  const t = useT();
  if (!categories?.length) return null;

  return (
    <section id="categories" className="scroll-mt-20 py-12 sm:py-16" dir={isRTL ? "rtl" : "ltr"} aria-labelledby="home-categories">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 id="home-categories" className="type-h2 text-foreground">
            {t.shopByCategory}
          </h2>
          <Link href="/products" className="shrink-0 text-sm font-semibold text-accent-text hover:underline">
            {t.viewAll}
          </Link>
        </div>
        <ul className="reveal-stagger mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {categories.map((cat) => {
            const label = translateCategory(cat.name, t, cat.nameAr);
            return (
              <li key={cat.id}>
                <Tilt3D className="h-full rounded-2xl">
                  <Link
                    href={`/products?category=${encodeURIComponent(cat.id)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-amber-500/60"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden border-b border-border">
                      <ProductImage
                        src={cat.cover}
                        alt=""
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="p-4 transition-transform duration-500 group-hover:scale-105"
                        padded={false}
                      />
                      <span className="tilt3d-shine pointer-events-none absolute inset-0" aria-hidden="true" />
                    </span>
                    <span className="tilt3d-pop flex flex-1 items-center justify-between gap-2 px-4 py-3">
                      <span className="font-bold text-foreground group-hover:text-accent-text">{label}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {t.homeBrandProducts.replace("{count}", cat.productCount)}
                      </span>
                    </span>
                  </Link>
                </Tilt3D>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
