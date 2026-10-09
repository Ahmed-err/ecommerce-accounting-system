import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export async function generateMetadata() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  const t = translations[lang] || translations.ar;
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.authForgotTitle} | ${b.brandName}`, robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
