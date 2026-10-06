"use client";

import Link from "next/link";
import { useLanguage, useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

// Real brands from the catalog (Product.brand), each linking to its products.
function BrandChip({ brand, t, hidden }) {
  return (
    <Link
      href={`/products?search=${encodeURIComponent(brand.name)}`}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className="group flex shrink-0 items-baseline gap-2 rounded-xl border border-border bg-card px-5 py-3 transition-colors hover:border-amber-500/60"
    >
      <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-foreground group-hover:text-accent-text" dir="ltr">
        {brand.name}
      </span>
      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
        {t.homeBrandProducts.replace("{count}", brand.count)}
      </span>
    </Link>
  );
}

export default function BrandsMarquee({ brands = [] }) {
  const { isRTL } = useLanguage();
  const t = useT();
  if (brands.length < 3) return null;

  return (
    <section className="reveal border-b border-border py-10 sm:py-12" dir={isRTL ? "rtl" : "ltr"} aria-labelledby="home-brands">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="home-brands" className="type-h2 text-foreground">
          {t.homeBrandsTitle}
        </h2>
      </div>
      {/* Static, wrapping list when motion is reduced; scrolling strip otherwise. */}
      <ul className="mx-auto mt-6 hidden max-w-7xl flex-wrap gap-3 px-4 motion-reduce:flex sm:px-6 lg:px-8">
        {brands.map((b) => (
          <li key={b.name}>
            <BrandChip brand={b} t={t} />
          </li>
        ))}
      </ul>
      <div className="group relative mt-6 flex overflow-hidden motion-reduce:hidden">
        <div
          className={cn(
            "flex w-max gap-3 pe-3 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            isRTL ? "animate-[marquee-rtl_50s_linear_infinite]" : "animate-[marquee_50s_linear_infinite]"
          )}
        >
          {[0, 1].map((copy) =>
            brands.map((b) => <BrandChip key={`${copy}-${b.name}`} brand={b} t={t} hidden={copy === 1} />)
          )}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-background to-transparent rtl:bg-gradient-to-l" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-background to-transparent rtl:bg-gradient-to-r" />
      </div>
    </section>
  );
}
