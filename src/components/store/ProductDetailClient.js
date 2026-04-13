"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingCart,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Heart,
  GitCompareArrows,
  Star,
  Truck,
  ShieldCheck,
  CreditCard,
  BadgeCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "./CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import ProductReviewsClient from "./ProductReviewsClient";
import ProductCard from "./ProductCard";
import { cn } from "@/lib/utils";
import { getCatalogProductsByIds } from "@/app/actions/catalog";
import { toggleWishlistProductAction } from "@/app/actions/wishlist";
import { requestProductStockAlertAction } from "@/app/actions/stock-alert";

function nameFor(product, lang) {
  return lang === "ar" ? product.nameAr || product.name : product.nameEn || product.name;
}

function shortDesc(product, lang) {
  const full =
    lang === "ar"
      ? product.descriptionAr || product.description
      : product.descriptionEn || product.description;
  if (!full) return "";
  return full
    .split(/\n+/)
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}

function longDesc(product, lang) {
  return lang === "ar"
    ? product.descriptionAr || product.description || ""
    : product.descriptionEn || product.description || "";
}

function specsToRows(specs, lang) {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs
      .map((row) => {
        const n =
          lang === "ar"
            ? row.keyAr || row.key || row.nameAr || row.name
            : row.keyEn || row.key || row.nameEn || row.name;
        const v = lang === "ar" ? row.valueAr ?? row.value : row.valueEn ?? row.value;
        return { name: n ? String(n) : "", value: v != null ? String(v) : "" };
      })
      .filter((r) => r.name && r.value);
  }
  if (typeof specs === "object") {
    return Object.entries(specs).map(([k, v]) => ({ name: k, value: String(v) }));
  }
  return [];
}

function normalizeHighlights(highlights, lang) {
  if (!Array.isArray(highlights)) return [];
  return highlights
    .map((h) => {
      if (typeof h === "string") return h;
      if (h && typeof h === "object") return lang === "ar" ? h.ar || h.en || "" : h.en || h.ar || "";
      return "";
    })
    .filter(Boolean);
}

