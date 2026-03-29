"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { submitContactForm } from "@/app/actions/contact";
import { cn } from "@/lib/utils";

export default function ContactFormClient({ defaultSubject }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [subject, setSubject] = useState(defaultSubject || "GENERAL");

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
  }, [defaultSubject]);

  const subjects = [
    { v: "GENERAL", label: t.contactSubjGeneral },
    { v: "ORDER", label: t.contactSubjOrder },
    { v: "PRODUCT", label: t.contactSubjProduct },
    { v: "TECH", label: t.contactSubjTech },
    { v: "OTHER", label: t.contactSubjOther },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFields({});

    const formData = new FormData(e.target);
    const message = String(formData.get("message") || "");
    if (message.trim().length < 20) {
      setLoading(false);
      setError(t.contactMsgMin);
      return;
    }

    const result = await submitContactForm({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || "",
      subject,
      message,
      lang,
    });

    setLoading(false);
    if (result.success) {
      setSuccess(true);
      e.target.reset();
    } else {
      setError(result.error || "");
      if (result.fields) setFields(result.fields);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-12"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        </motion.div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">{t.contactFormSuccess}</h2>
        <Button onClick={() => setSuccess(false)} variant="outline" className="mt-6 border-border">
          {t.sendMessage}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12">
      <h2 className="mb-8 text-2xl font-bold text-foreground">{t.sendMessage}</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 md:col-span-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="contact-name" className="text-sm font-medium text-muted-foreground">
            {t.fullName}
          </label>
          <Input
            id="contact-name"
            name="name"
            required
            className={cn("border-border bg-background", fields.name && "border-red-500")}
            placeholder={t.contactNamePlaceholder}
          />
          {fields.name?.[0] ? <p className="text-xs text-red-500">{fields.name[0]}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="contact-email" className="text-sm font-medium text-muted-foreground">
            {t.email}
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            dir="ltr"
            className={cn("border-border bg-background", fields.email && "border-red-500")}
            placeholder={t.contactEmailPlaceholder}
          />
          {fields.email?.[0] ? <p className="text-xs text-red-500">{fields.email[0]}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="contact-phone" className="text-sm font-medium text-muted-foreground">
            {t.phoneOptional}
          </label>
          <Input
            id="contact-phone"
            name="phone"
            dir="ltr"
            className="border-border bg-background"
            placeholder="09xxxxxxxx"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contact-subject" className="text-sm font-medium text-muted-foreground">
            {t.subject}
          </label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              isRTL && "text-right"
            )}
          >
            {subjects.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="contact-message" className="text-sm font-medium text-muted-foreground">
            {t.messageText}
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={20}
            rows={5}
            className={cn(
              "w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
              isRTL && "text-right",
              fields.message && "border-red-500"
            )}
            placeholder={t.tellUsHowWeCanHelp}
          />
          {fields.message?.[0] ? <p className="text-xs text-red-500">{fields.message[0]}</p> : null}
        </div>

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-amber-500 py-6 text-lg font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            <span>{loading ? t.saving : t.submitMessage}</span>
            {!loading && <Send className="h-5 w-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
