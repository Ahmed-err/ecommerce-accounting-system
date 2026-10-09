import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getAccountSettingsData } from "@/lib/user-settings";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { verifyEmailFromToken } from "@/app/actions/user";
import AccountSettingsClient from "@/components/account/AccountSettingsClient";
import AccountNav from "@/components/account/AccountNav";
import { Suspense } from "react";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return { title: `${t.accountSettingsTitle} | ${b.brandName}`, robots: { index: false } };
}

function TabSkeleton() {
  return <div className="min-h-[280px] animate-pulse rounded-xl bg-muted/40" />;
}

export default async function AccountSettingsPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/account/settings")}`);
  }

  const params = await searchParams;
  const vt = params?.vt;
  const ve = params?.ve;
  if (vt && ve) {
    const verified = await verifyEmailFromToken(decodeURIComponent(String(ve)), String(vt));
    if (verified.success) {
      redirect("/account/settings?tab=profile");
    }
  }

  const tab = ["profile", "addresses", "security", "notifications", "preferences"].includes(params?.tab)
    ? params.tab
    : "profile";

  const [data, store] = await Promise.all([
    getAccountSettingsData(session.user.id),
    getOrCreateStoreSettings(),
  ]);

  const lang = (await cookies()).get("lang")?.value || "ar";
  const t = translations[lang] || translations.ar;
  const whatsappEnabled = !!store.notificationConfig?.smsWhatsappEnabled;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.accountSettingsTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground"><span dir="ltr">{data.user?.email}</span></p>
        </div>
        <AccountNav active="settings" t={t} />
        <Suspense fallback={<TabSkeleton />}>
          <AccountSettingsClient
            initialTab={tab}
            user={data.user}
            addresses={data.addresses}
            hasOAuth={data.hasOAuth}
            whatsappEnabled={whatsappEnabled}
          />
        </Suspense>
      </div>
    </div>
  );
}
