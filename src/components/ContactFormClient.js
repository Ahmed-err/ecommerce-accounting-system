"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { submitContactForm } from "@/app/actions/contact";

export default function ContactFormClient() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const result = await submitContactForm({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    });

    setLoading(false);
    if (result.success) {
      setSuccess(true);
      e.target.reset();
    } else {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">{t.contactFormSuccess}</h2>
        <Button onClick={() => setSuccess(false)} variant="outline" className="mt-4 border-white/10 text-white hover:bg-white/5">
          {t.sendMessage}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12">
      <h2 className="text-2xl font-bold text-white mb-8">{t.sendMessage}</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {error && (
          <div className="md:col-span-2 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="contact-name" className="text-sm font-medium text-gray-300">{t.fullName}</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            className={`w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'}`}
            placeholder={t.contactNamePlaceholder}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contact-email" className="text-sm font-medium text-gray-300">{t.email}</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className={`w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'}`}
            placeholder={t.contactEmailPlaceholder}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="contact-subject" className="text-sm font-medium text-gray-300">{t.subject}</label>
          <select
            id="contact-subject"
            name="subject"
            className={`w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none appearance-none ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option>{t.subjProductInquiry}</option>
            <option>{t.subjWholesaleQuote}</option>
            <option>{t.subjTechSupport}</option>
            <option>{t.subjOther}</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="contact-message" className="text-sm font-medium text-gray-300">{t.messageText}</label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            className={`w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none resize-none ${isRTL ? 'text-right' : 'text-left'}`}
            placeholder={t.tellUsHowWeCanHelp}
          />
        </div>

        <div className="md:col-span-2 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
          >
            <span>{loading ? t.saving : t.submitMessage}</span>
            {!loading && <Send className="h-5 w-5 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
