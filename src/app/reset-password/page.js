"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { resetPassword } from "../actions/reset-password";

export default function ResetPasswordPage() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError(lang === 'ar' ? 'رابط غير صالح.' : 'Link is invalid.');
    }
  }, [token, email, lang]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمات المرور غير متطابقة.' : 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون أكثر من ٦ أحرف.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await resetPassword(email, token, newPassword);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(result.error || (lang === 'ar' ? 'حدث خطأ.' : 'An error occurred.'));
      }
    } catch (err) {
      setError(lang === 'ar' ? 'فشل النظام.' : 'System failure.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center p-6 ${isRTL ? 'font-arabic' : 'font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-card border border-border rounded-[40px] p-12 text-center max-w-md shadow-2xl animate-in zoom-in duration-500">
           <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
           </div>
           <h1 className="text-3xl font-black text-foreground mb-4">
              {lang === 'ar' ? 'تم التغيير بنجاح!' : 'Password Updated!'}
           </h1>
           <p className="text-muted-foreground mb-8 font-medium">
              {lang === 'ar' ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة. سيتم تحويلك قريباً...' : "Your password has been changed successfully. Redirecting to login..."}
           </p>
           <Link href="/login" className="text-amber-500 font-bold hover:underline">
              {lang === 'ar' ? 'اذهب لتسجيل الدخول الفوري' : 'Go to Login Now'}
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-0 right-0 w-[min(500px,85vw)] h-[min(500px,85vw)] bg-blue-500/5 rounded-full blur-[80px] sm:blur-[100px] translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[min(500px,85vw)] h-[min(500px,85vw)] bg-amber-500/5 rounded-full blur-[80px] sm:blur-[100px] -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="mb-6 inline-flex items-center justify-center rounded-2xl border border-border bg-card p-3 font-bold shadow-sm">
             <ShieldCheck className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground">
             {lang === 'ar' ? 'إعادة ضبط كلمة المرور' : 'Reset Your Password'}
          </h1>
          <p className="font-medium text-muted-foreground">
             {lang === 'ar' ? 'يرجى إدخال كلمة المرور الجديدة أدناه.' : "Enter your new password below."}
          </p>
        </div>

        <div className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-bold text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">{t.password}</label>
              <div className="relative group">
                <Lock className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-amber-500 transition-all duration-300`} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={`w-full bg-muted border-2 border-transparent rounded-[20px] h-14 ${isRTL ? 'pr-14 pl-14' : 'pl-14 pr-14'} text-foreground placeholder:text-muted-foreground focus:border-amber-500 transition-all outline-none font-semibold`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className={`absolute ${isRTL ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-500`}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
              <div className="relative group">
                <Lock className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-amber-500 transition-all duration-300`} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full bg-muted border-2 border-transparent rounded-[20px] h-14 ${isRTL ? 'pr-14 pl-14' : 'pl-14 pr-14'} text-foreground placeholder:text-muted-foreground focus:border-amber-500 transition-all outline-none font-semibold`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className={`absolute ${isRTL ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-500`}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!error && !token}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-5 rounded-[24px] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}</span>
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
