import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactSupportShell from "@/components/store/ContactSupportShell";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { listActiveFaqs } from "@/lib/contact";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return {
    title: t.contactSalesTitle + " | " + t.brandName,
    description: t.contactSalesDesc,
  };
}

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const defaultSubject =
    typeof params?.subject === "string" && ["GENERAL", "ORDER", "PRODUCT", "TECH", "OTHER"].includes(params.subject)
      ? params.subject
      : undefined;

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  const [store, faqs] = await Promise.all([getOrCreateStoreSettings(), listActiveFaqs()]);

  const storeBrief = {
    contactPhone: store.contactPhone,
    contactEmail: store.contactEmail,
    whatsappUrl: store.whatsappUrl,
    addressAr: store.addressAr,
    addressEn: store.addressEn,
    googleMapsLink: store.googleMapsLink,
    businessHoursJson: store.businessHoursJson,
    facebookUrl: store.facebookUrl,
    instagramUrl: store.instagramUrl,
    tiktokUrl: store.tiktokUrl,
  };

  return (
    <main
      className={`min-h-screen bg-background ${lang === "ar" ? "text-right" : "text-left"}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <ContactSupportShell store={storeBrief} faqs={faqs} defaultSubject={defaultSubject} />
      </div>
      <Footer />
    </main>
  );
}
