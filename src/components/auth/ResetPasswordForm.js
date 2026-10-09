"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { useT } from "@/context/LanguageContext";
import { resetPassword } from "@/app/actions/reset-password";
import { isStrongPassword } from "@/lib/auth-identity";
import AuthShell, { AuthAlert, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

const linkCls = "font-semibold text-accent-text hover:underline dark:text-amber-400";

/** `linkValid` is checked on the server before the form is shown. */
export default function ResetPasswordForm({ email, token, linkValid }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(!linkValid);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isStrongPassword(password)) errs.password = t.authErr_password_weak;
    if (confirm !== password) errs.confirm = t.authPasswordsDontMatch;
    setFieldErrors(errs);
    setError("");
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const result = await resetPassword(email, token, password);
      if (result?.success) setDone(true);
      else if (result?.error === "token_invalid") setExpired(true);
      else setError(t[`authErr_${result?.error}`] || t.authErr_reset_failed);
    } catch {
      setError(t.authErr_reset_failed);
    } finally {
      setLoading(false);
    }
  };

  let body;
  if (done) {
    body = (
      <div className="space-y-5 text-center">
        <AuthAlert tone="success">{t.authResetDone}</AuthAlert>
        <Link href="/login" className={linkCls}>{t.login}</Link>
      </div>
    );
  } else if (expired) {
    body = (
      <div className="space-y-5 text-center">
        <AuthAlert>{t.authErr_token_invalid}</AuthAlert>
        <Link href="/forgot-password" className={linkCls}>{t.authRequestNewLink}</Link>
      </div>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthAlert>{error}</AuthAlert>
        <AuthField
          id="reset-password"
          type="password"
          label={t.authNewPassword}
          icon={Lock}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={fieldErrors.password ? null : t.authPasswordRules}
          error={fieldErrors.password}
        />
        <AuthField
          id="reset-confirm"
          type="password"
          label={t.authConfirmPassword}
          icon={Lock}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
        />
        <AuthSubmit loading={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.authResetSubmit}
        </AuthSubmit>
      </form>
    );
  }

  return (
    <AuthShell title={t.authResetTitle} text={done || expired ? null : t.authResetText}>
      {body}
    </AuthShell>
  );
}
