"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { normalizeAppLang } from "@/lib/i18n-lang";

function WireIllustration({ className }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("h-48 w-48 text-muted-foreground", className)} aria-hidden>
      <path
        d="M30 100 L70 100 M70 100 Q100 60 130 100 M130 100 L170 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="12 10"
      />
      <circle cx="70" cy="100" r="10" className="fill-red-500" />
      <circle cx="130" cy="100" r="10" className="fill-amber-500" />
      <path d="M95 140 L105 155 L115 140" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function RootError({ error, reset }) {
  const ctx = useLanguage();
  const lang = normalizeAppLang(ctx?.lang);
  const isRTL = ctx?.isRTL ?? lang === "ar";
  const t = translations[lang] || translations.ar;

  useEffect(() => {
    console.error("Root error:", error?.digest || error?.message);
  }, [error]);

  return (
    <main className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <WireIllustration className="mx-auto opacity-80" />
        </motion.div>
        <h1 className="mt-6 text-3xl font-black text-foreground">{t.err500Title}</h1>
        <p className="mt-3 text-muted-foreground">{t.err500Desc}</p>
        <div className={cn("mt-10 flex flex-wrap justify-center gap-3", isRTL && "flex-row-reverse")}>
          <Button onClick={reset} className="bg-amber-500 text-black hover:bg-amber-400">
            {t.err500TryAgain}
          </Button>
          <Button asChild variant="outline" className="border-border">
            <Link href="/">{t.err500Home}</Link>
          </Button>
        </div>
        <Link href="/contact?subject=TECH" className="mt-8 text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400">
          {t.err500Report}
        </Link>
      </div>
      <Footer />
    </main>
  );
}
