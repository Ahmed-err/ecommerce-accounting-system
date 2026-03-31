import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export default async function Loading() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="animate-pulse text-center">
        <p className="text-2xl font-black tracking-tight text-amber-500">{b.brandName}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t.loadingStore}</p>
      </div>
      <div className="w-full max-w-md space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-muted/60" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
