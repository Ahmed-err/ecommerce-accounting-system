import { auth } from "@/auth";
import { getUserProfile } from "@/app/actions/user";
import SettingsClient from "@/components/store/SettingsClient";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/translations";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || session.user.role === "CUSTOMER") {
    redirect("/admin");
  }

  const user = await getUserProfile();
  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = getTranslations(lang);

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

      <div className="max-w-4xl">
        <SettingsClient user={user} />
      </div>
    </div>
  );
}
