"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function HeroSlider({ banners }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const reduceMotion = useReducedMotion();

  const next = useCallback(
    () => setCurrent((prev) => (prev + 1) % banners.length),
    [banners.length]
  );
  const prev = useCallback(
    () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length),
    [banners.length]
  );

  useEffect(() => {
    if (!banners || banners.length <= 1 || isPaused) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [banners, isPaused, next]);

  const fadeDuration = reduceMotion ? 0 : 0.6;

  if (!banners || banners.length === 0) {
    return (
      <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-background md:min-h-[520px]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-background to-orange-600/10" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Zap className="mx-auto mb-6 h-16 w-16 animate-pulse text-amber-500" />
          <h1 className="mb-6 text-4xl font-black uppercase tracking-tighter text-foreground italic md:text-6xl">
            {t.heroTitle1}{" "}
            <span className="text-amber-600 dark:text-amber-500">{t.heroTitle2}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">{t.heroDesc}</p>
          <Link href="/products">
            <Button className="h-14 rounded-2xl bg-amber-500 px-10 text-lg font-black text-black shadow-xl shadow-amber-500/20 hover:bg-amber-600">
              {t.browseProducts}
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  const slide = banners[current];
  const title = lang === "ar" ? slide.titleAr : slide.titleEn;
  const subtitle = lang === "ar" ? slide.subtitleAr : slide.subtitleEn;
  const cta = lang === "ar" ? slide.ctaTextAr : slide.ctaTextEn;

  return (
    <section
      className="relative w-full overflow-hidden bg-neutral-950 text-white"
      style={{ height: "clamp(420px, 72vh, 780px)" }}
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
      aria-label={isRTL ? "سلايدر العروض الرئيسية" : "Main hero slider"}
      aria-roledescription="carousel"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
          className="absolute inset-0"
          role="group"
          aria-roledescription="slide"
          aria-label={`${current + 1} / ${banners.length}`}
        >
          {/* Image */}
          <Image
            src={slide.image}
            alt={title}
            fill
            priority={current < 2}
            quality={90}
            sizes="100vw"
            className="object-cover object-center"
          />

          {/* Overlays — lighter so the photo remains visible */}
          <div className="absolute inset-0 z-[11] bg-black/30" aria-hidden />
          <div
            className="absolute inset-0 z-[11] bg-gradient-to-t from-black/80 via-black/30 to-transparent"
            aria-hidden
          />
          <div
            className={cn(
              "absolute inset-0 z-[11]",
              isRTL
                ? "bg-gradient-to-l from-black/80 via-black/35 to-transparent"
                : "bg-gradient-to-r from-black/80 via-black/35 to-transparent"
            )}
            aria-hidden
          />

          {/* Content */}
          <div className="relative z-20 flex h-full max-w-7xl mx-auto flex-col justify-end px-4 pb-24 sm:justify-center sm:px-6 sm:pb-0 lg:px-8">
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.15, duration: reduceMotion ? 0 : 0.4 }}
              className={cn(
                "max-w-xl space-y-5",
                isRTL ? "mr-0 ml-auto text-right" : "ml-0 mr-auto text-left"
              )}
            >
              <span
                className="inline-block rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300"
              >
                {subtitle}
              </span>

              <h1
                className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
                style={{
                  textShadow: "0 2px 16px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)",
                }}
              >
                {title}
              </h1>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link href={slide.ctaLink}>
                  <Button className="h-12 rounded-xl bg-amber-500 px-8 text-base font-black text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-[0.97] md:h-14 md:px-10 md:text-lg">
                    {cta}
                  </Button>
                </Link>
                <Link href="/products">
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl border-white/25 bg-white/10 px-8 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 md:h-14 md:px-10 md:text-lg"
                  >
                    {t.browseProducts}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      {banners.length > 1 && (
        <>
          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2 sm:bottom-8 sm:gap-2.5">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`${isRTL ? "الشريحة" : "Slide"} ${index + 1}`}
                aria-current={current === index ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  current === index
                    ? "w-9 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                    : "w-2 bg-white/45 hover:bg-white/75"
                )}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <button
            type="button"
            onClick={prev}
            aria-label={isRTL ? "الشريحة السابقة" : "Previous slide"}
            className={cn(
              "absolute top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2.5 text-white/80 shadow-lg backdrop-blur transition-all hover:bg-black/55 hover:text-white sm:p-3",
              isRTL ? "right-2.5 sm:right-4" : "left-2.5 sm:left-4"
            )}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={isRTL ? "الشريحة التالية" : "Next slide"}
            className={cn(
              "absolute top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2.5 text-white/80 shadow-lg backdrop-blur transition-all hover:bg-black/55 hover:text-white sm:p-3",
              isRTL ? "left-2.5 sm:left-4" : "right-2.5 sm:right-4"
            )}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}
    </section>
  );
}
