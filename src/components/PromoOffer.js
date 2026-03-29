"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PromoOffer({ offer }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    if (!offer?.expiresAt) return;
    const tick = () => {
      const distance = new Date(offer.expiresAt) - new Date();
      if (distance < 0) { setTimeLeft({}); return; }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offer?.expiresAt]);

  if (!offer) return null;

  const offerTitle  = lang === "ar" ? offer.titleAr    : offer.titleEn;
  const offerSub    = lang === "ar" ? offer.subtitleAr  : offer.subtitleEn;
  const offerCta    = lang === "ar" ? offer.ctaTextAr   : offer.ctaTextEn;
  const showTimer   = offer.expiresAt && timeLeft.seconds !== undefined;

  return (
    <section className="relative overflow-hidden bg-card text-foreground border-y border-foreground/5 py-14 sm:py-20 lg:py-28">
      {/* Decorative glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          className={cn(
            "grid grid-cols-1 gap-10 items-center lg:grid-cols-2 lg:gap-16",
            isRTL && "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1"
          )}
        >
          {/* ── Text side ─────────────────────────────────────────────── */}
          <div className={cn("space-y-6 sm:space-y-8", isRTL ? "text-right" : "text-left")}>
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest animate-pulse sm:px-4 sm:text-xs">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t.limitedOffer}
            </span>

            {/* Title */}
            <h2 className="text-3xl font-black text-foreground leading-[1.08] tracking-tighter uppercase italic sm:text-4xl md:text-5xl lg:text-6xl">
              {offerTitle}
              <br />
              <span className="text-amber-500">{offerSub}</span>
            </h2>

            {/* Countdown */}
            {showTimer && (
              <div className={cn("flex gap-2 sm:gap-4 flex-wrap", isRTL && "justify-end")}>
                {[
                  { label: t.days,    value: timeLeft.days },
                  { label: t.hours,   value: timeLeft.hours },
                  { label: t.minutes, value: timeLeft.minutes },
                  { label: t.seconds, value: timeLeft.seconds },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-foreground/5 backdrop-blur border border-foreground/10 p-3 rounded-xl text-center min-w-[64px] shadow-premium sm:p-5 sm:rounded-2xl sm:min-w-[88px] md:min-w-[100px]"
                  >
                    <div className="text-xl font-black text-amber-500 tabular-nums leading-none mb-0.5 sm:text-3xl md:text-4xl">
                      {String(value).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className={cn("flex flex-wrap gap-3", isRTL && "justify-end")}>
              <Link href={offer.ctaLink}>
                <Button className="h-12 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-base shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 group uppercase italic sm:h-14 sm:px-12 sm:text-lg">
                  {offerCta}
                  <ArrowRight
                    className={cn(
                      "ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5",
                      isRTL && "rotate-180 ml-0 mr-2 group-hover:-translate-x-1 group-hover:translate-x-0"
                    )}
                  />
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Image side ────────────────────────────────────────────── */}
          <div className="relative h-56 rounded-2xl overflow-hidden border border-foreground/10 shadow-xl shadow-amber-500/10 group sm:h-80 md:h-96 lg:h-[480px] xl:h-[540px]">
            <Image
              src={offer.image}
              alt={offerTitle}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
