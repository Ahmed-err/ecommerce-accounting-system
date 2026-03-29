"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle, MapPin, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import ContactFormClient from "@/components/ContactFormClient";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function ContactSupportShell({ store, faqs = [], defaultSubject }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [faqQ, setFaqQ] = useState("");

  const address = lang === "ar" ? store.addressAr || store.addressEn : store.addressEn || store.addressAr;
  const phone = store.contactPhone || "";
  const email = store.contactEmail || t.businessEmail;
  const waHref = useMemo(() => {
    if (store.whatsappUrl) return store.whatsappUrl;
    const digits = String(phone).replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "#";
  }, [store.whatsappUrl, phone]);

  const hours = store.businessHoursJson && typeof store.businessHoursJson === "object" ? store.businessHoursJson : {};

  const filteredFaq = useMemo(() => {
    const q = faqQ.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => {
      const qq = lang === "ar" ? f.questionAr : f.questionEn;
      const aa = lang === "ar" ? f.answerAr : f.answerEn;
      return `${qq} ${aa}`.toLowerCase().includes(q);
    });
  }, [faqs, faqQ, lang]);

  return (
    <div className={cn(isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-amber-500">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="opacity-40">/</span>
        <span className="font-medium text-foreground">{t.contactBreadcrumb}</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-14 max-w-3xl text-center"
      >
        <h1 className="text-4xl font-black text-foreground sm:text-5xl">{t.contactSalesTitle}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.contactSalesDesc}</p>
      </motion.div>

      <div className="mb-16 grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Phone,
            label: t.contactCardCall,
            value: phone || "—",
            href: phone ? `tel:${phone.replace(/\s/g, "")}` : null,
            cta: t.contactCardCall,
          },
          {
            icon: Mail,
            label: t.contactCardEmail,
            value: email,
            href: email ? `mailto:${email}` : null,
            cta: t.contactCardEmail,
          },
          {
            icon: MessageCircle,
            label: t.contactCardWhatsapp,
            value: t.whatsappSales,
            href: waHref,
            cta: t.contactCardWhatsapp,
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 inline-flex rounded-xl bg-amber-500/15 p-3 text-amber-500">
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground">{c.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
              {c.value}
            </p>
            {c.href && c.href !== "#" ? (
              <Button asChild className="mt-4 w-full bg-amber-500 text-black hover:bg-amber-400">
                <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  {c.cta}
                </a>
              </Button>
            ) : null}
          </motion.div>
        ))}
      </div>

      <div className="mb-16 grid gap-10 lg:grid-cols-2">
        <ContactFormClient defaultSubject={defaultSubject} />
        <div className="space-y-6 rounded-3xl border border-border bg-card p-8">
          <div className="flex items-start gap-4">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="font-bold text-foreground">{t.visitUs}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{address || t.addressLine1}</p>
              {store.googleMapsLink ? (
                <a
                  href={store.googleMapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-500 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Google Maps
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Clock className="mt-1 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="font-bold text-foreground">{t.workingHours}</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {DAYS.map((d) => {
                  const h = hours[d];
                  if (!h) return null;
                  return (
                    <li key={d} className="flex justify-between gap-4 border-b border-border/50 py-1">
                      <span className="capitalize">{d}</span>
                      <span dir="ltr">
                        {h.open ? `${h.from}–${h.to}` : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            {store.facebookUrl ? (
              <a href={store.facebookUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-500 hover:underline">
                Facebook
              </a>
            ) : null}
            {store.instagramUrl ? (
              <a href={store.instagramUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-500 hover:underline">
                Instagram
              </a>
            ) : null}
            {store.tiktokUrl ? (
              <a href={store.tiktokUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-500 hover:underline">
                TikTok
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-xl font-bold text-foreground">{t.contactFaqTitle}</h2>
        <Input
          className="mt-4 border-border bg-background"
          placeholder={t.contactFaqSearch}
          value={faqQ}
          onChange={(e) => setFaqQ(e.target.value)}
        />
        <div className="mt-6 space-y-2">
          {filteredFaq.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.catalogEmptyTitle}</p>
          ) : (
            filteredFaq.map((f) => (
              <details key={f.id} className="group rounded-xl border border-border bg-muted/20 open:bg-muted/30">
                <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                  {lang === "ar" ? f.questionAr : f.questionEn}
                </summary>
                <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  {lang === "ar" ? f.answerAr : f.answerEn}
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
