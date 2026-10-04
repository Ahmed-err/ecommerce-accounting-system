import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { translations } from "@/lib/translations";
import { normalizeAppLang } from "@/lib/i18n-lang";

// Shared store shell (P0.4): header, one <main>, footer. Admin/POS have their own layouts.
export default async function StoreLayout({ children }) {
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
      <Navbar />
      <main id="content" tabIndex={-1} className="min-h-[60vh] outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
