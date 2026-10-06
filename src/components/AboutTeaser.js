"use client";

import Link from "next/link";
import { useLanguage, useT } from "@/context/LanguageContext";

export default function AboutTeaser() {
  const { lang, isRTL } = useLanguage();
  const t = useT();

  return (
    <section className="py-10 bg-muted dark:bg-neutral-950/60 border-y border-border sm:py-14 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="reveal grid grid-cols-1 gap-10 items-start lg:grid-cols-2 lg:gap-14"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* ── Left column: text ─────────────────────────────────────── */}
          <div className="space-y-5 sm:space-y-6">
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
              <p className="text-accent-text dark:text-amber-500 font-bold text-sm sm:text-base">
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
                    className="text-muted-foreground marker:text-accent-text"
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

          {/* ── Right column: where to find the shop (stock solar photos removed, P2.1) ── */}
          <div className="space-y-4 sm:space-y-6">
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
