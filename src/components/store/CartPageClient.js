"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/store/CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { CHECKOUT_TAX_RATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { previewCoupon } from "@/app/actions/coupon";
import { getCatalogProducts } from "@/app/actions/catalog";
import ProductCard from "@/components/store/ProductCard";

function CartSkeleton() {
  return (
    <div
      className={cn(
        "grid gap-8 xl:gap-10",
        "lg:grid-cols-[1fr_min(100%,380px)]"
      )}
      aria-busy="true"
    >
      <div className="min-w-0 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="h-24 w-24 shrink-0 rounded-xl bg-muted sm:h-28 sm:w-28" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
              <div className="h-4 w-full max-w-[240px] rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="flex gap-2 pt-2">
                <div className="h-10 w-28 rounded-lg bg-muted" />
                <div className="h-10 w-20 rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="hidden h-fit rounded-2xl border border-border bg-card p-6 shadow-sm lg:block">
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </aside>
    </div>
  );
}

export default function CartPageClient() {
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang] || translations.ar;
  const {
    cart,
    savedForLater,
    removeFromCart,
    updateQuantity,
    moveToSavedForLater,
    restoreFromSavedForLater,
    removeSavedForLater,
    cartTotal,
    cartCount,
    loaded,
    appliedCoupon,
    setAppliedCoupon,
  } = useCart();

  const [couponDraft, setCouponDraft] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [crossSell, setCrossSell] = useState([]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon?.percentOff) return 0;
    return Math.min(
      cartTotal,
      Math.round(cartTotal * (appliedCoupon.percentOff / 100) * 100) / 100
    );
  }, [appliedCoupon, cartTotal]);

  const afterDiscount = Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100);

  const { estimatedTax, estimatedGrand } = useMemo(() => {
    const tax = Math.round(afterDiscount * CHECKOUT_TAX_RATE * 100) / 100;
    const grand = Math.round((afterDiscount + tax) * 100) / 100;
    return { estimatedTax: tax, estimatedGrand: grand };
  }, [afterDiscount]);

  const categoryForCrossSell = cart.find((i) => i.categoryName)?.categoryName;

  useEffect(() => {
    if (!categoryForCrossSell) {
      setCrossSell([]);
      return;
    }
    let cancelled = false;
    getCatalogProducts({
      category: categoryForCrossSell,
      page: 1,
      limit: 8,
      sort: "newest",
    }).then(({ products }) => {
      if (cancelled || !products?.length) return;
      const inCart = new Set(cart.map((c) => c.id));
      setCrossSell(products.filter((p) => !inCart.has(p.id)).slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, [categoryForCrossSell, cart]);

  const handleApplyCartCoupon = async () => {
    const code = couponDraft.trim();
    if (!code) {
      toast.error(t.couponInvalid);
      return;
    }
    setCouponBusy(true);
    try {
      const res = await previewCoupon(code);
      if (res.valid) {
        setAppliedCoupon({ code: res.code, percentOff: res.percentOff });
        toast.success(t.couponToastSuccess);
      } else {
        setAppliedCoupon(null);
        if (res.error === "rate_limit") toast.error(t.couponRateLimited);
        else toast.error(t.couponInvalid);
      }
    } finally {
      setCouponBusy(false);
    }
  };

  const bumpQty = useCallback(
    (item, delta) => {
      const cap =
        typeof item.stock === "number" ? item.stock : Number.MAX_SAFE_INTEGER;
      const next = item.quantity + delta;
      if (delta > 0 && item.quantity >= cap) {
        toast.message(t.stockCappedWarning);
        return;
      }
      updateQuantity(item.id, next);
    },
    [updateQuantity, t]
  );

  const summaryRows = (
    <>
      <div
        className={cn(
          "flex justify-between gap-4 text-sm text-muted-foreground",
          isRTL && "flex-row-reverse"
        )}
      >
        <span className="min-w-0 leading-snug">
          {t.subtotal}{" "}
          <span className="text-foreground/80">
            ({cartCount} {t.items})
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-foreground">
          {cartTotal.toLocaleString()} {t.currency}
        </span>
      </div>
      {discountAmount > 0 && (
        <div
          className={cn(
            "flex justify-between gap-4 text-sm text-emerald-600 dark:text-emerald-400",
            isRTL && "flex-row-reverse"
          )}
        >
          <span>{t.discountLabel}</span>
          <span className="shrink-0 tabular-nums">
            −{discountAmount.toLocaleString()} {t.currency}
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex justify-between gap-4 text-sm text-muted-foreground",
          isRTL && "flex-row-reverse"
        )}
      >
        <span className="min-w-0 leading-snug">
          {t.estimatedTax}{" "}
          <span className="text-xs opacity-80">
            ({Math.round(CHECKOUT_TAX_RATE * 100)}%)
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-foreground">
          {estimatedTax.toLocaleString()} {t.currency}
        </span>
      </div>
      <div
        className={cn(
          "flex justify-between gap-4 text-sm text-muted-foreground",
          isRTL && "flex-row-reverse"
        )}
      >
        <span>{t.delivery}</span>
        <span className="max-w-[55%] text-end text-xs leading-snug text-amber-600 dark:text-amber-400">
          {t.shippingAtCheckout}
        </span>
      </div>
    </>
  );

  if (!loaded) {
    return <CartSkeleton />;
  }

  if (cart.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-16 text-center shadow-sm sm:px-8 sm:py-24"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20 sm:h-24 sm:w-24">
          <ShoppingBag
            className="h-9 w-9 text-amber-600 sm:h-11 sm:w-11 dark:text-amber-400"
            strokeWidth={1.25}
          />
        </div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {brandName}
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
          {t.cartEmpty}
        </h2>
        <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base">
          {t.addSomeProducts}
        </p>
        <Link
          href="/products"
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-11 w-full max-w-xs touch-manipulation items-center justify-center gap-2 bg-amber-500 text-black hover:bg-amber-400 sm:w-auto"
          )}
        >
          {isRTL ? (
            <ArrowLeft className="h-4 w-4 shrink-0" />
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0" />
          )}
          {t.startShoppingBtn}
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="pb-28 lg:pb-0">
      <div
        className={cn(
          "mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <p className="text-sm text-muted-foreground">
          {cartCount} {t.items} · {cartTotal.toLocaleString()} {t.currency}
        </p>
        <Link
          href="/products"
          className={cn(
            "inline-flex min-h-10 touch-manipulation items-center gap-2 text-sm font-medium text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-400",
            isRTL && "flex-row-reverse"
          )}
        >
          {isRTL ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4 rotate-180" />
          )}
          {t.continueShopping}
        </Link>
      </div>

      <div
        className={cn(
          "grid gap-8 xl:gap-10",
          isRTL
            ? "lg:grid-cols-[min(100%,380px)_1fr]"
            : "lg:grid-cols-[1fr_min(100%,380px)]"
        )}
      >
        <div
          className={cn(
            "min-w-0 space-y-3 sm:space-y-4",
            isRTL && "lg:col-start-2 lg:row-start-1"
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              {t.cartYourItems}
            </h2>
          </div>
          <AnimatePresence mode="popLayout">
            {cart.map((item) => {
              const line = item.price * item.quantity;
              const cap =
                typeof item.stock === "number"
                  ? item.stock
                  : Number.MAX_SAFE_INTEGER;
              const atCap = item.quantity >= cap;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
                    "p-3 sm:p-4 md:p-5"
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-4 sm:flex-row sm:items-stretch",
                      isRTL && "sm:flex-row-reverse"
                    )}
                  >
                    <Link
                      href={`/products/${item.id}`}
                      className="relative mx-auto h-28 w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-muted sm:mx-0 sm:h-24 sm:w-24 md:h-28 md:w-28"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width:640px) 200px, 112px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </Link>

                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col justify-between gap-3",
                        isRTL ? "text-right" : "text-left"
                      )}
                    >
                      <div>
                        <Link
                          href={`/products/${item.id}`}
                          className="line-clamp-2 font-semibold leading-snug text-foreground hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.unitPrice}:{" "}
                          <span className="font-medium text-foreground">
                            {item.price.toLocaleString()} {t.currency}
                          </span>
                        </p>
                        {typeof item.stock === "number" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.inStock}: {item.stock}
                          </p>
                        )}
                      </div>

                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-3 sm:gap-4",
                          isRTL && "flex-row-reverse sm:flex-row-reverse"
                        )}
                      >
                        <div
                          className={cn(
                            "inline-flex h-11 items-center rounded-xl border border-input bg-background",
                            isRTL && "flex-row-reverse"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => bumpQty(item, -1)}
                            className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={t.decreaseQuantity}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[2.5rem] px-1 text-center text-sm font-semibold tabular-nums text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => bumpQty(item, 1)}
                            disabled={atCap}
                            className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={t.increaseQuantity}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div
                          className={cn(
                            "flex flex-1 flex-wrap items-center gap-3 sm:justify-end",
                            isRTL && "sm:flex-row-reverse"
                          )}
                        >
                          <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {t.cartLineTotal}: {line.toLocaleString()}{" "}
                            {t.currency}
                          </span>
                          <div
                            className={cn(
                              "flex flex-wrap items-center gap-2",
                              isRTL && "flex-row-reverse"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => moveToSavedForLater(item.id)}
                              className="inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-amber-600 hover:underline dark:hover:text-amber-400"
                            >
                              {t.moveToSaved}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className={cn(
                                "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-destructive transition-colors hover:bg-destructive/10",
                                isRTL && "flex-row-reverse"
                              )}
                            >
                              <Trash2 className="h-4 w-4 shrink-0" />
                              {t.remove}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {savedForLater.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-base font-bold text-foreground">
                {t.savedForLaterTitle}
              </h3>
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-3">
                {savedForLater.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{item.name}</span>
                    <div className={cn("flex shrink-0 gap-2", isRTL && "flex-row-reverse")}>
                      <button
                        type="button"
                        onClick={() => restoreFromSavedForLater(item.id)}
                        className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
                      >
                        {t.restoreToCart}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedForLater(item.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {crossSell.length > 0 && (
            <div className="mt-10 space-y-4">
              <h3 className="text-lg font-bold text-foreground">{t.crossSellTitle}</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {crossSell.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside
          className={cn(
            "h-fit rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 xl:p-6",
            isRTL && "lg:col-start-1 lg:row-start-1"
          )}
        >
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {t.orderSummary}
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {t.estimatedDeliveryHint}
          </p>
          <div className={cn("mb-4 flex gap-2", isRTL && "flex-row-reverse")}>
            <Input
              value={couponDraft}
              onChange={(e) => setCouponDraft(e.target.value)}
              placeholder={t.couponPlaceholder}
              className="h-10"
              disabled={couponBusy}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 shrink-0 touch-manipulation"
              disabled={couponBusy}
              onClick={handleApplyCartCoupon}
            >
              {couponBusy ? t.couponApplying : t.applyCoupon}
            </Button>
          </div>
          {appliedCoupon && (
            <p className="mb-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t.couponSavedInline}: {appliedCoupon.code} (−{appliedCoupon.percentOff}%)
            </p>
          )}
          <div className="space-y-3">{summaryRows}</div>
          <Separator className="my-4" />
          <div
            className={cn(
              "mb-2 flex justify-between gap-4 text-lg font-bold",
              isRTL && "flex-row-reverse"
            )}
          >
            <span className="text-foreground">{t.grandTotal}</span>
            <span className="tabular-nums text-amber-600 dark:text-amber-400">
              {estimatedGrand.toLocaleString()} {t.currency}
            </span>
          </div>
          <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
            {t.cartGrandTotalHint}
          </p>
          <Link
            href="/checkout"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 bg-amber-500 text-black hover:bg-amber-400"
            )}
          >
            {t.proceedToCheckout}
            {isRTL ? (
              <ArrowLeft className="h-4 w-4 shrink-0" />
            ) : (
              <ArrowRight className="h-4 w-4 shrink-0" />
            )}
          </Link>
        </aside>
      </div>

      {/* Mobile checkout bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)] lg:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4">
          <div className={cn("min-w-0 flex-1", isRTL && "text-right")}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t.grandTotal}
            </p>
            <p className="truncate text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {estimatedGrand.toLocaleString()} {t.currency}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t.estimatedTax} · {Math.round(CHECKOUT_TAX_RATE * 100)}%
            </p>
          </div>
          <Link
            href="/checkout"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0 touch-manipulation bg-amber-500 px-5 text-black hover:bg-amber-400"
            )}
          >
            {t.checkout}
          </Link>
        </div>
      </div>
    </div>
  );
}
