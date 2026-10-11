import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import TrackOrderClient from "@/components/store/TrackOrderClient";

async function getLang() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  return { lang, t: translations[lang] || translations.ar };
}

export async function generateMetadata() {
  const { lang, t } = await getLang();
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.trackTitle} | ${b.brandName}`, robots: { index: false, follow: true } };
}

export default async function TrackOrderPage({ searchParams }) {
  const { t } = await getLang();
  const params = await searchParams;
  // Links from order emails may carry the ref; the phone is always typed, never in the URL.
  const ref = typeof params?.orderNumber === "string" ? params.orderNumber.slice(0, 40) : "";
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.trackTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.trackIntro}</p>
        </div>
        <TrackOrderClient initialRef={ref} />
      </div>
    </div>
  );
}
