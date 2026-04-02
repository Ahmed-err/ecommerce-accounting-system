"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import { useReducedMotion } from "framer-motion";

function BrandChip({ name }) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded-2xl border border-border/70 bg-card/90 px-5 py-3 shadow-sm backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/45 hover:bg-card hover:shadow-md",
        "dark:border-white/10 dark:bg-card/40 dark:hover:border-amber-500/35"
      )}
    >
      <span className="whitespace-nowrap text-base font-black italic tracking-tight text-muted-foreground transition-colors duration-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 sm:text-lg lg:text-xl">
        {name}
      </span>
    </div>
  );
}

export default function BrandsMarquee() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const reduceMotion = useReducedMotion();

  const brands = [
    { name: "GlobalElectric" },
    { name: "PowerPro" },
    { name: "LumiSmart" },
    { name: "SafeWire" },
    { name: "TechVolt" },
    { name: "EcoEnergy" },
    { name: "MegaConnect" },
  ];

  const marqueeItems = [...brands, ...brands, ...brands, ...brands];

  return (
    <section
      className="relative overflow-hidden border-y border-foreground/5 bg-gradient-to-b from-muted/35 via-background to-muted/25 py-8 sm:py-12 lg:py-14"
      dir={isRTL ? "rtl" : "ltr"}
      aria-label={lang === "ar" ? "شعارات الشركاء" : "Partner brands"}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10 lg:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 sm:text-[11px] sm:tracking-[0.24em]">
            <Award className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
            <span>{t.brandsMarqueeEyebrow}</span>
          </div>
          <h2 className="text-balance text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {t.brandsMarqueeTitle}
          </h2>
          <p className="mt-3 text-pretty text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            {t.brandsMarqueeDesc}
          </p>
        </header>
      </div>

      {reduceMotion ? (
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 pb-2 sm:gap-4 sm:px-6 lg:gap-5 lg:px-8">
          {brands.map((brand) => (
            <BrandChip key={brand.name} name={brand.name} />
          ))}
        </div>
      ) : (
        <div className="relative flex overflow-x-hidden group">
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 z-10 w-20 from-background via-background/95 to-transparent sm:w-32 lg:w-44",
              isRTL ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 z-10 w-20 from-background via-background/95 to-transparent sm:w-32 lg:w-44",
              isRTL ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
            )}
            aria-hidden
          />

          <div
            className={cn(
              "flex w-max items-center gap-4 pr-4 sm:gap-6 sm:pr-8 lg:gap-8 lg:pr-12",
              isRTL
                ? "animate-[marquee-rtl_40s_linear_infinite]"
                : "animate-[marquee_40s_linear_infinite]",
              "group-hover:[animation-play-state:paused]"
            )}
          >
            {marqueeItems.map((brand, idx) => (
              <BrandChip key={`${brand.name}-${idx}`} name={brand.name} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
