"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, User, Phone, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { registerUser } from "../actions/register";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
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

    // 1. Register the user
    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 2. Automatically log them in after successful registration
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("Registration successful, but auto-login failed. Please log in manually.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden py-12">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg relative">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4 group ring-8 ring-amber-500/5">
            <UserPlus className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Create an Account
          </h1>
          <p className="text-gray-400 mt-2">
            Join PowerStore to manage your orders
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-shake">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                    First Name
                </label>
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                    <input
                    type="text"
                    name="firstName"
                    className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                    placeholder="Ahmed"
                    required
                    />
                </div>
                </div>

                <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                    Last Name
                </label>
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                    <input
                    type="text"
                    name="lastName"
                    className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                    placeholder="Ali"
                    required
                    />
                </div>
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="email"
                  name="email"
                  className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  placeholder="ahmed@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Phone Number <span className="text-gray-600 font-normal">(Optional)</span>
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="tel"
                  name="phone"
                  className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  placeholder="+20 100 123 4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="password"
                  name="password"
                  className="w-full bg-gray-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-950 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:text-amber-500 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="mt-8 text-center">
            <Link href="/" className="text-gray-600 hover:text-gray-400 transition-colors inline-flex items-center space-x-2 text-sm">
                <span>← Back to Homepage</span>
            </Link>
        </div>
      </div>
    </div>
  );
}
