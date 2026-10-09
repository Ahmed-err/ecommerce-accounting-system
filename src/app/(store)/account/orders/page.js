import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { listUserOrders } from "@/lib/user-orders";
import { ORDER_STATUSES, orderStatusLabel, paymentMethodLabel, orderRef } from "@/lib/order-labels";
import { formatDate, formatMoney } from "@/lib/account-format";
import AccountNav from "@/components/account/AccountNav";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

async function getLang() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  return { lang, t: translations[lang] || translations.ar };
}

export async function generateMetadata() {
  const { lang, t } = await getLang();
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.myOrdersTitle} | ${b.brandName}`, robots: { index: false } };
}

export default async function AccountOrdersPage({ searchParams }) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/account/orders");

  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params?.page)) || 1);
  const status = ORDER_STATUSES.includes(params?.status) ? params.status : "all";
  const search = typeof params?.search === "string" ? params.search.trim().replace(/^#/, "") : "";
  const { lang, t } = await getLang();

  const { orders, total } = await listUserOrders(session.user.id, { page, status, search, limit: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = status !== "all" || search;

  const pageHref = (p) => {
    const q = new URLSearchParams();
    if (p > 1) q.set("page", String(p));
    if (status !== "all") q.set("status", status);
    if (search) q.set("search", search);
    const s = q.toString();
    return s ? `?${s}` : "/account/orders";
  };
  const Prev = lang === "ar" ? ChevronRight : ChevronLeft;
  const Next = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.myOrdersTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.trackManageOrders}</p>
        </div>
        <AccountNav active="orders" t={t} />

        <form className="flex flex-col gap-2 sm:flex-row" role="search">
          <label className="sr-only" htmlFor="orders-search">{t.accountOrdersSearch}</label>
          <input
            id="orders-search"
            name="search"
            defaultValue={search}
            placeholder={t.accountOrdersSearch}
            className="h-11 w-full rounded-lg border border-input sm:flex-1 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <label className="sr-only" htmlFor="orders-status">{t.adminStatus}</label>
          <select
            id="orders-status"
            name="status"
            defaultValue={status}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground sm:w-48"
          >
            <option value="all">{t.accountOrdersAllStatuses}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{orderStatusLabel(s, t)}</option>
            ))}
          </select>
          <button className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t.accountOrdersFilter}
          </button>
        </form>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-semibold text-foreground">{filtered ? t.noOrdersFound : t.accountOrdersEmpty}</p>
            {filtered ? (
              <Link href="/account/orders" className="mt-2 inline-block text-sm font-medium text-accent-text hover:underline">
                {t.accountOrdersClear}
              </Link>
            ) : (
              <Link href="/products" className="mt-2 inline-block text-sm font-medium text-accent-text hover:underline">
                {t.startShopping}
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {orders.map((o) => {
              const count = o.items.reduce((n, it) => n + it.quantity, 0);
              return (
                <li key={o.id}>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-muted/50 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground"><span dir="ltr">#{orderRef(o.id)}</span></p>
                      <p className="text-sm text-muted-foreground">{formatDate(o.createdAt, lang)}</p>
                    </div>
                    <div className="justify-self-end sm:order-last">
                      <OrderStatusBadge status={o.status} t={t} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.accountOrdersItemsCount.replace("{count}", count)} · {paymentMethodLabel(o.paymentMethod, t)}
                    </p>
                    <p className="justify-self-end text-sm font-semibold text-foreground sm:justify-self-start">
                      {formatMoney(o.totalAmount, t)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-between text-sm" aria-label={t.accountOrdersPages}>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">
                <Prev className="h-4 w-4" aria-hidden /> {t.accountOrdersPrev}
              </Link>
            ) : <span />}
            <span className="text-muted-foreground">
              {t.accountOrdersPage.replace("{page}", page).replace("{pages}", pages)}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">
                {t.accountOrdersNext} <Next className="h-4 w-4" aria-hidden />
              </Link>
            ) : <span />}
          </nav>
        )}
      </div>
    </div>
  );
}
