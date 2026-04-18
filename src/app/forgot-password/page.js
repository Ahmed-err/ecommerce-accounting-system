"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { requestPasswordReset } from "../actions/reset-password";

export default function ForgotPasswordPage() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setMessage(lang === 'ar' ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.' : 'Reset link has been sent to your email.');
      } else {
        setError(result.error || (lang === 'ar' ? 'حدث خطأ ما.' : 'An error occurred.'));
      }
    } catch (err) {
      setError(lang === 'ar' ? 'خطأ في الاتصال بالسيرفر.' : 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-0 right-0 w-[min(500px,85vw)] h-[min(500px,85vw)] bg-amber-500/5 rounded-full blur-[80px] sm:blur-[100px] translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[min(500px,85vw)] h-[min(500px,85vw)] bg-blue-500/5 rounded-full blur-[80px] sm:blur-[100px] -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors mb-6 font-bold group">
            <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            <span>{t.backToLogin || (lang === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login')}</span>
          </Link>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">
             {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </h1>
          <p className="text-muted-foreground font-medium">
             {lang === 'ar' ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة ضبط كلمة المرور.' : "Enter your email and we'll send you a link to reset your password."}
          </p>
        </div>

        <div className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-2xl text-sm font-bold text-center">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-bold text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">{t.email}</label>
              <div className="relative group">
                <Mail className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-amber-500 transition-all duration-300`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full bg-muted border-2 border-transparent rounded-[20px] h-14 ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'} text-foreground placeholder:text-muted-foreground focus:border-amber-500 transition-all outline-none font-semibold`}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-5 rounded-[24px] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ar' ? 'إرسال رابط التغيير' : 'Send Reset Link'}</span>
                  <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
