import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);

  return {
    title: lang === "ar" ? `نقطة البيع | ${b.brandName}` : `POS | ${b.brandName}`,
    description: lang === "ar" ? "واجهة نقطة البيع" : "Point of Sale Terminal",
  };
}

export default async function POSLayout({ children }) {
  const session = await auth();

  // Strict check: Only Admin, Manager, and Cashier can access POS
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    return notFound();
  }

  return (
    <div className="min-h-dvh bg-gray-950 text-white font-sans overflow-x-hidden">
      {/* Clean layout specifically for POS Terminal (no generic headers/footers) */}
      <main className="h-screen w-full flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
