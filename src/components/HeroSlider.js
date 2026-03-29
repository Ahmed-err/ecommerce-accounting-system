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

  /* ── Empty / fallback state ─────────────────────────────────────────── */
  if (!banners || banners.length === 0) {
    return (
      <section className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-background sm:min-h-[460px] md:min-h-[540px]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-background to-orange-600/10" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Zap className="mx-auto mb-5 h-12 w-12 animate-pulse text-amber-500 sm:h-16 sm:w-16" />
          <h1 className="mb-5 text-3xl font-black uppercase tracking-tighter text-foreground italic sm:text-4xl md:text-6xl">
            {t.heroTitle1}{" "}
            <span className="text-amber-600 dark:text-amber-500">{t.heroTitle2}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t.heroDesc}
          </p>
          <Link href="/products">
            <Button className="h-12 rounded-2xl bg-amber-500 px-8 text-base font-black text-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 sm:h-14 sm:px-10 sm:text-lg">
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
      /* clamp: 360px (small phone) → 70vh → 760px max */
      style={{ height: "clamp(360px, 70vh, 760px)" }}
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
          aria-label={title}
        >
          {/* Background image */}
          <Image
            src={slide.image}
            alt={title}
            fill
            priority={current < 2}
            quality={90}
            sizes="100vw"
            className="object-cover object-center"
          />

          {/* Scrim layers — bottom heavy for text legibility */}
          <div className="absolute inset-0 z-[11] bg-black/30" aria-hidden />
          <div
            className="absolute inset-0 z-[11] bg-gradient-to-t from-black/85 via-black/30 to-transparent"
            aria-hidden
          />
          <div
            className={cn(
              "absolute inset-0 z-[11]",
              isRTL
                ? "bg-gradient-to-l from-black/75 via-black/30 to-transparent"
                : "bg-gradient-to-r from-black/75 via-black/30 to-transparent"
            )}
            aria-hidden
          />

          {/* Content */}
          <div
            className={cn(
              "relative z-20 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-28",
              "sm:justify-center sm:px-6 sm:pb-0 lg:px-8",
              banners.length > 1 && "max-sm:pb-32"
            )}
          >
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.15, duration: reduceMotion ? 0 : 0.4 }}
              className={cn(
                "w-full max-w-xs space-y-3 sm:max-w-md md:max-w-xl sm:space-y-4 md:space-y-5",
                isRTL ? "mr-auto ml-0 text-right" : "ml-auto mr-0 text-left",
                /* On small screens centre the block */
                "mx-auto sm:mx-0"
              )}
            >
              {/* Subtitle pill */}
              <span className="inline-block rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 sm:px-4 sm:py-1.5 sm:text-xs">
                {subtitle}
              </span>

              {/* Title */}
              <h1
                className="text-2xl font-black leading-[1.1] tracking-tight text-white xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}
              >
                {title}
              </h1>

              {/* CTAs */}
              <div className="flex flex-wrap gap-2 pt-1 sm:gap-3">
                <Link href={slide.ctaLink}>
                  <Button className="h-10 rounded-xl bg-amber-500 px-5 text-sm font-black text-black shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-[0.97] sm:h-12 sm:px-8 sm:text-base md:h-14 md:px-10 md:text-lg">
                    {cta}
                  </Button>
                </Link>
                <Link href="/products">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:h-12 sm:px-8 sm:text-base md:h-14 md:px-10 md:text-lg"
                  >
                    {t.browseProducts}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      {banners.length > 1 && (
        <>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-1.5 sm:bottom-6 sm:gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`${isRTL ? "الشريحة" : "Slide"} ${index + 1}`}
                aria-current={current === index ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 sm:h-2",
                  current === index
                    ? "w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] sm:w-9"
                    : "w-1.5 bg-white/40 hover:bg-white/70 sm:w-2"
                )}
              />
            ))}
          </div>

          {/* Prev */}
          <button
            type="button"
            onClick={prev}
            aria-label={isRTL ? "الشريحة السابقة" : "Previous slide"}
            className={cn(
              "absolute top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2 text-white/80 shadow-lg backdrop-blur transition-all hover:bg-black/55 hover:text-white sm:p-3",
              isRTL ? "right-2 sm:right-4" : "left-2 sm:left-4"
            )}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={next}
            aria-label={isRTL ? "الشريحة التالية" : "Next slide"}
            className={cn(
              "absolute top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2 text-white/80 shadow-lg backdrop-blur transition-all hover:bg-black/55 hover:text-white sm:p-3",
              isRTL ? "left-2 sm:left-4" : "right-2 sm:right-4"
            )}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>
        </>
      )}
    </section>
  );
}
