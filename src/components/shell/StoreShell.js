import { cookies } from "next/headers";
import SiteHeader from "@/components/shell/SiteHeader";
import SiteFooter from "@/components/shell/SiteFooter";
import { translations } from "@/lib/translations";
import { normalizeAppLang } from "@/lib/i18n-lang";

// Store shell (P0.4): skip link, header, one <main>, footer. Used by the (store) layout and by
// the root not-found page, so unmatched URLs also show the store navigation.
export default async function StoreShell({ children }) {
  const lang = normalizeAppLang((await cookies()).get("lang")?.value);
  const t = translations[lang];
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t.skipToContent}
      </a>
      <SiteHeader />
      <main id="content" tabIndex={-1} className="min-h-[60vh] outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
