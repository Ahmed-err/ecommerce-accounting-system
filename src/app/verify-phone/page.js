"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPhoneCode, sendPhoneVerificationCode } from "@/app/actions/register";
import { useLanguage } from "@/context/LanguageContext";

export default function VerifyPhonePage() {
  const { lang, isRTL } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const phone = useMemo(() => String(searchParams.get("phone") || "").trim(), [searchParams]);

  const labels = {
    title: lang === "ar" ? "تأكيد رقم الهاتف" : "Verify your phone",
    desc:
      lang === "ar"
        ? "أدخل رمز التحقق المرسل عبر الرسائل النصية."
        : "Enter the verification code sent by SMS.",
    code: lang === "ar" ? "رمز التحقق" : "Verification code",
    verify: lang === "ar" ? "تأكيد" : "Verify",
    resend: lang === "ar" ? "إعادة إرسال الرمز" : "Resend code",
    backToLogin: lang === "ar" ? "العودة لتسجيل الدخول" : "Back to login",
    invalidPhone: lang === "ar" ? "رقم الهاتف غير صالح." : "Invalid phone number.",
    verified: lang === "ar" ? "تم التحقق من الهاتف بنجاح. يمكنك تسجيل الدخول الآن." : "Phone verified successfully. You can now log in.",
  };

  const onVerify = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!phone) {
      setError(labels.invalidPhone);
      return;
    }

    startTransition(async () => {
      const result = await verifyPhoneCode(phone, code);
      if (!result?.success) {
        setError(result?.error || (lang === "ar" ? "فشل التحقق." : "Verification failed."));
        return;
      }
      setSuccess(labels.verified);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 800);
    });
  };

  const onResend = () => {
    setError("");
    setSuccess("");
    if (!phone) {
      setError(labels.invalidPhone);
      return;
    }

    startTransition(async () => {
      const result = await sendPhoneVerificationCode(phone);
      if (!result?.success) {
        setError(result?.error || (lang === "ar" ? "تعذر إرسال الرمز." : "Could not send code."));
        return;
      }
      setSuccess(lang === "ar" ? "تم إرسال رمز جديد." : "A new code has been sent.");
    });
  };

  return (
    <main className={`min-h-screen bg-background flex items-center justify-center p-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-900 p-8">
        <h1 className="text-2xl font-black text-white">{labels.title}</h1>
        <p className="mt-2 text-sm text-gray-400">{labels.desc}</p>
        {phone ? <p className="mt-1 text-xs text-amber-400">{phone}</p> : null}

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">{labels.code}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`w-full h-12 rounded-xl bg-gray-800 border border-white/10 px-4 text-white outline-none focus:border-amber-500 ${isRTL ? "text-right" : "text-left"}`}
            placeholder="123456"
            required
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-amber-500 text-black font-black disabled:opacity-60"
          >
            {labels.verify}
          </button>
        </form>

        <button
          type="button"
          onClick={onResend}
          disabled={isPending}
          className="mt-3 w-full h-11 rounded-xl border border-white/15 text-white font-bold disabled:opacity-60"
        >
          {labels.resend}
        </button>

        <Link href="/login" className="mt-5 block text-center text-xs text-gray-400 hover:text-white">
          {labels.backToLogin}
        </Link>
      </div>
    </main>
  );
}
