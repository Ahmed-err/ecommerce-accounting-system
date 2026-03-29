"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

function BoltIllustration({ className }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("h-48 w-48 text-amber-500", className)} aria-hidden>
      <defs>
        <linearGradient id="g404" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path
        fill="url(#g404)"
        d="M105 28 L78 98 H98 L88 172 L132 92 H108 L118 28 Z"
        className="drop-shadow-lg"
      />
      <path d="M40 120 Q100 40 160 120" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}

export default function NotFoundClient() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();

  const onSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get("q");
    if (q && String(q).trim()) router.push(`/products?search=${encodeURIComponent(String(q).trim())}`);
  };

  return (
    <main className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <BoltIllustration className="mx-auto opacity-90" />
        </motion.div>
        <h1 className="mt-6 text-3xl font-black text-foreground">{t.err404Title}</h1>
        <p className="mt-3 text-muted-foreground">{t.err404Desc}</p>
        <form onSubmit={onSearch} className="mt-8 flex w-full max-w-md gap-2">
          <Input name="q" placeholder={t.err404SearchPlaceholder} className="border-border bg-card" dir={isRTL ? "rtl" : "ltr"} />
          <Button type="submit" className="shrink-0 bg-amber-500 text-black hover:bg-amber-400">
            OK
          </Button>
        </form>
        <div className={cn("mt-10 flex flex-wrap justify-center gap-3", isRTL && "flex-row-reverse")}>
          <Button asChild variant="outline" className="border-border">
            <Link href="/">{t.err404Home}</Link>
          </Button>
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/products">{t.err404Browse}</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
