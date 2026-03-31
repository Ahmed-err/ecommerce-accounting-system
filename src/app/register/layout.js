import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: t.register + " | " + b.brandName,
  };
}

export default function RegisterLayout({ children }) {
  return children;
}
