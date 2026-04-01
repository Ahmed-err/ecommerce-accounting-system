"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Loader2, ArrowRight, UserPlus, ShieldCheck, Package, Zap } from "lucide-react";
import { registerUser } from "../actions/register";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function RegisterPage() {
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang];

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.requiresPhoneVerification && result.phone) {
      router.push(`/verify-phone?phone=${encodeURIComponent(result.phone)}`);
      router.refresh();
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError(t.autoLoginFailed);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const benefits = [
    { title: t.benefit1Title, desc: t.benefit1Desc, icon: ShieldCheck },
    { title: t.benefit2Title, desc: t.benefit2Desc, icon: Package },
    { title: t.benefit3Title, desc: t.benefit3Desc, icon: Zap },
  ];

  return (
    <div className={`min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[min(800px,90vw)] h-[min(800px,90vw)] bg-amber-500/5 rounded-full blur-[100px] sm:blur-[120px] translate-x-1/2 -translate-y-1/2 animate-pulse transition-all duration-[10s]" />
      <div className="absolute bottom-0 left-0 w-[min(800px,90vw)] h-[min(800px,90vw)] bg-blue-500/5 rounded-full blur-[100px] sm:blur-[120px] -translate-x-1/2 translate-y-1/2 animate-pulse transition-all duration-[15s]" />

      {/* LEFT SIDE: Side Info (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-24 bg-muted/40 backdrop-blur-3xl relative z-10 border-border/60 border-r border-l">
          <div className="max-w-md space-y-12">
              <div className="space-y-4">
                  <div className="h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center p-2.5 shadow-2xl shadow-amber-500/20">
                      <UserPlus className="h-full w-full text-black" />
                  </div>
                  <h2 className="text-5xl font-black text-foreground leading-tight tracking-tighter">
                     {lang === 'ar' ? 'ابدأ رحلتك مع' : 'Start your journey with'} <br/>
                     <span className="text-amber-600 dark:text-amber-500">{brandName}</span>
                  </h2>
              </div>

              <div className="space-y-8">
                  <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest px-1">
                     {t.registerBenefitsTitle}
                  </h3>
                  <div className="space-y-6">
                      {benefits.map((b, idx) => {
                          const Icon = b.icon;
                          return (
                              <div key={idx} className="flex items-start gap-4 group">
                                  <div className="p-3 rounded-2xl border border-border bg-card/80 group-hover:bg-amber-500/10 group-hover:border-amber-500/50 transition-all duration-300">
                                      <Icon className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                                  </div>
                                  <div>
                                      <h4 className="text-foreground font-bold text-lg mb-1">{b.title}</h4>
                                      <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="pt-8 flex items-center gap-2 text-muted-foreground text-sm font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {lang === 'ar' ? 'نظام مشفر بالكامل وآمن ٢٥٦-بت' : 'Full 256-bit AES encryption enabled'}
              </div>
          </div>
      </div>

      {/* RIGHT SIDE: Register Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 relative z-10 bg-background">
        <div className="w-full max-w-lg">
          <div className="lg:hidden text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4 group ring-8 ring-amber-500/5">
                <UserPlus className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">{t.createNewAccount}</h1>
              <p className="text-muted-foreground mt-2 font-medium">{t.joinPowerStore}</p>
          </div>

          <div className="bg-gray-900 border border-white/5 rounded-[28px] sm:rounded-[32px] md:rounded-[40px] p-5 sm:p-7 md:p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.firstName}</label>
                    </div>
                    <div className="relative group">
                        <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                            <User className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                        </div>
                        <input
                          type="text"
                          name="firstName"
                          required
                          className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl h-12 sm:h-14 ${isRTL ? 'pr-12 sm:pr-14 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-14 pr-4 sm:pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                          placeholder={isRTL ? "أحمد" : "Ahmed"}
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.lastName}</label>
                    </div>
                    <div className="relative group">
                        <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                            <User className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                        </div>
                        <input
                          type="text"
                          name="lastName"
                          required
                          className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl h-12 sm:h-14 ${isRTL ? 'pr-12 sm:pr-14 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-14 pr-4 sm:pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                          placeholder={isRTL ? "علي" : "Ali"}
                        />
                    </div>
                  </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.email}</label>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                    <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl h-12 sm:h-14 ${isRTL ? 'pr-12 sm:pr-14 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-14 pr-4 sm:pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    {t.phoneOptional}
                  </label>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                    <Phone className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl h-12 sm:h-14 ${isRTL ? 'pr-12 sm:pr-14 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-14 pr-4 sm:pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold regular-nums`}
                    placeholder="+249..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.password}</label>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                    <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl h-12 sm:h-14 ${isRTL ? 'pr-12 sm:pr-14 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-14 pr-4 sm:pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-4 sm:py-5 rounded-2xl sm:rounded-[24px] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-base sm:text-lg"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>{t.createNewAccount}</span>
                    <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </form>

            <div className="relative border-t border-white/5 mt-6 sm:mt-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="bg-gray-900 px-4 text-gray-500">{lang === 'ar' ? 'أو عبر' : 'Or register with'}</span>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                 </svg>
                 <span>Google</span>
              </button>
            </div>

            <div className="mt-8 sm:mt-10 text-center">
              <p className="text-gray-500 text-sm font-bold">
                  {t.alreadyHaveAccount}{" "}
                <Link href="/login" className="text-amber-500 hover:underline transition-all">
                  {t.login}
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                  <span>{t.backToStore}</span>
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
