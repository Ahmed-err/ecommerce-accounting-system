import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LegalDocClient from "@/components/store/LegalDocClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getLegalPageForStore } from "@/lib/legal";

export const revalidate = 3600;

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const base = process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
  return {
    title: `${t.privacyPageTitle} | ${t.brandName}`,
    description: t.privacyPageDesc,
    alternates: { canonical: `${base}/privacy` },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const legal = await getLegalPageForStore("PRIVACY");
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <LegalDocClient
        contentAr={legal.contentAr}
        contentEn={legal.contentEn}
        updatedAt={legal.updatedAt}
        docTitle={translations[lang].privacyPageTitle}
      />
      <Footer />
    </main>
  );
}
