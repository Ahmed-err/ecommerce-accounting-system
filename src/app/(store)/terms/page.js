import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getLegalPageForStore } from "@/lib/legal";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { getAbsoluteSiteUrl } from "@/lib/site-url";
import LegalDoc from "@/components/store/LegalDoc";

export const revalidate = 3600;

async function getLang() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  return { lang, t: translations[lang] || translations.ar };
}

export async function generateMetadata() {
  const { lang, t } = await getLang();
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return {
    title: `${t.termsPageTitle} | ${b.brandName}`,
    description: t.termsPageDesc,
    alternates: { canonical: `${getAbsoluteSiteUrl()}/terms` },
  };
}

export default async function TermsPage() {
  const { lang, t } = await getLang();
  const legal = await getLegalPageForStore("TERMS");
  return (
    <LegalDoc
      html={lang === "ar" ? legal.contentAr : legal.contentEn}
      title={t.termsPageTitle}
      updatedAt={legal.updatedAt}
      lang={lang}
      t={t}
    />
  );
}
