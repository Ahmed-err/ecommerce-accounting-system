"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const SARMADAX_URL = "https://sarmadax.com";

// Store footer credit for the developer (user request; store footer only).
export default function DeveloperCredit({ className }) {
  const { lang } = useLanguage();
  const t = translations[lang === "en" ? "en" : "ar"];
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t.developerCredit}{" "}
      <a
        href={SARMADAX_URL}
        target="_blank"
        rel="noopener"
        dir="ltr"
        className="font-semibold text-foreground underline-offset-4 hover:text-accent-text hover:underline"
      >
        Sarmadax
      </a>
    </p>
  );
}
