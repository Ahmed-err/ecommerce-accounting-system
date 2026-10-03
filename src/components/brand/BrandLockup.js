"use client";

import BoltMark from "@/components/brand/BoltMark";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const BRAND_WORDMARK = { ar: "همّت", en: "Himmat" };
const FALLBACK_SHOP = { ar: "عصام الدين نصر للأدوات الكهربائية", en: "Essam El-Din Nasr Electrical Tools" };

// Himmat leads; the shop name (from store settings) and GM line are small labels.
export default function BrandLockup({ variant = "compact", size, tone = "navy", className }) {
  const { lang, brandName } = useLanguage();
  const l = lang === "en" ? "en" : "ar";
  const t = translations[l];
  const wordmark = t.brandWordmark || BRAND_WORDMARK[l];
  const shop = (brandName || "").trim() || FALLBACK_SHOP[l];

  if (variant === "mark") return <BoltMark size={size ?? 36} tone={tone} title={wordmark} className={className} />;

  const full = variant === "full";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <BoltMark size={size ?? (full ? 48 : 36)} tone={tone} className="shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-baseline gap-2">
          <span className={cn("font-extrabold text-foreground", full ? "text-3xl" : "text-xl")}>{wordmark}</span>
          {l === "ar" && (
            <span
              dir="ltr"
              className={cn("text-[11px] font-bold tracking-[0.22em] text-accent-text", !full && "hidden sm:inline")}
            >
              HIMMAT
            </span>
          )}
        </span>
        <span className="truncate text-xs font-semibold text-muted-foreground">{shop}</span>
        {full && <span className="text-[11px] text-muted-foreground">{t.brandGmLine}</span>}
      </span>
    </span>
  );
}