export default function ProductDetailClient({
  product,
  relatedProducts = [],
  storeBrief,
  reviewSummary,
  wishlistInitial = false,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [wish, setWish] = useState(wishlistInitial);
  const [recentProducts, setRecentProducts] = useState([]);
  const [detailTab, setDetailTab] = useState("description");
  const [restockEmail, setRestockEmail] = useState("");
  const [restockBusy, setRestockBusy] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    setWish(wishlistInitial);
  }, [wishlistInitial]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "reviews" || tab === "specs" || tab === "shipping" || tab === "description") {
      setDetailTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
    setActiveImageIndex(0);
    setDetailTab("description");
    setRestockEmail("");
  }, [product.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !product?.id) return;
    try {
      const key = "powerstore_recent";
      const raw = localStorage.getItem(key);
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr = [product.id, ...arr.filter((x) => x !== product.id)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      /* ignore */
    }
  }, [product.id]);

  const loadRecent = useCallback(async () => {
    try {
      const raw = localStorage.getItem("powerstore_recent");
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      const ids = arr.filter((id) => id && id !== product.id).slice(0, 6);
      if (ids.length === 0) {
        setRecentProducts([]);
        return;
      }
      const rows = await getCatalogProductsByIds(ids);
      const visibleRows = Array.isArray(rows)
        ? rows.filter((row) => row && row.id && row.isActive !== false)
        : [];
      setRecentProducts(visibleRows);
    } catch {
      setRecentProducts([]);
    }
  }, [product.id]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const images = Array.isArray(product.images) ? product.images : [];
  const inStock = product.stock > 0;
  const lowStock =
    inStock && product.stock <= (typeof product.minStock === "number" ? product.minStock : 5);
  const displayN = nameFor(product, lang);
  const shortD = shortDesc(product, lang);
  const longD = longDesc(product, lang);
  const specRows = specsToRows(product.specs, lang);
  const highlightLines = normalizeHighlights(product.highlights, lang);

  const deliveryLine =
    lang === "ar"
      ? storeBrief?.defaultDeliveryEstimateAr || t.estimatedDeliveryHint
      : storeBrief?.defaultDeliveryEstimateEn || t.estimatedDeliveryHint;

  const shippingNotes =
    lang === "ar" ? storeBrief?.deliveryNotesAr || "" : storeBrief?.deliveryNotesEn || "";
  const returnPolicy =
    lang === "ar" ? storeBrief?.returnPolicyAr || "" : storeBrief?.returnPolicyEn || "";

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart(product, quantity);
    router.push("/checkout");
  };

  const onToggleWishlist = async () => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/products/${product.id}`)}`);
      return;
    }
    const prev = wish;
    setWish(!prev);
    const res = await toggleWishlistProductAction(product.id);
    if (res.needAuth) {
      setWish(prev);
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/products/${product.id}`)}`);
      return;
    }
    if (!res.ok) {
      setWish(prev);
      toast.error(lang === "ar" ? "تعذّر تحديث المفضلة" : "Could not update wishlist");
      return;
    }
    setWish(res.inWishlist);
  };

  const submitRestock = async (e) => {
    e.preventDefault();
    setRestockBusy(true);
    try {
      const res = await requestProductStockAlertAction({
        productId: product.id,
        email: restockEmail,
      });
      if (res.ok) {
        toast.success(t.pdpRestockSuccess);
        setRestockEmail("");
      } else if (res.error === "in_stock") {
        toast.message(t.pdpRestockInStock);
      } else if (res.error === "invalid_email") {
        toast.error(t.pdpRestockBadEmail);
      } else {
        toast.error(t.pdpRestockError);
      }
    } finally {
      setRestockBusy(false);
    }
  };

  const categoryHref = product.category?.name
    ? `/products?category=${encodeURIComponent(product.category.name)}`
    : "/products";

  const avg = reviewSummary?.average ?? 0;
  const totalRev = reviewSummary?.total ?? 0;

  useEffect(() => {
    setActiveImageIndex((idx) => {
      if (images.length === 0) return 0;
      if (idx < 0) return 0;
      if (idx >= images.length) return images.length - 1;
      return idx;
    });
  }, [images.length]);

  const goPrevImage = () =>
    setActiveImageIndex((i) => {
      if (images.length <= 1) return 0;
      return Math.max(0, i - 1);
    });
  const goNextImage = () =>
    setActiveImageIndex((i) => {
      if (images.length <= 1) return 0;
      return Math.min(images.length - 1, i + 1);
    });

  const onTabChange = (tab) => {
    setDetailTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    if (tab === "description") p.delete("tab");
    else p.set("tab", tab);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className={cn("min-w-0 max-w-full", isRTL ? "text-right" : "text-left")}>
      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-amber-500">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="opacity-40">/</span>
        <Link href={categoryHref} className="hover:text-amber-500">
          {translateCategory(product.category?.name, t)}
        </Link>
        <span className="opacity-40">/</span>
        <span className="line-clamp-1 font-medium text-foreground">{displayN}</span>
      </nav>

      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-amber-500"
      >
        <ChevronRight className={cn("h-4 w-4", !isRTL && "rotate-180")} />
        {t.backToProducts}
      </Link>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div
          className={cn(
            "flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4",
            isRTL && "lg:flex-row-reverse"
          )}
        >
          {/* Thumbnail rail: all images; horizontal scroll on mobile, vertical on lg+ */}
          {images.length > 1 && (
            <div
              className={cn(
                "order-2 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] lg:order-none lg:w-[4.75rem] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 lg:pr-0.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5",
                "snap-x snap-mandatory lg:snap-none"
              )}
              role="tablist"
              aria-label={lang === "ar" ? "صور المنتج" : "Product images"}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={activeImageIndex === idx}
                  aria-label={`${lang === "ar" ? "صورة" : "Image"} ${idx + 1}`}
                  onClick={() => setActiveImageIndex(idx)}
                  className={cn(
                    "relative aspect-square w-[4.25rem] shrink-0 snap-center overflow-hidden rounded-xl border-2 transition-all sm:w-[4.5rem] lg:w-full lg:snap-none",
                    activeImageIndex === idx
                      ? "border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-500/20"
                      : "border-border/60 opacity-80 hover:border-border hover:opacity-100"
                  )}
                >
                  <Image src={img} alt="" fill sizes="(max-width: 1024px) 72px, 76px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="order-1 min-w-0 flex-1 space-y-3 lg:order-none">
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label={displayN}
              tabIndex={0}
              className="group relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted/30 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-amber-500/50"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (dx > 56) goPrevImage();
                if (dx < -56) goNextImage();
                touchStartX.current = null;
              }}
              onKeyDown={(e) => {
                if (images.length <= 1) return;
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  isRTL ? goNextImage() : goPrevImage();
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  isRTL ? goPrevImage() : goNextImage();
                }
              }}
            >
              {product.hasDiscount && (
                <span
                  className={cn(
                    "absolute top-3 z-20 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white",
                    isRTL ? "right-3" : "left-3"
                  )}
                >
                  −{product.discountPct}% {t.discountBadge}
                </span>
              )}

              <button
                type="button"
                onClick={onToggleWishlist}
                className={cn(
                  "absolute top-3 z-20 rounded-full border border-border bg-background/80 p-2.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-muted",
                  isRTL ? "left-3" : "right-3"
                )}
                aria-label={wish ? t.removeFromWishlist : t.addToWishlist}
              >
                <Heart className={cn("h-5 w-5", wish && "fill-red-500 text-red-500")} />
              </button>

              {!inStock && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
                  <Badge variant="destructive" className="text-sm font-bold">
                    {t.outOfStock}
                  </Badge>
                </div>
              )}

              {images.length > 0 ? (
                <div className="relative h-full w-full overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0"
                    >
                      <div className="relative h-full w-full p-2 sm:p-4">
                        <div className="relative h-full w-full origin-center transition-transform duration-500 lg:group-hover:scale-[1.02]">
                          <Image
                            src={images[activeImageIndex]}
                            alt={`${displayN} — ${lang === "ar" ? "صورة" : "image"} ${activeImageIndex + 1} / ${images.length}`}
                            fill
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-contain"
                            priority={activeImageIndex === 0}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-8xl opacity-20">📦</div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    className={cn(
                      "absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 shadow-lg backdrop-blur-sm transition hover:bg-muted",
                      isRTL ? "right-2 sm:right-3" : "left-2 sm:left-3"
                    )}
                    aria-label={lang === "ar" ? "الصورة السابقة" : "Previous image"}
                  >
                    <ChevronLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
                  </button>
                  <button
                    type="button"
                    onClick={goNextImage}
                    className={cn(
                      "absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 shadow-lg backdrop-blur-sm transition hover:bg-muted",
                      isRTL ? "left-2 sm:left-3" : "right-2 sm:right-3"
                    )}
                    aria-label={lang === "ar" ? "الصورة التالية" : "Next image"}
                  >
                    <ChevronRight className={cn("h-5 w-5", isRTL && "rotate-180")} />
                  </button>
                  <div
                    className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
                    aria-hidden
                  >
                    <span>
                      {t.pdpImageCounter
                        .replace("{current}", String(activeImageIndex + 1))
                        .replace("{total}", String(images.length))}
                    </span>
                    <span className="hidden opacity-70 sm:inline">
                      · {images.length} {lang === "ar" ? "صور" : "photos"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <p className="text-center text-[11px] text-muted-foreground lg:text-start">
                {lang === "ar"
                  ? "اضغط الصور المصغّرة أو استخدم الأسهم لتصفح كل الصور."
                  : "Tap thumbnails or use arrows to browse all images."}
              </p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 max-w-full flex-col lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            {translateCategory(product.category?.name, t)}
          </p>
          <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl lg:text-4xl">{displayN}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {t.productSku}: {product.sku}
            </span>
            {product.barcode ? (
              <span className="font-mono">
                · {t.pdpBarcode}: {product.barcode}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              onTabChange("reviews");
              document.getElementById("pdp-detail-tabs")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="mt-4 flex flex-wrap items-center gap-2 text-start transition-opacity hover:opacity-80"
          >
            <span className="flex items-center gap-0.5" dir="ltr">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-4 w-4",
                    avg >= s - 0.25 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  )}
                />
              ))}
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums" dir="ltr">
              {avg.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({totalRev} {t.pdpReviewsCount})
            </span>
          </button>

          <div className="mt-6 space-y-2" dir="ltr">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-black tabular-nums text-foreground">
                {product.sellingPrice.toLocaleString()}{" "}
                <span className="text-lg font-semibold text-muted-foreground">{t.currency}</span>
              </span>
              {product.hasDiscount && product.listPrice != null ? (
                <span className="text-lg text-muted-foreground line-through tabular-nums">
                  {product.listPrice.toLocaleString()} {t.currency}
                </span>
              ) : null}
              {product.hasDiscount ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  −{product.discountPct}%
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground" dir={isRTL ? "rtl" : "ltr"}>
              {t.pdpPricePerUnit}: {product.unit || "pcs"}
            </p>
          </div>

          <div className="mt-4">
            {inStock && !lowStock ? (
              <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-400">
                <CheckCircle className="me-1 h-3.5 w-3.5" />
                {t.inStock} ({product.stock})
              </Badge>
            ) : null}
            {lowStock ? (
              <Badge className="bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300">
                {t.pdpLowStock}: {product.stock}
              </Badge>
            ) : null}
            {!inStock ? (
              <Badge variant="destructive">{t.outOfStock}</Badge>
            ) : null}
          </div>

          {shortD ? (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {shortD}
            </p>
          ) : null}

          <div className="mt-6 hidden flex-col gap-4 border-t border-border pt-6 lg:flex">
            <QtyAndActions
              quantity={quantity}
              setQuantity={setQuantity}
              product={product}
              inStock={inStock}
              added={added}
              onAdd={handleAddToCart}
              onBuyNow={handleBuyNow}
              t={t}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon" asChild className="rounded-xl border-border">
              <Link
                href={`/products/compare?ids=${encodeURIComponent(product.id)}`}
                aria-label={t.pdpAddToCompare}
              >
                <GitCompareArrows className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-foreground">{t.pdpEstimatedDelivery}</p>
              <p className="mt-1">{deliveryLine}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: RotateCcw, label: t.pdpTrustReturns },
              { icon: CreditCard, label: t.pdpTrustPayment },
              { icon: BadgeCheck, label: t.pdpTrustWarranty },
              { icon: ShieldCheck, label: t.pdpTrustAuthentic },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-card/50 px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground sm:text-xs"
              >
                <Icon className="h-4 w-4 text-amber-500" />
                {label}
              </div>
            ))}
          </div>

          {!inStock ? (
            <form
              onSubmit={submitRestock}
              className="mt-8 rounded-2xl border border-border bg-muted/15 p-4"
            >
              <p className="text-sm font-semibold text-foreground">{t.pdpRestockTitle}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  required
                  value={restockEmail}
                  onChange={(e) => setRestockEmail(e.target.value)}
                  placeholder={t.pdpRestockEmail}
                  className="border-border bg-background"
                  dir="ltr"
                />
                <Button
                  type="submit"
                  disabled={restockBusy}
                  variant="secondary"
                  className="shrink-0 bg-amber-500 text-black hover:bg-amber-400"
                >
                  {t.pdpRestockSubmit}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      <motion.section
        id="pdp-detail-tabs"
        className="mt-14 w-full min-w-0 max-w-full scroll-mt-24"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
      >
        <Tabs value={detailTab} onValueChange={onTabChange} className="w-full min-w-0 max-w-full">
          <TabsList
            variant="line"
            className={cn(
              "relative z-10 mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
            )}
          >
            <TabsTrigger
              value="description"
              className="shrink-0 grow-0 basis-auto rounded-none px-4 py-2 text-sm"
            >
              {t.pdpTabDescription}
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="shrink-0 grow-0 basis-auto rounded-none px-4 py-2 text-sm"
            >
              {t.pdpTabSpecs}
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="shrink-0 grow-0 basis-auto rounded-none px-4 py-2 text-sm"
            >
              {t.pdpTabReviews}
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="shrink-0 grow-0 basis-auto rounded-none px-4 py-2 text-sm"
            >
              {t.pdpTabShipping}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="flex-none outline-none">
            <div className="rounded-2xl border border-border bg-card/40 p-6">
              {highlightLines.length > 0 ? (
                <ul className="mb-6 list-disc space-y-2 ps-5 text-sm text-foreground">
                  {highlightLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {longD ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {longD}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.pdpDescriptionEmpty}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="flex-none outline-none">
            <div className="overflow-x-auto rounded-2xl border border-border">
              {specRows.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{t.pdpSpecsEmpty}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {specRows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <th
                          className={cn(
                            "w-1/3 bg-muted/30 px-4 py-3 font-semibold text-foreground",
                            isRTL ? "text-right" : "text-left"
                          )}
                        >
                          {row.name}
                        </th>
                        <td
                          className={cn("px-4 py-3 text-muted-foreground", isRTL ? "text-right" : "text-left")}
                          dir="auto"
                        >
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="flex-none w-full min-w-0 max-w-full outline-none">
            <div className="min-w-0 max-w-full rounded-2xl border border-border bg-card/40 p-3 sm:p-6 lg:p-8">
              <ProductReviewsClient productId={product.id} embedded />
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="flex-none outline-none">
            <div className="space-y-6 rounded-2xl border border-border bg-card/40 p-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.pdpShippingTitle}</h3>
                {shippingNotes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{shippingNotes}</p>
                ) : null}
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {(storeBrief?.shippingZones || []).map((z) => (
                    <li key={z.zoneName} className="flex flex-wrap justify-between gap-2 border-b border-border/50 py-2 last:border-0">
                      <span className="font-medium text-foreground">{z.zoneName}</span>
                      <span dir="ltr" className="tabular-nums">
                        {z.deliveryDaysEstimate} · {z.shippingCost.toLocaleString()}{" "}
                        {storeBrief.currency || t.currency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.pdpReturnsTitle}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {returnPolicy || t.pdpReturnsFallback}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.section>

      {relatedProducts.length > 0 ? (
        <motion.section
          className="mt-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-6 text-xl font-bold text-foreground">{t.pdpRelatedTitle}</h2>
          <div
            className={cn(
              "flex gap-4 overflow-x-auto pb-4",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}
          >
            {relatedProducts.map((p, i) => (
              <div key={p.id} className="w-[min(100%,260px)] shrink-0">
                <ProductCard product={p} index={i} compactRail />
              </div>
            ))}
          </div>
        </motion.section>
      ) : null}

      {recentProducts.length > 0 ? (
        <motion.section
          className="mt-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          <h2 className="mb-6 text-xl font-bold text-foreground">{t.catalogRecentlyViewed}</h2>
          <div
            className={cn(
              "flex gap-4 overflow-x-auto pb-4",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}
          >
            {recentProducts.map((p, i) => (
              <div key={p.id} className="w-[min(100%,260px)] shrink-0">
                <ProductCard product={p} index={i} compactRail />
              </div>
            ))}
          </div>
        </motion.section>
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden",
          "pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        )}
      >
        {inStock ? (
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex items-center rounded-xl border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 text-muted-foreground hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="p-3 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              className={cn(
                "min-h-12 flex-1 gap-2 font-bold transition-all",
                added ? "bg-emerald-600 hover:bg-emerald-600" : "bg-amber-500 text-black hover:bg-amber-400"
              )}
            >
              {added ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  {t.addedToCart}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  {t.addToCart}
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t.outOfStock}</p>
        )}
      </div>
    </div>
  );
}

function QtyAndActions({ quantity, setQuantity, product, inStock, added, onAdd, onBuyNow, t }) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center rounded-xl border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-3 text-muted-foreground hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-bold tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            className="p-3 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            disabled={!inStock}
            onClick={onAdd}
            className={cn(
              "min-h-12 flex-1 gap-2 text-base font-bold transition-all",
              added ? "bg-emerald-600 hover:bg-emerald-600" : "bg-amber-500 text-black hover:bg-amber-400"
            )}
          >
            {added ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t.addedToCart}
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                {t.addToCart} —{" "}
                <span dir="ltr" className="tabular-nums">
                  {(product.sellingPrice * quantity).toLocaleString()} {t.currency}
                </span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!inStock}
            onClick={onBuyNow}
            className="min-h-12 flex-1 border-amber-500/50 font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          >
            {t.pdpBuyNow}
          </Button>
        </div>
      </div>
    </>
  );
}
