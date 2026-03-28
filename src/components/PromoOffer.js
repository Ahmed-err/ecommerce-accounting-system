"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { ArrowRight, Clock } from "lucide-react";

export default function PromoOffer({ offer }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    if (!offer?.expiresAt) return;

    const timer = setInterval(() => {
      const distance = new Date(offer.expiresAt) - new Date();
      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({});
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offer?.expiresAt]);

  if (!offer) return null;

  return (
    <section className="py-20 lg:py-32 overflow-hidden relative bg-card text-foreground border-y border-foreground/5 shadow-premium">
      <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-tr from-amber-500/10 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className={`space-y-8 ${isRTL ? 'lg:order-2 text-right' : 'text-left'}`}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-widest animate-pulse hover:scale-105 transition-transform">
                   <Clock className="h-3 w-3" />
                   {t.limitedOffer}
                </div>
                
                <h2 className="text-4xl md:text-6xl font-black text-foreground leading-[1.1] tracking-tighter uppercase italic">
                    {lang === "ar" ? offer.titleAr : offer.titleEn}<br />
                    <span className="text-amber-500">{lang === "ar" ? offer.subtitleAr : offer.subtitleEn}</span>
                </h2>

                {offer.expiresAt && timeLeft.seconds !== undefined && (
                   <div className={`flex gap-3 md:gap-6 ${isRTL && 'justify-end'}`}>
                      {[
                        { label: t.days, value: timeLeft.days },
                        { label: t.hours, value: timeLeft.hours },
                        { label: t.minutes, value: timeLeft.minutes },
                        { label: t.seconds, value: timeLeft.seconds }
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-foreground/5 backdrop-blur-md border border-foreground/10 p-4 md:p-6 rounded-2xl min-w-[80px] md:min-w-[100px] text-center shadow-premium">
                      <div className="text-2xl md:text-4xl font-black text-amber-500 tabular-nums leading-none mb-1">
                        {String(value).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </div>
                    </div>
                      ))}
                   </div>
                )}

                <div className={`flex flex-wrap gap-4 ${isRTL && 'justify-end'}`}>
                   <Link href={offer.ctaLink}>
                      <Button className="h-16 px-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-lg shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 group uppercase italic border border-amber-400/30">
                         {lang === "ar" ? offer.ctaTextAr : offer.ctaTextEn}
                         <ArrowRight className={`ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 ${isRTL && 'rotate-180 group-hover:-translate-x-1'}`} />
                      </Button>
                   </Link>
                </div>
            </div>

            <div className={`relative h-[400px] md:h-[600px] rounded-3xl overflow-hidden group border border-white/10 shadow-3xl shadow-amber-500/10 ${isRTL ? 'lg:order-1' : ''}`}>
                <Image
                  src={offer.image}
                  alt={offer.titleEn}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

        </div>
      </div>
    </section>
  );
}
