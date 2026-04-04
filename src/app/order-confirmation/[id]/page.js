import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/auth";
import { getMyOrderConfirmation } from "@/app/actions/catalog";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { Check, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { normalizeAppLang } from "@/lib/i18n-lang";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const t = translations[lang] || translations.ar;
  const branding = await getStoreBranding();
  const b = getBrandingForLang(branding, lang);
  return {
    title: `${t.orderConfirmationThanks} | ${b.brandName}`,
    description: t.orderConfirmationGuestLine,
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmationPage({ params }) {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const lang = normalizeAppLang(cookieStore.get("lang")?.value);
  const t = translations[lang] || translations.ar;
  const isRTL = lang === "ar";

  const order =
    session?.user?.id && id ? await getMyOrderConfirmation(id) : null;

  const shortId = id ? id.slice(-8).toUpperCase() : "";

  return (
    <main
      className={cn(
        "min-h-screen bg-background",
        isRTL ? "text-right" : "text-left"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.orderConfirmationThanks}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t.orderNumberIs}: <span className="font-mono font-semibold text-foreground">{shortId}</span>
          </p>
          {!session && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t.orderConfirmationGuestLine}
            </p>
          )}
          {order && Array.isArray(order.items) && order.items.length > 0 && (
            <div className="mt-8 border-t border-border pt-6 text-start">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="h-4 w-4 text-amber-500" />
                {t.orderConfirmationYourItems}
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {order.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="min-w-0 truncate">{it.productName}</span>
                    <span className="shrink-0 tabular-nums">
                      ×{it.quantity} · {Number(it.price).toLocaleString()} {t.currency}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-lg font-bold text-amber-600 dark:text-amber-400">
                {t.grandTotal}: {Number(order.totalAmount).toLocaleString()} {t.currency}
              </p>
            </div>
          )}
          <div
            className={cn(
              "mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center",
              isRTL && "sm:flex-row-reverse"
            )}
          >
            <Link
              href="/products"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-amber-500 text-black hover:bg-amber-400"
              )}
            >
              {t.continueShopping}
            </Link>
            {session?.user && (
              <Link href="/my-orders" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t.myOrders}
              </Link>
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t.contactRecall}</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
