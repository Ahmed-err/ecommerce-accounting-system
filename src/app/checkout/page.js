import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CheckoutClient from "@/components/store/CheckoutClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { normalizeAppLang } from "@/lib/i18n-lang";
import { getOrCreateStoreSettings } from "@/lib/settings";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const t = translations[lang] || translations.ar;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: `${t.checkout} | ${b.brandName}`,
  };
}

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const store = await getOrCreateStoreSettings();

  return (
    <main
      className={`min-h-screen bg-background ${lang === "ar" ? "text-right" : "text-left"}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:mb-8 sm:text-3xl md:text-4xl">
          {(translations[lang] || translations.ar).checkout}
        </h1>
        <CheckoutClient
          proofWhatsappDigits={store.bankTransferProofWhatsapp}
          bankTransferDetails={{
            bankNameEn: store.bankTransferBankNameEn,
            bankNameAr: store.bankTransferBankNameAr,
            accountNumber: store.bankTransferAccountNumber,
            accountNameEn: store.bankTransferAccountNameEn,
            accountNameAr: store.bankTransferAccountNameAr,
          }}
        />
      </div>
      <Footer />
    </main>
  );
}
