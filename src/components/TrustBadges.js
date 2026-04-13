"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Truck, ShieldCheck, Lock, Headphones } from "lucide-react";

export default function TrustBadges() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const badges = [
    {
      icon: Truck,
      title: t.freeShipping,
      desc: t.freeShippingBadgeDesc || (isRTL ? "على الطلبات المؤهلة" : "On eligible orders"),
    },
    {
      icon: ShieldCheck,
      title: t.warranty,
      desc: isRTL ? "ضمان استبدال لمدة عام" : "1-year replacement warranty",
    },
    {
      icon: Lock,
      title: t.securePayment,
      desc: isRTL ? "دفع آمن بنسبة 100%" : "100% secure payments",
    },
    {
      icon: Headphones,
      title: isRTL ? "دعم 24/7" : "24/7 Support",
      desc: isRTL ? "متواجدون دائماً لمساعدتك" : "Always here to help you",
    },
  ];

  return (
    <section className="py-8 bg-background sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6 xl:gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-2xl bg-card border border-foreground/5 hover:border-amber-500/50 transition-all duration-300 group shadow-premium hover:shadow-xl sm:gap-3 sm:p-4 lg:p-5 xl:p-6 xl:rounded-3xl ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500 flex items-center justify-center text-black group-hover:scale-110 transition-transform shadow-md shadow-amber-500/20 sm:h-12 sm:w-12 sm:rounded-2xl lg:h-14 lg:w-14">
                <badge.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <h3 className="text-[11px] font-black uppercase tracking-wider text-foreground leading-tight sm:text-xs lg:tracking-widest">
                  {badge.title}
                </h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-tight hidden sm:block">
                  {badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
