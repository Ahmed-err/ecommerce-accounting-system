import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SuppliersModuleClient from "@/components/admin/SuppliersModuleClient";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return { title: `${t.adminSuppliersTitle} | ${b.brandName}` };
}

export default async function AdminSuppliersPage() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  return <SuppliersModuleClient />;
}
