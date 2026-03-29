import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAccountSettingsData } from "@/lib/user-settings";
import { getOrCreateStoreSettings } from "@/lib/settings";
import { verifyEmailFromToken } from "@/app/actions/user";
import AccountSettingsClient from "@/components/account/AccountSettingsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  return { title: `${t.accountSettingsTitle} | ${t.brandName}` };
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

  const whatsappEnabled = !!store.notificationConfig?.smsWhatsappEnabled;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<TabSkeleton />}>
          <AccountSettingsClient
            initialTab={tab}
            user={data.user}
            addresses={data.addresses}
            sessions={data.sessions}
            hasOAuth={data.hasOAuth}
            whatsappEnabled={whatsappEnabled}
          />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
