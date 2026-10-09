import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { translations } from "@/lib/translations";
import { getBrandingForLang, getStoreBranding } from "@/lib/branding";
import { getUserOrderById } from "@/lib/user-orders";
import { orderRef, paymentMethodLabel } from "@/lib/order-labels";
import { formatDate, formatMoney } from "@/lib/account-format";
import AccountOrderActions from "@/components/account/AccountOrderActions";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import ProductImage from "@/components/media/ProductImage";

export const dynamic = "force-dynamic";

// Counted from the last order update until orders record when they were delivered (P3.3).
const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

async function getLang() {
  const lang = (await cookies()).get("lang")?.value || "ar";
  return { lang, t: translations[lang] || translations.ar };
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { lang, t } = await getLang();
  const b = getBrandingForLang(await getStoreBranding(), lang);
  return { title: `${t.accountOrderTitle.replace("{ref}", orderRef(id))} | ${b.brandName}`, robots: { index: false } };
}

export default async function AccountOrderDetailPage({ params }) {
  const session = await auth();
  const { id } = await params;
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/account/orders/${id}`)}`);

  const { lang, t } = await getLang();
  const order = await getUserOrderById(session.user.id, id);
  if (!order) notFound();

  const returnOpen = order.status === "DELIVERED" && Date.now() - new Date(order.updatedAt).getTime() <= RETURN_WINDOW_MS;
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discount = order.invoice?.discountAmount || 0;
  const tax = order.invoice?.taxAmount || 0;
  const productName = (p) => (lang === "ar" ? p?.nameAr || p?.name : p?.nameEn || p?.name) || t.deletedProduct;
  const address = [order.guestAddress, order.guestCity].filter(Boolean).join("، ");
  const Back = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <Back className="h-4 w-4" aria-hidden /> {t.accountOrdersBack}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t.accountOrderHeading} <span dir="ltr">#{orderRef(order.id)}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt, lang, true)}</p>
          </div>
          <OrderStatusBadge status={order.status} t={t} className="text-sm" />
        </div>

        <section className="rounded-xl border border-border bg-card">
          <h2 className="sr-only">{t.accountOrderItems}</h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => {
              const name = productName(item.product);
              const live = item.product && item.product.isActive !== false;
              return (
                <li key={item.id} className="flex items-center gap-3 p-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                    <ProductImage src={item.product?.images?.[0]} alt="" sizes="56px" compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    {live ? (
                      <Link href={`/products/${item.product.id}`} className="line-clamp-2 text-sm font-medium text-foreground hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.accountOrderQty.replace("{qty}", item.quantity)} × {formatMoney(item.price, t)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">{formatMoney(item.price * item.quantity, t)}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
            {order.guestName || order.guestPhone || address ? (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground">{t.accountOrderDelivery}</h2>
                {order.guestName ? <p className="mt-1 text-foreground">{order.guestName}</p> : null}
                {order.guestPhone ? <p className="text-foreground"><span dir="ltr">{order.guestPhone}</span></p> : null}
                {address ? <p className="text-foreground">{address}</p> : null}
              </div>
            ) : null}
            <div>
              <h2 className="text-xs font-medium text-muted-foreground">{t.paymentMethodTitle}</h2>
              <p className="mt-1 text-foreground">{paymentMethodLabel(order.paymentMethod, t)}</p>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
            <h2 className="sr-only">{t.accountOrderSummary}</h2>
            <div className="flex justify-between"><span>{t.subtotal}</span><span>{formatMoney(subtotal, t)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between"><span>{t.accountOrderDiscount}</span><span>−{formatMoney(discount, t)}</span></div>
            )}
            <div className="flex justify-between"><span>{t.delivery}</span><span>{formatMoney(order.shippingCost, t)}</span></div>
            {tax > 0 && <div className="flex justify-between"><span>{t.estimatedTax}</span><span>{formatMoney(tax, t)}</span></div>}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>{t.grandTotal}</span><span>{formatMoney(order.totalAmount, t)}</span>
            </div>
          </section>
        </div>

        <AccountOrderActions
          orderId={order.id}
          status={order.status}
          returnOpen={returnOpen}
          lines={order.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            name: productName(it.product),
            isActive: it.product != null && it.product.isActive !== false,
          }))}
        />
      </div>
    </div>
  );
}
