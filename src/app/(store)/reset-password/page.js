import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { validateResetToken } from "@/app/actions/reset-password";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export async function generateMetadata() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  const t = translations[lang] || translations.ar;
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.authResetTitle} | ${b.brandName}`, robots: { index: false } };
}

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";
  const token = typeof params?.token === "string" ? params.token : "";
  // Check the link first, so nobody types a new password into an expired link.
  const { valid } = email && token ? await validateResetToken(email, token) : { valid: false };
  return <ResetPasswordForm email={email} token={token} linkValid={valid} />;
}
