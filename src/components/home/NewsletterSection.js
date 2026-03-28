"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

export default function NewsletterSection() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;
  
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
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
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    setStatus("error");
    setMessage(result.error || (isRTL ? "تعذر الاشتراك حالياً." : "Could not subscribe right now."));
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <section className="relative py-24 bg-card border-t border-foreground/5 overflow-hidden">
      {/* Decorative meshes */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 mb-8 border border-amber-500/20 shadow-premium">
          <Mail className="h-8 w-8" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-foreground uppercase mb-6">
           {t.newsletterTitle || "Subscribe to our Newsletter"}
        </h2>
        
        <p className="text-muted-foreground text-sm sm:text-base font-bold uppercase tracking-widest max-w-xl mx-auto mb-12">
            {t.newsletterDesc || "Be the first to know about new products and exclusive offers."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto relative">
          <div className="relative w-full group">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.newsletterPlaceholder || "Enter your email here..."}
              className={cn(
                "h-14 w-full rounded-2xl bg-foreground/5 border-foreground/10 text-center sm:text-start focus-visible:ring-amber-500 shadow-inner px-6 text-foreground placeholder:text-muted-foreground",
                isRTL ? "sm:pr-6 sm:pl-36" : "sm:pl-6 sm:pr-36"
              )}
              required
              disabled={status === "loading"}
            />
            <Button 
              type="submit" 
              disabled={status === "loading"}
              className={cn(
                "hidden sm:flex absolute top-1.5 bottom-1.5 h-auto rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-xs shadow-md transition-all active:scale-95",
                isRTL ? "left-1.5 px-6" : "right-1.5 px-6"
              )}
            >
              {status === "loading" ? "..." : status === "success" ? <CheckCircle className="h-5 w-5" /> : (t.subscribeNow || "Subscribe")}
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={status === "loading"}
            className="sm:hidden w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase shadow-premium transition-all active:scale-95"
          >
            {status === "loading" ? "..." : status === "success" ? <CheckCircle className="h-5 w-5" /> : (t.subscribeNow || "Subscribe")}
          </Button>
        </form>

        {message && (
          <p
            aria-live="polite"
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -bottom-10 mt-6 text-sm font-bold animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap",
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
