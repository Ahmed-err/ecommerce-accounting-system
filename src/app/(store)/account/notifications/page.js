import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import CustomerNotificationsClient from "@/components/account/CustomerNotificationsClient";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/account/notifications");

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";

  return (
    <div className={`bg-background ${isRTL ? "text-right" : "text-left"}`}>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {lang === "ar" ? "الإشعارات" : "Notifications"}
          </h1>
          <p className="text-muted-foreground">
            {lang === "ar" ? "تحديثات حالة طلباتك" : "Updates about your orders"}
          </p>
        </div>
        <CustomerNotificationsClient
          emptyText={lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
          markAllText={lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
          loadingText={lang === "ar" ? "جارٍ التحميل..." : "Loading..."}
          viewOrderText={t.viewOrder || (lang === "ar" ? "عرض الطلب" : "View order")}
          lang={lang}
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}
