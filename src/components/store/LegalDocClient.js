"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Printer, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function LegalDocClient({ contentAr, contentEn, updatedAt, docTitle }) {
  const { lang: siteLang } = useLanguage();
  const t = translations[siteLang];
  const [displayLang, setDisplayLang] = useState(siteLang === "en" ? "en" : "ar");
  const articleRef = useRef(null);
  const [toc, setToc] = useState([]);

  useEffect(() => {
    setDisplayLang(siteLang === "en" ? "en" : "ar");
  }, [siteLang]);

  const html = displayLang === "ar" ? contentAr : contentEn;

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const h2s = root.querySelectorAll("h2[id]");
    setToc(
      [...h2s].map((h) => ({
        id: h.id,
        text: h.textContent?.trim() || h.id,
      }))
    );
  }, [html]);

  const updatedLabel = useMemo(() => {
    if (!updatedAt) return null;
    try {
      const d = new Date(updatedAt);
      return new Intl.DateTimeFormat(displayLang === "ar" ? "ar-SD" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
    } catch {
      return null;
    }
  }, [updatedAt, displayLang]);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn(displayLang === "ar" && "text-right")} dir={displayLang === "ar" ? "rtl" : "ltr"}>
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 pb-6 pt-8 text-sm text-muted-foreground sm:px-6">
        <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="opacity-40">/</span>
        <span className="font-medium text-foreground">{docTitle}</span>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className={cn("mb-8 flex flex-wrap items-center justify-between gap-3", displayLang === "ar" && "flex-row-reverse")}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border"
              onClick={() => setDisplayLang("ar")}
            >
              {t.legalLangAr}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border"
              onClick={() => setDisplayLang("en")}
            >
              {t.legalLangEn}
            </Button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            {t.legalPrint}
          </Button>
        </div>

        {updatedLabel ? (
          <p className="mb-8 text-sm text-muted-foreground">
            {t.legalLastUpdated}: {updatedLabel}
          </p>
        ) : null}

        <div className={cn("grid gap-10 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]", displayLang === "ar" && "lg:[direction:rtl]")}>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 hidden items-center gap-2 font-semibold text-foreground lg:flex">
              <List className="h-4 w-4" />
              {t.legalToc}
            </div>
            <div className="mb-6 lg:hidden">
              <Select onValueChange={(v) => scrollToId(v)}>
                <SelectTrigger className="w-full border-border bg-card">
                  <SelectValue placeholder={t.legalToc} />
                </SelectTrigger>
                <SelectContent>
                  {toc.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <motion.ul
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden max-h-[70vh] space-y-1 overflow-y-auto text-sm lg:block"
            >
              {toc.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToId(item.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground rtl:text-right"
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </motion.ul>
          </aside>

          <article
            ref={articleRef}
            className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm print:border-0 print:shadow-none sm:p-10 [&_h2]:mt-10 [&_h2]:scroll-mt-28 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:leading-relaxed [&_p]:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

      </div>
    </div>
  );
}
