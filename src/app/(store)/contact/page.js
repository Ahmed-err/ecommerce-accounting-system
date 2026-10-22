import ContactSupportShell from "@/components/store/ContactSupportShell";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getStoreSettingsForDisplay } from "@/lib/settings";
import { listActiveFaqs } from "@/lib/contact";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { getAbsoluteSiteUrl } from "@/lib/site-url";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: t.contactSalesTitle + " | " + b.brandName,
    description: t.contactSalesDesc,
    alternates: { canonical: `${getAbsoluteSiteUrl()}/contact` },
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

  const [store, faqs] = await Promise.all([getStoreSettingsForDisplay(), listActiveFaqs()]);

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
    <div
      className={`bg-background ${lang === "ar" ? "text-right" : "text-left"}`}
     
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <ContactSupportShell store={storeBrief} faqs={faqs} defaultSubject={defaultSubject} />
      </div>
    </div>
  );
}
