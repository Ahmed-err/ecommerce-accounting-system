"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, PackageSearch } from "lucide-react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { trackGuestOrderAction } from "@/app/actions/user-orders";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import { formatDate, formatMoney } from "@/lib/account-format";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function TrackOrderClient({ initialRef = "" }) {
  const t = useT();
  const { lang } = useLanguage();
  const [orderNumber, setOrderNumber] = useState(initialRef);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setResult(await trackGuestOrderAction({ orderNumber, phone }));
    } catch {
      setResult({ success: false, error: "system" });
    } finally {
      setBusy(false);
    }
  };

  const error = result && !result.success ? t[`trackErr_${result.error}`] || t.trackErr_system : null;
  const order = result?.success ? result.order : null;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <label htmlFor="track-ref" className="text-sm font-medium text-foreground">{t.trackOrderNumber}</label>
          <input id="track-ref" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} dir="ltr" autoComplete="off" placeholder="EIZ5HPD2" className={`${inputClass} rtl:text-right`} />
          <p className="text-xs text-muted-foreground">{t.trackOrderNumberHint}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="track-phone" className="text-sm font-medium text-foreground">{t.trackPhone}</label>
          <input id="track-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="0912345678" className={`${inputClass} rtl:text-right`} />
        </div>
        {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-label={t.trackSubmit} /> : t.trackSubmit}
        </button>
      </form>

      {order ? (
        <section aria-live="polite" className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-foreground">
                {t.accountOrderHeading} <span dir="ltr">#{order.ref}</span>
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(order.createdAt, lang)}</p>
            </div>
            <OrderStatusBadge status={order.status} t={t} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t.accountOrdersItemsCount.replace("{count}", order.itemCount)} · <span className="font-semibold text-foreground">{formatMoney(order.totalAmount, t)}</span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t.trackHelp}{" "}
            <Link href="/contact" className="font-medium text-accent-text hover:underline">{t.contactSalesTitle}</Link>
          </p>
        </section>
      ) : (
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{t.trackSignedInHint} <Link href="/account/orders" className="font-medium text-accent-text hover:underline">{t.myOrdersTitle}</Link></p>
        </div>
      )}
    </div>
  );
}
