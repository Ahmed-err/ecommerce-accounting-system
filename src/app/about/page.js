import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AboutPageClient from "@/components/store/AboutPageClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getAboutPageData } from "@/lib/store/about";

export const revalidate = 3600;

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const base = process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
  return {
    title: `${t.aboutMetaTitle} | ${t.brandName}`,
    description: t.aboutMetaDesc,
    alternates: { canonical: `${base}/about` },
  };
}

export default async function AboutPage() {
  const data = await getAboutPageData();
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const store = data.store;
  const name = lang === "ar" ? store.nameAr || store.nameEn : store.nameEn || store.nameAr;
  const slogan = lang === "ar" ? store.sloganAr || store.sloganEn : store.sloganEn || store.sloganAr;
  const address = lang === "ar" ? store.addressAr || store.addressEn : store.addressEn || store.addressAr;
  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
    description: slogan || t.aboutMetaDesc,
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
          },
        }
      : {}),
    ...(store.contactPhone ? { telephone: store.contactPhone } : {}),
    ...(store.contactEmail ? { email: store.contactEmail } : {}),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <AboutPageClient store={store} stats={data.stats} features={data.features} team={data.team} />
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
