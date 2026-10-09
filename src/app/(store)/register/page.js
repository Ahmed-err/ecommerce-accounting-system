"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { registerUser } from "@/app/actions/register";
import { useT } from "@/context/LanguageContext";
import { isStrongPassword, phoneVariants } from "@/lib/auth-identity";
import AuthShell, { AuthAlert, AuthField, AuthGoogle, AuthSubmit } from "@/components/auth/AuthShell";

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", password: "" };

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  // Same rules as the server, checked here so mistakes show next to the field.
  const validate = () => {
    const errs = {};
    for (const key of Object.keys(EMPTY)) if (!values[key].trim()) errs[key] = t.authFieldRequired;
    if (!errs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errs.email = t.authErr_email_invalid;
    if (!errs.phone && !phoneVariants(values.phone)) errs.phone = t.authErr_phone_invalid;
    if (!errs.password && !isStrongPassword(values.password)) errs.password = t.authErr_password_weak;
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    setError("");
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(values)) fd.set(k, v);
      const result = await registerUser(fd);
      if (result?.error) {
        setError(t[`authErr_${result.error}`] || t.authErr_register_failed);
        return;
      }
      const signInResult = await signIn("credentials", {
        email: values.email.trim(),
        password: values.password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError(t.autoLoginFailed);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t.authErr_register_failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      withAside
      title={t.authRegisterHeroTitle}
      text={t.authRegisterHeroText}
      below={
        <p className="text-muted-foreground">
          {t.alreadyHaveAccount}{" "}
          <Link href="/login" className="font-semibold text-accent-text hover:underline dark:text-amber-400">
            {t.login}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthAlert>{error}</AuthAlert>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AuthField id="reg-first" label={t.firstName} icon={User} autoComplete="given-name" value={values.firstName} onChange={set("firstName")} error={fieldErrors.firstName} />
          <AuthField id="reg-last" label={t.lastName} icon={User} autoComplete="family-name" value={values.lastName} onChange={set("lastName")} error={fieldErrors.lastName} />
        </div>
        <AuthField id="reg-email" type="email" label={t.email} icon={Mail} autoComplete="email" value={values.email} onChange={set("email")} placeholder="name@example.com" error={fieldErrors.email} />
        <AuthField id="reg-phone" type="tel" label={t.authPhone} icon={Phone} autoComplete="tel" inputMode="tel" value={values.phone} onChange={set("phone")} placeholder="0912345678" error={fieldErrors.phone} />
        <AuthField
          id="reg-password"
          type="password"
          label={t.password}
          icon={Lock}
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          hint={fieldErrors.password ? null : t.authPasswordRules}
          error={fieldErrors.password}
        />
        <AuthSubmit loading={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.createNewAccount}
        </AuthSubmit>
      </form>
      <AuthGoogle />
    </AuthShell>
  );
}
