import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/translations";
import { cookies } from "next/headers";
import AdminSettingsClient from "@/components/admin/AdminSettingsClient";
import { getAdminSettingsData } from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin");
  }
  const params = await searchParams;
  const tab = params?.tab || "store";

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = getTranslations(lang);
  const initialData = await getAdminSettingsData();

  return (
    <div className="space-y-8 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {t.adminSettings || "Admin Settings"}
        </h1>
        <p className="text-gray-400 text-sm">
          {lang === 'ar' ? 'إدارة إعدادات حسابك وتفضيلات النظام.' : 'Manage your account settings and system preferences.'}
        </p>
      </div>

      <div className="max-w-6xl">
        <AdminSettingsClient initialTab={tab} initialData={initialData} lang={lang} />
      </div>
    </div>
  );
}
