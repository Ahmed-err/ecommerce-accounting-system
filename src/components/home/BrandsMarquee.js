"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Zap, Shield, Cpu, Activity, Lightbulb, Battery, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BrandsMarquee() {
  const { lang, isRTL } = useLanguage();
  const trustedBy = lang === 'ar' ? "شركاء موثوقون وعلامات تجارية رائدة" : "Trusted by industry leaders and premium brands";

  const brands = [
    { name: "GlobalElectric", icon: Zap },
    { name: "PowerPro", icon: Battery },
    { name: "LumiSmart", icon: Lightbulb },
    { name: "SafeWire", icon: Shield },
    { name: "TechVolt", icon: Cpu },
    { name: "EcoEnergy", icon: Activity },
    { name: "MegaConnect", icon: Power },
  ];

  // Provide exactly 4 sets so translating 50% moves exactly 2 sets for a seamless infinite loop
  const marqueeItems = [...brands, ...brands, ...brands, ...brands];

  return (
    <section className="py-16 bg-background border-y border-foreground/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">{trustedBy}</p>
      </div>
      
      <div className="relative flex overflow-x-hidden group">
        {/* Fading Edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className={cn(
          "flex items-center space-x-12 sm:space-x-24 rtl:space-x-reverse w-max pr-12 sm:pr-24",
          isRTL ? "animate-[marquee-rtl_40s_linear_infinite]" : "animate-[marquee_40s_linear_infinite]",
          "group-hover:[animation-play-state:paused]"
        )}>
          {marqueeItems.map((brand, idx) => (
            <div key={idx} className="flex items-center gap-4 text-foreground/20 hover:text-amber-500 transition-colors duration-500 grayscale hover:grayscale-0">
              <brand.icon className="h-10 w-10 sm:h-12 sm:w-12" />
              <span className="text-2xl sm:text-4xl font-black tracking-tighter italic whitespace-nowrap">{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
