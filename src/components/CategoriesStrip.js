"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export default function CategoriesStrip({ categories }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const scrollRef = useRef(null);

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-12 bg-background border-y border-foreground/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground decoration-amber-500 underline underline-offset-8">
                {t.shopByCategory}
            </h2>
            <Link href="/products" className="text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase">
                {isRTL ? "عرض الكل ←" : "View All →"}
            </Link>
        </div>

        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide select-none cursor-grab active:cursor-grabbing snap-x snap-mandatory"
          aria-label={isRTL ? "أقسام المنتجات" : "Product categories"}
          onMouseDown={(e) => {
            const slider = scrollRef.current;
            let isDown = true;
            let startX = e.pageX - slider.offsetLeft;
            let scrollLeft = slider.scrollLeft;

            const move = (e) => {
               if (!isDown) return;
               e.preventDefault();
               const x = e.pageX - slider.offsetLeft;
               const walk = (x - startX) * 2;
               slider.scrollLeft = scrollLeft - walk;
            }

            const up = () => {
                isDown = false;
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
            }

            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
          }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.name}`}
              className="flex-shrink-0 snap-start group w-48 flex flex-col items-center gap-6 p-8 rounded-[3rem] bg-card border border-foreground/5 hover:border-amber-500/50 transition-all duration-500 transform hover:-translate-y-3 shadow-premium hover:shadow-2xl active:scale-95"
              aria-label={`${isRTL ? "تصفح فئة" : "Browse category"} ${translateCategory(cat.name, t)}`}
            >
              <div className="relative h-24 w-24 bg-muted/50 rounded-2xl flex items-center justify-center p-4 group-hover:scale-110 group-hover:bg-amber-500/10 transition-all duration-500 overflow-hidden shadow-inner">
                <Image
                  src={cat.image || "/placeholder.png"}
                  alt={cat.name}
                  width={96}
                  height={96}
                  draggable={false}
                  className="object-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground group-hover:text-amber-500 transition-colors truncate w-full text-center">
                {translateCategory(cat.name, t)}
              </p>
            </Link>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
