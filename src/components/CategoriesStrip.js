"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function CategoriesStrip({ categories }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const scrollRef = useRef(null);

  if (!categories || categories.length === 0) return null;

  /* Drag-to-scroll on desktop */
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    let isDown = true;
    const startX = e.pageX - slider.offsetLeft;
    const scrollLeft = slider.scrollLeft;

    const move = (ev) => {
      if (!isDown) return;
      ev.preventDefault();
      const x = ev.pageX - slider.offsetLeft;
      slider.scrollLeft = scrollLeft - (x - startX) * 1.5;
    };
    const up = () => {
      isDown = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <section className="py-10 bg-background border-y border-foreground/5 sm:py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={cn("flex items-center justify-between mb-6 sm:mb-8", isRTL && "flex-row-reverse")}>
          <h2
            className={cn(
              "text-lg font-black uppercase tracking-tighter text-foreground underline underline-offset-8 decoration-amber-500 sm:text-2xl",
              isRTL && "text-right"
            )}
          >
            {t.shopByCategory}
          </h2>
          <Link
            href="/products"
            className="shrink-0 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-wide sm:text-sm"
          >
            {isRTL ? "← عرض الكل" : "View All →"}
          </Link>
        </div>

        {/* Scrollable strip */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide select-none cursor-grab active:cursor-grabbing snap-x snap-mandatory sm:gap-4 sm:pb-6"
          aria-label={isRTL ? "أقسام المنتجات" : "Product categories"}
          onMouseDown={handleMouseDown}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.name}`}
              draggable={false}
              className="flex-shrink-0 snap-start group flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-foreground/5 hover:border-amber-500/50 transition-all duration-500 transform hover:-translate-y-2 shadow-premium hover:shadow-xl active:scale-95 w-28 sm:w-36 md:w-44 lg:w-48 sm:gap-4 sm:p-5 sm:rounded-3xl lg:p-6 lg:rounded-[2rem]"
              aria-label={`${isRTL ? "تصفح فئة" : "Browse category"} ${translateCategory(cat.name, t)}`}
            >
              {/* Image wrapper */}
              <div className="relative h-16 w-16 rounded-xl flex items-center justify-center bg-muted/50 overflow-hidden group-hover:scale-110 group-hover:bg-amber-500/10 transition-all duration-500 sm:h-20 sm:w-20 sm:rounded-2xl lg:h-24 lg:w-24">
                <Image
                  src={cat.image || "/placeholder.png"}
                  alt={cat.name}
                  width={96}
                  height={96}
                  draggable={false}
                  className="object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all duration-500 sm:rounded-xl"
                />
              </div>

              {/* Name */}
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-amber-500 transition-colors truncate w-full text-center sm:text-[10px] sm:tracking-[0.22em] lg:text-[11px] lg:tracking-[0.25em]">
                {translateCategory(cat.name, t)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
