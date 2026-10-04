"use client";

import { useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export const SARMADAX_URL = "https://sarmadax.com";

// Store footer credit for the developer (user request; store footer only).
export default function DeveloperCredit({ className }) {
  const t = useT();
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
