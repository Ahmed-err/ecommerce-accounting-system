"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

function GridPattern({ className }) {
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full text-amber-500/10", className)} aria-hidden>
      <defs>
        <pattern id="about-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="6" cy="6" r="1.2" fill="currentColor" opacity="0.35" />
          <path d="M36 12 L42 18 L36 24" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#about-grid)" />
    </svg>
  );
}

function StatCounter({ value, label, isRTL }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = Math.max(0, Math.floor(Number(value) || 0));
    const dur = 1100;
    let start;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.floor(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div ref={ref} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{n.toLocaleString(isRTL ? "ar-SD" : "en-US")}</p>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

const STAGGER = { visible: { transition: { staggerChildren: 0.08 } } };
const FADE_UP = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } };

export default function AboutPageClient({ store, stats, features, team }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const fallbackFromTranslations = [
    { id: "fb1", iconKey: "Package", titleKey: "aboutFeatQualityTitle", descKey: "aboutFeatQualityDesc" },
    { id: "fb2", iconKey: "Users", titleKey: "aboutFeatExpertTitle", descKey: "aboutFeatExpertDesc" },
    { id: "fb3", iconKey: "Truck", titleKey: "aboutFeatDeliveryTitle", descKey: "aboutFeatDeliveryDesc" },
    { id: "fb4", iconKey: "Headphones", titleKey: "aboutFeatSupportTitle", descKey: "aboutFeatSupportDesc" },
  ];

  const name = lang === "ar" ? store.nameAr || store.nameEn : store.nameEn || store.nameAr;
  const slogan = lang === "ar" ? store.sloganAr || store.sloganEn : store.sloganEn || store.sloganAr;
  const story = lang === "ar" ? store.aboutStoryAr || store.aboutStoryEn : store.aboutStoryEn || store.aboutStoryAr;
  const mission = lang === "ar" ? store.aboutMissionAr || store.aboutMissionEn : store.aboutMissionEn || store.aboutMissionAr;
  const vision = lang === "ar" ? store.aboutVisionAr || store.aboutVisionEn : store.aboutVisionEn || store.aboutVisionAr;
  const address = lang === "ar" ? store.addressAr || store.addressEn : store.addressEn || store.addressAr;

  const displayFeatures = features?.length ? features : fallbackFromTranslations;
  const years = stats.yearsInBusiness ?? (lang === "ar" ? 15 : 15);

  const hours = store.businessHoursJson && typeof store.businessHoursJson === "object" ? store.businessHoursJson : {};
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayLabel = (d) => t[`aboutDay_${d}`];

  const embedSrc =
    store.googleMapsLink &&
    (store.googleMapsLink.includes("/maps/embed") || store.googleMapsLink.includes("output=embed"))
      ? store.googleMapsLink
      : null;
  const mapsHref =
    store.googleMapsLink ||
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);

  return (
    <div className={cn(isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-4 pt-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="opacity-40">/</span>
        <span className="font-medium text-foreground">{t.aboutBreadcrumb}</span>
      </nav>

      <section className="relative overflow-hidden border-b border-border bg-muted/30">
        <GridPattern />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">{name}</h1>
            {slogan ? <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{slogan}</p> : null}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className={cn("grid gap-10 lg:grid-cols-2 lg:items-center", isRTL && "lg:[direction:rtl]")}>
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-black text-foreground">{t.aboutOurStory}</h2>
            <p className="leading-relaxed text-muted-foreground">{story || t.aboutStoryFallback}</p>
            {mission ? (
              <div>
                <h3 className="font-bold text-foreground">{t.aboutMission}</h3>
                <p className="mt-1 text-muted-foreground">{mission}</p>
              </div>
            ) : null}
            {vision ? (
              <div>
                <h3 className="font-bold text-foreground">{t.aboutVision}</h3>
                <p className="mt-1 text-muted-foreground">{vision}</p>
              </div>
            ) : null}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
            className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted shadow-lg"
          >
            {store.aboutImageUrl ? (
              <Image src={store.aboutImageUrl} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-background p-8 text-center text-muted-foreground">
                <LucideIcons.Zap className="h-24 w-24 text-amber-500/40" aria-hidden />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-black text-foreground">{t.aboutWhyTitle}</h2>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={STAGGER}
          >
            {displayFeatures.map((f, i) => {
              const title = f.titleKey ? t[f.titleKey] : lang === "ar" ? f.titleAr : f.titleEn;
              const desc = f.descKey ? t[f.descKey] : lang === "ar" ? f.descAr : f.descEn;
              const IconComp = LucideIcons[f.iconKey] || LucideIcons.Shield;
              return (
                <motion.div
                  key={f.id || i}
                  variants={FADE_UP}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400">
                    <IconComp className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-2xl font-black text-foreground">{t.aboutStatsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCounter value={years} label={t.aboutStatYears} isRTL={isRTL} />
          <StatCounter value={stats.productCount} label={t.aboutStatProducts} isRTL={isRTL} />
          <StatCounter value={stats.happyCustomers} label={t.aboutStatCustomers} isRTL={isRTL} />
          <StatCounter value={stats.ordersDelivered} label={t.aboutStatOrders} isRTL={isRTL} />
        </div>
      </section>

      {team?.length ? (
        <section className="border-t border-border bg-muted/15 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-black text-foreground">{t.aboutTeamTitle}</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((m) => {
                const nm = lang === "ar" ? m.nameAr : m.nameEn;
                const pos = lang === "ar" ? m.positionAr : m.positionEn;
                return (
                  <div key={m.id} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                    <div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border border-border bg-muted">
                      {m.photo ? (
                        <Image src={m.photo} alt="" fill className="object-cover" sizes="112px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <LucideIcons.User className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-foreground">{nm}</p>
                    <p className="text-sm text-muted-foreground">{pos}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-black text-foreground">{t.aboutVisitTitle}</h2>
        {address ? <p className="mb-6 text-muted-foreground">{address}</p> : null}
        {embedSrc ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border">
            <iframe title="map" src={embedSrc} className="h-full w-full border-0" loading="lazy" allowFullScreen />
          </div>
        ) : mapsHref ? (
          <Button asChild variant="outline" className="border-border">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer">
              {t.aboutOpenMaps}
            </a>
          </Button>
        ) : null}
        <div className="mt-10">
          <h3 className="mb-4 font-bold text-foreground">{t.aboutHoursTitle}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {dayKeys.map((d) => {
              const row = hours[d];
              if (!row) return null;
              const open = row.open;
              const line = open ? `${row.from} – ${row.to}` : t.aboutClosed;
              return (
                <li key={d} className={cn("flex justify-between gap-4 border-b border-border/60 py-2", isRTL && "flex-row-reverse")}>
                  <span className="font-medium text-foreground">{dayLabel(d)}</span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-amber-500/10 py-14 dark:bg-amber-500/5">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <p className="text-lg font-semibold text-foreground">{t.aboutCtaLine}</p>
          <div className={cn("flex flex-wrap justify-center gap-3", isRTL && "flex-row-reverse")}>
            <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
              <Link href="/products">{t.aboutCtaBrowse}</Link>
            </Button>
            <Button asChild variant="outline" className="border-border">
              <Link href="/contact">{t.aboutCtaContact}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
