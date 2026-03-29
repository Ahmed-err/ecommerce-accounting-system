"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Zap, Shield, Cpu, Activity, Lightbulb, Battery, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BrandsMarquee() {
  const { lang, isRTL } = useLanguage();
  const trustedBy =
    lang === "ar"
      ? "شركاء موثوقون وعلامات تجارية رائدة"
      : "Trusted by industry leaders and premium brands";

  const brands = [
    { name: "GlobalElectric", icon: Zap },
    { name: "PowerPro", icon: Battery },
    { name: "LumiSmart", icon: Lightbulb },
    { name: "SafeWire", icon: Shield },
    { name: "TechVolt", icon: Cpu },
    { name: "EcoEnergy", icon: Activity },
    { name: "MegaConnect", icon: Power },
  ];

  /* Four copies for a seamless 50% translate loop */
  const marqueeItems = [...brands, ...brands, ...brands, ...brands];

  return (
    <section className="py-10 bg-background border-y border-foreground/5 overflow-hidden sm:py-14 lg:py-16">
      {/* Label */}
      <p className="mb-7 px-4 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.28em] sm:mb-9 sm:text-xs">
        {trustedBy}
      </p>

      {/* Marquee */}
      <div className="relative flex overflow-x-hidden group">
        {/* Fade edges */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 z-10 w-16 from-background to-transparent sm:w-28 lg:w-36",
            isRTL ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 z-10 w-16 from-background to-transparent sm:w-28 lg:w-36",
            isRTL ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
          )}
        />

        <div
          className={cn(
            "flex items-center gap-8 sm:gap-16 lg:gap-24 w-max pr-8 sm:pr-16 lg:pr-24",
            isRTL
              ? "animate-[marquee-rtl_38s_linear_infinite]"
              : "animate-[marquee_38s_linear_infinite]",
            "group-hover:[animation-play-state:paused]"
          )}
        >
          {marqueeItems.map((brand, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 sm:gap-3.5 text-foreground/20 hover:text-amber-500 transition-colors duration-500 grayscale hover:grayscale-0 shrink-0"
            >
              <brand.icon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 shrink-0" />
              <span className="text-lg font-black tracking-tighter italic whitespace-nowrap sm:text-2xl lg:text-3xl">
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
