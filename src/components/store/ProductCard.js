"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Heart, GitCompareArrows, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "./CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WISHLIST_KEY = "powerstore_wishlist";

export default function ProductCard({
  product,
  index = 0,
  compareIds = [],
  onToggleCompare,
  compactRail = false,
  homeShowcase = false,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const { addToCart } = useCart();

  const purchase = Number(product.purchasePrice) || 0;
  const selling = Number(product.sellingPrice) || 0;
  const refPrice = purchase > 0 ? purchase * 1.5 : 0;
  const hasDiscount = refPrice > 0 && selling < refPrice;
  const offPct = hasDiscount
    ? Math.min(99, Math.round((1 - selling / refPrice) * 100))
    : 0;

  const [imgError, setImgError] = useState(false);
  const [qvOpen, setQvOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const imageUrl = product.images?.[0];
  const isOutOfStock = product.stock <= 0;
  const compared = compareIds.includes(product.id);

  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      setWishlisted(Array.isArray(w) && w.includes(product.id));
    } catch {
      setWishlisted(false);
    }
  }, [product.id]);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let w = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      if (!Array.isArray(w)) w = [];
      if (w.includes(product.id)) {
        w = w.filter((x) => x !== product.id);
        setWishlisted(false);
      } else {
        w.push(product.id);
        setWishlisted(true);
      }
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(w));
    } catch {
      /* ignore */
    }
  };

  const handleToggleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onToggleCompare) return;
    if (!compared && compareIds.length >= 3) {
      toast.message(t.catalogCompareMax);
      return;
    }
    onToggleCompare(product.id);
  };

  const imgHeight = compactRail
    ? "h-40"
    : homeShowcase
      ? "h-40 w-full sm:h-44 md:h-48 lg:h-[12.5rem]"
      : "h-64";

  const quickBody = (
    <div
      className="overflow-y-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Image */}
      <div className="relative h-56 w-full shrink-0 overflow-hidden bg-muted sm:h-64">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="448px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-20">
            📦
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
            −{offPct}% {t.discountBadge}
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
            {t.outOfStock}
          </span>
        )}
      </div>

      {/* Info */}
      <div
        className={cn(
          "space-y-3 p-5",
          isRTL ? "text-right" : "text-left"
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500">
          {translateCategory(product.category?.name, t)}
        </p>

        <p className="text-base font-bold leading-snug text-foreground sm:text-lg">
          {product.name}
        </p>

        <p className="text-2xl font-extrabold tabular-nums text-foreground">
          {selling.toLocaleString()}{" "}
          <span className="text-base font-medium text-muted-foreground">{t.currency}</span>
        </p>

        {product.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {product.sku && (
            <span>
              {t.productSku}:{" "}
              <span className="font-mono text-foreground">{product.sku}</span>
            </span>
          )}
          <span
            className={cn(
              "font-medium",
              isOutOfStock ? "text-red-500" : "text-emerald-500"
            )}
          >
            {isOutOfStock ? t.outOfStock : `${t.inStock}: ${product.stock}`}
          </span>
        </div>

        <div
          className={cn(
            "flex gap-2 pt-1",
            isRTL && "flex-row-reverse"
          )}
        >
          <Button
            type="button"
            className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
            disabled={isOutOfStock}
            onClick={() => {
              addToCart(product);
              setQvOpen(false);
            }}
          >
            <ShoppingCart className={cn("h-4 w-4 shrink-0", isRTL ? "ms-2" : "me-2")} />
            {t.addToCart}
          </Button>
          <Link
            href={`/products/${product.id}`}
            onClick={() => setQvOpen(false)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "shrink-0 gap-1.5"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {lang === "ar" ? "التفاصيل" : "Details"}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        className={cn(
          "group relative flex min-h-0 flex-col overflow-hidden rounded-3xl border border-foreground/5 bg-card shadow-premium transition-all duration-500 hover:border-amber-500/50 hover:shadow-2xl",
          // `h-full` relies on the parent having an explicit height. On the home featured grid
          // that isn't the case, which can clip the bottom price row.
          homeShowcase
            ? "h-auto min-h-0 border-foreground/10 shadow-lg ring-1 ring-foreground/5"
            : "h-full",
          compactRail && "rounded-2xl",
          homeShowcase && "rounded-2xl sm:rounded-3xl"
        )}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          duration: 0.5,
          delay: index * 0.08,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={
          compactRail
            ? {}
            : homeShowcase
              ? { y: -2, transition: { duration: 0.22 } }
              : {
                  y: -8,
                  transition: { duration: 0.3 },
                }
        }
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(234,88,12,0.1) 100%)",
            zIndex: 0,
          }}
        />

        {!compactRail && onToggleCompare && (
          <label
            className={cn(
              "absolute left-3 top-3 z-20 flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm",
              isRTL && "left-auto right-3"
            )}
          >
            <input
              type="checkbox"
              checked={compared}
              onChange={handleToggleCompare}
              className="size-3.5 accent-amber-500"
            />
            <GitCompareArrows className="h-3 w-3" />
            <span className="hidden sm:inline">{t.catalogCompare}</span>
          </label>
        )}

        <button
          type="button"
          onClick={toggleWishlist}
          className={cn(
            "absolute top-3 z-20 rounded-full border border-white/10 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60",
            isRTL ? "left-3 right-auto" : "right-3",
            !compactRail && onToggleCompare && (isRTL ? "left-24" : "right-24")
          )}
          aria-label={wishlisted ? t.removeFromWishlist : t.addToWishlist}
        >
          <Heart
            className={cn("h-4 w-4", wishlisted && "fill-red-500 text-red-500")}
          />
        </button>

        <div className="relative z-10">
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted/30",
              imgHeight
            )}
          >
            <Link
              href={`/products/${product.id}`}
              className="absolute inset-0 z-10"
              aria-hidden
            />
            <div className="absolute inset-0 z-[5] bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {hasDiscount && (
              <span
                className={cn(
                  "absolute z-[15] rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white",
                  isRTL ? "left-3 right-auto top-3" : "right-3 top-3"
                )}
              >
                −{offPct}% {t.discountBadge}
              </span>
            )}
            {imageUrl && !imgError ? (
              <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-110">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes={
                    homeShowcase
                      ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 28vw, 22vw"
                      : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  }
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                <span className="text-6xl">📦</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {t.noImage}
                </span>
              </div>
            )}

            {isOutOfStock && (
              <span
                className={cn(
                  "absolute z-[15] rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
                  isRTL ? "right-3 top-3" : "left-3 top-3"
                )}
              >
                {t.outOfStock}
              </span>
            )}

            {!compactRail && (
              <button
                type="button"
                onClick={() => setQvOpen(true)}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100 max-md:bg-black/20"
              >
                <span className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm pointer-events-none">
                  {t.quickView}
                </span>
              </button>
            )}
          </div>

          <div
            className={cn(
              "relative z-10 flex min-h-0 flex-1 flex-col p-5 pb-6",
              compactRail && "p-3 pb-4",
              homeShowcase && "gap-2 p-4 pb-4 sm:p-5 sm:pb-5",
              isRTL ? "text-right" : "text-left"
            )}
          >
            <span
              className={cn(
                "font-medium uppercase tracking-wider text-amber-500",
                homeShowcase ? "text-[10px] sm:text-[11px]" : "text-xs"
              )}
            >
              {translateCategory(product.category?.name, t)}
            </span>

            <Link href={`/products/${product.id}`} className="min-h-0">
              <h3
                className={cn(
                  "mt-1 font-bold text-foreground transition-colors group-hover:text-amber-500",
                  compactRail
                    ? "text-sm line-clamp-2 leading-snug"
                    : homeShowcase
                      ? "line-clamp-2 min-h-[2.65rem] text-[15px] font-semibold leading-snug sm:min-h-[2.9rem] sm:text-base sm:leading-snug"
                      : "line-clamp-2 text-lg leading-snug sm:line-clamp-3"
                )}
              >
                {product.name}
              </h3>
            </Link>

            {homeShowcase ? (
              <>
                {product.description ? (
                  <p className="line-clamp-2 min-h-[2.15rem] text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                    {product.description}
                  </p>
                ) : (
                  <div className="min-h-[2.15rem]" />
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:gap-x-4">
                  {product.sku ? (
                    <span className="min-w-0 max-w-full truncate font-mono text-[10px] sm:text-[11px]">
                      {t.productSku}: {product.sku}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      isOutOfStock ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {isOutOfStock ? t.outOfStock : `${t.inStock}: ${product.stock}`}
                  </span>
                </div>
                <div className="mt-auto space-y-3 border-t border-border/70 pt-3.5 sm:pt-4">
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3",
                      "border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent",
                      "dark:border-amber-400/25 dark:from-amber-400/15 dark:via-amber-400/5"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/90 dark:text-amber-300/95">
                      {t.price}
                    </p>
                    <p className="mt-1 flex min-w-0 items-end justify-between gap-2">
                      <span className="min-w-0 truncate text-[1.25rem] font-black tabular-nums leading-none tracking-tight text-foreground sm:text-2xl">
                        {selling.toLocaleString()}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-amber-700 dark:text-amber-400 sm:text-base">
                        {t.currency}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product);
                    }}
                    disabled={isOutOfStock}
                    className="flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-amber-500 px-4 text-sm font-bold text-black shadow-sm transition-all duration-200 hover:bg-amber-400 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm sm:h-11 sm:text-[0.9375rem]"
                    title={t.addToCart}
                  >
                    <ShoppingCart className="h-4 w-4 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]" />
                    <span>{t.addToCart}</span>
                  </button>
                </div>
              </>
            ) : (
              <div
                className={cn(
                  "mt-auto flex items-center justify-between gap-2 pt-3 pb-1"
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-bold tabular-nums text-foreground",
                    compactRail ? "text-base" : "text-xl"
                  )}
                >
                  {selling.toLocaleString()} {t.currency}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart(product);
                  }}
                  disabled={isOutOfStock}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-xl bg-amber-500/10 text-amber-500 transition-all duration-200 hover:bg-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
                    "p-2.5"
                  )}
                  title={t.addToCart}
                >
                  <ShoppingCart className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <Dialog open={qvOpen} onOpenChange={setQvOpen}>
        <DialogContent
          className="max-w-md gap-0 overflow-hidden p-0 border-border bg-card"
          showCloseButton
        >
          <DialogHeader className="border-b border-border px-5 py-3.5">
            <DialogTitle className="line-clamp-1 text-sm font-semibold">
              {product.name}
            </DialogTitle>
          </DialogHeader>
          {quickBody}
        </DialogContent>
      </Dialog>
    </>
  );
}
