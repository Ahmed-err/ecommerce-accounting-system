import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import AccountNav from "@/components/account/AccountNav";
import CustomerNotificationsClient from "@/components/account/CustomerNotificationsClient";

export const dynamic = "force-dynamic";

async function getLang() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  return { lang, t: translations[lang] || translations.ar };
}

export async function generateMetadata() {
  const { lang, t } = await getLang();
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.notifications} | ${b.brandName}`, robots: { index: false } };
}

export default async function AccountNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/account/notifications");
  const { lang, t } = await getLang();

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.notifications}</h1>
          <p className="mt-1 text-muted-foreground">{t.accountNotificationsSubtitle}</p>
        </div>
        <AccountNav active="notifications" t={t} />
        <CustomerNotificationsClient
          emptyText={t.accountNotificationsEmpty}
          markAllText={t.accountNotificationsMarkAll}
          loadingText={t.accountNotificationsLoading}
          viewOrderText={t.accountViewOrder}
          lang={lang}
        />
      </div>
    </div>
  );
}
