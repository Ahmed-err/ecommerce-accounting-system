"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { requestPasswordReset } from "@/app/actions/reset-password";
import AuthShell, { AuthAlert, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function ForgotPasswordForm() {
  const t = useT();
  const { contactPhone } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldError(identifier.trim() ? "" : t.authFieldRequired);
    if (!identifier.trim()) return;

    setLoading(true);
    try {
      const result = await requestPasswordReset(identifier.trim());
      if (result?.success) setSent(true);
      else setError(t[`authErr_${result?.error}`] || t.authErr_system_error);
    } catch {
      setError(t.authErr_system_error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t.authForgotTitle}
      text={t.authForgotText}
      below={
        <Link href="/login" className="font-semibold text-accent-text hover:underline dark:text-amber-400">
          {t.login}
        </Link>
      }
    >
      {sent ? (
        <AuthAlert tone="success">{t.authForgotSent}</AuthAlert>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <AuthAlert>{error}</AuthAlert>
          <AuthField
            id="forgot-identifier"
            label={t.authEmailOrPhone}
            icon={Mail}
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="name@example.com / 0912345678"
            error={fieldError}
          />
          <AuthSubmit loading={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.authForgotSubmit}
          </AuthSubmit>
        </form>
      )}
      {contactPhone ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.authForgotHelp}{" "}
          <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`} dir="ltr" className="font-semibold text-foreground hover:underline">
            {contactPhone}
          </a>
        </p>
      ) : null}
    </AuthShell>
  );
}
