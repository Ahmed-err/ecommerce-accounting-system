"use client";

import { useState } from "react";
import { Eye, EyeOff, MapPin, Package, Zap } from "lucide-react";
import { signIn } from "next-auth/react";
import BoltMark from "@/components/brand/BoltMark";
import { useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: Package, title: "authBenefitOrdersTitle", text: "authBenefitOrdersText" },
  { icon: MapPin, title: "authBenefitAddressTitle", text: "authBenefitAddressText" },
  { icon: Zap, title: "authBenefitFastTitle", text: "authBenefitFastText" },
];

/**
 * Layout for the sign-in pages. With `withAside`, desktop gets a side panel with the
 * page title and what an account is for; phones and the narrow pages show the title
 * above the card.
 */
export default function AuthShell({ title, text, withAside = false, children, below }) {
  const t = useT();
  const heading = (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {text ? <p className="mt-2 text-muted-foreground">{text}</p> : null}
    </>
  );

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background lg:flex-row">
      {withAside && (
        <aside className="hidden border-e border-border bg-muted/40 px-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-center xl:px-20">
          <div className="max-w-md space-y-10">
            <div className="space-y-4">
              <BoltMark size={48} />
              <h2 className="text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">{title}</h2>
              {text ? <p className="text-lg text-muted-foreground">{text}</p> : null}
            </div>
            <ul className="space-y-6">
              {BENEFITS.map(({ icon: Icon, title: titleKey, text: textKey }) => (
                <li key={titleKey} className="flex items-start gap-4">
                  <span className="rounded-xl border border-border bg-card p-2.5">
                    <Icon className="h-5 w-5 text-accent-text dark:text-amber-400" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{t[titleKey]}</span>
                    <span className="block text-sm text-muted-foreground">{t[textKey]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className={cn("mb-8 text-center", withAside && "lg:hidden")}>{heading}</div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</div>
          {below ? <div className="mt-6 text-center text-sm">{below}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Labelled input with an icon, an error line and (for passwords) a show/hide button. */
export function AuthField({ id, label, icon: Icon, error, hint, labelAside, type = "text", ...inputProps }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        ) : null}
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-xl border bg-background pe-4 text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/25",
            Icon ? "ps-12" : "ps-4",
            isPassword && "pe-12",
            error ? "border-destructive" : "border-input"
          )}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={shown ? t.authHidePassword : t.authShowPassword}
          >
            {shown ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthAlert({ tone = "error", children }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      )}
    >
      {children}
    </div>
  );
}

export function AuthSubmit({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** "or" divider plus the Google button. */
export function AuthGoogle({ callbackUrl = "/" }) {
  const t = useT();
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.authOrContinueWith}
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background font-medium text-foreground transition-colors hover:bg-muted"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {t.authContinueWithGoogle}
      </button>
    </>
  );
}
