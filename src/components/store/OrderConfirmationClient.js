"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getMyOrderConfirmation } from "@/app/actions/catalog";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { Check, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeOrderIdParam(raw) {
  if (typeof raw === "string") {
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
  return "";
}

export default function OrderConfirmationClient() {
  const params = useParams();
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang] || translations.ar;
  const { data: session, status: sessionStatus } = useSession();
  const [order, setOrder] = useState(null);

  const id = useMemo(() => normalizeOrderIdParam(params?.id), [params?.id]);
  const shortId = id ? id.slice(-8).toUpperCase() : "—";

  useEffect(() => {
    document.title = `${t.orderConfirmationThanks} | ${brandName}`;
  }, [t.orderConfirmationThanks, brandName]);

  useEffect(() => {
    let cancelled = false;
    if (!id || sessionStatus !== "authenticated" || !session?.user?.id) {
      setOrder(null);
      return undefined;
    }
    getMyOrderConfirmation(id)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, session?.user?.id, sessionStatus]);

  const showGuestNote =
    sessionStatus !== "loading" &&
    (sessionStatus === "unauthenticated" || !session?.user);

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
            {t.orderNumberIs}:{" "}
            <span className="font-mono font-semibold text-foreground">{shortId}</span>
          </p>
          {showGuestNote ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t.orderConfirmationGuestLine}
            </p>
          ) : null}
          {order && Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="mt-8 border-t border-border pt-6 text-start">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="h-4 w-4 text-amber-500" />
                {t.orderConfirmationYourItems}
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {order.items
                  .filter((it) => it && typeof it.id === "string")
                  .map((it) => {
                    const line = Number(it.price);
                    const linePrice = Number.isFinite(line) ? line : 0;
                    const qty = Number.isFinite(Number(it.quantity))
                      ? Number(it.quantity)
                      : 0;
                    return (
                      <li
                        key={it.id}
                        className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
                      >
                        <span className="min-w-0 truncate">{it.productName || "—"}</span>
                        <span className="shrink-0 tabular-nums">
                          ×{qty} · {linePrice.toLocaleString()} {t.currency}
                        </span>
                      </li>
                    );
                  })}
              </ul>
              <p className="mt-4 text-lg font-bold text-amber-600 dark:text-amber-400">
                {t.grandTotal}:{" "}
                {Number.isFinite(Number(order.totalAmount))
                  ? Number(order.totalAmount).toLocaleString()
                  : "—"}{" "}
                {t.currency}
              </p>
            </div>
          ) : null}
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
            {session?.user ? (
              <Link
                href="/account/orders"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t.myOrders}
              </Link>
            ) : null}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t.contactRecall}</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
