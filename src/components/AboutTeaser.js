"use client";

import Link from "next/link";
import Image from "next/image";
import { translations } from "@/lib/translations";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutTeaser() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;

  return (
    <section className="py-14 bg-muted dark:bg-neutral-950/60 border-y border-border sm:py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="grid grid-cols-1 gap-10 items-start lg:grid-cols-3 lg:gap-14"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* ── Left column: text ─────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5 sm:space-y-6">
            <h2
              className={`text-2xl font-black uppercase tracking-tighter italic text-foreground sm:text-3xl lg:text-4xl ${
                isRTL ? "text-right" : "text-left"
              }`}
            >
              {t.aboutTitle}
            </h2>

            <p
              className={`text-muted-foreground text-sm leading-relaxed sm:text-base ${
                isRTL ? "text-right" : "text-left"
              }`}
            >
              {t.aboutIntro}
            </p>

            <div className="bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 rounded-2xl p-5 space-y-2 sm:p-6">
              <p className="text-amber-600 dark:text-amber-500 font-bold text-sm sm:text-base">
                {t.sudanTouch}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t.sudanTouchDesc}</p>
            </div>

            <div className="space-y-2">
              <p className="text-foreground font-bold text-sm sm:text-base">{t.servicesTitle}</p>
              <ul
                className={`space-y-2 text-xs leading-relaxed sm:text-sm ${isRTL ? "list-inside list-disc text-right" : "list-inside list-disc text-left"}`}
                dir={isRTL ? "rtl" : "ltr"}
              >
                {t.services.slice(0, 3).map((s, idx) => (
                  <li
                    key={idx}
                    className="text-muted-foreground marker:text-amber-500"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all text-sm sm:px-6 sm:text-base"
              >
                {t.aboutTitle}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-5 py-3 bg-foreground/5 border border-border hover:bg-foreground/10 text-foreground font-bold rounded-xl transition-all text-sm sm:px-6 sm:text-base"
              >
                {t.contactSales}
              </Link>
            </div>
          </div>

          {/* ── Right column: images ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Main large image */}
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <Image
                src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1400&q=80"
                alt={isRTL ? "ألواح طاقة شمسية" : "Solar panels"}
                width={1200}
                height={700}
                className="w-full h-48 object-cover sm:h-64 md:h-72 lg:h-[300px] xl:h-[340px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <h3 className="text-white text-base font-bold sm:text-xl">{t.solarPanelTitle}</h3>
                <p className="text-gray-200 text-xs mt-1 sm:text-sm">{t.solarPanelDesc}</p>
              </div>
            </div>

            {/* Two smaller images */}
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="relative rounded-xl overflow-hidden border border-border sm:rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=900&q=80"
                  alt={isRTL ? "أدوات كهربائية" : "Electrical tools"}
                  width={900}
                  height={600}
                  className="w-full h-36 object-cover sm:h-44 md:h-52"
                />
              </div>
              <div className="relative rounded-xl overflow-hidden border border-border sm:rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80"
                  alt={isRTL ? "كابلات وأسلاك" : "Cables and wires"}
                  width={900}
                  height={600}
                  className="w-full h-36 object-cover sm:h-44 md:h-52"
                />
              </div>
            </div>

            {/* Location card */}
            <div className="bg-card border border-border rounded-xl p-4 sm:rounded-2xl sm:p-6">
              <p className="text-foreground font-bold text-sm sm:text-base">{t.locationTitle}</p>
              <p className="text-muted-foreground text-xs mt-2 leading-relaxed sm:text-sm">
                {t.locationLine1}
                <br />
                {t.locationLine2}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
