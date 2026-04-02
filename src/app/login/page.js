"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function LoginPage() {
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (String(result.error).includes("PHONE_NOT_VERIFIED")) {
          setError(lang === "ar" ? "رقم الهاتف غير مُفعّل. يرجى التحقق أولاً." : "Phone not verified yet. Please verify first.");
        } else {
          setError(t.emailOrPasswordIncorrect);
        }
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[min(800px,90vw)] h-[min(800px,90vw)] bg-amber-500/5 rounded-full blur-[100px] sm:blur-[120px] -translate-x-1/2 -translate-y-1/2 animate-pulse transition-all duration-[10s]" />
      <div className="absolute bottom-0 right-0 w-[min(800px,90vw)] h-[min(800px,90vw)] bg-blue-500/5 rounded-full blur-[100px] sm:blur-[120px] translate-x-1/2 translate-y-1/2 animate-pulse transition-all duration-[15s]" />

      {/* LEFT SIDE: Hero Section (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-24 bg-muted/40 backdrop-blur-3xl relative z-10 border-border/60 border-r border-l">
          <div className="max-w-md space-y-12">
              <div className="space-y-4">
                  <div className="h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center p-2.5 shadow-2xl shadow-amber-500/20">
                      <ShieldCheck className="h-full w-full text-black" />
                  </div>
                  <h2 className="text-6xl font-black text-foreground leading-tight tracking-tighter">
                     {lang === 'ar' ? 'مرحباً بك مجدداً في' : 'Welcome back to'} <br/>
                     <span className="text-amber-600 dark:text-amber-500">{brandName}</span>
                  </h2>
                  <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                     {t.loginToManage}
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-[32px] border border-border bg-card/80 shadow-sm">
                      <div className="text-2xl font-black text-amber-600 dark:text-amber-500 mb-1 leading-none font-mono regular-nums">10K+</div>
                      <div className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{lang === 'ar' ? 'عميل نشط' : 'Active Users'}</div>
                  </div>
                  <div className="p-6 rounded-[32px] border border-border bg-card/80 shadow-sm">
                      <div className="text-2xl font-black text-amber-600 dark:text-amber-500 mb-1 leading-none font-mono regular-nums">99.9%</div>
                      <div className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{lang === 'ar' ? 'أداء النظام' : 'Uptime'}</div>
                  </div>
              </div>
          </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4 group ring-8 ring-amber-500/5">
                <ShieldCheck className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">{t.welcomeBack}</h1>
              <p className="text-muted-foreground mt-2 font-medium">{t.loginToManage}</p>
          </div>

          <div className="bg-gray-900 border border-white/5 rounded-[40px] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.email}</label>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                    <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-[20px] h-14 ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                    placeholder={lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone Number'}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.password}</label>
                  <Link href="/forgot-password" title="Reset Password" className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest">
                    {t.forgotPassword}
                  </Link>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-5' : 'left-5'} flex items-center pointer-events-none z-10`}>
                    <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-all duration-300" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-[20px] h-14 ${isRTL ? 'pr-14 pl-14 text-right' : 'pl-14 pr-14 text-left'} text-white placeholder:text-gray-700 focus:border-amber-500 transition-all outline-none font-semibold`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={`absolute inset-y-0 ${isRTL ? "left-4" : "right-4"} flex items-center text-gray-400 hover:text-amber-500`}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center px-1">
                <label className="flex items-center gap-3 text-gray-400 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-white/10 bg-gray-800 text-amber-500 focus:ring-amber-500 transition-all" />
                  <span className="text-sm font-bold group-hover:text-gray-300 transition-colors">{t.rememberMe}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-5 rounded-[24px] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>{t.login}</span>
                    <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </form>

            <div className="relative border-t border-white/5 mt-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="bg-gray-900 px-4 text-gray-500">{lang === 'ar' ? 'أو عبر' : 'Or continue with'}</span>
              </div>
            </div>

            <div className="mt-8">
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

            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm font-bold">
                  {t.dontHaveAccount}{" "}
                <Link href="/register" className="text-amber-500 hover:underline transition-all">
                  {t.createNewAccountLink}
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
