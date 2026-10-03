"use client";

import { useLanguage } from "@/context/LanguageContext";
import { discountPercent, formatAmount } from "@/lib/format";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const SIZES = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export default function Price({ amount, compareAt, size = "md", className }) {
  const { lang } = useLanguage();
  const currency = translations[lang === "en" ? "en" : "ar"].currency;
  const off = discountPercent(amount, compareAt);
  return (
    <span data-numeric className={cn("inline-flex flex-wrap items-baseline gap-x-2 tabular-nums", className)}>
      <span className={cn("font-extrabold text-foreground", SIZES[size] || SIZES.md)}>
        {formatAmount(amount)}{" "}
        <span className="text-xs font-bold text-muted-foreground">{currency}</span>
      </span>
      {off !== null && (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatAmount(compareAt)}</span>
          <span className="rounded-md bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">−{off}%</span>
        </>
      )}
    </span>
  );
}
