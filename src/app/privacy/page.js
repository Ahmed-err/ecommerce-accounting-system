import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { DEFAULT_PRIVACY_AR, DEFAULT_PRIVACY_EN } from "@/lib/legal-defaults";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export const revalidate = 3600;

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  const base = process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
  return {
    title: `${t.privacyPageTitle} | ${b.brandName}`,
    description: t.privacyPageDesc,
    alternates: { canonical: `${base}/privacy` },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const html = lang === "ar" ? DEFAULT_PRIVACY_AR : DEFAULT_PRIVACY_EN;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-bold">{translations[lang].privacyPageTitle}</h1>
        <article
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    </main>
  );
}
