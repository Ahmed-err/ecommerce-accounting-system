"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("حدث خطأ ما. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden text-right" dir="rtl">
      {/* Background Orbs */}
      <div className="absolute top-0 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4 group ring-8 ring-amber-500/5">
            <ShieldCheck className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            مرحباً بعودتك
          </h1>
          <p className="text-gray-400 mt-2">
            سجل الدخول لإدارة حسابك في باور ستور
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-shake text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1">
                البريد الإلكتروني
              </label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-right"
                  placeholder="admin@powerstore.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1">
                كلمة المرور
              </label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-right"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-gray-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-950 transition-all" />
                <span className="group-hover:text-gray-300 transition-colors">تذكرني</span>
              </label>
              <Link href="#" className="text-amber-500 hover:text-amber-400 transition-colors font-medium">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-950 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="text-white hover:text-amber-500 transition-colors font-medium">
                أنشئ حساباً جديداً
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="mt-8 text-center">
            <Link href="/" className="text-gray-600 hover:text-gray-400 transition-colors inline-flex items-center gap-2 text-sm">
                <span>العودة للرئيسية</span>
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
      </div>
    </div>
  );
}
