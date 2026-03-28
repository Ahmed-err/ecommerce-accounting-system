"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Truck, ShieldCheck, Lock, Headphones } from "lucide-react";

export default function TrustBadges() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const badges = [
    { icon: Truck, title: t.freeShipping, desc: isRTL ? "على جميع الطلبات فوق 50,000" : "On all orders over 50k" },
    { icon: ShieldCheck, title: t.warranty, desc: isRTL ? "ضمان استبدال لمدة عام" : "1 Year replacement warranty" },
    { icon: Lock, title: t.securePayment, desc: isRTL ? "دفع آمن بنسبة 100%" : "100% Secure payments" },
    { icon: Headphones, title: isRTL ? "دعم 24/7" : "24/7 Support", desc: isRTL ? "متواجدون دائماً لمساعدتك" : "Always here to help you" },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {badges.map((badge, i) => (
            <div key={i} className="flex items-center gap-6 p-8 rounded-3xl bg-card border border-foreground/5 hover:border-amber-500/50 transition-all duration-300 group shadow-premium hover:shadow-2xl">
              <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center text-black shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                <badge.icon className="h-7 w-7" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-1">{badge.title}</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
