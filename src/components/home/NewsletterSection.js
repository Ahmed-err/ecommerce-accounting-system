"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

export default function NewsletterSection() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;

  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");

    const result = await subscribeToNewsletter(email);

    if (result.success) {
      setStatus("success");
      setEmail("");
      setMessage(isRTL ? "تم الاشتراك بنجاح! شكراً لك." : "Successfully subscribed! Thank you.");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);
    } else {
      setStatus("error");
      setMessage(result.error || (isRTL ? "تعذر الاشتراك حالياً." : "Could not subscribe right now."));
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);
    }
  };

  return (
    <section className="relative overflow-hidden bg-card border-t border-foreground/5 py-16 sm:py-20 lg:py-24">
      {/* Decorative line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      {/* Glow blob */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[min(700px,100%)] h-60 bg-amber-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 text-center">
        {/* Icon */}
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-6 shadow-premium sm:h-16 sm:w-16 sm:mb-8">
          <Mail className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-black italic tracking-tighter leading-[1.2] text-foreground uppercase mb-5 pb-1 sm:text-4xl md:text-5xl sm:mb-6">
          {t.newsletterTitle || "Subscribe to our Newsletter"}
        </h2>

        {/* Subheading */}
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-sm mx-auto mb-8 sm:text-sm sm:mb-10 sm:max-w-none">
          {t.newsletterDesc || "Be the first to know about new products and exclusive offers."}
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md mx-auto"
          noValidate
        >
          {/* Input + inline button on sm+ */}
          <div className="relative flex min-h-[3rem] flex-col gap-3 sm:min-h-[3.5rem] sm:flex-row sm:gap-0">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.newsletterPlaceholder || "Enter your email…"}
              className={cn(
                "h-12 w-full rounded-2xl border-foreground/10 bg-foreground/5 px-5 text-base font-medium placeholder:text-muted-foreground focus-visible:ring-amber-500 sm:h-14",
                isRTL ? "sm:ps-40" : "sm:pe-40"
              )}
              required
              disabled={status === "loading"}
            />

            {/* Inset button — visible sm+ */}
            <Button
              type="submit"
              disabled={status === "loading"}
              className={cn(
                "absolute top-1/2 z-[1] hidden h-11 min-h-[2.75rem] -translate-y-1/2 items-center gap-2 rounded-xl bg-amber-500 px-5 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-amber-600 active:scale-95 sm:flex sm:h-12 sm:min-h-12",
                isRTL ? "start-1.5" : "end-1.5"
              )}
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                t.subscribeNow || "Subscribe"
              )}
            </Button>

            {/* Full-width button — visible < sm */}
            <Button
              type="submit"
              disabled={status === "loading"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-amber-600 active:scale-95 sm:hidden"
            >
              {status === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "success" ? (
                <><CheckCircle className="h-5 w-5" /> {isRTL ? "تم!" : "Done!"}</>
              ) : (
                t.subscribeNow || "Subscribe"
              )}
            </Button>
          </div>
        </form>

        {/* Feedback message — static, not absolute */}
        {message && (
          <p
            aria-live="polite"
            className={cn(
              "mt-5 text-sm font-bold animate-in fade-in slide-in-from-bottom-2",
              status === "error"
                ? "text-destructive"
                : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
