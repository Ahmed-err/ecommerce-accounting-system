"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useT } from "@/context/LanguageContext";
import { isSafeCallbackPath } from "@/lib/auth-identity";
import AuthShell, { AuthAlert, AuthField, AuthGoogle, AuthSubmit } from "@/components/auth/AuthShell";

function readCallbackUrl() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("callbackUrl");
  return isSafeCallbackPath(value) ? value : null;
}

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = {};
    if (!identifier.trim()) missing.identifier = t.authFieldRequired;
    if (!password) missing.password = t.authFieldRequired;
    setFieldErrors(missing);
    setError("");
    if (Object.keys(missing).length) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", { email: identifier.trim(), password, redirect: false });
      if (result?.error) {
        setError(t.emailOrPasswordIncorrect);
        return;
      }
      // Back to the page that asked for a login; otherwise staff go to the dashboard.
      const session = await getSession();
      const fallback = session?.user?.role && session.user.role !== "CUSTOMER" ? "/admin" : "/";
      router.push(readCallbackUrl() || fallback);
      router.refresh();
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      withAside
      title={t.authLoginHeroTitle}
      text={t.authLoginHeroText}
      below={
        <p className="text-muted-foreground">
          {t.dontHaveAccount}{" "}
          <Link href="/register" className="font-semibold text-accent-text hover:underline dark:text-amber-400">
            {t.createNewAccountLink}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthAlert>{error}</AuthAlert>
        <AuthField
          id="login-identifier"
          label={t.authEmailOrPhone}
          icon={Mail}
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="name@example.com / 0912345678"
          error={fieldErrors.identifier}
        />
        <AuthField
          id="login-password"
          type="password"
          label={t.password}
          icon={Lock}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          labelAside={
            <Link href="/forgot-password" className="text-sm font-medium text-accent-text hover:underline dark:text-amber-400">
              {t.forgotPassword}
            </Link>
          }
        />
        <AuthSubmit loading={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.login}
        </AuthSubmit>
      </form>
      <AuthGoogle callbackUrl={readCallbackUrl() || "/"} />
    </AuthShell>
  );
}
